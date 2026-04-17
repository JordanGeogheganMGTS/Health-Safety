'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  site_id: z.string().uuid('Please select a site'),
  location: z.string().optional(),
  serial_number: z.string().optional(),
  asset_tag: z.string().optional(),
  manufacturer: z.string().optional(),
  model: z.string().optional(),
  purchase_date: z.string().optional(),
  service_interval_months: z.coerce.number().int().min(1, 'Must be at least 1 month'),
  status: z.enum(['Operational', 'Out of Service', 'Awaiting Service', 'Decommissioned']),
  responsible_person_id: z.string().optional(),
  notes: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

// ─── Types ────────────────────────────────────────────────────────────────────

interface Site { id: string; name: string }
interface UserOption { id: string; first_name: string; last_name: string }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function computeNextServiceDue(purchaseDate: string | undefined, intervalMonths: number): string {
  const base = purchaseDate ? new Date(purchaseDate) : new Date()
  base.setMonth(base.getMonth() + intervalMonths)
  return base.toISOString().split('T')[0]
}

// ─── Component ────────────────────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ id: string }>
}

export default function EditEquipmentPage({ params }: PageProps) {
  const router = useRouter()
  const supabase = createClient()

  const [equipmentId, setEquipmentId] = useState<string | null>(null)
  const [sites, setSites] = useState<Site[]>([])
  const [users, setUsers] = useState<UserOption[]>([])
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

  const purchaseDateWatched = useWatch({ control, name: 'purchase_date' })
  const intervalWatched = useWatch({ control, name: 'service_interval_months' })
  const computedNextDue = computeNextServiceDue(purchaseDateWatched, Number(intervalWatched) || 12)

  useEffect(() => {
    async function load() {
      const { id } = await params
      setEquipmentId(id)

      const [{ data: eq }, { data: sitesData }, { data: usersData }] = await Promise.all([
        supabase.from('equipment').select('*').eq('id', id).single(),
        supabase.from('sites').select('id, name').order('name'),
        supabase.from('users').select('id, first_name, last_name').eq('is_active', true).order('last_name'),
      ])

      setSites(sitesData ?? [])
      setUsers(usersData ?? [])

      if (eq) {
        reset({
          name: eq.name ?? '',
          description: eq.description ?? '',
          site_id: eq.site_id ?? '',
          location: eq.location ?? '',
          serial_number: eq.serial_number ?? '',
          asset_tag: eq.asset_tag ?? '',
          manufacturer: eq.manufacturer ?? '',
          model: eq.model ?? '',
          purchase_date: eq.purchase_date ?? '',
          service_interval_months: eq.service_interval_months ?? 12,
          status: eq.status ?? 'Operational',
          responsible_person_id: eq.responsible_person ?? '',
          notes: eq.notes ?? '',
        })
      }

      setLoading(false)
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function onSubmit(values: FormValues) {
    if (!equipmentId) return
    setServerError(null)

    const { error } = await supabase
      .from('equipment')
      .update({
        name: values.name,
        description: values.description || null,
        site_id: values.site_id,
        location: values.location || null,
        serial_number: values.serial_number || null,
        asset_tag: values.asset_tag || null,
        manufacturer: values.manufacturer || null,
        model: values.model || null,
        purchase_date: values.purchase_date || null,
        service_interval_months: values.service_interval_months,
        status: values.status,
        responsible_person: values.responsible_person_id || null,
        notes: values.notes || null,
        next_inspection_date: computedNextDue,
      })
      .eq('id', equipmentId)

    if (error) {
      setServerError(error.message)
      return
    }

    router.push(`/equipment/${equipmentId}`)
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
        <h1 className="text-2xl font-semibold text-slate-900">Edit Equipment</h1>
        <p className="mt-1 text-sm text-slate-500">Update the equipment record details.</p>
      </div>

      <div className="max-w-4xl">
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

          {/* Name */}
          <div className="space-y-1">
            <label htmlFor="name" className={labelClass}>
              Name <span className="text-red-500">*</span>
            </label>
            <input id="name" type="text" {...register('name')} className={inputClass} />
            {errors.name && <p className={errorClass}>{errors.name.message}</p>}
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label htmlFor="description" className={labelClass}>Description</label>
            <textarea id="description" {...register('description')} rows={3} className={inputClass} />
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
            <input id="location" type="text" {...register('location')} className={inputClass} />
          </div>

          {/* Serial Number & Asset Tag */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label htmlFor="serial_number" className={labelClass}>Serial Number</label>
              <input id="serial_number" type="text" {...register('serial_number')} className={inputClass} />
            </div>
            <div className="space-y-1">
              <label htmlFor="asset_tag" className={labelClass}>Asset Tag</label>
              <input id="asset_tag" type="text" {...register('asset_tag')} className={inputClass} />
            </div>
          </div>

          {/* Manufacturer & Model */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label htmlFor="manufacturer" className={labelClass}>Manufacturer</label>
              <input id="manufacturer" type="text" {...register('manufacturer')} className={inputClass} />
            </div>
            <div className="space-y-1">
              <label htmlFor="model" className={labelClass}>Model</label>
              <input id="model" type="text" {...register('model')} className={inputClass} />
            </div>
          </div>

          {/* Purchase Date */}
          <div className="space-y-1">
            <label htmlFor="purchase_date" className={labelClass}>Purchase Date</label>
            <input id="purchase_date" type="date" {...register('purchase_date')} className={inputClass} />
          </div>

          {/* Service Interval & Computed Next Due */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label htmlFor="service_interval_months" className={labelClass}>
                Service Interval (months) <span className="text-red-500">*</span>
              </label>
              <input
                id="service_interval_months"
                type="number"
                min={1}
                {...register('service_interval_months')}
                className={inputClass}
              />
              {errors.service_interval_months && (
                <p className={errorClass}>{errors.service_interval_months.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <label className={labelClass}>Next Service Due (computed)</label>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                {computedNextDue}
              </div>
              <p className="text-xs text-slate-400">Recalculated from purchase date + interval</p>
            </div>
          </div>

          {/* Status */}
          <div className="space-y-1">
            <label htmlFor="status" className={labelClass}>
              Status <span className="text-red-500">*</span>
            </label>
            <select id="status" {...register('status')} className={selectClass}>
              <option value="Operational">Operational</option>
              <option value="Out of Service">Out of Service</option>
              <option value="Awaiting Service">Awaiting Service</option>
              <option value="Decommissioned">Decommissioned</option>
            </select>
            {errors.status && <p className={errorClass}>{errors.status.message}</p>}
          </div>

          {/* Responsible Person */}
          <div className="space-y-1">
            <label htmlFor="responsible_person_id" className={labelClass}>Responsible Person</label>
            <select id="responsible_person_id" {...register('responsible_person_id')} className={selectClass}>
              <option value="">Select a person…</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <label htmlFor="notes" className={labelClass}>Notes</label>
            <textarea id="notes" {...register('notes')} rows={3} className={inputClass} />
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
