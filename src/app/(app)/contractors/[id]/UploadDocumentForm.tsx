'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { uploadFile } from '@/lib/storage'

interface DocType {
  id: string
  label: string
}

interface Props {
  contractorId: string
  userId: string
  docTypes: DocType[]
}

export default function UploadDocumentForm({ contractorId, userId, docTypes }: Props) {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [typeId, setTypeId] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file || !title || !typeId) {
      setError('Please fill in Type, Title, and select a file.')
      return
    }

    setUploading(true)
    setError(null)

    const { key, error: uploadErr } = await uploadFile(`contractor-documents/${contractorId}`, file)
    if (uploadErr) {
      setError(uploadErr)
      setUploading(false)
      return
    }

    const supabase = createClient()
    const { error: dbErr } = await supabase.from('contractor_documents').insert({
      contractor_id: contractorId,
      type_id: typeId,
      title,
      storage_key: key,
      expiry_date: expiryDate || null,
      uploaded_by: userId,
      uploaded_at: new Date().toISOString(),
    })

    if (dbErr) {
      setError(dbErr.message)
      setUploading(false)
      return
    }

    setTitle('')
    setTypeId('')
    setExpiryDate('')
    setFile(null)
    router.refresh()
    setUploading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">
          Document Type <span className="text-red-500">*</span>
        </label>
        <select
          value={typeId}
          onChange={(e) => setTypeId(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">Select type…</option>
          {docTypes.map((t) => (
            <option key={t.id} value={t.id}>{t.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">
          Title <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="Document title"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Expiry Date</label>
        <input
          type="date"
          value={expiryDate}
          onChange={(e) => setExpiryDate(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">
          File <span className="text-red-500">*</span>
        </label>
        <input
          type="file"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-blue-700 hover:file:bg-blue-100"
          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
        />
      </div>

      {error && (
        <div className="sm:col-span-2">
          <p className="text-xs text-red-600">{error}</p>
        </div>
      )}

      <div className="sm:col-span-2 flex justify-end">
        <button
          type="submit"
          disabled={uploading}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {uploading ? 'Uploading…' : 'Upload Document'}
        </button>
      </div>
    </form>
  )
}
