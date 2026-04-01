'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'

const stepSchema = z.object({
  description: z.string().min(1, 'Step description is required'),
  hazards: z.string().optional(),
  controls: z.string().optional(),
})

const schema = z.object({
  title: z.string().min(1, 'Title is required'),
  site_id: z.string().min(1, 'Site is required'),
  task_description: z.string().min(1, 'Task description is required'),
  category: z.string().optional(),
  ppe_required: z.string().optional(),
  equipment_required: z.string().optional(),
  emergency_procedures: z.string().optional(),
  review_date: z.string().optional(),
  status: z.enum(['Draft', 'Active', 'Superseded']),
  steps: z.array(stepSchema),
})

type FormValues = z.infer<typeof schema>

interface Site { id: string; name: string }

const blankStep = { description: '', hazards: '', controls: '' }

export default function EditMethodStatementPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const supabase = createClient()

  const [sites, setSites] = useState<Site[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { steps: [], status: 'Draft' },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'steps' })

  useEffect(() => {
    async function load() {
      const [msRes, stepsRes, sitesRes] = await Promise.all([
        supabase
          .from('method_statements')
          .select('id, title, site_id, task_description, category, ppe_required, equipment_required, emergency_procedures, review_date, status')
          .eq('id', params.id)
          .single(),
        supabase
          .from('method_statement_steps')
          .select('step_number, description, hazards, controls')
          .eq('ms_id', params.id)
          .order('step_number'),
        supabase.from('sites').select('id, name').order('name'),
      ])

      setSites((sitesRes.data ?? []) as unknown as Site[])

      if (msRes.data) {
        const d = msRes.data
        const loadedSteps = (stepsRes.data ?? []).map((s) => ({
          description: s.description,
          hazards: s.hazards ?? '',
          controls: s.controls ?? '',
        }))
        reset({
          title: d.title,
          site_id: d.site_id ?? '',
          task_description: d.task_description,
          category: d.category ?? '',
          ppe_required: d.ppe_required ?? '',
          equipment_required: d.equipment_required ?? '',
          emergency_procedures: d.emergency_procedures ?? '',
          review_date: d.review_date ? d.review_date.split('T')[0] : '',
          status: d.status as FormValues['status'],
          steps: loadedSteps,
        })
      }
      setLoading(false)
    }
    load()
  }, [params.id])

  async function onSubmit(values: FormValues) {
    setSubmitting(true)
    setServerError(null)

    const { error: msErr } = await supabase
      .from('method_statements')
      .update({
        title: values.title,
        site_id: values.site_id,
        task_description: values.task_description,
        category: values.category || null,
        ppe_required: values.ppe_required || null,
        equipment_required: values.equipment_required || null,
        emergency_procedures: values.emergency_procedures || null,
        review_date: values.review_date || null,
        status: values.status,
      })
      .eq('id', params.id)

    if (msErr) {
      setServerError(msErr.message)
      setSubmitting(false)
      return
    }

    const { error: delErr } = await supabase
      .from('method_statement_steps')
      .delete()
      .eq('ms_id', params.id)

    if (delErr) {
      setServerError(delErr.message)
      setSubmitting(false)
      return
    }

    if (values.steps.length > 0) {
      const stepRows = values.steps.map((s, idx) => ({
        ms_id: params.id,
        step_number: idx + 1,
        description: s.description,
        hazards: s.hazards || null,
        controls: s.controls || null,
      }))

      const { error: insErr } = await supabase.from('method_statement_steps').insert(stepRows)
      if (insErr) {
        setServerError(insErr.message)
        setSubmitting(false)
        return
      }
    }

    router.push(`/method-statements/${params.id}`)
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
  const smInputCls = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 resize-none'

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
          <a href="/method-statements" className="hover:text-orange-600 transition-colors">Method Statements</a>
          <span>/</span>
          <a href={`/method-statements/${params.id}`} className="hover:text-orange-600 transition-colors">Statement</a>
          <span>/</span>
          <span>Edit</span>
        </div>
        <h1 className="text-2xl font-semibold text-slate-900">Edit Method Statement</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {serverError && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            {serverError}
          </div>
        )}

        {/* Header section */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-5">
          <h2 className="text-sm font-semibold text-slate-700 border-b border-slate-100 pb-3">Statement Details</h2>

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
              <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
              <select {...register('status')} className={selectCls}>
                {['Draft', 'Active', 'Superseded'].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
              <input {...register('category')} className={inputCls} placeholder="e.g. Electrical, Working at Height" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Review Date</label>
              <input {...register('review_date')} type="date" className={inputCls} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Task Description <span className="text-red-500">*</span></label>
            <textarea {...register('task_description')} rows={4} className={textareaCls} />
            {errors.task_description && <p className="mt-1 text-xs text-red-600">{errors.task_description.message}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">PPE Required</label>
              <textarea {...register('ppe_required')} rows={3} className={textareaCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Equipment Required</label>
              <textarea {...register('equipment_required')} rows={3} className={textareaCls} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Emergency Procedures</label>
            <textarea {...register('emergency_procedures')} rows={3} className={textareaCls} />
          </div>
        </div>

        {/* Steps section */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700">Method Steps</h2>
            <button
              type="button"
              onClick={() => append({ ...blankStep })}
              className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-orange-50 px-3 py-1.5 text-xs font-medium text-orange-700 hover:bg-orange-100 transition-colors"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Step
            </button>
          </div>

          {fields.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              No steps added yet. Click &quot;Add Step&quot; to begin.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {fields.map((field, idx) => (
                <div key={field.id} className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="flex items-center gap-2">
                      <span className="flex items-center justify-center w-7 h-7 rounded-full bg-orange-50 text-orange-700 text-xs font-bold border border-blue-100">
                        {idx + 1}
                      </span>
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Step {idx + 1}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => remove(idx)}
                      className="text-xs text-red-500 hover:text-red-700 font-medium transition-colors"
                    >
                      Remove
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Description <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        {...register(`steps.${idx}.description`)}
                        rows={3}
                        className={smInputCls}
                        placeholder="Describe this step…"
                      />
                      {errors.steps?.[idx]?.description && (
                        <p className="mt-0.5 text-xs text-red-600">{errors.steps[idx]?.description?.message}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Hazards</label>
                        <textarea
                          {...register(`steps.${idx}.hazards`)}
                          rows={2}
                          className={smInputCls}
                          placeholder="Hazards associated with this step…"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Controls</label>
                        <textarea
                          {...register(`steps.${idx}.controls`)}
                          rows={2}
                          className={smInputCls}
                          placeholder="Control measures for this step…"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {fields.length > 0 && (
            <div className="px-6 py-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => append({ ...blankStep })}
                className="inline-flex items-center gap-1.5 text-xs text-orange-600 hover:text-orange-700 font-medium transition-colors"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add another step
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-orange-500 px-5 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? 'Saving…' : 'Save Method Statement'}
          </button>
          <a href={`/method-statements/${params.id}`} className="text-sm text-slate-600 hover:text-slate-900 transition-colors">
            Cancel
          </a>
        </div>
      </form>
    </div>
  )
}
