'use client'

import { useState, useEffect } from 'react'
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
  is_active: z.boolean(),
})

type FormValues = z.infer<typeof schema>

export default function EditPpeItemPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const watchHasSizes = useWatch({ control, name: 'has_sizes' })

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('ppe_items')
        .select('id, name, description, has_sizes, size_category_key, replacement_months, sort_order, is_active')
        .eq('id', params.id)
        .single()

      if (data) {
        reset({
          name: data.name,
          description: data.description ?? '',
          has_sizes: data.has_sizes,
          size_category_key: data.size_category_key ?? '',
          replacement_months: data.replacement_months ?? ('' as const),
          sort_order: data.sort_order ?? 0,
          is_active: data.is_active,
        })
      }
      setLoading(false)
    }
    load()
  }, [params.id])

  async function onSubmit(values: FormValues) {
    setSubmitting(true)
    setServerError(null)

    const { error } = await supabase
      .from('ppe_items')
      .update({
        name: values.name,
        description: values.description || null,
        has_sizes: values.has_sizes,
        size_category_key: values.has_sizes && values.size_category_key ? values.size_category_key : null,
        replacement_months: values.replacement_months
          ? Number(values.replacement_months)
          : null,
        sort_order: Number(values.sort_order),
        is_active: values.is_active,
      })
      .eq('id', params.id)

    if (error) {
      setServerError(error.message)
      setSubmitting(false)
      return
    }

    router.push('/ppe')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    )
  }

  const inputCls = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500'
  const textareaCls = `${inputCls} resize-none`

  return (
    <div className="max-w-xl">
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
          <a href="/ppe" className="hover:text-orange-600 transition-colors">PPE Management</a>
          <span>/</span>
          <span>Edit PPE Item</span>
        </div>
        <h1 className="text-2xl font-semibold text-slate-900">Edit PPE Item</h1>
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
          <input {...register('name')} className={inputCls} />
          {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
          <textarea {...register('description')} rows={2} className={textareaCls} />
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
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Replacement Interval (months)</label>
          <input
            {...register('replacement_months')}
            type="number"
            min="1"
            className={inputCls}
          />
          {errors.replacement_months && (
            <p className="mt-1 text-xs text-red-600">{errors.replacement_months.message as string}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Sort Order</label>
          <input {...register('sort_order')} type="number" min="0" className={inputCls} />
        </div>

        <div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              {...register('is_active')}
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
            />
            <span className="text-sm font-medium text-slate-700">Active</span>
          </label>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-orange-500 px-5 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            {submitting ? 'Saving…' : 'Save Changes'}
          </button>
          <a href="/ppe" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">
            Cancel
          </a>
        </div>
      </form>
    </div>
  )
}
