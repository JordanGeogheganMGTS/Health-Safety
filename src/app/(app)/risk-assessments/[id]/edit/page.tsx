'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'

const hazardSchema = z.object({
  id: z.string().optional(),
  hazard_description: z.string().min(1, 'Hazard description is required'),
  who_is_affected: z.string().min(1, 'Persons at risk is required'),
  existing_controls: z.string().min(1, 'Existing controls are required'),
  likelihood_before: z.coerce.number().min(1).max(5),
  severity_before: z.coerce.number().min(1).max(5),
  additional_controls: z.string().optional(),
  responsible_person: z.string().optional(),
  action_due_date: z.string().optional(),
  likelihood_after: z.coerce.number().min(1).max(5).optional().or(z.literal('')),
  severity_after: z.coerce.number().min(1).max(5).optional().or(z.literal('')),
})

const schema = z.object({
  title: z.string().min(1, 'Title is required'),
  site_id: z.string().min(1, 'Site is required'),
  category_id: z.string().min(1, 'Category is required'),
  assessed_by: z.string().min(1, 'Assessor is required'),
  assessment_date: z.string().min(1, 'Assessment date is required'),
  review_due_date: z.string().min(1, 'Review date is required'),
  status: z.enum(['Draft', 'Active', 'Under Review', 'Superseded']),
  overall_rating: z.string().optional(),
  hazards: z.array(hazardSchema),
})

type FormValues = z.infer<typeof schema>

interface LookupValue { id: string; label: string }
interface Site { id: string; name: string }
interface User { id: string; first_name: string; last_name: string }

function riskRating(l: number, s: number): number {
  return l * s
}

function ratingClass(r: number): string {
  if (r <= 4) return 'bg-green-100 text-green-700'
  if (r <= 9) return 'bg-amber-100 text-amber-700'
  if (r <= 15) return 'bg-orange-100 text-orange-700'
  return 'bg-red-100 text-red-700'
}

const blankHazard = {
  hazard: '',
  persons_at_risk: '',
  existing_controls: '',
  likelihood: 1 as const,
  severity: 1 as const,
  additional_controls: '',
  action_owner_id: '',
  action_due_date: '',
  residual_likelihood: '' as const,
  residual_severity: '' as const,
}

