'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'

const schema = z.object({
  product_name: z.string().min(1, 'Product name is required'),
  site_id: z.string().min(1, 'Site is required'),
  supplier: z.string().optional(),
  product_reference: z.string().optional(),
  cas_number: z.string().optional(),
  location_of_use: z.string().optional(),
  description_of_use: z.string().optional(),
  quantity_used: z.string().optional(),
  frequency_of_use: z.string().optional(),
  is_flammable: z.boolean().default(false),
  is_oxidising: z.boolean().default(false),
  is_toxic: z.boolean().default(false),
  is_corrosive: z.boolean().default(false),
  is_irritant: z.boolean().default(false),
  is_harmful: z.boolean().default(false),
  is_carcinogenic: z.boolean().default(false),
  is_sensitiser: z.boolean().default(false),
  other_hazards: z.string().optional(),
  exposure_inhalation: z.boolean().default(false),
  exposure_skin: z.boolean().default(false),
  exposure_ingestion: z.boolean().default(false),
  exposure_eyes: z.boolean().default(false),
  engineering_controls: z.string().optional(),
  ppe_required: z.string().optional(),
  storage_requirements: z.string().optional(),
  disposal_method: z.string().optional(),
  first_aid_measures: z.string().optional(),
  spillage_procedure: z.string().optional(),
  sds_url: z.string().url('Please enter a valid URL (starting with https://)').min(1, 'Safety data sheet URL is required'),
  assessed_by: z.string().min(1, 'Assessor is required'),
  assessment_date: z.string().min(1, 'Assessment date is required'),
  review_due_date: z.string().min(1, 'Review date is required'),
})

type FormValues = z.infer<typeof schema>

interface Site { id: string; name: string }
interface User { id: string; first_name: string; last_name: string }

function todayISO() {
  return new Date().toISOString().split('T')[0]
}

function plus12Months() {
  const d = new Date()
  d.setFullYear(d.getFullYear() + 1)
  return d.toISOString().split('T')[0]
}

