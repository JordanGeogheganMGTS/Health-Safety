'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  fire_alarm_system_id: z.string().uuid('Please select a fire alarm system'),
  test_date: z.string().min(1, 'Test date is required'),
  test_type_id: z.string().uuid('Please select a test type'),
  call_point_tested: z.string().optional(),
  outcome_id: z.string().uuid('Outcome is required'),
  fault_description: z.string().optional(),
  remedial_action: z.string().optional(),
  notes: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface AlarmSystem {
  id: string
  panel_location: string | null
  manufacturer: string | null
  model: string | null
  sites: { name: string } | null
}
interface LookupOption { id: string; label: string }

// ─── Component ────────────────────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ id: string }>
}

export default function EditAlarmTestPage({ params }: PageProps) {
  const router = useRouter()
  const supabase = createClient()

  const [testId, setTestId] = useState<string | null>(null)
  const [systems, setSystems] = useState<AlarmSystem[]>([])
  const [testTypes, setTestTypes] = useState<LookupOption[]>([])
  const [outcomes, setOutcomes] = useState<LookupOption[]>([])
  const [loading, setLoading] = useState(true)
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const outcomeIdWatched = useWatch({ control, name: 'outcome_id' })
  const selectedOutcomeLabel = outcomes.find((o) => o.id === outcomeIdWatched)?.label ?? ''
  const showFaults = selectedOutcomeLabel.toLowerCase() === 'fail'

  useEffect(() => {
    async function load() {
      const { id } = await params
      setTestId(id)

      const { data: cats } = await supabase
        .from('lookup_categories')
        .select('id, key')
        .in('key', ['alarm_test_type', 'alarm_test_outcome'])

      const testTypeCatId = cats?.find((c) => c.key === 'alarm_test_type')?.id
      const outcomeCatId = cats?.find((c) => c.key === 'alarm_test_outcome')?.id

      const [{ data: rec }, { data: systemsData }, { data: testTypesData }, { data: outcomesData }] =
        await Promise.all([
          supabase.from('fire_alarm_tests').select('*').eq('id', id).single(),
          supabase
            .from('fire_alarm_systems')
            .select('id, panel_location, manufacturer, model, sites(name)')
            .eq('is_active', true),
          testTypeCatId
            ? supabase.from('lookup_values').select('id, label').eq('category_id', testTypeCatId).order('sort_order')
            : Promise.resolve({ data: [] }),
          outcomeCatId
            ? supabase.from('lookup_values').select('id, label').eq('category_id', outcomeCatId).order('sort_order')
            : Promise.resolve({ data: [] }),
        ])

      setSystems((systemsData ?? []) as unknown as AlarmSystem[])
      setTestTypes((testTypesData ?? []) as LookupOption[])
      setOutcomes((outcomesData ?? []) as LookupOption[])

      if (rec) {
        reset({
          fire_alarm_system_id: rec.fire_alarm_system_id ?? '',
          test_date: rec.test_date ?? '',
          test_type_id: rec.test_type_id ?? '',
          call_point_tested: rec.call_point_tested ?? '',
          outcome_id: rec.outcome_id ?? '',
          fault_description: rec.fault_description ?? '',
          remedial_action: rec.remedial_action ?? '',
          notes: rec.notes ?? '',
        })
      }

      setLoading(false)
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function onSubmit(values: FormValues) {
    if (!testId) return
    setServerError(null)

    const { error } = await supabase
      .from('fire_alarm_tests')
      .update({
        fire_alarm_system_id: values.fire_alarm_system_id,
        test_date: values.test_date,
        test_type_id: values.test_type_id,
        call_point_tested: values.call_point_tested || null,
        outcome_id: values.outcome_id,
        fault_description: values.fault_description || null,
        remedial_action: values.remedial_action || null,
        notes: values.notes || null,
      })
      .eq('id', testId)

    if (error) { setServerError(error.message); return }
    router.push(`/fire-safety/alarm/${testId}`)
  }

  const inputClass = 'block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500'
  const selectClass = 'block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 disabled:opacity-50'
  const labelClass = 'block text-sm font-medium text-slate-700'
  const errorClass = 'text-xs text-red-600'

  if (loading) return <div className="flex items-center justify-center py-16"><p className="text-sm text-slate-500">Loading…</p></div>

  return (
    <div className="space-y-6">
      <div>
        <nav className="flex items-center gap-2 text-sm text-slate-500 mb-4">
          <a href="/fire-safety" className="hover:text-slate-700 hover:underline">Fire Safety</a>
          <span>/</span>
          <a href={`/fire-safety/alarm/${testId}`} className="hover:text-slate-700 hover:underline">Alarm Test</a>
          <span>/</span>
          <span className="font-medium text-slate-800">Edit</span>
        </nav>
        <h1 className="text-2xl font-semibold text-slate-900">Edit Alarm Test</h1>
      </div>

      <div className="max-w-2xl">
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          {serverError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{serverError}</div>
          )}

          {/* System */}
          <div className="space-y-1">
            <label htmlFor="fire_alarm_system_id" className={labelClass}>Fire Alarm System <span className="text-red-500">*</span></label>
            <select id="fire_alarm_system_id" {...register('fire_alarm_system_id')} className={selectClass}>
              <option value="">Select a system…</option>
              {systems.map((s) => (
                <option key={s.id} value={s.id}>
                  {(s.sites as unknown as { name: string } | null)?.name ?? 'Unknown Site'}
                  {(s.manufacturer || s.model || s.panel_location)
                    ? ` — ${[s.manufacturer, s.model].filter(Boolean).join(' ') || s.panel_location}`
                    : ''}
                </option>
              ))}
            </select>
            {errors.fire_alarm_system_id && <p className={errorClass}>{errors.fire_alarm_system_id.message}</p>}
          </div>

          {/* Test Date */}
          <div className="space-y-1">
            <label htmlFor="test_date" className={labelClass}>Test Date <span className="text-red-500">*</span></label>
            <input id="test_date" type="date" {...register('test_date')} className={inputClass} />
            {errors.test_date && <p className={errorClass}>{errors.test_date.message}</p>}
          </div>

          {/* Test Type */}
          <div className="space-y-1">
            <label htmlFor="test_type_id" className={labelClass}>Test Type <span className="text-red-500">*</span></label>
            <select id="test_type_id" {...register('test_type_id')} className={selectClass}>
              <option value="">Select a test type…</option>
              {testTypes.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
            {errors.test_type_id && <p className={errorClass}>{errors.test_type_id.message}</p>}
          </div>

          {/* Call Point */}
          <div className="space-y-1">
            <label htmlFor="call_point_tested" className={labelClass}>Call Point Tested</label>
            <input id="call_point_tested" type="text" {...register('call_point_tested')} className={inputClass} placeholder="e.g. CP-01, Zone A" />
          </div>

          {/* Outcome */}
          <div className="space-y-1">
            <label htmlFor="outcome_id" className={labelClass}>Outcome <span className="text-red-500">*</span></label>
            <select id="outcome_id" {...register('outcome_id')} className={selectClass}>
              <option value="">Select an outcome…</option>
              {outcomes.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
            {errors.outcome_id && <p className={errorClass}>{errors.outcome_id.message}</p>}
          </div>

          {/* Fault Description — shown when Fail */}
          {showFaults && (
            <div className="space-y-1">
              <label htmlFor="fault_description" className={labelClass}>Fault Description</label>
              <textarea id="fault_description" {...register('fault_description')} rows={3} className={inputClass} placeholder="Describe the faults identified…" />
            </div>
          )}

          {/* Remedial Action */}
          <div className="space-y-1">
            <label htmlFor="remedial_action" className={labelClass}>Remedial Action</label>
            <textarea id="remedial_action" {...register('remedial_action')} rows={3} className={inputClass} />
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <label htmlFor="notes" className={labelClass}>Notes</label>
            <textarea id="notes" {...register('notes')} rows={3} className={inputClass} />
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
            <button type="button" onClick={() => router.back()} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="rounded-lg bg-orange-500 px-5 py-2 text-sm font-medium text-white hover:bg-orange-600 transition-colors disabled:opacity-60">
              {isSubmitting ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
