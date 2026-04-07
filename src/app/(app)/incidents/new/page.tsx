'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'

// ─── Schema ───────────────────────────────────────────────────────────────────

const today = new Date().toISOString().split('T')[0]

const schema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  incident_date: z.string().min(1, 'Incident date is required'),
  incident_time: z.string().optional(),
  type_id: z.string().uuid('Please select an incident type'),
  site_id: z.string().uuid('Please select a site'),
  location: z.string().optional(),
  description: z.string().min(1, 'Description is required'),
  injured_person_name: z.string().optional(),
  injured_person_type: z.string().optional(),
  injured_person_dept: z.string().optional(),
  witnesses: z.string().optional(),
  immediate_causes: z.string().optional(),
  is_riddor_reportable: z.boolean(),
  riddor_reference: z.string().optional(),
  riddor_report_date: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface Site { id: string; name: string }
interface IncidentType { id: string; label: string }
interface LookupOption { id: string; label: string }

// ─── Component ────────────────────────────────────────────────────────────────

export default function NewIncidentPage() {
  const router = useRouter()
  const supabase = createClient()

  const [sites, setSites] = useState<Site[]>([])
  const [incidentTypes, setIncidentTypes] = useState<IncidentType[]>([])
  const [personTypes, setPersonTypes] = useState<LookupOption[]>([])
  const [loadingOptions, setLoadingOptions] = useState(true)
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      incident_date: today,
      is_riddor_reportable: false,
    },
  })

  const riddorWatched = useWatch({ control, name: 'is_riddor_reportable' })

  useEffect(() => {
    async function load() {
      const [{ data: incTypeCat }, { data: personTypeCat }] = await Promise.all([
        supabase.from('lookup_categories').select('id').eq('key', 'incident_type').single(),
        supabase.from('lookup_categories').select('id').eq('key', 'incident_person_type').single(),
      ])

      const [{ data: sitesData }, { data: typesData }, { data: personTypesData }] = await Promise.all([
        supabase.from('sites').select('id, name').order('name'),
        incTypeCat
          ? supabase.from('lookup_values').select('id, label').eq('category_id', incTypeCat.id).eq('is_active', true).order('sort_order')
          : Promise.resolve({ data: [] }),
        personTypeCat
          ? supabase.from('lookup_values').select('id, label').eq('category_id', personTypeCat.id).eq('is_active', true).order('sort_order')
          : Promise.resolve({ data: [] }),
      ])

      setSites(sitesData ?? [])
      setIncidentTypes((typesData ?? []) as IncidentType[])
      setPersonTypes((personTypesData ?? []) as LookupOption[])
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
      .from('incidents')
      .insert({
        title: values.title,
        incident_date: values.incident_date,
        incident_time: values.incident_time || null,
        type_id: values.type_id,
        site_id: values.site_id,
        location: values.location || null,
        description: values.description,
        injured_person_name: values.injured_person_name || null,
        injured_person_type: values.injured_person_type || null,
        injured_person_dept: values.injured_person_dept || null,
        witnesses: values.witnesses || null,
        immediate_causes: values.immediate_causes || null,
        is_riddor_reportable: values.is_riddor_reportable,
        riddor_reference: values.is_riddor_reportable ? (values.riddor_reference || null) : null,
        riddor_report_date: values.is_riddor_reportable ? (values.riddor_report_date || null) : null,
        reported_by: user.id,
        status: 'Open',
      })
      .select('id')
      .single()

    if (error || !data) {
      setServerError(error?.message ?? 'Failed to create incident.')
      return
    }

    router.push(`/incidents/${data.id}`)
  }

  const inputClass =
    'block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500'
  const selectClass =
    'block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 disabled:opacity-50'
  const labelClass = 'block text-sm font-medium text-slate-700'
  const errorClass = 'text-xs text-red-600'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Report Incident</h1>
        <p className="mt-1 text-sm text-slate-500">Complete the form below to log a new incident.</p>
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
            <input
              id="title"
              type="text"
              {...register('title')}
              className={inputClass}
              placeholder="Brief summary of the incident"
            />
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
            <select id="type_id" {...register('type_id')} disabled={loadingOptions} className={selectClass}>
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
            <select id="site_id" {...register('site_id')} disabled={loadingOptions} className={selectClass}>
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
            <input
              id="location"
              type="text"
              {...register('location')}
              className={inputClass}
              placeholder="e.g. Warehouse, loading bay 3"
            />
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label htmlFor="description" className={labelClass}>
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              id="description"
              {...register('description')}
              rows={5}
              className={inputClass}
              placeholder="Provide a full description of what happened…"
            />
            {errors.description && <p className={errorClass}>{errors.description.message}</p>}
          </div>

          {/* Injured Person */}
          <div className="space-y-4 rounded-lg border border-slate-100 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Injured / Affected Person</p>
            <div className="space-y-1">
              <label htmlFor="injured_person_name" className={labelClass}>Name</label>
              <input id="injured_person_name" type="text" {...register('injured_person_name')} className={inputClass} placeholder="Full name of the injured person" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label htmlFor="injured_person_type" className={labelClass}>Person Type</label>
                <select id="injured_person_type" {...register('injured_person_type')} disabled={loadingOptions} className={selectClass}>
                  <option value="">Select type…</option>
                  {personTypes.map((t) => (
                    <option key={t.id} value={t.label}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label htmlFor="injured_person_dept" className={labelClass}>Department</label>
                <input id="injured_person_dept" type="text" {...register('injured_person_dept')} className={inputClass} placeholder="e.g. Warehouse, Admin" />
              </div>
            </div>
          </div>

          {/* Witnesses */}
          <div className="space-y-1">
            <label htmlFor="witnesses" className={labelClass}>Witnesses / Persons Involved</label>
            <textarea
              id="witnesses"
              {...register('witnesses')}
              rows={3}
              className={inputClass}
              placeholder="Names and roles of witnesses or persons involved…"
            />
          </div>

          {/* Immediate Actions */}
          <div className="space-y-1">
            <label htmlFor="immediate_causes" className={labelClass}>Immediate Actions Taken</label>
            <textarea
              id="immediate_causes"
              {...register('immediate_causes')}
              rows={3}
              className={inputClass}
              placeholder="What actions were taken immediately after the incident?…"
            />
          </div>

          {/* RIDDOR Reportable */}
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

            {/* Conditional RIDDOR Fields */}
            {riddorWatched && (
              <div className="ml-7 space-y-4 rounded-lg border border-red-100 bg-red-50 p-4">
                <p className="text-xs font-medium text-red-700">RIDDOR reporting details</p>
                <div className="space-y-1">
                  <label htmlFor="riddor_reference" className={labelClass}>RIDDOR Reference Number</label>
                  <input
                    id="riddor_reference"
                    type="text"
                    {...register('riddor_reference')}
                    className={inputClass}
                    placeholder="e.g. 2024/123456"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="riddor_report_date" className={labelClass}>Date Reported to HSE</label>
                  <input id="riddor_report_date" type="date" {...register('riddor_report_date')} className={inputClass} />
                </div>
              </div>
            )}
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
              {isSubmitting ? 'Saving…' : 'Report Incident'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
