'use client'

import { useTransition, useState } from 'react'
import Link from 'next/link'
import { uploadFile } from '@/lib/storage'
import { updateContract } from './actions'

interface User { id: string; first_name: string; last_name: string }

interface Props {
  id: string
  name: string
  supplier: string | null
  ownerId: string | null
  signedDate: string | null
  renewalDate: string | null
  contractValue: number | null
  noticePeriodDays: number | null
  notes: string | null
  existingFilePath: string | null
  existingFileName: string | null
  users: User[]
}

export default function EditContractForm({
  id, name, supplier, ownerId, signedDate, renewalDate,
  contractValue, noticePeriodDays, notes,
  existingFilePath, existingFileName, users,
}: Props) {
  const [newFile, setNewFile] = useState<File | null>(null)
  const [removed, setRemoved] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const updateWithId = updateContract.bind(null, id)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setUploadError(null)

    const formData = new FormData(e.currentTarget)

    if (newFile) {
      setUploading(true)
      const { key, error } = await uploadFile('contracts', newFile)
      setUploading(false)
      if (error) {
        setUploadError(`File upload failed: ${error}`)
        return
      }
      formData.set('new_file_path', key)
      formData.set('new_file_name', newFile.name)
    }

    // Pass existing file info so the server action can preserve or delete it
    formData.set('existing_file_path', existingFilePath ?? '')
    formData.set('existing_file_name', existingFileName ?? '')
    if (removed) formData.set('remove_file', 'true')

    startTransition(() => {
      updateWithId(formData)
    })
  }

  const busy = uploading || isPending
  const inputCls = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500'
  const showCurrentFile = existingFileName && !removed && !newFile

  return (
    <form onSubmit={handleSubmit} className="px-6 py-6 space-y-5">
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
        <input name="name" required type="text" defaultValue={name} className={inputCls} />
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {/* Supplier */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Supplier / Provider</label>
          <input name="supplier" type="text" defaultValue={supplier ?? ''} className={inputCls} />
        </div>

        {/* Contract Owner */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Contract Owner</label>
          <select name="owner_id" defaultValue={ownerId ?? ''} className={inputCls + ' bg-white'}>
            <option value="">— Select owner —</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>
            ))}
          </select>
        </div>

        {/* Signed Date */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Signed Date</label>
          <input name="signed_date" type="date" defaultValue={signedDate ?? ''} className={inputCls} />
        </div>

        {/* Renewal Date */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Renewal Date</label>
          <input name="renewal_date" type="date" defaultValue={renewalDate ?? ''} className={inputCls} />
        </div>

        {/* Contract Value */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Contract Value (£)</label>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400 text-sm">£</span>
            <input name="contract_value" type="number" min="0" step="0.01" defaultValue={contractValue ?? ''}
              className="w-full rounded-lg border border-slate-300 pl-7 pr-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500" />
          </div>
        </div>

        {/* Notice Period */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Notice Period</label>
          <div className="relative">
            <input name="notice_period_days" type="number" min="1" defaultValue={noticePeriodDays ?? 90}
              className="w-full rounded-lg border border-slate-300 px-3 pr-12 py-2 text-sm text-slate-900 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500" />
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-400 text-sm">days</span>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
        <textarea name="notes" rows={3} defaultValue={notes ?? ''} className={inputCls} />
      </div>

      {/* Contract Document */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Contract Document</label>

        {showCurrentFile && (
          <div className="mb-3 flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <div className="flex items-center gap-2">
              <svg className="h-4 w-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="text-sm text-slate-700">{existingFileName}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                if (confirm('Remove the current document?')) setRemoved(true)
              }}
              className="text-xs font-medium text-red-500 hover:text-red-700 transition-colors"
            >
              Remove
            </button>
          </div>
        )}

        {removed && (
          <div className="mb-3 flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
            <span className="text-sm text-amber-700">Document will be removed on save</span>
            <button type="button" onClick={() => setRemoved(false)} className="text-xs font-medium text-amber-600 hover:text-amber-800">
              Undo
            </button>
          </div>
        )}

        {!removed && (
          <>
            <input
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx"
              onChange={(e) => setNewFile(e.target.files?.[0] ?? null)}
              className="w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-orange-50 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-orange-700 hover:file:bg-orange-100"
            />
            {newFile && <p className="text-xs text-slate-500 mt-1">Selected: {newFile.name}</p>}
            {!newFile && existingFileName && (
              <p className="text-xs text-slate-400 mt-1">Upload a new file to replace the current document.</p>
            )}
            {!newFile && !existingFileName && (
              <p className="text-xs text-slate-400 mt-1">PDF, Word, or Excel.</p>
            )}
          </>
        )}
      </div>

      <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
        <Link href={`/contracts/${id}`} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
          Cancel
        </Link>
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-orange-500 px-5 py-2 text-sm font-medium text-white hover:bg-orange-600 transition-colors disabled:opacity-60"
        >
          {uploading ? 'Uploading…' : isPending ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </form>
  )
}
