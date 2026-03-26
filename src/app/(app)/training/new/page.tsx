'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { uploadFile } from '@/lib/storage'
import { addMonthsToDate } from '@/lib/dates'

const schema = z.object({
  user_id: z.string().min(1, 'Staff member is required'),
  training_type_id: z.string().min(1, 'Training type is required'),
  completed_date: z.string().min(1, 'Completed date is required'),
  provider: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface User { id: string; first_name: string; last_name: string }
interface TrainingType { id: string; name: string; validity_years: number | null }

function todayISO() {
  return new Date().toISOString().split('T')[0]
}

export default function NewTrainingRecordPage() {
  const router = useRouter()
  const supabase = createClient()

  const [users, setUsers] = useState<User[]>([])
  const [trainingTypes, setTrainingTypes] = useState<TrainingType[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [certFile, setCertFile] = useState<File | null>(null)

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { completed_date: todayISO() },
  })

  const watchedTypeId = useWatch({ control, name: 'training_type_id' })
  const watchedDate = useWatch({ control, name: 'completed_date' })

  useEffect(() => {
    async function load() {
      const [userRes, typeRes] = await Promise.all([
        supabase.from('users').select('id, first_name, last_name').eq('is_active', true).order('first_name'),
        supabase.from('training_types').select('id, name, validity_years').eq('is_active', true).order('name'),
      ])
      setUsers((userRes.data ?? []) as User[])
      setTrainingTypes((typeRes.data ?? []) as TrainingType[])
    }
    load()
  }, [])

  const selectedType = trainingTypes.find((t) => t.id === watchedTypeId)

  const computedExpiry = (() => {
    if (!selectedType) return null
    if (!selectedType.validity_years) return null
    if (!watchedDate) return null
    try {
      return addMonthsToDate(watchedDate, selectedType.validity_years * 12)
        .toISOString()
        .split('T')[0]
    } catch {
      return null
    }
  })()

  async function onSubmit(values: FormValues) {
    setSubmitting(true)
    setServerError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setServerError('Not authenticated')
      setSubmitting(false)
      return
    }

    let certKey: string | null = null
    if (certFile) {
      const { key, error: uploadError } = await uploadFile(`training/${values.user_id}`, certFile)
      if (uploadError) {
        setServerError(`File upload failed: ${uploadError}`)
        setSubmitting(false)
        return
      }
      certKey = key
    }

    const { error } = await supabase.from('training_records').insert({
      user_id: values.user_id,
      training_type_id: values.training_type_id,
      completed_date: values.completed_date,
      expiry_date: computedExpiry,
      provider: values.provider || null,
      certificate_key: certKey,
      recorded_by: user.id,
      recorded_at: new Date().toISOString(),
    })

    if (error) {
      setServerError(error.message)
      setSubmitting(false)
      return
    }

    router.push('/training')
  }

  const inputCls = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'
  const selectCls = `${inputCls} bg-white`

  return (
    <div className="max-w-xl">
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
          <a href="/training" className="hover:text-blue-600 transition-colors">Training</a>
          <span>/</span>
          <span>Record Training</span>
        </div>
        <h1 className="text-2xl font-semibold text-slate-900">Record Training</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        {serverError && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            {serverError}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Staff Member <span className="text-red-500">*</span>
          </label>
          <select {...register('user_id')} className={selectCls}>
            <option value="">Select person…</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>
            ))}
          </select>
          {errors.user_id && <p className="mt-1 text-xs text-red-600">{errors.user_id.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Training Type <span className="text-red-500">*</span>
          </label>
          <select {...register('training_type_id')} className={selectCls}>
            <option value="">Select training type…</option>
            {trainingTypes.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          {errors.training_type_id && <p className="mt-1 text-xs text-red-600">{errors.training_type_id.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Completed Date <span className="text-red-500">*</span>
          </label>
          <input {...register('completed_date')} type="date" className={inputCls} />
          {errors.completed_date && <p className="mt-1 text-xs text-red-600">{errors.completed_date.message}</p>}
        </div>

        {/* Computed expiry (read-only) */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Expiry Date</label>
          <div className={`${inputCls} bg-slate-50 text-slate-500 cursor-not-allowed`}>
            {watchedTypeId
              ? computedExpiry
                ? computedExpiry
                : 'No expiry'
              : 'Select a training type first'}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {selectedType?.validity_years
              ? `Calculated from completed date + ${selectedType.validity_years} year${selectedType.validity_years > 1 ? 's' : ''}`
              : 'Determined by the selected training type'}
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Provider</label>
          <input {...register('provider')} className={inputCls} placeholder="Training provider or course name" />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Certificate (optional)</label>
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={(e) => setCertFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
          />
          {certFile && <p className="mt-1 text-xs text-slate-500">Selected: {certFile.name}</p>}
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? 'Saving…' : 'Record Training'}
          </button>
          <a href="/training" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">
            Cancel
          </a>
        </div>
      </form>
    </div>
  )
}
