'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z
  .object({
    title: z.string().min(1, 'Title is required').max(255),
    description: z.string().optional(),
    site_id: z.string().uuid('Please select a site'),
    priority_id: z.string().uuid('Please select a priority'),
    assigned_to: z.string().uuid('Please select a user'),
    due_date: z.string().min(1, 'Due date is required'),
    status: z.enum(['Open', 'In Progress', 'Completed', 'Overdue', 'Closed'], {
      required_error: 'Please select a status',
    }),
    completed_at: z.string().optional(),
    completion_notes: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.status === 'Completed' && !data.completed_at) {
      ctx.addIssue({
        path: ['completed_at'],
        code: z.ZodIssueCode.custom,
        message: 'Completed date is required when status is Completed',
      })
    }
  })

type FormValues = z.infer<typeof schema>

// ─── Types ────────────────────────────────────────────────────────────────────

interface Site {
  id: string
  name: string
}

interface UserOption {
  id: string
  first_name: string
  last_name: string
}

interface PriorityOption {
  id: string
  label: string
}

interface ExistingCA {
  id: string
  title: string
  description: string | null
  site_id: string
  priority_id: string
  assigned_to: string
  due_date: string | null
  status: 'Open' | 'In Progress' | 'Completed' | 'Overdue' | 'Closed'
  completed_at: string | null
  completion_notes: string | null
}

// ─── Component ────────────────────────────────────────────────────────────────

interface PageProps {
  params: { id: string }
}

