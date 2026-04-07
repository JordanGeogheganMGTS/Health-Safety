'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  title:           z.string().min(1, 'Title is required'),
  site_id:         z.string().min(1, 'Site is required'),
  type_id:         z.string().min(1, 'Type is required'),
  template_id:     z.string().optional(),
  inspection_date: z.string().min(1, 'Date is required'),
  inspected_by:    z.string().min(1, 'Conducted by is required'),
})

type FormValues = z.infer<typeof schema>

// ─── Types ────────────────────────────────────────────────────────────────────

interface Site      { id: string; name: string }
interface LookupVal { id: string; label: string }
interface Template  { id: string; name: string; site_id: string | null }
interface User      { id: string; first_name: string; last_name: string }

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NewInspectionPage() {
  const router   = useRouter()
  const supabase = createClient()

  const [sites,     setSites]     = useState<Site[]>([])
  const [types,     setTypes]     = useState<LookupVal[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [users,     setUsers]     = useState<User[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [serverErr,  setServerErr]  = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const selectedSite = watch('site_id')

  useEffect(() => {
    async function load() {
      const [
        { data: { user } },
        sitesRes,
        catRes,
        templatesRes,
        usersRes,
      ] = await Promise.all([
        supabase.auth.getUser(),
        supabase.from('sites').select('id, name').eq('is_active', true).order('name'),
        supabase.from('lookup_categories').select('id').eq('key', 'inspection_type').single(),
        supabase.from('inspection_templates').select('id, name, site_id').eq('is_active', true).order('name'),
        supabase.from('users').select('id, first_name, last_name').eq('is_active', true).order('last_name'),
      ])

      setSites(sitesRes.data ?? [])
      setTemplates((templatesRes.data ?? []) as Template[])
      setUsers(usersRes.data ?? [])

      // Default conducted-by to the current user
      if (user) setValue('inspected_by', user.id)

      // Two-step lookup: category key → category id → values
      if (catRes.data?.id) {
        const { data: typeRows } = await supabase
          .from('lookup_values')
          .select('id, label')
          .eq('category_id', catRes.data.id)
          .eq('is_active', true)
          .order('sort_order')
        setTypes(typeRows ?? [])
      }
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Filter templates to those matching the selected site (or site-agnostic)
  const filteredTemplates = templates.filter(
    (t) => t.site_id === null || t.site_id === selectedSite
  )

  async function onSubmit(values: FormValues) {
    setSubmitting(true)
    setServerErr(null)

    const { data, error } = await supabase
      .from('inspections')
      .insert({
        title:           values.title,
        site_id:         values.site_id,
        type_id:         values.type_id,
        template_id:     values.template_id || null,
        inspection_date: values.inspection_date,
        inspected_by:    values.inspected_by,
        status:          'Draft',
      })
      .select('id')
      .single()

    if (error || !data) {
      setServerErr(error?.message ?? 'Failed to create inspection.')
      setSubmitting(false)
      return
    }

    router.push(`/inspections/${data.id}`)
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Schedule Inspection</h1>
        <p className="mt-1 text-sm text-slate-500">Create a new inspection or audit record.</p>
      </div>

      {serverErr && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {serverErr}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            {...register('title')}
            placeholder="e.g. Monthly Fire Safety Audit"
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
          />
          {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title.message}</p>}
        </div>

        {/* Site */}
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Site <span className="text-red-500">*</span>
          </label>
          <select
            {...register('site_id')}
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
          >
            <option value="">Select a site…</option>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          {errors.site_id && <p className="mt-1 text-xs text-red-600">{errors.site_id.message}</p>}
        </div>

        {/* Type */}
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Inspection Type <span className="text-red-500">*</span>
          </label>
          <select
            {...register('type_id')}
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
          >
            <option value="">Select a type…</option>
            {types.map((t) => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
          {errors.type_id && <p className="mt-1 text-xs text-red-600">{errors.type_id.message}</p>}
        </div>

        {/* Template */}
        <div>
          <label className="block text-sm font-medium text-slate-700">Template (optional)</label>
          <select
            {...register('template_id')}
            disabled={!selectedSite}
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 disabled:bg-slate-50 disabled:text-slate-400"
          >
            <option value="">No template</option>
            {filteredTemplates.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          {!selectedSite && (
            <p className="mt-1 text-xs text-slate-400">Select a site first to filter templates.</p>
          )}
        </div>

        {/* Date */}
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Inspection Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            {...register('inspection_date')}
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
          />
          {errors.inspection_date && <p className="mt-1 text-xs text-red-600">{errors.inspection_date.message}</p>}
        </div>

        {/* Conducted By */}
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Conducted By <span className="text-red-500">*</span>
          </label>
          <select
            {...register('inspected_by')}
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
          >
            <option value="">Select person…</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.first_name} {u.last_name}
              </option>
            ))}
          </select>
          {errors.inspected_by && <p className="mt-1 text-xs text-red-600">{errors.inspected_by.message}</p>}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-orange-600 transition-colors disabled:opacity-60"
          >
            {submitting ? 'Saving…' : 'Schedule Inspection'}
          </button>
        </div>
      </form>
    </div>
  )
}
