'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  has_sizes: z.boolean(),
  size_category_key: z.string().optional(),
  replacement_months: z.coerce.number().int().min(1).optional().or(z.literal('')),
  sort_order: z.coerce.number().int().min(0),
})

type FormValues = z.infer<typeof schema>

export default function NewPpeItemPage() {
  const router = useRouter()
  const supabase = createClient()

  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      has_sizes: false,
      sort_order: 0,
    },
  })

  const watchHasSizes = useWatch({ control, name: 'has_sizes' })

  async function onSubmit(values: FormValues) {
    setSubmitting(true)
    setServerError(null)

    const { error } = await supabase.from('ppe_items').insert({
      name: values.name,
      description: values.description || null,
      has_sizes: values.has_sizes,
      size_category_key: values.has_sizes && values.size_category_key ? values.size_category_key : null,
      replacement_months: values.replacement_months
        ? Number(values.replacement_months)
        : null,
      sort_order: Number(values.sort_order),
      is_active: true,
    })

    if (error) {
      setServerError(error.message)
      setSubmitting(false)
      return
    }

    router.push('/ppe')
  }

  const inputCls = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500'
  const textareaCls = `${inputCls} resize-none`

  return (
    <div className="max-w-xl">
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
          <a href="/ppe" className="hover:text-orange-600 transition-colors">PPE Management</a>
          <span>/</span>
          <span>New PPE Item</span>
        </div>
        <h1 className="text-2xl font-semibold text-slate-900">Add PPE Item</h1>
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
          <input {...register('name')} className={inputCls} placeholder="e.g. Safety Helmet, Hi-Vis Vest" />
          {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
          <textarea {...register('description')} rows={2} className={textareaCls} placeholder="Optional description…" />
        </div>

        <div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              {...register('has_sizes')}
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
            />
            <span className="text-sm font-medium text-slate-700">This item comes in sizes</span>
          </label>
        </div>

        {watchHasSizes && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Size Category Key</label>
            <input
              {...register('size_category_key')}
              className={inputCls}
              placeholder="e.g. clothing_sizes, shoe_sizes"
            />
            <p className="mt-1 text-xs text-slate-500">Used as the label/category for size input</p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Replacement Interval (months)</label>
          <input
            {...register('replacement_months')}
            type="number"
            min="1"
            className={inputCls}
            placeholder="Leave blank if no set interval"
          />
          {errors.replacement_months && (
            <p className="mt-1 text-xs text-red-600">{errors.replacement_months.message as string}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Sort Order</label>
          <input
            {...register('sort_order')}
            type="number"
            min="0"
            className={inputCls}
          />
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-orange-500 px-5 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? 'Saving…' : 'Add PPE Item'}
          </button>
          <a href="/ppe" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">
            Cancel
          </a>
        </div>
      </form>
    </div>
  )
}
