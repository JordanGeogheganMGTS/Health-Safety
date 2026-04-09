'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().optional(),
  site_id: z.string().uuid('Please select a site'),
  priority_id: z.string().uuid('Please select a priority'),
  assigned_to: z.string().uuid('Please select a user'),
  due_date: z.string().min(1, 'Due date is required'),
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

// ─── Component ────────────────────────────────────────────────────────────────

export default function NewCorrectiveActionPage() {
  const router = useRouter()
  const supabase = createClient()

  const [sites, setSites] = useState<Site[]>([])
  const [users, setUsers] = useState<UserOption[]>([])
  const [priorities, setPriorities] = useState<PriorityOption[]>([])
  const [loadingOptions, setLoadingOptions] = useState(true)
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  // Load sites, users and priorities on mount
  useEffect(() => {
    async function load() {
      const { data: catData } = await supabase
        .from('lookup_categories')
        .select('id')
        .eq('key', 'ca_priority')
        .single()

      const [{ data: sitesData }, { data: usersData }, { data: prioritiesData }] =
        await Promise.all([
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
        ])

      setSites(sitesData ?? [])
      setUsers(usersData ?? [])
      setPriorities((prioritiesData ?? []) as PriorityOption[])
      setLoadingOptions(false)
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function onSubmit(values: FormValues) {
    setServerError(null)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setServerError('You must be logged in.')
      return
    }

    const { data, error } = await supabase
      .from('corrective_actions')
      .insert({
        title: values.title,
        description: values.description || null,
        site_id: values.site_id,
        priority_id: values.priority_id,
        assigned_to: values.assigned_to,
        assigned_by: user.id,
        due_date: values.due_date,
        source_table: 'manual',
        status: 'Open',
      })
      .select('id')
      .single()

    if (error || !data) {
      setServerError(error?.message ?? 'Failed to create corrective action.')
      return
    }

    router.push(`/corrective-actions/${data.id}`)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">New Corrective Action</h1>
        <p className="mt-1 text-sm text-slate-500">
          Complete the fields below to log a new corrective action.
        </p>
      </div>

      <div className="max-w-4xl">
        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
        >
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
              placeholder="Brief description of the action required"
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
              placeholder="Provide additional context or steps required…"
              className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
            />
            {errors.description && (
              <p className="text-xs text-red-600">{errors.description.message}</p>
            )}
          </div>

          {/* Site */}
          <div className="space-y-1">
            <label htmlFor="site_id" className="block text-sm font-medium text-slate-700">
              Site <span className="text-red-500">*</span>
            </label>
            <select
              id="site_id"
              {...register('site_id')}
              disabled={loadingOptions}
              className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 disabled:opacity-50"
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
              disabled={loadingOptions}
              className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 disabled:opacity-50"
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
              disabled={loadingOptions}
              className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 disabled:opacity-50"
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

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-orange-500 px-5 py-2 text-sm font-medium text-white hover:bg-orange-600 transition-colors disabled:opacity-60"
            >
              {isSubmitting ? 'Saving…' : 'Create Corrective Action'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
