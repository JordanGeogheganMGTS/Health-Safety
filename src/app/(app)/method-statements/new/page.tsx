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
  task_description: z.string().min(1, 'Task description is required'),
  category: z.string().optional(),
  ppe_required: z.string().optional(),
  equipment_required: z.string().optional(),
  emergency_procedures: z.string().optional(),
  review_date: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface Site { id: string; name: string }

export default function NewMethodStatementPage() {
  const router = useRouter()
  const supabase = createClient()

  const [sites, setSites] = useState<Site[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('sites').select('id, name').order('name')
      setSites((data ?? []) as unknown as Site[])
    }
    load()
  }, [])

  async function onSubmit(values: FormValues) {
    setSubmitting(true)
    setServerError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setServerError('Not authenticated')
      setSubmitting(false)
      return
    }

    const { data, error } = await supabase
      .from('method_statements')
      .insert({
        title: values.title,
        site_id: values.site_id,
        task_description: values.task_description,
        category: values.category || null,
        ppe_required: values.ppe_required || null,
        equipment_required: values.equipment_required || null,
        emergency_procedures: values.emergency_procedures || null,
        review_date: values.review_date || null,
        status: 'Draft',
        author_id: user.id,
      })
      .select('id')
      .single()

    if (error) {
      setServerError(error.message)
      setSubmitting(false)
      return
    }

    router.push(`/method-statements/${data.id}/edit`)
  }

  const inputCls = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500'
  const selectCls = `${inputCls} bg-white`
  const textareaCls = `${inputCls} resize-none`

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
          <a href="/method-statements" className="hover:text-orange-600 transition-colors">Method Statements</a>
          <span>/</span>
          <span>New</span>
        </div>
        <h1 className="text-2xl font-semibold text-slate-900">New Method Statement</h1>
        <p className="text-sm text-slate-500 mt-1">Create the header, then add steps in the next screen</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        {serverError && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            {serverError}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            {...register('title')}
            className={inputCls}
            placeholder="e.g. Working at Height — Scaffold Erection"
          />
          {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Site <span className="text-red-500">*</span>
          </label>
          <select {...register('site_id')} className={selectCls}>
            <option value="">Select site…</option>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          {errors.site_id && <p className="mt-1 text-xs text-red-600">{errors.site_id.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Task Description <span className="text-red-500">*</span>
          </label>
          <textarea
            {...register('task_description')}
            rows={4}
            className={textareaCls}
            placeholder="Describe the task to be carried out…"
          />
          {errors.task_description && <p className="mt-1 text-xs text-red-600">{errors.task_description.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
          <input
            {...register('category')}
            className={inputCls}
            placeholder="e.g. Electrical, Working at Height"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">PPE Required</label>
          <textarea
            {...register('ppe_required')}
            rows={2}
            className={textareaCls}
            placeholder="List required personal protective equipment…"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Equipment Required</label>
          <textarea
            {...register('equipment_required')}
            rows={2}
            className={textareaCls}
            placeholder="List tools and equipment needed…"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Emergency Procedures</label>
          <textarea
            {...register('emergency_procedures')}
            rows={3}
            className={textareaCls}
            placeholder="Describe actions in case of emergency…"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Review Date</label>
          <input
            {...register('review_date')}
            type="date"
            className={inputCls}
          />
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-orange-500 px-5 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? 'Creating…' : 'Create & Add Steps'}
          </button>
          <a href="/method-statements" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">
            Cancel
          </a>
        </div>
      </form>
    </div>
  )
}
