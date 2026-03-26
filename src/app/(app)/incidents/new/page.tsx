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
  incident_date: z.string().min(1, 'Incident date is required'),
  incident_time: z.string().optional(),
  type: z.string().min(1, 'Please select an incident type'),
  site_id: z.string().uuid('Please select a site'),
  location_description: z.string().min(1, 'Location is required'),
  description: z.string().min(1, 'Description is required'),
  persons_involved: z.string().optional(),
  immediate_actions: z.string().optional(),
  riddor_reportable: z.boolean(),
  riddor_reference: z.string().optional(),
  riddor_reported_date: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface Site { id: string; name: string }

const INCIDENT_TYPES = [
  'Near Miss',
  'First Aid',
  'RIDDOR Reportable',
  'Property Damage',
  'Environmental',
  'Fire',
  'Theft',
  'Violence',
]

// ─── Component ────────────────────────────────────────────────────────────────

export default function NewIncidentPage() {
  const router = useRouter()
  const supabase = createClient()

  const [sites, setSites] = useState<Site[]>([])
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
      riddor_reportable: false,
    },
  })

  const riddorWatched = useWatch({ control, name: 'riddor_reportable' })

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('sites').select('id, name').order('name')
      setSites(data ?? [])
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
        incident_date: values.incident_date,
        incident_time: values.incident_time || null,
        type: values.type,
        site_id: values.site_id,
        location_description: values.location_description,
        description: values.description,
        persons_involved: values.persons_involved || null,
        immediate_actions: values.immediate_actions || null,
        riddor_reportable: values.riddor_reportable,
        riddor_reference: values.riddor_reportable ? (values.riddor_reference || null) : null,
        riddor_reported_date: values.riddor_reportable ? (values.riddor_reported_date || null) : null,
        reported_by_id: user.id,
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
    'block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'
  const selectClass =
    'block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50'
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
            <label htmlFor="type" className={labelClass}>
              Incident Type <span className="text-red-500">*</span>
            </label>
            <select id="type" {...register('type')} className={selectClass}>
              <option value="">Select a type…</option>
              {INCIDENT_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            {errors.type && <p className={errorClass}>{errors.type.message}</p>}
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
            <label htmlFor="location_description" className={labelClass}>
              Location Description <span className="text-red-500">*</span>
            </label>
            <input
              id="location_description"
              type="text"
              {...register('location_description')}
              className={inputClass}
              placeholder="e.g. Warehouse, loading bay 3"
            />
            {errors.location_description && <p className={errorClass}>{errors.location_description.message}</p>}
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

          {/* Persons Involved */}
          <div className="space-y-1">
            <label htmlFor="persons_involved" className={labelClass}>Persons Involved</label>
            <textarea
              id="persons_involved"
              {...register('persons_involved')}
              rows={3}
              className={inputClass}
              placeholder="Names and roles of persons involved…"
            />
          </div>

          {/* Immediate Actions */}
          <div className="space-y-1">
            <label htmlFor="immediate_actions" className={labelClass}>Immediate Actions Taken</label>
            <textarea
              id="immediate_actions"
              {...register('immediate_actions')}
              rows={3}
              className={inputClass}
              placeholder="What actions were taken immediately after the incident?…"
            />
          </div>

          {/* RIDDOR Reportable */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <input
                id="riddor_reportable"
                type="checkbox"
                {...register('riddor_reportable')}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="riddor_reportable" className="text-sm font-medium text-slate-700">
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
                  <label htmlFor="riddor_reported_date" className={labelClass}>Date Reported to HSE</label>
                  <input id="riddor_reported_date" type="date" {...register('riddor_reported_date')} className={inputClass} />
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
              className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-60"
            >
              {isSubmitting ? 'Saving…' : 'Report Incident'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
