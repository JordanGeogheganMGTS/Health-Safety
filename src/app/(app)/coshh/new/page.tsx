'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'

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
      review_date: plus12Months(),
    },
  })

  useEffect(() => {
    async function load() {
      const [siteRes, userRes] = await Promise.all([
        supabase.from('sites').select('id, name').order('name'),
        supabase.from('users').select('id, first_name, last_name').eq('is_active', true).order('first_name'),
      ])
      setSites((siteRes.data ?? []) as Site[])
      setUsers((userRes.data ?? []) as User[])
    }
    load()
  }, [])

  async function onSubmit(values: FormValues) {
    setSubmitting(true)
    setServerError(null)

    const { data, error } = await supabase
      .from('coshh_assessments')
      .insert({
        substance_name: values.substance_name,
        site_id: values.site_id,
        location_used: values.location_used || null,
        supplier: values.supplier || null,
        sds_reference: values.sds_reference || null,
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

  const inputCls = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'
  const selectCls = `${inputCls} bg-white`
  const textareaCls = `${inputCls} resize-none`

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
          <a href="/coshh" className="hover:text-blue-600 transition-colors">COSHH Assessments</a>
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

        {/* Substance Information */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-semibold text-slate-700 border-b border-slate-100 pb-3">Substance Information</h2>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Substance Name <span className="text-red-500">*</span></label>
            <input {...register('substance_name')} className={inputCls} placeholder="e.g. White Spirit" />
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
              <input {...register('location_used')} className={inputCls} placeholder="e.g. Workshop, Store room" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Supplier</label>
              <input {...register('supplier')} className={inputCls} placeholder="Manufacturer or supplier name" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">SDS Reference</label>
              <input {...register('sds_reference')} className={inputCls} placeholder="Safety Data Sheet reference" />
            </div>
          </div>
        </div>

        {/* Hazard Information */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-semibold text-slate-700 border-b border-slate-100 pb-3">Hazard Information</h2>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Hazard Classification</label>
            <input {...register('hazard_classification')} className={inputCls} placeholder="e.g. Flammable, Irritant, Harmful" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Persons at Risk <span className="text-red-500">*</span></label>
              <input {...register('persons_at_risk')} className={inputCls} placeholder="e.g. All staff, Contractors" />
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
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-semibold text-slate-700 border-b border-slate-100 pb-3">Controls</h2>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Existing Controls <span className="text-red-500">*</span></label>
            <textarea {...register('existing_controls')} rows={3} className={textareaCls} placeholder="Controls already in place…" />
            {errors.existing_controls && <p className="mt-1 text-xs text-red-600">{errors.existing_controls.message}</p>}
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
            <label className="block text-sm font-medium text-slate-700 mb-1">Emergency Procedures</label>
            <textarea {...register('emergency_procedures')} rows={3} className={textareaCls} placeholder="Actions in case of spill, fire, etc…" />
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
