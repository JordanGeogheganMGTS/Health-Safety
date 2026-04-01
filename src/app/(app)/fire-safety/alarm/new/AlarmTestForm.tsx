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
  system_id: z.string().uuid('Please select a fire alarm system'),
  test_date: z.string().min(1, 'Test date is required'),
  test_type: z.enum(['Weekly', 'Monthly', 'Annual']),
  call_point_ref: z.string().optional(),
  outcome: z.enum(['Pass', 'Fail'], { required_error: 'Outcome is required' }),
  faults_found: z.string().optional(),
  actions_taken: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

// ─── Types ────────────────────────────────────────────────────────────────────

interface AlarmSystem {
  id: string
  system_description: string | null
  sites: { id: string; name: string } | null
}

interface Props {
  systems: AlarmSystem[]
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function futureDateStr(daysFromNow: number): string {
  const d = new Date()
  d.setDate(d.getDate() + daysFromNow)
  return d.toISOString().split('T')[0]
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AlarmTestForm({ systems }: Props) {
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
      test_type: 'Weekly',
      outcome: 'Pass',
    },
  })

  const testTypeWatched = useWatch({ control, name: 'test_type' })
  const outcomeWatched = useWatch({ control, name: 'outcome' })
  const showCallPoint = testTypeWatched === 'Weekly'
  const showFaults = outcomeWatched === 'Fail'

  async function onSubmit(values: FormValues) {
    setServerError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setServerError('You must be logged in.')
      return
    }

    // Find the selected system's site
    const selectedSystem = systems.find((s) => s.id === values.system_id)
    const siteId = selectedSystem?.sites?.id ?? null

    // Build alarm test row
    const testRow: Record<string, unknown> = {
      system_id: values.system_id,
      test_date: values.test_date,
      test_type: values.test_type,
      call_point_ref: values.call_point_ref || null,
      tested_by_id: user.id,
      outcome: values.outcome,
      faults_found: values.faults_found || null,
      actions_taken: values.actions_taken || null,
    }

    // If fail with faults, create a corrective action first
    if (values.outcome === 'Fail' && values.faults_found) {
      const truncatedTitle = `Fire Alarm Fault: ${values.faults_found}`.slice(0, 80)
      const { data: caData, error: caError } = await supabase
        .from('corrective_actions')
        .insert({
          title: truncatedTitle,
          source_module: 'fire_alarm_tests',
          priority: 'High',
          site_id: siteId,
          due_date: futureDateStr(7),
          created_by_id: user.id,
          status: 'Open',
        })
        .select('id')
        .single()

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

        {systems.length === 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            No fire alarm systems have been configured. Please add a system before logging a test.
          </div>
        )}

        {/* System */}
        <div className="space-y-1">
          <label htmlFor="system_id" className={labelClass}>
            Fire Alarm System <span className="text-red-500">*</span>
          </label>
          <select id="system_id" {...register('system_id')} className={selectClass}>
            <option value="">Select a system…</option>
            {systems.map((s) => (
              <option key={s.id} value={s.id}>
                {s.sites?.[0]?.name ?? 'Unknown Site'}{s.system_description ? ` — ${s.system_description}` : ''}
              </option>
            ))}
          </select>
          {errors.system_id && <p className={errorClass}>{errors.system_id.message}</p>}
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
          <label htmlFor="test_type" className={labelClass}>
            Test Type <span className="text-red-500">*</span>
          </label>
          <select id="test_type" {...register('test_type')} className={selectClass}>
            <option value="Weekly">Weekly</option>
            <option value="Monthly">Monthly</option>
            <option value="Annual">Annual</option>
          </select>
          {errors.test_type && <p className={errorClass}>{errors.test_type.message}</p>}
        </div>

        {/* Call Point Ref — shown for Weekly tests */}
        {showCallPoint && (
          <div className="space-y-1">
            <label htmlFor="call_point_ref" className={labelClass}>Call Point Reference</label>
            <input id="call_point_ref" type="text" {...register('call_point_ref')} className={inputClass} placeholder="e.g. CP-01, Zone A" />
          </div>
        )}

        {/* Outcome */}
        <div className="space-y-1">
          <label htmlFor="outcome" className={labelClass}>
            Outcome <span className="text-red-500">*</span>
          </label>
          <select id="outcome" {...register('outcome')} className={selectClass}>
            <option value="Pass">Pass</option>
            <option value="Fail">Fail</option>
          </select>
          {errors.outcome && <p className={errorClass}>{errors.outcome.message}</p>}
        </div>

        {/* Faults Found — shown when Fail */}
        {showFaults && (
          <div className="space-y-1">
            <label htmlFor="faults_found" className={labelClass}>Faults Found</label>
            <textarea id="faults_found" {...register('faults_found')} rows={3} className={inputClass} placeholder="Describe the faults identified…" />
            <p className="text-xs text-amber-600">A corrective action will be automatically created for this fault.</p>
          </div>
        )}

        {/* Actions Taken */}
        <div className="space-y-1">
          <label htmlFor="actions_taken" className={labelClass}>Actions Taken</label>
          <textarea id="actions_taken" {...register('actions_taken')} rows={3} className={inputClass} placeholder="Describe any immediate actions taken…" />
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
