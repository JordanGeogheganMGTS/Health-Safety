'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  site_id: z.string().uuid('Please select a site'),
  drill_date: z.string().min(1, 'Drill date is required'),
  drill_time: z.string().optional(),
  evacuation_time_secs: z.coerce.number().int().min(0).optional().or(z.literal('')),
  number_evacuated: z.coerce.number().int().min(0).optional().or(z.literal('')),
  issues_identified: z.string().optional(),
  notes: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface Site { id: string; name: string }

// ─── Component ────────────────────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ id: string }>
}

export default function EditDrillPage({ params }: PageProps) {
  const router = useRouter()
  const supabase = createClient()

  const [drillId, setDrillId] = useState<string | null>(null)
  const [sites, setSites] = useState<Site[]>([])
  const [loading, setLoading] = useState(true)
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  useEffect(() => {
    async function load() {
      const { id } = await params
      setDrillId(id)

      const [{ data: rec }, { data: sitesData }] = await Promise.all([
        supabase.from('fire_drills').select('*').eq('id', id).single(),
        supabase.from('sites').select('id, name').order('name'),
      ])

      setSites(sitesData ?? [])

      if (rec) {
        reset({
          site_id: rec.site_id ?? '',
          drill_date: rec.drill_date ?? '',
          drill_time: rec.drill_time ?? '',
          evacuation_time_secs: rec.evacuation_time_secs ?? '',
          number_evacuated: rec.number_evacuated ?? '',
          issues_identified: rec.issues_identified ?? '',
          notes: rec.notes ?? '',
        })
      }

      setLoading(false)
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function onSubmit(values: FormValues) {
    if (!drillId) return
    setServerError(null)

    const { error } = await supabase
      .from('fire_drills')
      .update({
        site_id: values.site_id,
        drill_date: values.drill_date,
        drill_time: values.drill_time || null,
        evacuation_time_secs: values.evacuation_time_secs !== '' && values.evacuation_time_secs != null
          ? Number(values.evacuation_time_secs) : null,
        number_evacuated: values.number_evacuated !== '' && values.number_evacuated != null
          ? Number(values.number_evacuated) : null,
        issues_identified: values.issues_identified || null,
        notes: values.notes || null,
      })
      .eq('id', drillId)

    if (error) { setServerError(error.message); return }
    router.push(`/fire-safety/drill/${drillId}`)
  }

  const inputClass = 'block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500'
  const selectClass = 'block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 disabled:opacity-50'
  const labelClass = 'block text-sm font-medium text-slate-700'
  const errorClass = 'text-xs text-red-600'

  if (loading) return <div className="flex items-center justify-center py-16"><p className="text-sm text-slate-500">Loading…</p></div>

  return (
    <div className="space-y-6">
      <div>
        <nav className="flex items-center gap-2 text-sm text-slate-500 mb-4">
          <a href="/fire-safety" className="hover:text-slate-700 hover:underline">Fire Safety</a>
          <span>/</span>
          <a href={`/fire-safety/drill/${drillId}`} className="hover:text-slate-700 hover:underline">Fire Drill</a>
          <span>/</span>
          <span className="font-medium text-slate-800">Edit</span>
        </nav>
        <h1 className="text-2xl font-semibold text-slate-900">Edit Fire Drill</h1>
      </div>

      <div className="max-w-2xl">
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          {serverError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{serverError}</div>
          )}

          {/* Site */}
          <div className="space-y-1">
            <label htmlFor="site_id" className={labelClass}>Site <span className="text-red-500">*</span></label>
            <select id="site_id" {...register('site_id')} className={selectClass}>
              <option value="">Select a site…</option>
              {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            {errors.site_id && <p className={errorClass}>{errors.site_id.message}</p>}
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label htmlFor="drill_date" className={labelClass}>Drill Date <span className="text-red-500">*</span></label>
              <input id="drill_date" type="date" {...register('drill_date')} className={inputClass} />
              {errors.drill_date && <p className={errorClass}>{errors.drill_date.message}</p>}
            </div>
            <div className="space-y-1">
              <label htmlFor="drill_time" className={labelClass}>Drill Time</label>
              <input id="drill_time" type="time" {...register('drill_time')} className={inputClass} />
            </div>
          </div>

          {/* Evacuation Time & Number Evacuated */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label htmlFor="evacuation_time_secs" className={labelClass}>Evacuation Time (seconds)</label>
              <input id="evacuation_time_secs" type="number" min={0} {...register('evacuation_time_secs')} className={inputClass} placeholder="e.g. 180" />
            </div>
            <div className="space-y-1">
              <label htmlFor="number_evacuated" className={labelClass}>Number Evacuated</label>
              <input id="number_evacuated" type="number" min={0} {...register('number_evacuated')} className={inputClass} placeholder="e.g. 45" />
            </div>
          </div>

          {/* Issues Identified */}
          <div className="space-y-1">
            <label htmlFor="issues_identified" className={labelClass}>Issues Identified</label>
            <textarea id="issues_identified" {...register('issues_identified')} rows={3} className={inputClass} />
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <label htmlFor="notes" className={labelClass}>Notes</label>
            <textarea id="notes" {...register('notes')} rows={3} className={inputClass} />
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
            <button type="button" onClick={() => router.back()} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="rounded-lg bg-orange-500 px-5 py-2 text-sm font-medium text-white hover:bg-orange-600 transition-colors disabled:opacity-60">
              {isSubmitting ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
