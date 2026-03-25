'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'

const schema = z.object({
  title: z.string().min(1, 'Title is required'),
  category_id: z.string().min(1, 'Category is required'),
  site_id: z.string().min(1, 'Site is required'),
  version: z.string().optional(),
  review_date: z.string().min(1, 'Review date is required'),
  owner_id: z.string().min(1, 'Document owner is required'),
  status: z.enum(['Draft', 'Current', 'Under Review', 'Superseded', 'Expired']),
})

type FormValues = z.infer<typeof schema>

interface LookupValue { id: string; label: string }
interface Site { id: string; name: string }
interface User { id: string; first_name: string; last_name: string }

export default function EditDocumentPage({ params }: { params: { id: string } }) {
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
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  useEffect(() => {
    async function load() {
      const [docRes, catRes, siteRes, userRes] = await Promise.all([
        supabase
          .from('documents')
          .select('id, title, version, status, review_date, site_id, owner_id, category_id')
          .eq('id', params.id)
          .single(),
        supabase
          .from('lookup_values')
          .select('id, label, lookup_categories!inner(key)')
          .eq('lookup_categories.key', 'document_type')
          .eq('is_active', true)
          .order('sort_order'),
        supabase.from('sites').select('id, name').order('name'),
        supabase.from('users').select('id, first_name, last_name').eq('is_active', true).order('first_name'),
      ])

      if (docRes.data) {
        const d = docRes.data
        reset({
          title: d.title,
          category_id: d.category_id ?? '',
          site_id: d.site_id ?? '',
          version: d.version ?? '',
          review_date: d.review_date ? d.review_date.split('T')[0] : '',
          owner_id: d.owner_id ?? '',
          status: d.status as FormValues['status'],
        })
      }

      setCategories((catRes.data ?? []) as LookupValue[])
      setSites((siteRes.data ?? []) as Site[])
      setUsers((userRes.data ?? []) as User[])
      setLoading(false)
    }
    load()
  }, [params.id])

  async function onSubmit(values: FormValues) {
    setSubmitting(true)
    setServerError(null)

    const { error } = await supabase
      .from('documents')
      .update({
        title: values.title,
        category_id: values.category_id,
        site_id: values.site_id,
        version: values.version || null,
        review_date: values.review_date,
        owner_id: values.owner_id,
        status: values.status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)

    if (error) {
      setServerError(error.message)
      setSubmitting(false)
      return
    }

    router.push(`/documents/${params.id}`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
          <a href="/documents" className="hover:text-blue-600 transition-colors">Document Library</a>
          <span>/</span>
          <a href={`/documents/${params.id}`} className="hover:text-blue-600 transition-colors">Document</a>
          <span>/</span>
          <span>Edit</span>
        </div>
        <h1 className="text-2xl font-semibold text-slate-900">Edit Document</h1>
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
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title.message}</p>}
        </div>

        {/* Status */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Status <span className="text-red-500">*</span>
          </label>
          <select
            {...register('status')}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
          >
            {['Draft', 'Current', 'Under Review', 'Superseded', 'Expired'].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          {errors.status && <p className="mt-1 text-xs text-red-600">{errors.status.message}</p>}
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Category <span className="text-red-500">*</span>
          </label>
          <select
            {...register('category_id')}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
          >
            <option value="">Select category…</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
          {errors.category_id && <p className="mt-1 text-xs text-red-600">{errors.category_id.message}</p>}
        </div>

        {/* Site */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Site <span className="text-red-500">*</span>
          </label>
          <select
            {...register('site_id')}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
          >
            <option value="">Select site…</option>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          {errors.site_id && <p className="mt-1 text-xs text-red-600">{errors.site_id.message}</p>}
        </div>

        {/* Version + Review Date */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Version</label>
            <input
              {...register('version')}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="e.g. 1.0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Review Date <span className="text-red-500">*</span>
            </label>
            <input
              {...register('review_date')}
              type="date"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            {errors.review_date && <p className="mt-1 text-xs text-red-600">{errors.review_date.message}</p>}
          </div>
        </div>

        {/* Owner */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Document Owner <span className="text-red-500">*</span>
          </label>
          <select
            {...register('owner_id')}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
          >
            <option value="">Select owner…</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>
            ))}
          </select>
          {errors.owner_id && <p className="mt-1 text-xs text-red-600">{errors.owner_id.message}</p>}
        </div>

        <p className="text-xs text-slate-400">File replacement is not available in edit mode — upload a new document to replace the file.</p>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? 'Saving…' : 'Save Changes'}
          </button>
          <a href={`/documents/${params.id}`} className="text-sm text-slate-600 hover:text-slate-900 transition-colors">
            Cancel
          </a>
        </div>
      </form>
    </div>
  )
}
