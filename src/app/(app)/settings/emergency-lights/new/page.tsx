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
  notes: z.string().optional(),
})

type FormValues = z.infer<typeof schema>
interface Site { id: string; name: string }

export default function NewEmergencyLightPage() {
  const router = useRouter()
  const supabase = createClient()
  const [sites, setSites] = useState<Site[]>([])
  const [serverError, setServerError] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  useEffect(() => {
    supabase.from('sites').select('id, name').order('name').then(({ data }) => setSites(data ?? []))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function onSubmit(values: FormValues) {
    setServerError(null)
    const { error } = await supabase.from('emergency_lights').insert({
      site_id: values.site_id,
      identifier: values.identifier,
      location: values.location || null,
      fitting_type: values.fitting_type || null,
      notes: values.notes || null,
      is_active: true,
    })
    if (error) { setServerError(error.message); return }
    router.push('/settings/emergency-lights')
  }

  const inputClass = 'block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500'
  const selectClass = 'block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500'
  const labelClass = 'block text-sm font-medium text-slate-700'
  const errorClass = 'text-xs text-red-600'

  return (
    <div className="space-y-6">
      <div>
        <nav className="flex items-center gap-2 text-sm text-slate-500 mb-4">
          <a href="/settings/emergency-lights" className="hover:text-slate-700 hover:underline">Emergency Lights</a>
          <span>/</span>
          <span className="font-medium text-slate-800">Add Light</span>
        </nav>
        <h1 className="text-2xl font-semibold text-slate-900">Add Emergency Light</h1>
        <p className="mt-1 text-sm text-slate-500">Register a new light fitting. It will automatically appear on test forms for the selected site.</p>
      </div>

      <div className="max-w-lg">
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          {serverError && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{serverError}</div>}

          <div className="space-y-1">
            <label htmlFor="site_id" className={labelClass}>Site <span className="text-red-500">*</span></label>
            <select id="site_id" {...register('site_id')} className={selectClass}>
              <option value="">Select a site…</option>
              {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            {errors.site_id && <p className={errorClass}>{errors.site_id.message}</p>}
          </div>

          <div className="space-y-1">
            <label htmlFor="identifier" className={labelClass}>Identifier / Name <span className="text-red-500">*</span></label>
            <input id="identifier" type="text" {...register('identifier')} className={inputClass} placeholder="e.g. EL-01, Exit Sign - Front Door" />
            <p className="text-xs text-slate-400">This is how the light will be labelled on test forms.</p>
            {errors.identifier && <p className={errorClass}>{errors.identifier.message}</p>}
          </div>

          <div className="space-y-1">
            <label htmlFor="location" className={labelClass}>Location</label>
            <input id="location" type="text" {...register('location')} className={inputClass} placeholder="e.g. Ground floor corridor, near fire exit" />
          </div>

          <div className="space-y-1">
            <label htmlFor="fitting_type" className={labelClass}>Fitting Type</label>
            <input id="fitting_type" type="text" {...register('fitting_type')} className={inputClass} placeholder="e.g. Exit Sign, Bulkhead, Downlight" />
          </div>

          <div className="space-y-1">
            <label htmlFor="notes" className={labelClass}>Notes</label>
            <textarea id="notes" {...register('notes')} rows={2} className={inputClass} />
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <button type="button" onClick={() => router.back()} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="rounded-lg bg-orange-500 px-5 py-2 text-sm font-medium text-white hover:bg-orange-600 transition-colors disabled:opacity-60">
              {isSubmitting ? 'Saving…' : 'Add Light'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
