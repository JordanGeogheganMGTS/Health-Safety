'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'

const schema = z.object({
  site_id: z.string().uuid('Please select a site'),
  identifier: z.string().min(1, 'Identifier is required').max(100),
  location: z.string().optional(),
  fitting_type: z.string().optional(),
  is_active: z.boolean(),
  notes: z.string().optional(),
})

type FormValues = z.infer<typeof schema>
interface Site { id: string; name: string }

interface PageProps { params: Promise<{ id: string }> }

export default function EditEmergencyLightPage({ params }: PageProps) {
  const router = useRouter()
  const supabase = createClient()
  const [lightId, setLightId] = useState<string | null>(null)
  const [sites, setSites] = useState<Site[]>([])
  const [loading, setLoading] = useState(true)
  const [serverError, setServerError] = useState<string | null>(null)

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  useEffect(() => {
    async function load() {
      const { id } = await params
      setLightId(id)
      const [{ data: rec }, { data: sitesData }] = await Promise.all([
        supabase.from('emergency_lights').select('*').eq('id', id).single(),
        supabase.from('sites').select('id, name').order('name'),
      ])
      setSites(sitesData ?? [])
      if (rec) {
        reset({
          site_id: rec.site_id,
          identifier: rec.identifier,
          location: rec.location ?? '',
          fitting_type: rec.fitting_type ?? '',
          is_active: rec.is_active,
          notes: rec.notes ?? '',
        })
      }
      setLoading(false)
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function onSubmit(values: FormValues) {
    if (!lightId) return
    setServerError(null)
    const { error } = await supabase.from('emergency_lights').update({
      site_id: values.site_id,
      identifier: values.identifier,
      location: values.location || null,
      fitting_type: values.fitting_type || null,
      is_active: values.is_active,
      notes: values.notes || null,
    }).eq('id', lightId)
    if (error) { setServerError(error.message); return }
    router.push('/settings/emergency-lights')
  }

  const inputClass = 'block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500'
  const selectClass = 'block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500'
  const labelClass = 'block text-sm font-medium text-slate-700'
  const errorClass = 'text-xs text-red-600'

  if (loading) return <div className="flex items-center justify-center py-16"><p className="text-sm text-slate-500">Loading…</p></div>

  return (
    <div className="space-y-6">
      <div>
        <nav className="flex items-center gap-2 text-sm text-slate-500 mb-4">
          <a href="/settings/emergency-lights" className="hover:text-slate-700 hover:underline">Emergency Lights</a>
          <span>/</span>
          <span className="font-medium text-slate-800">Edit</span>
        </nav>
        <h1 className="text-2xl font-semibold text-slate-900">Edit Emergency Light</h1>
      </div>

      <div className="max-w-lg">
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          {serverError && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{serverError}</div>}

          <div className="space-y-1">
            <label htmlFor="site_id" className={labelClass}>Site <span className="text-red-500">*</span></label>
            <select id="site_id" {...register('site_id')} className={selectClass}>
              {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            {errors.site_id && <p className={errorClass}>{errors.site_id.message}</p>}
          </div>

          <div className="space-y-1">
            <label htmlFor="identifier" className={labelClass}>Identifier / Name <span className="text-red-500">*</span></label>
            <input id="identifier" type="text" {...register('identifier')} className={inputClass} />
            {errors.identifier && <p className={errorClass}>{errors.identifier.message}</p>}
          </div>

          <div className="space-y-1">
            <label htmlFor="location" className={labelClass}>Location</label>
            <input id="location" type="text" {...register('location')} className={inputClass} />
          </div>

          <div className="space-y-1">
            <label htmlFor="fitting_type" className={labelClass}>Fitting Type</label>
            <input id="fitting_type" type="text" {...register('fitting_type')} className={inputClass} />
          </div>

          <div className="space-y-1">
            <label htmlFor="notes" className={labelClass}>Notes</label>
            <textarea id="notes" {...register('notes')} rows={2} className={inputClass} />
          </div>

          <div className="flex items-center gap-3">
            <input id="is_active" type="checkbox" {...register('is_active')} className="h-4 w-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500" />
            <label htmlFor="is_active" className="text-sm font-medium text-slate-700">Active (appears on test forms)</label>
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
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
