'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { uploadFile } from '@/lib/storage'

const schema = z.object({
  substance_name: z.string().min(1, 'Substance name is required'),
  site_id: z.string().min(1, 'Site is required'),
  location_used: z.string().optional(),
  supplier: z.string().optional(),
  sds_reference: z.string().optional(),
  hazard_classification: z.string().optional(),
  persons_at_risk: z.string().min(1, 'Persons at risk is required'),
  exposure_route: z.string().optional(),
  risk_rating: z.string().optional(),
  existing_controls: z.string().min(1, 'Existing controls are required'),
  ppe_required: z.string().optional(),
  storage_requirements: z.string().optional(),
  disposal_method: z.string().optional(),
  first_aid_measures: z.string().optional(),
  emergency_procedures: z.string().optional(),
  assessor_id: z.string().min(1, 'Assessor is required'),
  assessment_date: z.string().min(1, 'Assessment date is required'),
  review_date: z.string().min(1, 'Review date is required'),
  status: z.enum(['Draft', 'Active', 'Under Review', 'Superseded']),
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
  const [existingSdsKey, setExistingSdsKey] = useState<string | null>(null)

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
        setExistingSdsKey(d.sds_storage_key ?? null)
        reset({
          substance_name: d.substance_name,
          site_id: d.site_id ?? '',
          location_used: d.location_used ?? '',
          supplier: d.supplier ?? '',
          sds_reference: d.sds_reference ?? '',
          hazard_classification: d.hazard_classification ?? '',
          persons_at_risk: d.persons_at_risk,
          exposure_route: d.exposure_route ?? '',
          risk_rating: d.risk_rating ?? '',
          existing_controls: d.existing_controls,
          ppe_required: d.ppe_required ?? '',
          storage_requirements: d.storage_requirements ?? '',
          disposal_method: d.disposal_method ?? '',
          first_aid_measures: d.first_aid_measures ?? '',
          emergency_procedures: d.emergency_procedures ?? '',
          assessor_id: d.assessor_id ?? '',
          assessment_date: d.assessment_date ? d.assessment_date.split('T')[0] : '',
          review_date: d.review_date ? d.review_date.split('T')[0] : '',
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

    let sdsStorageKey = existingSdsKey

    if (sdsFile) {
      const { key, error: uploadError } = await uploadFile(`coshh/${params.id}/sds`, sdsFile)
      if (uploadError) {
        setServerError(`File upload failed: ${uploadError}`)
        setSubmitting(false)
        return
      }
      sdsStorageKey = key
    }

    const { error } = await supabase
      .from('coshh_assessments')
      .update({
        substance_name: values.substance_name,
        site_id: values.site_id,
        location_used: values.location_used || null,
        supplier: values.supplier || null,
        sds_reference: values.sds_reference || null,
        sds_storage_key: sdsStorageKey,
        hazard_classification: values.hazard_classification || null,
        persons_at_risk: values.persons_at_risk,
        exposure_route: values.exposure_route || null,
        risk_rating: values.risk_rating || null,
        existing_controls: values.existing_controls,
        ppe_required: values.ppe_required || null,
        storage_requirements: values.storage_requirements || null,
        disposal_method: values.disposal_method || null,
        first_aid_measures: values.first_aid_measures || null,
        emergency_procedures: values.emergency_procedures || null,
        assessor_id: values.assessor_id,
        assessment_date: values.assessment_date,
        review_date: values.review_date,
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

  const inputCls = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'
  const selectCls = `${inputCls} bg-white`
  const textareaCls = `${inputCls} resize-none`

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
          <a href="/coshh" className="hover:text-blue-600 transition-colors">COSHH Assessments</a>
          <span>/</span>
          <a href={`/coshh/${params.id}`} className="hover:text-blue-600 transition-colors">Assessment</a>
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

        {/* Substance Information */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-semibold text-slate-700 border-b border-slate-100 pb-3">Substance Information</h2>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Substance Name <span className="text-red-500">*</span></label>
            <input {...register('substance_name')} className={inputCls} />
            {errors.substance_name && <p className="mt-1 text-xs text-red-600">{errors.substance_name.message}</p>}
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
              <label className="block text-sm font-medium text-slate-700 mb-1">Location Used</label>
              <input {...register('location_used')} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Supplier</label>
              <input {...register('supplier')} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">SDS Reference</label>
              <input {...register('sds_reference')} className={inputCls} />
            </div>
          </div>

          {/* SDS File Upload */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Safety Data Sheet (PDF)
              {existingSdsKey && <span className="ml-2 text-xs text-green-600 font-normal">SDS on file</span>}
            </label>
            <input
              type="file"
              accept=".pdf"
              onChange={(e) => setSdsFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
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
            <label className="block text-sm font-medium text-slate-700 mb-1">Hazard Classification</label>
            <input {...register('hazard_classification')} className={inputCls} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Persons at Risk <span className="text-red-500">*</span></label>
              <input {...register('persons_at_risk')} className={inputCls} />
              {errors.persons_at_risk && <p className="mt-1 text-xs text-red-600">{errors.persons_at_risk.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Exposure Route</label>
              <select {...register('exposure_route')} className={selectCls}>
                <option value="">Select route…</option>
                {['Inhalation', 'Skin Contact', 'Ingestion', 'Injection', 'Multiple Routes'].map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Risk Rating</label>
              <select {...register('risk_rating')} className={selectCls}>
                <option value="">Select rating…</option>
                {['Low', 'Medium', 'High', 'Very High'].map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
              <select {...register('status')} className={selectCls}>
                {['Draft', 'Active', 'Under Review', 'Superseded'].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-semibold text-slate-700 border-b border-slate-100 pb-3">Controls</h2>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Existing Controls <span className="text-red-500">*</span></label>
            <textarea {...register('existing_controls')} rows={3} className={textareaCls} />
            {errors.existing_controls && <p className="mt-1 text-xs text-red-600">{errors.existing_controls.message}</p>}
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
            <label className="block text-sm font-medium text-slate-700 mb-1">Emergency Procedures</label>
            <textarea {...register('emergency_procedures')} rows={3} className={textareaCls} />
          </div>
        </div>

        {/* Assessment Details */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-semibold text-slate-700 border-b border-slate-100 pb-3">Assessment Details</h2>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Assessor <span className="text-red-500">*</span></label>
            <select {...register('assessor_id')} className={selectCls}>
              <option value="">Select assessor…</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>)}
            </select>
            {errors.assessor_id && <p className="mt-1 text-xs text-red-600">{errors.assessor_id.message}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Assessment Date <span className="text-red-500">*</span></label>
              <input {...register('assessment_date')} type="date" className={inputCls} />
              {errors.assessment_date && <p className="mt-1 text-xs text-red-600">{errors.assessment_date.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Review Date <span className="text-red-500">*</span></label>
              <input {...register('review_date')} type="date" className={inputCls} />
              {errors.review_date && <p className="mt-1 text-xs text-red-600">{errors.review_date.message}</p>}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
