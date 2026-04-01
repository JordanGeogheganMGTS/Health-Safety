'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { uploadFile } from '@/lib/storage'

// ─── Schema ───────────────────────────────────────────────────────────────────

const today = new Date().toISOString().split('T')[0]

const schema = z.object({
  service_date: z.string().min(1, 'Service date is required'),
  service_type: z.enum(['Routine Service', 'Repair', 'Inspection', 'Calibration', 'PAT Test']),
  engineer_name: z.string().optional(),
  company: z.string().optional(),
  outcome: z.enum(['Pass', 'Fail', 'Advisory'], { required_error: 'Outcome is required' }),
  notes: z.string().optional(),
  next_service_due: z.string().min(1, 'Next service due date is required'),
})

type FormValues = z.infer<typeof schema>

// ─── Component ────────────────────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ id: string }>
}

export default function NewServiceRecordPage({ params }: PageProps) {
  const router = useRouter()
  const supabase = createClient()

  const [equipmentId, setEquipmentId] = useState<string | null>(null)
  const [equipmentName, setEquipmentName] = useState<string>('')
  const [certificateFile, setCertificateFile] = useState<File | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      service_date: today,
      service_type: 'Routine Service',
    },
  })

  useEffect(() => {
    async function load() {
      const { id } = await params
      setEquipmentId(id)
      const { data } = await supabase.from('equipment').select('name').eq('id', id).single()
      setEquipmentName(data?.name ?? 'Equipment')
      setLoading(false)
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function onSubmit(values: FormValues) {
    if (!equipmentId) return
    setServerError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setServerError('You must be logged in.')
      return
    }

    // Upload certificate if provided
    let certificate_key: string | null = null
    if (certificateFile) {
      const { key, error: uploadError } = await uploadFile(
        `equipment/${equipmentId}/service`,
        certificateFile
      )
      if (uploadError) {
        setServerError(`File upload failed: ${uploadError}`)
        return
      }
      certificate_key = key
    }

    // Insert service record
    const { error: insertError } = await supabase
      .from('equipment_service_records')
      .insert({
        equipment_id: equipmentId,
        service_date: values.service_date,
        service_type: values.service_type,
        engineer_name: values.engineer_name || null,
        company: values.company || null,
        outcome: values.outcome,
        notes: values.notes || null,
        next_service_due: values.next_service_due,
        certificate_key,
        recorded_by: user.id,
      })

    if (insertError) {
      setServerError(insertError.message)
      return
    }

    // Update equipment last_service_date and next_service_due
    const { error: updateError } = await supabase
      .from('equipment')
      .update({
        last_service_date: values.service_date,
        next_service_due: values.next_service_due,
      })
      .eq('id', equipmentId)

    if (updateError) {
      setServerError(updateError.message)
      return
    }

    router.push(`/equipment/${equipmentId}`)
  }

  const inputClass =
    'block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500'
  const selectClass =
    'block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500'
  const labelClass = 'block text-sm font-medium text-slate-700'
  const errorClass = 'text-xs text-red-600'

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-sm text-slate-500">Loading…</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <nav className="flex items-center gap-2 text-sm text-slate-500 mb-4">
          <a href="/equipment" className="hover:text-slate-700 hover:underline">Equipment Register</a>
          <span>/</span>
          <a href={`/equipment/${equipmentId}`} className="hover:text-slate-700 hover:underline">{equipmentName}</a>
          <span>/</span>
          <span className="text-slate-800 font-medium">Log Service Record</span>
        </nav>
        <h1 className="text-2xl font-semibold text-slate-900">Log Service Record</h1>
        <p className="mt-1 text-sm text-slate-500">
          Recording a service record for <strong>{equipmentName}</strong>.
        </p>
      </div>

      <div className="max-w-2xl">
        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          {serverError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {serverError}
            </div>
          )}

          {/* Service Date */}
          <div className="space-y-1">
            <label htmlFor="service_date" className={labelClass}>
              Service Date <span className="text-red-500">*</span>
            </label>
            <input id="service_date" type="date" {...register('service_date')} className={inputClass} />
            {errors.service_date && <p className={errorClass}>{errors.service_date.message}</p>}
          </div>

          {/* Service Type */}
          <div className="space-y-1">
            <label htmlFor="service_type" className={labelClass}>
              Service Type <span className="text-red-500">*</span>
            </label>
            <select id="service_type" {...register('service_type')} className={selectClass}>
              <option value="Routine Service">Routine Service</option>
              <option value="Repair">Repair</option>
              <option value="Inspection">Inspection</option>
              <option value="Calibration">Calibration</option>
              <option value="PAT Test">PAT Test</option>
            </select>
            {errors.service_type && <p className={errorClass}>{errors.service_type.message}</p>}
          </div>

          {/* Engineer & Company */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label htmlFor="engineer_name" className={labelClass}>Engineer Name</label>
              <input id="engineer_name" type="text" {...register('engineer_name')} className={inputClass} placeholder="e.g. John Smith" />
            </div>
            <div className="space-y-1">
              <label htmlFor="company" className={labelClass}>Company</label>
              <input id="company" type="text" {...register('company')} className={inputClass} placeholder="e.g. ABC Maintenance Ltd" />
            </div>
          </div>

          {/* Outcome */}
          <div className="space-y-1">
            <label htmlFor="outcome" className={labelClass}>
              Outcome <span className="text-red-500">*</span>
            </label>
            <select id="outcome" {...register('outcome')} className={selectClass}>
              <option value="">Select outcome…</option>
              <option value="Pass">Pass</option>
              <option value="Fail">Fail</option>
              <option value="Advisory">Advisory</option>
            </select>
            {errors.outcome && <p className={errorClass}>{errors.outcome.message}</p>}
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <label htmlFor="notes" className={labelClass}>Notes</label>
            <textarea id="notes" {...register('notes')} rows={4} className={inputClass} placeholder="Findings, actions taken, etc." />
          </div>

          {/* Next Service Due */}
          <div className="space-y-1">
            <label htmlFor="next_service_due" className={labelClass}>
              Next Service Due <span className="text-red-500">*</span>
            </label>
            <input id="next_service_due" type="date" {...register('next_service_due')} className={inputClass} />
            {errors.next_service_due && <p className={errorClass}>{errors.next_service_due.message}</p>}
          </div>

          {/* Certificate Upload */}
          <div className="space-y-1">
            <label htmlFor="certificate_file" className={labelClass}>Certificate / Report (optional)</label>
            <input
              id="certificate_file"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => setCertificateFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-slate-700 file:mr-4 file:rounded-lg file:border-0 file:bg-orange-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-orange-700 hover:file:bg-orange-100"
            />
            {certificateFile && (
              <p className="text-xs text-slate-500">Selected: {certificateFile.name}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-orange-500 px-5 py-2 text-sm font-medium text-white hover:bg-orange-600 transition-colors disabled:opacity-60"
            >
              {isSubmitting ? 'Saving…' : 'Log Service Record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
