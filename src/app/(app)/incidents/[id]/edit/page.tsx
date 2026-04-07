'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  incident_date: z.string().min(1, 'Incident date is required'),
  incident_time: z.string().optional(),
  type_id: z.string().uuid('Please select an incident type'),
  site_id: z.string().uuid('Please select a site'),
  location: z.string().optional(),
  description: z.string().min(1, 'Description is required'),
  witnesses: z.string().optional(),
  immediate_causes: z.string().optional(),
  is_riddor_reportable: z.boolean(),
  riddor_reference: z.string().optional(),
  riddor_report_date: z.string().optional(),
  status: z.enum(['Open', 'Under Investigation', 'Closed']),
  investigated_by: z.string().optional(),
  root_causes: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

// ─── Types ────────────────────────────────────────────────────────────────────

interface Site { id: string; name: string }
interface UserOption { id: string; first_name: string; last_name: string }
interface IncidentType { id: string; label: string }

// ─── Component ────────────────────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ id: string }>
}

export default function EditIncidentPage({ params }: PageProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const action = searchParams.get('action')
  const supabase = createClient()

  const [incidentId, setIncidentId] = useState<string | null>(null)
  const [sites, setSites] = useState<Site[]>([])
  const [users, setUsers] = useState<UserOption[]>([])
  const [incidentTypes, setIncidentTypes] = useState<IncidentType[]>([])
  const [loading, setLoading] = useState(true)
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  const riddorWatched = useWatch({ control, name: 'is_riddor_reportable' })
  const statusWatched = useWatch({ control, name: 'status' })

  useEffect(() => {
    async function load() {
      const { id } = await params
      setIncidentId(id)

      // Fetch lookup category for incident types
      const { data: catData } = await supabase
        .from('lookup_categories')
        .select('id')
        .eq('key', 'incident_type')
        .single()

      const [{ data: inc }, { data: sitesData }, { data: usersData }, { data: typesData }] =
        await Promise.all([
          supabase.from('incidents').select('*').eq('id', id).single(),
          supabase.from('sites').select('id, name').order('name'),
          supabase.from('users').select('id, first_name, last_name').eq('is_active', true).order('last_name'),
          catData
            ? supabase.from('lookup_values').select('id, label').eq('category_id', catData.id).order('sort_order')
            : Promise.resolve({ data: [] }),
        ])

      setSites(sitesData ?? [])
      setUsers(usersData ?? [])
      setIncidentTypes((typesData ?? []) as IncidentType[])

      if (inc) {
        let overrideStatus = inc.status
        if (action === 'investigate') overrideStatus = 'Under Investigation'
        if (action === 'close') overrideStatus = 'Closed'

        reset({
          title: inc.title ?? '',
          incident_date: inc.incident_date ?? '',
          incident_time: inc.incident_time ?? '',
          type_id: inc.type_id ?? '',
          site_id: inc.site_id ?? '',
          location: inc.location ?? '',
          description: inc.description ?? '',
          witnesses: inc.witnesses ?? '',
          immediate_causes: inc.immediate_causes ?? '',
          is_riddor_reportable: inc.is_riddor_reportable ?? false,
          riddor_reference: inc.riddor_reference ?? '',
          riddor_report_date: inc.riddor_report_date ?? '',
          investigated_by: inc.investigated_by ?? '',
          root_causes: inc.root_causes ?? '',
          status: overrideStatus,
        })
      }

      setLoading(false)
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function onSubmit(values: FormValues) {
    if (!incidentId) return
    setServerError(null)

    const updatePayload: Record<string, unknown> = {
      title: values.title,
      incident_date: values.incident_date,
      incident_time: values.incident_time || null,
      type_id: values.type_id,
      site_id: values.site_id,
      location: values.location || null,
      description: values.description,
      witnesses: values.witnesses || null,
      immediate_causes: values.immediate_causes || null,
      is_riddor_reportable: values.is_riddor_reportable,
      riddor_reference: values.is_riddor_reportable ? (values.riddor_reference || null) : null,
      riddor_report_date: values.is_riddor_reportable ? (values.riddor_report_date || null) : null,
      investigated_by: values.investigated_by || null,
      root_causes: values.root_causes || null,
      status: values.status,
    }

    if (values.status === 'Closed') {
      updatePayload.closed_at = new Date().toISOString()
    }

    const { error } = await supabase
      .from('incidents')
      .update(updatePayload)
      .eq('id', incidentId)

    if (error) {
      setServerError(error.message)
      return
    }

    router.push(`/incidents/${incidentId}`)
  }

  const inputClass =
    'block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500'
  const selectClass =
    'block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 disabled:opacity-50'
  const labelClass = 'block text-sm font-medium text-slate-700'
  const errorClass = 'text-xs text-red-600'

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-sm text-slate-500">Loading…</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <nav className="flex items-center gap-2 text-sm text-slate-500 mb-4">
          <a href="/incidents" className="hover:text-slate-700 hover:underline">Incident Log</a>
          <span>/</span>
          <a href={`/incidents/${incidentId}`} className="hover:text-slate-700 hover:underline">Incident</a>
          <span>/</span>
          <span className="font-medium text-slate-800">Edit</span>
        </nav>
        <h1 className="text-2xl font-semibold text-slate-900">Edit Incident</h1>
        <p className="mt-1 text-sm text-slate-500">Update the incident record details.</p>
      </div>

      <div className="max-w-2xl">
        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          {serverError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {serverError}
            </div>
          )}

          {/* Title */}
          <div className="space-y-1">
            <label htmlFor="title" className={labelClass}>
              Title <span className="text-red-500">*</span>
            </label>
            <input id="title" type="text" {...register('title')} className={inputClass} placeholder="Brief summary of the incident" />
            {errors.title && <p className={errorClass}>{errors.title.message}</p>}
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label htmlFor="incident_date" className={labelClass}>
                Incident Date <span className="text-red-500">*</span>
              </label>
              <input id="incident_date" type="date" {...register('incident_date')} className={inputClass} />
              {errors.incident_date && <p className={errorClass}>{errors.incident_date.message}</p>}
            </div>
            <div className="space-y-1">
              <label htmlFor="incident_time" className={labelClass}>Incident Time</label>
              <input id="incident_time" type="time" {...register('incident_time')} className={inputClass} />
            </div>
          </div>

          {/* Type */}
          <div className="space-y-1">
            <label htmlFor="type_id" className={labelClass}>
              Incident Type <span className="text-red-500">*</span>
            </label>
            <select id="type_id" {...register('type_id')} disabled={loading} className={selectClass}>
              <option value="">Select a type…</option>
              {incidentTypes.map((t) => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
            {errors.type_id && <p className={errorClass}>{errors.type_id.message}</p>}
          </div>

          {/* Site */}
          <div className="space-y-1">
            <label htmlFor="site_id" className={labelClass}>
              Site <span className="text-red-500">*</span>
            </label>
            <select id="site_id" {...register('site_id')} className={selectClass}>
              <option value="">Select a site…</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            {errors.site_id && <p className={errorClass}>{errors.site_id.message}</p>}
          </div>

          {/* Location */}
          <div className="space-y-1">
            <label htmlFor="location" className={labelClass}>Location</label>
            <input id="location" type="text" {...register('location')} className={inputClass} placeholder="e.g. Warehouse, loading bay 3" />
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label htmlFor="description" className={labelClass}>
              Description <span className="text-red-500">*</span>
            </label>
            <textarea id="description" {...register('description')} rows={5} className={inputClass} />
            {errors.description && <p className={errorClass}>{errors.description.message}</p>}
          </div>

          {/* Witnesses */}
          <div className="space-y-1">
            <label htmlFor="witnesses" className={labelClass}>Witnesses / Persons Involved</label>
            <textarea id="witnesses" {...register('witnesses')} rows={3} className={inputClass} />
          </div>

          {/* Immediate Causes */}
          <div className="space-y-1">
            <label htmlFor="immediate_causes" className={labelClass}>Immediate Actions Taken</label>
            <textarea id="immediate_causes" {...register('immediate_causes')} rows={3} className={inputClass} />
          </div>

          {/* RIDDOR */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <input
                id="is_riddor_reportable"
                type="checkbox"
                {...register('is_riddor_reportable')}
                className="h-4 w-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
              />
              <label htmlFor="is_riddor_reportable" className="text-sm font-medium text-slate-700">
                RIDDOR Reportable
              </label>
            </div>

            {riddorWatched && (
              <div className="ml-7 space-y-4 rounded-lg border border-red-100 bg-red-50 p-4">
                <p className="text-xs font-medium text-red-700">RIDDOR reporting details</p>
                <div className="space-y-1">
                  <label htmlFor="riddor_reference" className={labelClass}>RIDDOR Reference Number</label>
                  <input id="riddor_reference" type="text" {...register('riddor_reference')} className={inputClass} />
                </div>
                <div className="space-y-1">
                  <label htmlFor="riddor_report_date" className={labelClass}>Date Reported to HSE</label>
                  <input id="riddor_report_date" type="date" {...register('riddor_report_date')} className={inputClass} />
                </div>
              </div>
            )}
          </div>

          {/* Investigation Section */}
          <div className="space-y-4 rounded-lg border border-slate-100 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Investigation</p>

            <div className="space-y-1">
              <label htmlFor="status" className={labelClass}>
                Status <span className="text-red-500">*</span>
              </label>
              <select id="status" {...register('status')} className={selectClass}>
                <option value="Open">Open</option>
                <option value="Under Investigation">Under Investigation</option>
                <option value="Closed">Closed</option>
              </select>
              {errors.status && <p className={errorClass}>{errors.status.message}</p>}
              {statusWatched === 'Closed' && (
                <p className="text-xs text-green-700">
                  Closing this incident will automatically record the closure timestamp.
                </p>
              )}
            </div>

            <div className="space-y-1">
              <label htmlFor="investigated_by" className={labelClass}>Investigated By</label>
              <select id="investigated_by" {...register('investigated_by')} className={selectClass}>
                <option value="">Select a user…</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label htmlFor="root_causes" className={labelClass}>Root Causes / Investigation Summary</label>
              <textarea
                id="root_causes"
                {...register('root_causes')}
                rows={5}
                className={inputClass}
                placeholder="Summarise the findings of the investigation…"
              />
            </div>
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
              disabled={isSubmitting}
              className="rounded-lg bg-orange-500 px-5 py-2 text-sm font-medium text-white hover:bg-orange-600 transition-colors disabled:opacity-60"
            >
              {isSubmitting ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
