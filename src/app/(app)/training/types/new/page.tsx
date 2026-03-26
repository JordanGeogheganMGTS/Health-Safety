'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  validity_years: z.coerce.number().int().min(1).optional().or(z.literal('')),
  is_mandatory: z.boolean(),
  is_active: z.boolean(),
})

type FormValues = z.infer<typeof schema>

export default function NewTrainingTypePage() {
  const router = useRouter()
  const supabase = createClient()

  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      is_mandatory: false,
      is_active: true,
    },
  })

  async function onSubmit(values: FormValues) {
    setSubmitting(true)
    setServerError(null)

    const { error } = await supabase.from('training_types').insert({
      name: values.name,
      description: values.description || null,
      validity_years: values.validity_years ? Number(values.validity_years) : null,
      is_mandatory: values.is_mandatory,
      is_active: values.is_active,
    })

    if (error) {
      setServerError(error.message)
      setSubmitting(false)
      return
    }

    router.push('/training')
  }

  const inputCls = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'
  const textareaCls = `${inputCls} resize-none`

  return (
    <div className="max-w-xl">
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
          <a href="/training" className="hover:text-blue-600 transition-colors">Training</a>
          <span>/</span>
          <span>New Training Type</span>
        </div>
        <h1 className="text-2xl font-semibold text-slate-900">Add Training Type</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        {serverError && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            {serverError}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Name <span className="text-red-500">*</span>
          </label>
          <input {...register('name')} className={inputCls} placeholder="e.g. First Aid, Manual Handling" />
          {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
          <textarea {...register('description')} rows={2} className={textareaCls} placeholder="Brief description of this training…" />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Validity (years)</label>
          <input
            {...register('validity_years')}
            type="number"
            min="1"
            className={inputCls}
            placeholder="Leave blank if no expiry"
          />
          {errors.validity_years && <p className="mt-1 text-xs text-red-600">{errors.validity_years.message as string}</p>}
          <p className="mt-1 text-xs text-slate-500">Leave blank if training does not expire</p>
        </div>

        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              {...register('is_mandatory')}
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-slate-700">Mandatory training</span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              {...register('is_active')}
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-slate-700">Active (visible in dropdown)</span>
          </label>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? 'Saving…' : 'Add Training Type'}
          </button>
          <a href="/training" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">
            Cancel
          </a>
        </div>
      </form>
    </div>
  )
}
