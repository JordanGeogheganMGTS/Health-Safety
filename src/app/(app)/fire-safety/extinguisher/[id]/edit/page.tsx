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
  type_id: z.string().uuid('Please select a type'),
  size_id: z.string().optional(),
  serial_number: z.string().optional(),
  manufacture_date: z.string().optional(),
  next_inspection_date: z.string().min(1, 'Next inspection date is required'),
  status_id: z.string().uuid('Please select a status'),
  notes: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface Site { id: string; name: string }
interface LookupOption { id: string; label: string }

interface PageProps {
  params: Promise<{ id: string }>
}

export default function EditExtinguisherPage({ params }: PageProps) {
  const router = useRouter()
  const supabase = createClient()

  const [extId, setExtId] = useState<string | null>(null)
  const [sites, setSites] = useState<Site[]>([])
  const [extTypes, setExtTypes] = useState<LookupOption[]>([])
  const [extSizes, setExtSizes] = useState<LookupOption[]>([])
  const [extStatuses, setExtStatuses] = useState<LookupOption[]>([])
  const [loadingOptions, setLoadingOptions] = useState(true)
  const [notFound, setNotFound] = useState(false)
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
      setExtId(id)

      const { data: cats } = await supabase
        .from('lookup_categories')
        .select('id, key')
        .in('key', ['extinguisher_type', 'extinguisher_status', 'extinguisher_size'])

      const typeCatId = cats?.find((c) => c.key === 'extinguisher_type')?.id
      const statusCatId = cats?.find((c) => c.key === 'extinguisher_status')?.id
      const sizeCatId = cats?.find((c) => c.key === 'extinguisher_size')?.id

      const [{ data: sitesData }, { data: typesData }, { data: sizesData }, { data: statusesData }, { data: extData, error: extError }] =
        await Promise.all([
          supabase.from('sites').select('id, name').order('name'),
          typeCatId
            ? supabase.from('lookup_values').select('id, label').eq('category_id', typeCatId).order('sort_order')
            : Promise.resolve({ data: [] }),
          sizeCatId
            ? supabase.from('lookup_values').select('id, label').eq('category_id', sizeCatId).order('sort_order')
            : Promise.resolve({ data: [] }),
          statusCatId
            ? supabase.from('lookup_values').select('id, label').eq('category_id', statusCatId).order('sort_order')
            : Promise.resolve({ data: [] }),
          supabase
            .from('fire_extinguishers')
            .select('site_id, location, type_id, size_id, serial_number, manufacture_date, next_inspection_date, status_id, notes')
            .eq('id', id)
            .single(),
        ])

      setSites(sitesData ?? [])
      setExtTypes((typesData ?? []) as LookupOption[])
      setExtSizes((sizesData ?? []) as LookupOption[])
      setExtStatuses((statusesData ?? []) as LookupOption[])

      if (extError || !extData) {
        setNotFound(true)
        setLoadingOptions(false)
        return
      }

      const ext = extData as unknown as {
        site_id: string; location: string; type_id: string; size_id: string | null
        serial_number: string | null; manufacture_date: string | null
        next_inspection_date: string | null; status_id: string; notes: string | null
      }

      reset({
        site_id: ext.site_id,
        location: ext.location,
        type_id: ext.type_id,
        size_id: ext.size_id ?? '',
        serial_number: ext.serial_number ?? '',
        manufacture_date: ext.manufacture_date ?? '',
        next_inspection_date: ext.next_inspection_date ?? '',
        status_id: ext.status_id,
        notes: ext.notes ?? '',
      })

      setLoadingOptions(false)
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function onSubmit(values: FormValues) {
    if (!extId) return
    setServerError(null)

    const { error } = await supabase
      .from('fire_extinguishers')
      .update({
        site_id: values.site_id,
        location: values.location,
        type_id: values.type_id,
        size_id: values.size_id || null,
        serial_number: values.serial_number || null,
        manufacture_date: values.manufacture_date || null,
        next_inspection_date: values.next_inspection_date,
        status_id: values.status_id,
        notes: values.notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', extId)

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

  if (notFound) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        Extinguisher not found.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <nav className="flex items-center gap-2 text-sm text-slate-500 mb-4">
          <a href="/fire-safety" className="hover:text-slate-700 hover:underline">Fire Safety</a>
          <span>/</span>
          <span className="font-medium text-slate-800">Edit Extinguisher</span>
        </nav>
        <h1 className="text-2xl font-semibold text-slate-900">Edit Fire Extinguisher</h1>
        <p className="mt-1 text-sm text-slate-500">Update the details for this extinguisher.</p>
      </div>

      <div className="max-w-2xl">
        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          {loadingOptions && (
            <div className="space-y-4 animate-pulse">
              {[...Array(6)].map((_, i) => <div key={i} className="h-10 rounded-lg bg-slate-100" />)}
            </div>
          )}

          {!loadingOptions && (
            <>
              {serverError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {serverError}
                </div>
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

              {/* Location */}
              <div className="space-y-1">
                <label htmlFor="location" className={labelClass}>Location <span className="text-red-500">*</span></label>
                <input id="location" type="text" {...register('location')} className={inputClass} placeholder="e.g. Reception, near main entrance" />
                {errors.location && <p className={errorClass}>{errors.location.message}</p>}
              </div>

              {/* Type */}
              <div className="space-y-1">
                <label htmlFor="type_id" className={labelClass}>Type <span className="text-red-500">*</span></label>
                <select id="type_id" {...register('type_id')} className={selectClass}>
                  <option value="">Select a type…</option>
                  {extTypes.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
                {errors.type_id && <p className={errorClass}>{errors.type_id.message}</p>}
              </div>

              {/* Size */}
              <div className="space-y-1">
                <label htmlFor="size_id" className={labelClass}>Size</label>
                <select id="size_id" {...register('size_id')} className={selectClass}>
                  <option value="">Select a size…</option>
                  {extSizes.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </div>

              {/* Serial Number & Manufacture Date */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label htmlFor="serial_number" className={labelClass}>Serial Number</label>
                  <input id="serial_number" type="text" {...register('serial_number')} className={inputClass} />
                </div>
                <div className="space-y-1">
                  <label htmlFor="manufacture_date" className={labelClass}>Manufacture Date</label>
                  <input id="manufacture_date" type="date" {...register('manufacture_date')} className={inputClass} />
                </div>
              </div>

              {/* Next Inspection Date */}
              <div className="space-y-1">
                <label htmlFor="next_inspection_date" className={labelClass}>
                  Next Inspection Date <span className="text-red-500">*</span>
                </label>
                <input id="next_inspection_date" type="date" {...register('next_inspection_date')} className={inputClass} />
                {errors.next_inspection_date && <p className={errorClass}>{errors.next_inspection_date.message}</p>}
              </div>

              {/* Status */}
              <div className="space-y-1">
                <label htmlFor="status_id" className={labelClass}>Status <span className="text-red-500">*</span></label>
                <select id="status_id" {...register('status_id')} className={selectClass}>
                  <option value="">Select a status…</option>
                  {extStatuses.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
                {errors.status_id && <p className={errorClass}>{errors.status_id.message}</p>}
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
                  onClick={() => router.push('/fire-safety')}
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
            </>
          )}
        </form>
      </div>
    </div>
  )
}