export default function EditCorrectiveActionPage({ params }: PageProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isClosingAction = searchParams.get('action') === 'close'
  const supabase = createClient()

  const [sites, setSites] = useState<Site[]>([])
  const [users, setUsers] = useState<UserOption[]>([])
  const [priorities, setPriorities] = useState<PriorityOption[]>([])
  const [loadingOptions, setLoadingOptions] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  const watchedStatus = watch('status')
  const showCompletedAt = watchedStatus === 'Completed'
  const showCompletionNotes = watchedStatus === 'Completed' || watchedStatus === 'Closed'

  // Load existing record + options
  useEffect(() => {
    async function load() {
      // Fetch priority category ID first, then all other data in parallel
      const { data: catData } = await supabase
        .from('lookup_categories')
        .select('id')
        .eq('key', 'ca_priority')
        .single()

      const [
        { data: sitesData },
        { data: usersData },
        { data: prioritiesData },
        { data: caData, error: caError },
      ] = await Promise.all([
        supabase.from('sites').select('id, name').order('name'),
        supabase
          .from('users')
          .select('id, first_name, last_name')
          .eq('is_active', true)
          .order('last_name'),
        catData
          ? supabase
              .from('lookup_values')
              .select('id, label')
              .eq('category_id', catData.id)
              .order('sort_order')
          : Promise.resolve({ data: [] }),
        supabase
          .from('corrective_actions')
          .select(
            'id, title, description, site_id, priority_id, assigned_to, due_date, status, completed_at, completion_notes'
          )
          .eq('id', params.id)
          .single(),
      ])

      setSites(sitesData ?? [])
      setUsers(usersData ?? [])
      setPriorities((prioritiesData ?? []) as PriorityOption[])

      if (caError || !caData) {
        setNotFound(true)
        setLoadingOptions(false)
        return
      }

      const ca = caData as unknown as ExistingCA

      reset({
        title: ca.title,
        description: ca.description ?? '',
        site_id: ca.site_id,
        priority_id: ca.priority_id,
        assigned_to: ca.assigned_to,
        due_date: ca.due_date ?? '',
        status: isClosingAction ? 'Closed' : ca.status,
        completed_at: ca.completed_at ? ca.completed_at.slice(0, 10) : '',
        completion_notes: ca.completion_notes ?? '',
      })

      setLoadingOptions(false)
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id, isClosingAction])

  async function onSubmit(values: FormValues) {
    setServerError(null)

    const { error } = await supabase
      .from('corrective_actions')
      .update({
        title: values.title,
        description: values.description || null,
        site_id: values.site_id,
        priority_id: values.priority_id,
        assigned_to: values.assigned_to,
        due_date: values.due_date,
        status: values.status,
        completed_at: values.completed_at ? new Date(values.completed_at).toISOString() : null,
        completion_notes: values.completion_notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)

    if (error) {
      setServerError(error.message)
      return
    }

    router.push(`/corrective-actions/${params.id}`)
  }

  if (notFound) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        Corrective action not found.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          {isClosingAction ? 'Close Corrective Action' : 'Edit Corrective Action'}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {isClosingAction
            ? 'Review details and add completion notes before closing.'
            : 'Update the fields below.'}
        </p>
      </div>

      <div className="max-w-2xl">
        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          {/* Loading skeleton */}
          {loadingOptions && (
            <div className="space-y-4 animate-pulse">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-10 rounded-lg bg-slate-100" />
              ))}
            </div>
          )}

          {!loadingOptions && (
            <>
              {/* Server error */}
              {serverError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {serverError}
                </div>
              )}

              {/* Title */}
              <div className="space-y-1">
                <label htmlFor="title" className="block text-sm font-medium text-slate-700">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  id="title"
                  type="text"
                  {...register('title')}
                  className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
                {errors.title && (
                  <p className="text-xs text-red-600">{errors.title.message}</p>
                )}
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label htmlFor="description" className="block text-sm font-medium text-slate-700">
                  Description
                </label>
                <textarea
                  id="description"
                  {...register('description')}
                  rows={4}
                  className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
              </div>

              {/* Site */}
              <div className="space-y-1">
                <label htmlFor="site_id" className="block text-sm font-medium text-slate-700">
                  Site <span className="text-red-500">*</span>
                </label>
                <select
                  id="site_id"
                  {...register('site_id')}
                  className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                >
                  <option value="">Select a site…</option>
                  {sites.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                {errors.site_id && (
                  <p className="text-xs text-red-600">{errors.site_id.message}</p>
                )}
              </div>

              {/* Priority */}
              <div className="space-y-1">
                <label htmlFor="priority_id" className="block text-sm font-medium text-slate-700">
                  Priority <span className="text-red-500">*</span>
                </label>
                <select
                  id="priority_id"
                  {...register('priority_id')}
                  className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                >
                  <option value="">Select priority…</option>
                  {priorities.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
                {errors.priority_id && (
                  <p className="text-xs text-red-600">{errors.priority_id.message}</p>
                )}
              </div>

              {/* Assigned To */}
              <div className="space-y-1">
                <label htmlFor="assigned_to" className="block text-sm font-medium text-slate-700">
                  Assigned To <span className="text-red-500">*</span>
                </label>
                <select
                  id="assigned_to"
                  {...register('assigned_to')}
                  className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                >
                  <option value="">Select a user…</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.first_name} {u.last_name}
                    </option>
                  ))}
                </select>
                {errors.assigned_to && (
                  <p className="text-xs text-red-600">{errors.assigned_to.message}</p>
                )}
              </div>

              {/* Due Date */}
              <div className="space-y-1">
                <label htmlFor="due_date" className="block text-sm font-medium text-slate-700">
                  Due Date <span className="text-red-500">*</span>
                </label>
                <input
                  id="due_date"
                  type="date"
                  {...register('due_date')}
                  className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
                {errors.due_date && (
                  <p className="text-xs text-red-600">{errors.due_date.message}</p>
                )}
              </div>

              {/* Status */}
              <div className="space-y-1">
                <label htmlFor="status" className="block text-sm font-medium text-slate-700">
                  Status <span className="text-red-500">*</span>
                </label>
                <select
                  id="status"
                  {...register('status')}
                  className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                >
                  <option value="">Select status…</option>
                  <option value="Open">Open</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                  <option value="Overdue">Overdue</option>
                  <option value="Closed">Closed</option>
                </select>
                {errors.status && (
                  <p className="text-xs text-red-600">{errors.status.message}</p>
                )}
              </div>

              {/* Completed Date — conditional */}
              {showCompletedAt && (
                <div className="space-y-1">
                  <label htmlFor="completed_at" className="block text-sm font-medium text-slate-700">
                    Completed Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="completed_at"
                    type="date"
                    {...register('completed_at')}
                    className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                  {errors.completed_at && (
                    <p className="text-xs text-red-600">{errors.completed_at.message}</p>
                  )}
                </div>
              )}

              {/* Completion Notes — conditional */}
              {showCompletionNotes && (
                <div className="space-y-1">
                  <label htmlFor="completion_notes" className="block text-sm font-medium text-slate-700">
                    Completion Notes
                  </label>
                  <textarea
                    id="completion_notes"
                    {...register('completion_notes')}
                    rows={4}
                    placeholder="Describe how this action was resolved…"
                    className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => router.push(`/corrective-actions/${params.id}`)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-lg bg-orange-500 px-5 py-2 text-sm font-medium text-white hover:bg-orange-600 transition-colors disabled:opacity-60"
                >
                  {isSubmitting
                    ? 'Saving…'
                    : isClosingAction
                    ? 'Close Action'
                    : 'Save Changes'}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  )
}