export default function EditRiskAssessmentPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const supabase = createClient()

  const [categories, setCategories] = useState<LookupValue[]>([])
  const [sites, setSites] = useState<Site[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { hazards: [], status: 'Draft' },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'hazards' })
  const watchedHazards = watch('hazards')

  useEffect(() => {
    async function load() {
      const [raRes, hazardsRes, catRes, siteRes, userRes] = await Promise.all([
        supabase
          .from('risk_assessments')
          .select('id, title, site_id, category_id, assessed_by, assessment_date, review_due_date, status, overall_rating')
          .eq('id', params.id)
          .single(),
        supabase
          .from('ra_hazards')
          .select('*')
          .eq('ra_id', params.id)
          .order('sort_order'),
        supabase
          .from('lookup_values')
          .select('id, label, lookup_categories!inner(key)')
          .eq('lookup_categories.key', 'ra_category')
          .eq('is_active', true)
          .order('sort_order'),
        supabase.from('sites').select('id, name').order('name'),
        supabase.from('users').select('id, first_name, last_name').eq('is_active', true).order('first_name'),
      ])

      setCategories((catRes.data ?? []) as unknown as LookupValue[])
      setSites((siteRes.data ?? []) as unknown as Site[])
      setUsers((userRes.data ?? []) as unknown as User[])

      if (raRes.data) {
        const d = raRes.data
        const hz = (hazardsRes.data ?? []).map((h: Record<string, unknown>) => ({
          id: h.id as string,
          hazard: h.hazard as string,
          persons_at_risk: h.persons_at_risk as string,
          existing_controls: h.existing_controls as string,
          likelihood: h.likelihood as number,
          severity: h.severity as number,
          additional_controls: (h.additional_controls as string) ?? '',
          action_owner_id: (h.action_owner_id as string) ?? '',
          action_due_date: h.action_due_date ? (h.action_due_date as string).split('T')[0] : '',
          residual_likelihood: (h.residual_likelihood as number | null) ?? ('' as const),
          residual_severity: (h.residual_severity as number | null) ?? ('' as const),
        }))
        reset({
          title: d.title,
          site_id: d.site_id ?? '',
          category_id: d.category_id ?? '',
          assessed_by: d.assessed_by ?? '',
          assessment_date: d.assessment_date ? d.assessment_date.split('T')[0] : '',
          review_due_date: d.review_due_date ? d.review_due_date.split('T')[0] : '',
          status: d.status as FormValues['status'],
          overall_rating: d.overall_rating ?? '',
          hazards: hz.length ? hz : [],
        })
      }
      setLoading(false)
    }
    load()
  }, [params.id])

  async function onSubmit(values: FormValues) {
    setSubmitting(true)
    setServerError(null)

    // Update RA header
    const { error: raErr } = await supabase
      .from('risk_assessments')
      .update({
        title: values.title,
        site_id: values.site_id,
        category_id: values.category_id,
        assessed_by: values.assessed_by,
        assessment_date: values.assessment_date,
        review_due_date: values.review_due_date,
        status: values.status,
        overall_rating: values.overall_rating || null,
      })
      .eq('id', params.id)

    if (raErr) {
      setServerError(raErr.message)
      setSubmitting(false)
      return
    }

    // Delete existing hazards
    const { error: delErr } = await supabase
      .from('ra_hazards')
      .delete()
      .eq('ra_id', params.id)

    if (delErr) {
      setServerError(delErr.message)
      setSubmitting(false)
      return
    }

    // Insert new hazards
    if (values.hazards.length > 0) {
      const hazardRows = values.hazards.map((h, idx) => {
        const l = Number(h.likelihood)
        const s = Number(h.severity)
        const rl = h.residual_likelihood ? Number(h.residual_likelihood) : null
        const rs = h.residual_severity ? Number(h.residual_severity) : null
        return {
          ra_id: params.id,
          hazard: h.hazard,
          persons_at_risk: h.persons_at_risk,
          existing_controls: h.existing_controls,
          likelihood: l,
          severity: s,
          risk_rating: l * s,
          additional_controls: h.additional_controls || null,
          action_owner_id: h.action_owner_id || null,
          action_due_date: h.action_due_date || null,
          residual_likelihood: rl,
          residual_severity: rs,
          residual_risk_rating: rl && rs ? rl * rs : null,
          sort_order: idx + 1,
        }
      })

      const { error: insErr } = await supabase.from('ra_hazards').insert(hazardRows)
      if (insErr) {
        setServerError(insErr.message)
        setSubmitting(false)
        return
      }
    }

    router.push(`/risk-assessments/${params.id}`)
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
  const smInputCls = 'w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs text-slate-900 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500'
  const smSelectCls = `${smInputCls} bg-white`

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
          <a href="/risk-assessments" className="hover:text-orange-600 transition-colors">Risk Assessments</a>
          <span>/</span>
          <a href={`/risk-assessments/${params.id}`} className="hover:text-orange-600 transition-colors">Assessment</a>
          <span>/</span>
          <span>Edit</span>
        </div>
        <h1 className="text-2xl font-semibold text-slate-900">Edit Risk Assessment</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {serverError && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            {serverError}
          </div>
        )}

        {/* Header fields */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-5">
          <h2 className="text-sm font-semibold text-slate-700 border-b border-slate-100 pb-3">Assessment Details</h2>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Title <span className="text-red-500">*</span></label>
            <input {...register('title')} className={inputCls} />
            {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title.message}</p>}
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
              <label className="block text-sm font-medium text-slate-700 mb-1">Category <span className="text-red-500">*</span></label>
              <select {...register('category_id')} className={selectCls}>
                <option value="">Select category…</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
              {errors.category_id && <p className="mt-1 text-xs text-red-600">{errors.category_id.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Assessor <span className="text-red-500">*</span></label>
              <select {...register('assessed_by')} className={selectCls}>
                <option value="">Select assessor…</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>)}
              </select>
              {errors.assessed_by && <p className="mt-1 text-xs text-red-600">{errors.assessed_by.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Status <span className="text-red-500">*</span></label>
              <select {...register('status')} className={selectCls}>
                {['Draft', 'Active', 'Under Review', 'Superseded'].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Assessment Date <span className="text-red-500">*</span></label>
              <input {...register('assessment_date')} type="date" className={inputCls} />
              {errors.assessment_date && <p className="mt-1 text-xs text-red-600">{errors.assessment_date.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Review Date <span className="text-red-500">*</span></label>
              <input {...register('review_due_date')} type="date" className={inputCls} />
              {errors.review_due_date && <p className="mt-1 text-xs text-red-600">{errors.review_due_date.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Overall Rating</label>
              <select {...register('overall_rating')} className={selectCls}>
                <option value="">Not set</option>
                {['Low', 'Medium', 'High', 'Very High'].map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Hazards section */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700">Hazards &amp; Controls</h2>
            <button
              type="button"
              onClick={() => append({ ...blankHazard })}
              className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-orange-50 px-3 py-1.5 text-xs font-medium text-orange-700 hover:bg-orange-100 transition-colors"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Hazard
            </button>
          </div>

          {fields.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              No hazards added yet. Click "Add Hazard" to begin.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {fields.map((field, idx) => {
                const l = Number(watchedHazards[idx]?.likelihood ?? 1)
                const s = Number(watchedHazards[idx]?.severity ?? 1)
                const rr = l * s
                const rl = Number(watchedHazards[idx]?.residual_likelihood) || null
                const rs = Number(watchedHazards[idx]?.residual_severity) || null
                const residualRR = rl && rs ? rl * rs : null

                return (
                  <div key={field.id} className="p-5">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Hazard {idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => remove(idx)}
                        className="text-xs text-red-500 hover:text-red-700 font-medium transition-colors"
                      >
                        Remove
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-slate-600 mb-1">Hazard Description <span className="text-red-500">*</span></label>
                        <textarea
                          {...register(`hazards.${idx}.hazard`)}
                          rows={2}
                          className={smInputCls}
                          placeholder="Describe the hazard…"
                        />
                        {errors.hazards?.[idx]?.hazard && (
                          <p className="mt-0.5 text-xs text-red-600">{errors.hazards[idx]?.hazard?.message}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Persons at Risk <span className="text-red-500">*</span></label>
                        <input {...register(`hazards.${idx}.persons_at_risk`)} className={smInputCls} placeholder="e.g. All staff, Visitors" />
                        {errors.hazards?.[idx]?.persons_at_risk && (
                          <p className="mt-0.5 text-xs text-red-600">{errors.hazards[idx]?.persons_at_risk?.message}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Existing Controls <span className="text-red-500">*</span></label>
                        <textarea
                          {...register(`hazards.${idx}.existing_controls`)}
                          rows={2}
                          className={smInputCls}
                          placeholder="Controls currently in place…"
                        />
                        {errors.hazards?.[idx]?.existing_controls && (
                          <p className="mt-0.5 text-xs text-red-600">{errors.hazards[idx]?.existing_controls?.message}</p>
                        )}
                      </div>
                    </div>

                    {/* Risk rating row */}
                    <div className="grid grid-cols-3 md:grid-cols-6 gap-3 items-end mb-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Likelihood (1-5)</label>
                        <select {...register(`hazards.${idx}.likelihood`)} className={smSelectCls}>
                          {[1,2,3,4,5].map((n) => <option key={n} value={n}>{n}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Severity (1-5)</label>
                        <select {...register(`hazards.${idx}.severity`)} className={smSelectCls}>
                          {[1,2,3,4,5].map((n) => <option key={n} value={n}>{n}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Risk Rating</label>
                        <div className={`inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-sm font-bold ${ratingClass(rr)}`}>
                          {rr}
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Residual L</label>
                        <select {...register(`hazards.${idx}.residual_likelihood`)} className={smSelectCls}>
                          <option value="">—</option>
                          {[1,2,3,4,5].map((n) => <option key={n} value={n}>{n}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Residual S</label>
                        <select {...register(`hazards.${idx}.residual_severity`)} className={smSelectCls}>
                          <option value="">—</option>
                          {[1,2,3,4,5].map((n) => <option key={n} value={n}>{n}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Residual RR</label>
                        <div className={`inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-sm font-bold ${residualRR ? ratingClass(residualRR) : 'bg-slate-100 text-slate-500'}`}>
                          {residualRR ?? '—'}
                        </div>
                      </div>
                    </div>

                    {/* Additional controls / action */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Additional Controls</label>
                        <textarea {...register(`hazards.${idx}.additional_controls`)} rows={2} className={smInputCls} placeholder="Further controls required…" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Action Owner</label>
                        <select {...register(`hazards.${idx}.action_owner_id`)} className={smSelectCls}>
                          <option value="">None</option>
                          {users.map((u) => <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Action Due Date</label>
                        <input {...register(`hazards.${idx}.action_due_date`)} type="date" className={smInputCls} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {fields.length > 0 && (
            <div className="px-6 py-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => append({ ...blankHazard })}
                className="inline-flex items-center gap-1.5 text-xs text-orange-600 hover:text-orange-700 font-medium transition-colors"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add another hazard
              </button>
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-orange-500 px-5 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? 'Saving…' : 'Save Risk Assessment'}
          </button>
          <a href={`/risk-assessments/${params.id}`} className="text-sm text-slate-600 hover:text-slate-900 transition-colors">
            Cancel
          </a>
        </div>
      </form>
    </div>
  )
}
