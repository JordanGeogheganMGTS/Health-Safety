'use client'

import { useTransition, useState, useRef } from 'react'
import Link from 'next/link'
import { uploadFile } from '@/lib/storage'
import { createContract } from './actions'

interface User { id: string; first_name: string; last_name: string }

export default function NewContractForm({ users }: { users: User[] }) {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setUploadError(null)

    const formData = new FormData(e.currentTarget)

    if (file) {
      setUploading(true)
      const { key, error } = await uploadFile('contracts', file)
      setUploading(false)
      if (error) {
        setUploadError(`File upload failed: ${error}`)
        return
      }
      formData.set('file_path', key)
      formData.set('file_name', file.name)
    }

    startTransition(() => {
      createContract(formData)
    })
  }

  const busy = uploading || isPending

  const inputCls = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500'

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="px-6 py-6 space-y-5">
      {uploadError && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
          {uploadError}
        </div>
      )}

      {/* Contract Name */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Contract Name <span className="text-red-500">*</span>
        </label>
        <input name="name" required type="text" placeholder="e.g. IT Support Services Agreement" className={inputCls} />
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {/* Supplier */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Supplier / Provider</label>
          <input name="supplier" type="text" placeholder="e.g. Acme Ltd" className={inputCls} />
        </div>

        {/* Contract Owner */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Contract Owner</label>
          <select name="owner_id" className={inputCls + ' bg-white'}>
            <option value="">— Select owner —</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>
            ))}
          </select>
        </div>

        {/* Signed Date */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Signed Date</label>
          <input name="signed_date" type="date" className={inputCls} />
        </div>

        {/* Renewal Date */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Renewal Date</label>
          <input name="renewal_date" type="date" className={inputCls} />
        </div>

        {/* Contract Value */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Contract Value (£)</label>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400 text-sm">£</span>
            <input name="contract_value" type="number" min="0" step="0.01" placeholder="0.00"
              className="w-full rounded-lg border border-slate-300 pl-7 pr-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500" />
          </div>
        </div>

        {/* Notice Period */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Notice Period</label>
          <div className="relative">
            <input name="notice_period_days" type="number" min="1" defaultValue={90}
              className="w-full rounded-lg border border-slate-300 px-3 pr-12 py-2 text-sm text-slate-900 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500" />
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-400 text-sm">days</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Status changes to &ldquo;Expiring Soon&rdquo; this many days before the renewal date</p>
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
        <textarea name="notes" rows={3} placeholder="Any additional notes about this contract…"
          className={inputCls} />
      </div>

      {/* Contract Document */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Contract Document</label>
        <input
          type="file"
          accept=".pdf,.doc,.docx,.xls,.xlsx"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-orange-50 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-orange-700 hover:file:bg-orange-100"
        />
        {file && <p className="text-xs text-slate-500 mt-1">Selected: {file.name}</p>}
        {!file && <p className="text-xs text-slate-400 mt-1">PDF, Word, or Excel. Can be replaced when the contract is renewed.</p>}
      </div>

      <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
        <Link href="/contracts" className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
          Cancel
        </Link>
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-orange-500 px-5 py-2 text-sm font-medium text-white hover:bg-orange-600 transition-colors disabled:opacity-60"
        >
          {uploading ? 'Uploading…' : isPending ? 'Saving…' : 'Save Contract'}
        </button>
      </div>
    </form>
  )
}
