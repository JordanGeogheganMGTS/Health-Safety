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
  site_id: z.string().uuid('Please select a site'),
  drill_date: z.string().min(1, 'Drill date is required'),
  drill_time: z.string().optional(),
  evacuation_time_secs: z.coerce.number().int().min(0).optional().or(z.literal('')),
  total_occupants: z.coerce.number().int().min(0).optional().or(z.literal('')),
  all_accounted_for: z.boolean(),
  issues_found: z.string().optional(),
  actions_arising: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface Site { id: string; name: string }

// ─── Helper ───────────────────────────────────────────────────────────────────

function futureDateStr(daysFromNow: number): string {
  const d = new Date()
  d.setDate(d.getDate() + daysFromNow)
  return d.toISOString().split('T')[0]
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function NewDrillPage() {
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
      drill_date: today,
      all_accounted_for: true,
    },
  })

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

    const selectedSite = sites.find((s) => s.id === values.site_id)
    const siteName = selectedSite?.name ?? 'Unknown Site'

    // Build drill row
    const drillRow: Record<string, unknown> = {
      site_id: values.site_id,
      drill_date: values.drill_date,
      drill_time: values.drill_time || null,
      evacuation_time_secs: values.evacuation_time_secs !== '' && values.evacuation_time_secs != null
        ? Number(values.evacuation_time_secs)
        : null,
      total_occupants: values.total_occupants !== '' && values.total_occupants != null
        ? Number(values.total_occupants)
        : null,
      all_accounted_for: values.all_accounted_for,
      issues_found: values.issues_found || null,
      actions_arising: values.actions_arising || null,
      conducted_by_id: user.id,
    }

    // If issues found, create a corrective action
    if (values.issues_found) {
      const { data: caData, error: caError } = await supabase
        .from('corrective_actions')
        .insert({
          title: `Fire Drill Issues: ${siteName}`,
          source_module: 'fire_drills',
          priority: 'Medium',
          site_id: values.site_id,
          due_date: futureDateStr(14),
          created_by_id: user.id,
          status: 'Open',
        })
        .select('id')
        .single()

      if (!caError && caData) {
        drillRow.ca_id = caData.id
      }
    }

    const { error: insertError } = await supabase.from('fire_drills').insert(drillRow)

    if (insertError) {
      setServerError(insertError.message)
      return
    }

    router.push('/fire-safety')
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
        <nav className="flex items-center gap-2 text-sm text-slate-500 mb-4">
          <a href="/fire-safety" className="hover:text-slate-700 hover:underline">Fire Safety</a>
          <span>/</span>
          <span className="font-medium text-slate-800">Log Fire Drill</span>
        </nav>
        <h1 className="text-2xl font-semibold text-slate-900">Log Fire Drill</h1>
        <p className="mt-1 text-sm text-slate-500">Record the details of an evacuation drill.</p>
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

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label htmlFor="drill_date" className={labelClass}>
                Drill Date <span className="text-red-500">*</span>
              </label>
              <input id="drill_date" type="date" {...register('drill_date')} className={inputClass} />
              {errors.drill_date && <p className={errorClass}>{errors.drill_date.message}</p>}
            </div>
            <div className="space-y-1">
              <label htmlFor="drill_time" className={labelClass}>Drill Time</label>
              <input id="drill_time" type="time" {...register('drill_time')} className={inputClass} />
            </div>
          </div>

          {/* Evacuation Time & Occupants */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label htmlFor="evacuation_time_secs" className={labelClass}>Evacuation Time (seconds)</label>
              <input
                id="evacuation_time_secs"
                type="number"
                min={0}
                {...register('evacuation_time_secs')}
                className={inputClass}
                placeholder="e.g. 180"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="total_occupants" className={labelClass}>Total Occupants</label>
              <input
                id="total_occupants"
                type="number"
                min={0}
                {...register('total_occupants')}
                className={inputClass}
                placeholder="e.g. 45"
              />
            </div>
          </div>

          {/* All Accounted For */}
          <div className="flex items-center gap-3">
            <input
              id="all_accounted_for"
              type="checkbox"
              {...register('all_accounted_for')}
              className="h-4 w-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
            />
            <label htmlFor="all_accounted_for" className="text-sm font-medium text-slate-700">
              All occupants accounted for
            </label>
          </div>

          {/* Issues Found */}
          <div className="space-y-1">
            <label htmlFor="issues_found" className={labelClass}>Issues Found</label>
            <textarea
              id="issues_found"
              {...register('issues_found')}
              rows={3}
              className={inputClass}
              placeholder="Describe any issues identified during the drill…"
            />
            <p className="text-xs text-slate-400">If issues are noted, a corrective action will be automatically created.</p>
          </div>

          {/* Actions Arising */}
          <div className="space-y-1">
            <label htmlFor="actions_arising" className={labelClass}>Actions Arising</label>
            <textarea
              id="actions_arising"
              {...register('actions_arising')}
              rows={3}
              className={inputClass}
              placeholder="Actions to be taken following this drill…"
            />
          </div>

          {/* Form Actions */}
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
              {isSubmitting ? 'Saving…' : 'Log Fire Drill'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
