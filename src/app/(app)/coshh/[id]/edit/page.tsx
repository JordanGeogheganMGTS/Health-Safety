'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { uploadFile } from '@/lib/storage'

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
  assessed_by: z.string().min(1, 'Assessor is required'),
  assessment_date: z.string().min(1, 'Assessment date is required'),
  review_due_date: z.string().min(1, 'Review date is required'),
  status: z.enum(['Draft', 'Active', 'Under Review', 'Superseded', 'Archived']),
})

type FormValues = z.infer<typeof schema>

interface Site { id: string; name: string }
interface User { id: string; first_name: string; last_name: string }

export default function EditCoshhPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const supabase = createClient()

  const [sites, setSites] = useState<Site[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [sdsFile, setSdsFile] = useState<File | null>(null)
  const [existingSdsPath, setExistingSdsPath] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  useEffect(() => {
    async function load() {
      const [caRes, siteRes, userRes] = await Promise.all([
        supabase
          .from('coshh_assessments')
          .select('*')
          .eq('id', params.id)
          .single(),
        supabase.from('sites').select('id, name').order('name'),
        supabase.from('users').select('id, first_name, last_name').eq('is_active', true).order('first_name'),
      ])

      setSites((siteRes.data ?? []) as unknown as Site[])
      setUsers((userRes.data ?? []) as unknown as User[])

      if (caRes.data) {
        const d = caRes.data
        setExistingSdsPath(d.sds_file_path ?? null)
        reset({
          product_name: d.product_name,
          site_id: d.site_id ?? '',
          supplier: d.supplier ?? '',
          product_reference: d.product_reference ?? '',
          cas_number: d.cas_number ?? '',
          location_of_use: d.location_of_use ?? '',
          description_of_use: d.description_of_use ?? '',
          quantity_used: d.quantity_used ?? '',
          frequency_of_use: d.frequency_of_use ?? '',
          is_flammable: d.is_flammable ?? false,
          is_oxidising: d.is_oxidising ?? false,
          is_toxic: d.is_toxic ?? false,
          is_corrosive: d.is_corrosive ?? false,
          is_irritant: d.is_irritant ?? false,
          is_harmful: d.is_harmful ?? false,
          is_carcinogenic: d.is_carcinogenic ?? false,
          is_sensitiser: d.is_sensitiser ?? false,
          other_hazards: d.other_hazards ?? '',
          exposure_inhalation: d.exposure_inhalation ?? false,
          exposure_skin: d.exposure_skin ?? false,
          exposure_ingestion: d.exposure_ingestion ?? false,
          exposure_eyes: d.exposure_eyes ?? false,
          engineering_controls: d.engineering_controls ?? '',
          ppe_required: d.ppe_required ?? '',
          storage_requirements: d.storage_requirements ?? '',
          disposal_method: d.disposal_method ?? '',
          first_aid_measures: d.first_aid_measures ?? '',
          spillage_procedure: d.spillage_procedure ?? '',
          assessed_by: d.assessed_by ?? '',
          assessment_date: d.assessment_date ? d.assessment_date.split('T')[0] : '',
          review_due_date: d.review_due_date ? d.review_due_date.split('T')[0] : '',
          status: d.status as FormValues['status'],
        })
      }
      setLoading(false)
    }
    load()
  }, [params.id])

  async function onSubmit(values: FormValues) {
    setSubmitting(true)
    setServerError(null)

    let sdsFilePath = existingSdsPath
    let sdsFileName = null

    if (sdsFile) {
      const { key, error: uploadError } = await uploadFile(`coshh/${params.id}/sds`, sdsFile)
      if (uploadError) {
        setServerError(`File upload failed: ${uploadError}`)
        setSubmitting(false)
        return
      }
      sdsFilePath = key
      sdsFileName = sdsFile.name
    }

    const { error } = await supabase
      .from('coshh_assessments')
      .update({
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
        sds_file_path: sdsFilePath,
        sds_file_name: sdsFileName,
        assessed_by: values.assessed_by,
        assessment_date: values.assessment_date,
        review_due_date: values.review_due_date,
        status: values.status,
      })
      .eq('id', params.id)

    if (error) {
      setServerError(error.message)
      setSubmitting(false)
      return
    }

    router.push(`/coshh/${params.id}`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    )
  }

  const inputCls = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500'
  const selectCls = `${inputCls} bg-white`
  const textareaCls = `${inputCls} resize-none`
  const checkboxLabelCls = 'flex items-center gap-2 text-sm text-slate-700'

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
          <a href="/coshh" className="hover:text-orange-600 transition-colors">COSHH Assessments</a>
          <span>/</span>
          <a href={`/coshh/${params.id}`} className="hover:text-orange-600 transition-colors">Assessment</a>
          <span>/</span>
          <span>Edit</span>
        </div>
        <h1 className="text-2xl font-semibold text-slate-900">Edit COSHH Assessment</h1>
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
            <input {...register('product_name')} className={inputCls} />
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
              <input {...register('supplier')} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Product Reference</label>
              <input {...register('product_reference')} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">CAS Number</label>
              <input {...register('cas_number')} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Location of Use</label>
              <input {...register('location_of_use')} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Frequency of Use</label>
              <input {...register('frequency_of_use')} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Quantity Used</label>
              <input {...register('quantity_used')} className={inputCls} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description of Use</label>
            <textarea {...register('description_of_use')} rows={2} className={textareaCls} />
          </div>

          {/* SDS File Upload */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Safety Data Sheet (PDF)
              {existingSdsPath && <span className="ml-2 text-xs text-green-600 font-normal">SDS on file</span>}
            </label>
            <input
              type="file"
              accept=".pdf"
              onChange={(e) => setSdsFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100 cursor-pointer"
            />
            {sdsFile && (
              <p className="mt-1 text-xs text-slate-500">Selected: {sdsFile.name}</p>
            )}
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
            <textarea {...register('other_hazards')} rows={2} className={textareaCls} />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
            <select {...register('status')} className={selectCls}>
              {['Draft', 'Active', 'Under Review', 'Superseded', 'Archived'].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-semibold text-slate-700 border-b border-slate-100 pb-3">Controls</h2>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Engineering Controls</label>
            <textarea {...register('engineering_controls')} rows={3} className={textareaCls} />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">PPE Required</label>
            <textarea {...register('ppe_required')} rows={2} className={textareaCls} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Storage Requirements</label>
              <textarea {...register('storage_requirements')} rows={2} className={textareaCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Disposal Method</label>
              <textarea {...register('disposal_method')} rows={2} className={textareaCls} />
            </div>
          </div>
        </div>

        {/* Emergency Information */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-semibold text-slate-700 border-b border-slate-100 pb-3">Emergency Information</h2>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">First Aid Measures</label>
            <textarea {...register('first_aid_measures')} rows={3} className={textareaCls} />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Spillage Procedure</label>
            <textarea {...register('spillage_procedure')} rows={3} className={textareaCls} />
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
            {submitting ? 'Saving…' : 'Save Changes'}
          </button>
          <a href={`/coshh/${params.id}`} className="text-sm text-slate-600 hover:text-slate-900 transition-colors">
            Cancel
          </a>
        </div>
      </form>
    </div>
  )
}