export default function NewCoshhPage() {
  const router = useRouter()
  const supabase = createClient()

  const [sites, setSites] = useState<Site[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      assessment_date: todayISO(),
      review_due_date: plus12Months(),
      is_flammable: false,
      is_oxidising: false,
      is_toxic: false,
      is_corrosive: false,
      is_irritant: false,
      is_harmful: false,
      is_carcinogenic: false,
      is_sensitiser: false,
      exposure_inhalation: false,
      exposure_skin: false,
      exposure_ingestion: false,
      exposure_eyes: false,
    },
  })

  useEffect(() => {
    async function load() {
      const [siteRes, userRes] = await Promise.all([
        supabase.from('sites').select('id, name').order('name'),
        supabase.from('users').select('id, first_name, last_name').eq('is_active', true).order('first_name'),
      ])
      setSites((siteRes.data ?? []) as unknown as Site[])
      setUsers((userRes.data ?? []) as unknown as User[])
    }
    load()
  }, [])

  async function onSubmit(values: FormValues) {
    setSubmitting(true)
    setServerError(null)

    const { data, error } = await supabase
      .from('coshh_assessments')
      .insert({
        product_name: values.product_name,
        site_id: values.site_id,
        supplier: values.supplier || null,
        product_reference: values.product_reference || null,
        cas_number: values.cas_number || null,
        location_of_use: values.location_of_use || null,
        description_of_use: values.description_of_use || null,
        quantity_used: values.quantity_used || null,
        frequency_of_use: values.frequency_of_use || null,
        is_flammable: values.is_flammable,
        is_oxidising: values.is_oxidising,
        is_toxic: values.is_toxic,
        is_corrosive: values.is_corrosive,
        is_irritant: values.is_irritant,
        is_harmful: values.is_harmful,
        is_carcinogenic: values.is_carcinogenic,
        is_sensitiser: values.is_sensitiser,
        other_hazards: values.other_hazards || null,
        exposure_inhalation: values.exposure_inhalation,
        exposure_skin: values.exposure_skin,
        exposure_ingestion: values.exposure_ingestion,
        exposure_eyes: values.exposure_eyes,
        engineering_controls: values.engineering_controls || null,
        ppe_required: values.ppe_required || null,
        storage_requirements: values.storage_requirements || null,
        disposal_method: values.disposal_method || null,
        first_aid_measures: values.first_aid_measures || null,
        spillage_procedure: values.spillage_procedure || null,
        sds_url: values.sds_url,
        assessed_by: values.assessed_by,
        assessment_date: values.assessment_date,
        review_due_date: values.review_due_date,
        status: 'Draft',
      })
      .select('id')
      .single()

    if (error) {
      setServerError(error.message)
      setSubmitting(false)
      return
    }

    router.push(`/coshh/${data.id}`)
  }

  const inputCls = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500'
  const selectCls = `${inputCls} bg-white`
  const textareaCls = `${inputCls} resize-none`
  const checkboxLabelCls = 'flex items-center gap-2 text-sm text-slate-700'

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
          <a href="/coshh" className="hover:text-orange-600 transition-colors">COSHH Assessments</a>
          <span>/</span>
          <span>New</span>
        </div>
        <h1 className="text-2xl font-semibold text-slate-900">New COSHH Assessment</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {serverError && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            {serverError}
          </div>
        )}

        {/* Product Information */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-semibold text-slate-700 border-b border-slate-100 pb-3">Product Information</h2>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Product Name <span className="text-red-500">*</span></label>
            <input {...register('product_name')} className={inputCls} placeholder="e.g. White Spirit" />
            {errors.product_name && <p className="mt-1 text-xs text-red-600">{errors.product_name.message}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Site <span className="text-red-500">*</span></label>
              <select {...register('site_id')} className={selectCls}>
                <option value="">Select site…</option>
                {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              {errors.site_id && <p className="mt-1 text-xs text-red-600">{errors.site_id.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Supplier</label>
              <input {...register('supplier')} className={inputCls} placeholder="Manufacturer or supplier name" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Product Reference</label>
              <input {...register('product_reference')} className={inputCls} placeholder="Product code or ref" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">CAS Number</label>
              <input {...register('cas_number')} className={inputCls} placeholder="e.g. 64-17-5" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Location of Use</label>
              <input {...register('location_of_use')} className={inputCls} placeholder="e.g. Workshop, Store room" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Frequency of Use</label>
              <input {...register('frequency_of_use')} className={inputCls} placeholder="e.g. Daily, Weekly" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Quantity Used</label>
              <input {...register('quantity_used')} className={inputCls} placeholder="e.g. 500ml per use" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description of Use</label>
            <textarea {...register('description_of_use')} rows={2} className={textareaCls} placeholder="How the product is used…" />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Safety Data Sheet URL <span className="text-red-500">*</span>
            </label>
            <input
              {...register('sds_url')}
              type="url"
              className={inputCls}
              placeholder="https://supplier.com/sds/product.pdf"
            />
            {errors.sds_url && <p className="mt-1 text-xs text-red-600">{errors.sds_url.message}</p>}
            <p className="mt-1 text-xs text-slate-400">Link to the supplier&apos;s online safety data sheet</p>
          </div>
        </div>

        {/* Hazard Information */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-semibold text-slate-700 border-b border-slate-100 pb-3">Hazard Information</h2>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Hazard Classifications</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {([
                ['is_flammable', 'Flammable'],
                ['is_oxidising', 'Oxidising'],
                ['is_toxic', 'Toxic'],
                ['is_corrosive', 'Corrosive'],
                ['is_irritant', 'Irritant'],
                ['is_harmful', 'Harmful'],
                ['is_carcinogenic', 'Carcinogenic'],
                ['is_sensitiser', 'Sensitiser'],
              ] as const).map(([field, label]) => (
                <label key={field} className={checkboxLabelCls}>
                  <input {...register(field)} type="checkbox" className="h-4 w-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500" />
                  {label}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Exposure Routes</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {([
                ['exposure_inhalation', 'Inhalation'],
                ['exposure_skin', 'Skin Contact'],
                ['exposure_ingestion', 'Ingestion'],
                ['exposure_eyes', 'Eyes'],
              ] as const).map(([field, label]) => (
                <label key={field} className={checkboxLabelCls}>
                  <input {...register(field)} type="checkbox" className="h-4 w-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500" />
                  {label}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Other Hazards</label>
            <textarea {...register('other_hazards')} rows={2} className={textareaCls} placeholder="Any other hazard information…" />
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-semibold text-slate-700 border-b border-slate-100 pb-3">Controls</h2>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Engineering Controls</label>
            <textarea {...register('engineering_controls')} rows={3} className={textareaCls} placeholder="Ventilation, enclosure, LEV, etc…" />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">PPE Required</label>
            <textarea {...register('ppe_required')} rows={2} className={textareaCls} placeholder="Personal protective equipment required…" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Storage Requirements</label>
              <textarea {...register('storage_requirements')} rows={2} className={textareaCls} placeholder="How and where should this be stored…" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Disposal Method</label>
              <textarea {...register('disposal_method')} rows={2} className={textareaCls} placeholder="Safe disposal instructions…" />
            </div>
          </div>
        </div>

        {/* Emergency Information */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-semibold text-slate-700 border-b border-slate-100 pb-3">Emergency Information</h2>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">First Aid Measures</label>
            <textarea {...register('first_aid_measures')} rows={3} className={textareaCls} placeholder="Steps to take in case of exposure…" />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Spillage Procedure</label>
            <textarea {...register('spillage_procedure')} rows={3} className={textareaCls} placeholder="Actions in case of spill…" />
          </div>
        </div>

        {/* Assessment Details */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-semibold text-slate-700 border-b border-slate-100 pb-3">Assessment Details</h2>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Assessor <span className="text-red-500">*</span></label>
            <select {...register('assessed_by')} className={selectCls}>
              <option value="">Select assessor…</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>)}
            </select>
            {errors.assessed_by && <p className="mt-1 text-xs text-red-600">{errors.assessed_by.message}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Assessment Date <span className="text-red-500">*</span></label>
              <input {...register('assessment_date')} type="date" className={inputCls} />
              {errors.assessment_date && <p className="mt-1 text-xs text-red-600">{errors.assessment_date.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Review Due Date <span className="text-red-500">*</span></label>
              <input {...register('review_due_date')} type="date" className={inputCls} />
              {errors.review_due_date && <p className="mt-1 text-xs text-red-600">{errors.review_due_date.message}</p>}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-orange-500 px-5 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? 'Creating…' : 'Create Assessment'}
          </button>
          <a href="/coshh" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">
            Cancel
          </a>
        </div>
      </form>
    </div>
  )
}
