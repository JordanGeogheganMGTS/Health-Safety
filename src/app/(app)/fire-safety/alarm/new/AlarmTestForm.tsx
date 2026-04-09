'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'

// ─── Schema ───────────────────────────────────────────────────────────────────

const today = new Date().toISOString().split('T')[0]

const schema = z.object({
  fire_alarm_system_id: z.string().uuid('Please select a fire alarm system'),
  test_date: z.string().min(1, 'Test date is required'),
  test_type_id: z.string().uuid('Please select a test type'),
  call_point_tested: z.string().optional(),
  outcome_id: z.string().uuid('Outcome is required'),
  fault_description: z.string().optional(),
  remedial_action: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

// ─── Types ────────────────────────────────────────────────────────────────────

interface AlarmSystem {
  id: string
  panel_location: string | null
  manufacturer: string | null
  model: string | null
  sites: { id: string; name: string } | null
}

interface Props {
  systems: AlarmSystem[]
  testTypes: { id: string; label: string }[]
  outcomeOptions: { id: string; label: string }[]
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function futureDateStr(daysFromNow: number): string {
  const d = new Date()
  d.setDate(d.getDate() + daysFromNow)
  return d.toISOString().split('T')[0]
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AlarmTestForm({ systems, testTypes, outcomeOptions }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      test_date: today,
      test_type_id: testTypes[0]?.id ?? '',
      outcome_id: outcomeOptions[0]?.id ?? '',
    },
  })

  const outcomeIdWatched = useWatch({ control, name: 'outcome_id' })
  const selectedOutcomeLabel = outcomeOptions.find((o) => o.id === outcomeIdWatched)?.label ?? ''
  const showFaults = selectedOutcomeLabel.toLowerCase() === 'fail'

  async function onSubmit(values: FormValues) {
    setServerError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setServerError('You must be logged in.')
      return
    }

    // Find the selected system's site
    const selectedSystem = systems.find((s) => s.id === values.fire_alarm_system_id)
    const siteId = selectedSystem?.sites?.id ?? null

    // Build alarm test row
    const testRow: Record<string, unknown> = {
      fire_alarm_system_id: values.fire_alarm_system_id,
      test_date: values.test_date,
      test_type_id: values.test_type_id,
      call_point_tested: values.call_point_tested || null,
      tested_by: user.id,
      outcome_id: values.outcome_id,
      fault_description: values.fault_description || null,
      remedial_action: values.remedial_action || null,
    }

    // If fail with faults, create a corrective action first
    if (showFaults && values.fault_description) {
      const truncatedTitle = `Fire Alarm Fault: ${values.fault_description}`.slice(0, 80)

      // Look up 'High' priority UUID
      let highPriorityId: string | null = null
      const { data: catRow } = await supabase.from('lookup_categories').select('id').eq('key', 'ca_priority').single()
      if (catRow) {
        const { data: pvRow } = await supabase.from('lookup_values').select('id').ilike('label', 'High').eq('category_id', catRow.id).single()
        highPriorityId = pvRow?.id ?? null
      }

      const { data: caData, error: caError } = highPriorityId ? await supabase
        .from('corrective_actions')
        .insert({
          title: truncatedTitle,
          source_table: 'fire_alarm_tests',
          priority_id: highPriorityId,
          site_id: siteId,
          due_date: futureDateStr(7),
          assigned_by: user.id,
          status: 'Open',
        })
        .select('id')
        .single() : { data: null, error: null }

      if (!caError && caData) {
        testRow.ca_id = caData.id
      }
    }

    const { error: insertError } = await supabase.from('fire_alarm_tests').insert(testRow)

    if (insertError) {
      setServerError(insertError.message)
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

  return (
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

        {systems.length === 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            No fire alarm systems have been configured. Please add a system before logging a test.
          </div>
        )}

        {/* System */}
        <div className="space-y-1">
          <label htmlFor="fire_alarm_system_id" className={labelClass}>
            Fire Alarm System <span className="text-red-500">*</span>
          </label>
          <select id="fire_alarm_system_id" {...register('fire_alarm_system_id')} className={selectClass}>
            <option value="">Select a system…</option>
            {systems.map((s) => (
              <option key={s.id} value={s.id}>
                {s.sites?.name ?? 'Unknown Site'}{(s.manufacturer || s.model || s.panel_location) ? ` — ${[s.manufacturer, s.model].filter(Boolean).join(' ') || s.panel_location}` : ''}
              </option>
            ))}
          </select>
          {errors.fire_alarm_system_id && <p className={errorClass}>{errors.fire_alarm_system_id.message}</p>}
        </div>

        {/* Test Date */}
        <div className="space-y-1">
          <label htmlFor="test_date" className={labelClass}>
            Test Date <span className="text-red-500">*</span>
          </label>
          <input id="test_date" type="date" {...register('test_date')} className={inputClass} />
          {errors.test_date && <p className={errorClass}>{errors.test_date.message}</p>}
        </div>

        {/* Test Type */}
        <div className="space-y-1">
          <label htmlFor="test_type_id" className={labelClass}>
            Test Type <span className="text-red-500">*</span>
          </label>
          <select id="test_type_id" {...register('test_type_id')} className={selectClass}>
            <option value="">Select a test type…</option>
            {testTypes.map((t) => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
          {errors.test_type_id && <p className={errorClass}>{errors.test_type_id.message}</p>}
        </div>

        {/* Call Point Tested */}
        <div className="space-y-1">
          <label htmlFor="call_point_tested" className={labelClass}>Call Point Tested</label>
          <input id="call_point_tested" type="text" {...register('call_point_tested')} className={inputClass} placeholder="e.g. CP-01, Zone A" />
        </div>

        {/* Outcome */}
        <div className="space-y-1">
          <label htmlFor="outcome_id" className={labelClass}>
            Outcome <span className="text-red-500">*</span>
          </label>
          <select id="outcome_id" {...register('outcome_id')} className={selectClass}>
            <option value="">Select an outcome…</option>
            {outcomeOptions.map((o) => (
              <option key={o.id} value={o.id}>{o.label}</option>
            ))}
          </select>
          {errors.outcome_id && <p className={errorClass}>{errors.outcome_id.message}</p>}
        </div>

        {/* Fault Description — shown when Fail */}
        {showFaults && (
          <div className="space-y-1">
            <label htmlFor="fault_description" className={labelClass}>Fault Description</label>
            <textarea id="fault_description" {...register('fault_description')} rows={3} className={inputClass} placeholder="Describe the faults identified…" />
            <p className="text-xs text-amber-600">A corrective action will be automatically created for this fault.</p>
          </div>
        )}

        {/* Remedial Action */}
        <div className="space-y-1">
          <label htmlFor="remedial_action" className={labelClass}>Remedial Action</label>
          <textarea id="remedial_action" {...register('remedial_action')} rows={3} className={inputClass} placeholder="Describe any immediate actions taken…" />
        </div>

        {/* Form Actions */}
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
            disabled={isSubmitting || systems.length === 0}
            className="rounded-lg bg-orange-500 px-5 py-2 text-sm font-medium text-white hover:bg-orange-600 transition-colors disabled:opacity-60"
          >
            {isSubmitting ? 'Saving…' : 'Log Alarm Test'}
          </button>
        </div>
      </form>
    </div>
  )
}
