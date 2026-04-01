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
  location: z.string().min(1, 'Location is required'),
  type: z.enum(['Water', 'Foam', 'CO2', 'Dry Powder', 'Wet Chemical', 'Halon']),
  capacity_kg_or_l: z.string().optional(),
  serial_number: z.string().optional(),
  install_date: z.string().optional(),
  next_inspection_due: z.string().min(1, 'Next inspection due date is required'),
  status: z.enum(['Operational', 'Condemned', 'Requires Attention']),
  notes: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface Site { id: string; name: string }

// ─── Component ────────────────────────────────────────────────────────────────

export default function NewExtinguisherPage() {
  const router = useRouter()
  const supabase = createClient()

  const [sites, setSites] = useState<Site[]>([])
  const [loadingOptions, setLoadingOptions] = useState(true)
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: 'CO2',
      status: 'Operational',
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

    const { error } = await supabase.from('fire_extinguishers').insert({
      site_id: values.site_id,
      location: values.location,
      type: values.type,
      capacity_kg_or_l: values.capacity_kg_or_l || null,
      serial_number: values.serial_number || null,
      install_date: values.install_date || null,
      next_inspection_due: values.next_inspection_due,
      status: values.status,
      notes: values.notes || null,
    })

    if (error) {
      setServerError(error.message)
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
          <span className="font-medium text-slate-800">Add Extinguisher</span>
        </nav>
        <h1 className="text-2xl font-semibold text-slate-900">Add Fire Extinguisher</h1>
        <p className="mt-1 text-sm text-slate-500">Register a new fire extinguisher in the system.</p>
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

          {/* Location */}
          <div className="space-y-1">
            <label htmlFor="location" className={labelClass}>
              Location <span className="text-red-500">*</span>
            </label>
            <input id="location" type="text" {...register('location')} className={inputClass} placeholder="e.g. Reception, near main entrance" />
            {errors.location && <p className={errorClass}>{errors.location.message}</p>}
          </div>

          {/* Type */}
          <div className="space-y-1">
            <label htmlFor="type" className={labelClass}>
              Type <span className="text-red-500">*</span>
            </label>
            <select id="type" {...register('type')} className={selectClass}>
              <option value="Water">Water</option>
              <option value="Foam">Foam</option>
              <option value="CO2">CO2</option>
              <option value="Dry Powder">Dry Powder</option>
              <option value="Wet Chemical">Wet Chemical</option>
              <option value="Halon">Halon</option>
            </select>
            {errors.type && <p className={errorClass}>{errors.type.message}</p>}
          </div>

          {/* Capacity & Serial Number */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label htmlFor="capacity_kg_or_l" className={labelClass}>Capacity (kg/L)</label>
              <input id="capacity_kg_or_l" type="text" {...register('capacity_kg_or_l')} className={inputClass} placeholder="e.g. 2kg" />
            </div>
            <div className="space-y-1">
              <label htmlFor="serial_number" className={labelClass}>Serial Number</label>
              <input id="serial_number" type="text" {...register('serial_number')} className={inputClass} />
            </div>
          </div>

          {/* Install Date */}
          <div className="space-y-1">
            <label htmlFor="install_date" className={labelClass}>Install Date</label>
            <input id="install_date" type="date" {...register('install_date')} className={inputClass} />
          </div>

          {/* Next Inspection Due */}
          <div className="space-y-1">
            <label htmlFor="next_inspection_due" className={labelClass}>
              Next Inspection Due <span className="text-red-500">*</span>
            </label>
            <input id="next_inspection_due" type="date" {...register('next_inspection_due')} className={inputClass} />
            {errors.next_inspection_due && <p className={errorClass}>{errors.next_inspection_due.message}</p>}
          </div>

          {/* Status */}
          <div className="space-y-1">
            <label htmlFor="status" className={labelClass}>
              Status <span className="text-red-500">*</span>
            </label>
            <select id="status" {...register('status')} className={selectClass}>
              <option value="Operational">Operational</option>
              <option value="Condemned">Condemned</option>
              <option value="Requires Attention">Requires Attention</option>
            </select>
            {errors.status && <p className={errorClass}>{errors.status.message}</p>}
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <label htmlFor="notes" className={labelClass}>Notes</label>
            <textarea id="notes" {...register('notes')} rows={3} className={inputClass} placeholder="Optional notes…" />
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
              {isSubmitting ? 'Saving…' : 'Add Extinguisher'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
