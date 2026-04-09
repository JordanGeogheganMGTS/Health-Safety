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
  inspection_date: z.string().min(1, 'Inspection date is required'),
  inspected_by: z.string().min(1, 'Inspector name is required'),
  outcome_id: z.string().uuid('Please select an outcome'),
  notes: z.string().optional(),
  next_due_date: z.string().min(1, 'Next due date is required'),
})

type FormValues = z.infer<typeof schema>

interface LookupOption { id: string; label: string }

// ─── Component ────────────────────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ id: string }>
}

export default function InspectExtinguisherPage({ params }: PageProps) {
  const router = useRouter()
  const supabase = createClient()

  const [extinguisherId, setExtinguisherId] = useState<string | null>(null)
  const [extinguisherLabel, setExtinguisherLabel] = useState<string>('Extinguisher')
  const [outcomes, setOutcomes] = useState<LookupOption[]>([])
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
      inspection_date: today,
    },
  })

  useEffect(() => {
    async function load() {
      const { id } = await params
      setExtinguisherId(id)

      const { data: catData } = await supabase
        .from('lookup_categories')
        .select('id')
        .eq('key', 'extinguisher_outcome')
        .single()

      const [{ data: extData }, { data: outcomesData }] = await Promise.all([
        supabase
          .from('fire_extinguishers')
          .select('location, type:lookup_values!type_id(label)')
          .eq('id', id)
          .single(),
        catData
          ? supabase.from('lookup_values').select('id, label').eq('category_id', catData.id).order('sort_order')
          : Promise.resolve({ data: [] }),
      ])

      if (extData) {
        const typeLabel = (extData.type as unknown as { label: string } | null)?.label ?? 'Unknown'
        setExtinguisherLabel(`${typeLabel} — ${extData.location}`)
      }
      setOutcomes((outcomesData ?? []) as LookupOption[])
      setLoading(false)
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function onSubmit(values: FormValues) {
    if (!extinguisherId) return
    setServerError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setServerError('You must be logged in.')
      return
    }

    // Upload certificate if provided
    let file_path: string | null = null
    let file_name: string | null = null
    if (certificateFile) {
      const { key, error: uploadError } = await uploadFile(
        `fire-extinguisher/${extinguisherId}/inspections`,
        certificateFile
      )
      if (uploadError) {
        setServerError(`File upload failed: ${uploadError}`)
        return
      }
      file_path = key
      file_name = certificateFile.name
    }

    // Insert inspection record
    const { error: insertError } = await supabase
      .from('fire_extinguisher_inspections')
      .insert({
        fire_extinguisher_id: extinguisherId,
        inspection_date: values.inspection_date,
        inspected_by: values.inspected_by,
        outcome_id: values.outcome_id,
        notes: values.notes || null,
        next_due_date: values.next_due_date,
        file_path,
        file_name,
        recorded_by: user.id,
      })

    if (insertError) {
      setServerError(insertError.message)
      return
    }

    // Update extinguisher dates
    const { error: updateError } = await supabase
      .from('fire_extinguishers')
      .update({
        last_inspection_date: values.inspection_date,
        next_inspection_date: values.next_due_date,
      })
      .eq('id', extinguisherId)

    if (updateError) {
      setServerError(updateError.message)
      return
    }

    router.push('/fire-safety')
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
          <a href="/fire-safety" className="hover:text-slate-700 hover:underline">Fire Safety</a>
          <span>/</span>
          <span className="font-medium text-slate-800">Log Inspection</span>
        </nav>
        <h1 className="text-2xl font-semibold text-slate-900">Log Extinguisher Inspection</h1>
        <p className="mt-1 text-sm text-slate-500">
          Recording an inspection for <strong>{extinguisherLabel}</strong>.
        </p>
      </div>

      <div className="max-w-4xl">
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

          {/* Inspection Date */}
          <div className="space-y-1">
            <label htmlFor="inspection_date" className={labelClass}>
              Inspection Date <span className="text-red-500">*</span>
            </label>
            <input id="inspection_date" type="date" {...register('inspection_date')} className={inputClass} />
            {errors.inspection_date && <p className={errorClass}>{errors.inspection_date.message}</p>}
          </div>

          {/* Inspector Name */}
          <div className="space-y-1">
            <label htmlFor="inspected_by" className={labelClass}>
              Inspector Name <span className="text-red-500">*</span>
            </label>
            <input id="inspected_by" type="text" {...register('inspected_by')} className={inputClass} placeholder="e.g. Jane Doe" />
            {errors.inspected_by && <p className={errorClass}>{errors.inspected_by.message}</p>}
          </div>

          {/* Outcome */}
          <div className="space-y-1">
            <label htmlFor="outcome_id" className={labelClass}>
              Outcome <span className="text-red-500">*</span>
            </label>
            <select id="outcome_id" {...register('outcome_id')} className={selectClass}>
              <option value="">Select outcome…</option>
              {outcomes.map((o) => (
                <option key={o.id} value={o.id}>{o.label}</option>
              ))}
            </select>
            {errors.outcome_id && <p className={errorClass}>{errors.outcome_id.message}</p>}
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <label htmlFor="notes" className={labelClass}>Notes</label>
            <textarea id="notes" {...register('notes')} rows={3} className={inputClass} placeholder="Findings, actions required, etc." />
          </div>

          {/* Next Due Date */}
          <div className="space-y-1">
            <label htmlFor="next_due_date" className={labelClass}>
              Next Inspection Due <span className="text-red-500">*</span>
            </label>
            <input id="next_due_date" type="date" {...register('next_due_date')} className={inputClass} />
            {errors.next_due_date && <p className={errorClass}>{errors.next_due_date.message}</p>}
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
              {isSubmitting ? 'Saving…' : 'Log Inspection'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
