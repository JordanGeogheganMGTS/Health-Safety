'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { uploadFile } from '@/lib/storage'
import { useEffect } from 'react'

const schema = z.object({
  title: z.string().min(1, 'Title is required'),
  category_id: z.string().min(1, 'Category is required'),
  site_id: z.string().min(1, 'Site is required'),
  version: z.string().optional(),
  review_due_date: z.string().min(1, 'Review date is required'),
  owner_id: z.string().min(1, 'Document owner is required'),
})

type FormValues = z.infer<typeof schema>

interface LookupValue { id: string; label: string }
interface Site { id: string; name: string }
interface User { id: string; first_name: string; last_name: string }

export default function NewDocumentPage() {
  const router = useRouter()
  const supabase = createClient()

  const [categories, setCategories] = useState<LookupValue[]>([])
  const [sites, setSites] = useState<Site[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
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
          .eq('lookup_categories.key', 'document_category')
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
    if (!file) {
      setFileError('Please select a file to upload')
      return
    }
    setFileError(null)
    setSubmitting(true)
    setServerError(null)

    try {
      const { key, error: uploadError } = await uploadFile('documents', file)
      if (uploadError) {
        setServerError(`File upload failed: ${uploadError}`)
        setSubmitting(false)
        return
      }

      const { data, error } = await supabase
        .from('documents')
        .insert({
          title: values.title,
          category_id: values.category_id,
          site_id: values.site_id,
          version: values.version || null,
          review_due_date: values.review_due_date,
          owner_id: values.owner_id,
          file_path: key,
          status: 'Draft',
        })
        .select('id')
        .single()

      if (error) {
        setServerError(error.message)
        setSubmitting(false)
        return
      }

      router.push(`/documents/${data.id}`)
    } catch (err) {
      setServerError('An unexpected error occurred')
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Upload Document</h1>
        <p className="text-sm text-slate-500 mt-1">Add a new document to the library</p>
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
            placeholder="e.g. Health & Safety Policy"
          />
          {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title.message}</p>}
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

        {/* Version + Review Date row */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Version</label>
            <input
              {...register('version')}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
              placeholder="e.g. 1.0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Review Date <span className="text-red-500">*</span>
            </label>
            <input
              {...register('review_due_date')}
              type="date"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
            />
            {errors.review_due_date && <p className="mt-1 text-xs text-red-600">{errors.review_due_date.message}</p>}
          </div>
        </div>

        {/* Owner */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Document Owner <span className="text-red-500">*</span>
          </label>
          <select
            {...register('owner_id')}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 bg-white"
          >
            <option value="">Select owner…</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>
            ))}
          </select>
          {errors.owner_id && <p className="mt-1 text-xs text-red-600">{errors.owner_id.message}</p>}
        </div>

        {/* File upload */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            File <span className="text-red-500">*</span>
          </label>
          <input
            type="file"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null)
              setFileError(null)
            }}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 file:mr-3 file:rounded file:border-0 file:bg-slate-100 file:px-3 file:py-1 file:text-xs file:font-medium file:text-slate-700 hover:file:bg-slate-200"
          />
          {fileError && <p className="mt-1 text-xs text-red-600">{fileError}</p>}
          {file && <p className="mt-1 text-xs text-slate-500">Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)</p>}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-orange-500 px-5 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? 'Uploading…' : 'Upload Document'}
          </button>
          <a href="/documents" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">
            Cancel
          </a>
        </div>
      </form>
    </div>
  )
}
