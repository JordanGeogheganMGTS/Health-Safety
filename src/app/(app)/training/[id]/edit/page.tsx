'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { uploadFile } from '@/lib/storage'
import { addMonthsToDate } from '@/lib/dates'
import Link from 'next/link'

interface TrainingType { id: string; name: string; validity_months: number | null }

export default function EditTrainingRecordPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [trainingTypes, setTrainingTypes] = useState<TrainingType[]>([])
  const [trainingTypeId, setTrainingTypeId] = useState('')
  const [completionDate, setCompletionDate] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [provider, setProvider] = useState('')
  const [notes, setNotes] = useState('')
  const [certFile, setCertFile] = useState<File | null>(null)
  const [existingCertName, setExistingCertName] = useState<string | null>(null)
  const [existingCertPath, setExistingCertPath] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const [recordRes, typeRes] = await Promise.all([
        supabase
          .from('training_records')
          .select('training_type_id, completion_date, expiry_date, provider, notes, certificate_file_path, certificate_file_name')
          .eq('id', id)
          .single(),
        supabase.from('training_types').select('id, name, validity_months').eq('is_active', true).order('name'),
      ])

      if (recordRes.data) {
        const r = recordRes.data
        setTrainingTypeId(r.training_type_id ?? '')
        setCompletionDate(r.completion_date ?? '')
        setExpiryDate(r.expiry_date ?? '')
        setProvider(r.provider ?? '')
        setNotes(r.notes ?? '')
        setExistingCertPath(r.certificate_file_path ?? null)
        setExistingCertName(r.certificate_file_name ?? null)
      }

      setTrainingTypes((typeRes.data ?? []) as TrainingType[])
      setLoading(false)
    }
    load()
  }, [id])

  // Auto-compute expiry when completion date or training type changes
  useEffect(() => {
    if (!completionDate || !trainingTypeId) return
    const type = trainingTypes.find((t) => t.id === trainingTypeId)
    if (!type?.validity_months) return
    try {
      const computed = addMonthsToDate(completionDate, type.validity_months).toISOString().split('T')[0]
      setExpiryDate(computed)
    } catch {
      // ignore
    }
  }, [completionDate, trainingTypeId, trainingTypes])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    let certPath = existingCertPath
    let certName = existingCertName

    if (certFile) {
      const { key, error: uploadErr } = await uploadFile(`training`, certFile)
      if (uploadErr) {
        setError(`File upload failed: ${uploadErr}`)
        setSubmitting(false)
        return
      }
      certPath = key
      certName = certFile.name
    }

    const { error: dbErr } = await supabase
      .from('training_records')
      .update({
        training_type_id: trainingTypeId,
        completion_date: completionDate,
        expiry_date: expiryDate || null,
        provider: provider || null,
        notes: notes || null,
        certificate_file_path: certPath,
        certificate_file_name: certName,
      })
      .eq('id', id)

    if (dbErr) {
      setError(dbErr.message)
      setSubmitting(false)
      return
    }

    router.push(`/training/${id}`)
  }

  const inputCls = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500'

  if (loading) {
    return <div className="py-12 text-center text-slate-400 text-sm">Loading…</div>
  }

  return (
    <div className="max-w-xl">
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
          <Link href="/training" className="hover:text-orange-600">Training</Link>
          <span>/</span>
          <Link href={`/training/${id}`} className="hover:text-orange-600">Record</Link>
          <span>/</span>
          <span>Edit</span>
        </div>
        <h1 className="text-2xl font-semibold text-slate-900">Edit Training Record</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Training Type <span className="text-red-500">*</span></label>
          <select
            value={trainingTypeId}
            onChange={(e) => setTrainingTypeId(e.target.value)}
            required
            className={`${inputCls} bg-white`}
          >
            <option value="">Select training type…</option>
            {trainingTypes.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Completion Date <span className="text-red-500">*</span></label>
          <input
            type="date"
            value={completionDate}
            onChange={(e) => setCompletionDate(e.target.value)}
            required
            className={inputCls}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Expiry Date</label>
          <input
            type="date"
            value={expiryDate}
            onChange={(e) => setExpiryDate(e.target.value)}
            className={inputCls}
          />
          <p className="mt-1 text-xs text-slate-400">Auto-calculated from completion date. You can override this manually.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Provider</label>
          <input
            type="text"
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            className={inputCls}
            placeholder="Training provider or course name"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className={inputCls}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Certificate</label>
          {existingCertName && !certFile && (
            <p className="text-xs text-slate-500 mb-1">Current file: {existingCertName}</p>
          )}
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={(e) => setCertFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100 cursor-pointer"
          />
          {certFile && <p className="mt-1 text-xs text-slate-500">New file selected: {certFile.name}</p>}
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-orange-500 px-5 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50 transition-colors"
          >
            {submitting ? 'Saving…' : 'Save Changes'}
          </button>
          <Link href={`/training/${id}`} className="text-sm text-slate-600 hover:text-slate-900 transition-colors">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
