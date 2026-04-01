'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'

const schema = z.object({
  title: z.string().min(1, 'Title is required'),
  site_id: z.string().min(1, 'Site is required'),
  category_id: z.string().min(1, 'Category is required'),
  assessor_id: z.string().min(1, 'Assessor is required'),
  assessment_date: z.string().min(1, 'Assessment date is required'),
  review_date: z.string().min(1, 'Review date is required'),
})

type FormValues = z.infer<typeof schema>

interface LookupValue { id: string; label: string }
interface Site { id: string; name: string }
interface User { id: string; first_name: string; last_name: string }

export default function NewRiskAssessmentPage() {
  const router = useRouter()
  const supabase = createClient()

  const [categories, setCategories] = useState<LookupValue[]>([])
  const [sites, setSites] = useState<Site[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  useEffect(() => {
    async function load() {
      const [catRes, siteRes, userRes] = await Promise.all([
        supabase
          .from('lookup_values')
          .select('id, label, lookup_categories!inner(key)')
          .eq('lookup_categories.key', 'risk_assessment_category')
          .eq('is_active', true)
          .order('sort_order'),
        supabase.from('sites').select('id, name').order('name'),
        supabase.from('users').select('id, first_name, last_name').eq('is_active', true).order('first_name'),
      ])
      setCategories((catRes.data ?? []) as unknown as LookupValue[])
      setSites((siteRes.data ?? []) as unknown as Site[])
      setUsers((userRes.data ?? []) as unknown as User[])
    }
    load()
  }, [])

  async function onSubmit(values: FormValues) {
    setSubmitting(true)
    setServerError(null)

    const { data, error } = await supabase
      .from('risk_assessments')
      .insert({
        title: values.title,
        site_id: values.site_id,
        category_id: values.category_id,
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

    router.push(`/risk-assessments/${data.id}/edit`)
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
          <a href="/risk-assessments" className="hover:text-orange-600 transition-colors">Risk Assessments</a>
          <span>/</span>
          <span>New</span>
        </div>
        <h1 className="text-2xl font-semibold text-slate-900">New Risk Assessment</h1>
        <p className="text-sm text-slate-500 mt-1">Create the assessment, then add hazards in the next step</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        {serverError && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            {serverError}
          </div>
        )}

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            {...register('title')}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
            placeholder="e.g. Manual Handling Assessment"
          />
          {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title.message}</p>}
        </div>

        {/* Site */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Site <span className="text-red-500">*</span>
          </label>
          <select
            {...register('site_id')}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 bg-white"
          >
            <option value="">Select site…</option>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          {errors.site_id && <p className="mt-1 text-xs text-red-600">{errors.site_id.message}</p>}
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Category <span className="text-red-500">*</span>
          </label>
          <select
            {...register('category_id')}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 bg-white"
          >
            <option value="">Select category…</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
          {errors.category_id && <p className="mt-1 text-xs text-red-600">{errors.category_id.message}</p>}
        </div>

        {/* Assessor */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Assessor <span className="text-red-500">*</span>
          </label>
          <select
            {...register('assessor_id')}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 bg-white"
          >
            <option value="">Select assessor…</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>
            ))}
          </select>
          {errors.assessor_id && <p className="mt-1 text-xs text-red-600">{errors.assessor_id.message}</p>}
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Assessment Date <span className="text-red-500">*</span>
            </label>
            <input
              {...register('assessment_date')}
              type="date"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
            />
            {errors.assessment_date && <p className="mt-1 text-xs text-red-600">{errors.assessment_date.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Review Date <span className="text-red-500">*</span>
            </label>
            <input
              {...register('review_date')}
              type="date"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
            />
            {errors.review_date && <p className="mt-1 text-xs text-red-600">{errors.review_date.message}</p>}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-orange-500 px-5 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? 'Creating…' : 'Create & Add Hazards'}
          </button>
          <a href="/risk-assessments" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">
            Cancel
          </a>
        </div>
      </form>
    </div>
  )
}
