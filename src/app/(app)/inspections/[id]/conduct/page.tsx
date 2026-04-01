'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { createClient } from '@/lib/supabase/client'

// ─── Types ────────────────────────────────────────────────────────────────────

type ResponseType = 'pass_fail' | 'yes_no' | 'score_1_5' | 'text'

interface TemplateItem {
  id: string
  item_text: string
  response_type: ResponseType
  is_mandatory: boolean
  sort_order: number
  guidance: string | null
}

interface LookupVal { id: string; label: string }

interface FindingField {
  template_item_id: string
  item_text: string
  response_type: ResponseType
  is_mandatory: boolean
  guidance: string | null
  response: string
  finding_detail: string
  severity_id: string
}

interface FormValues {
  notes: string
  findings: FindingField[]
}

// ─── Score selector ───────────────────────────────────────────────────────────

function ScoreSelector({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex gap-2">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(String(n))}
          className={`h-9 w-9 rounded-lg border text-sm font-semibold transition-colors ${
            value === String(n)
              ? 'border-orange-500 bg-orange-500 text-white'
              : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
          }`}
        >
          {n}
        </button>
      ))}
    </div>
  )
}

// ─── Toggle button ────────────────────────────────────────────────────────────

function ToggleButton({
  optionA,
  optionB,
  value,
  onChange,
}: {
  optionA: string
  optionB: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="inline-flex rounded-lg border border-slate-300 overflow-hidden">
      <button
        type="button"
        onClick={() => onChange(optionA.toLowerCase())}
        className={`px-4 py-1.5 text-sm font-medium transition-colors ${
          value === optionA.toLowerCase()
            ? optionA.toLowerCase() === 'pass' || optionA.toLowerCase() === 'yes'
              ? 'bg-green-600 text-white'
              : 'bg-red-600 text-white'
            : 'bg-white text-slate-600 hover:bg-slate-50'
        }`}
      >
        {optionA}
      </button>
      <button
        type="button"
        onClick={() => onChange(optionB.toLowerCase())}
        className={`px-4 py-1.5 text-sm font-medium border-l border-slate-300 transition-colors ${
          value === optionB.toLowerCase()
            ? optionB.toLowerCase() === 'fail' || optionB.toLowerCase() === 'no'
              ? 'bg-red-600 text-white'
              : 'bg-green-600 text-white'
            : 'bg-white text-slate-600 hover:bg-slate-50'
        }`}
      >
        {optionB}
      </button>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ConductInspectionPage() {
  const params   = useParams<{ id: string }>()
  const id       = params.id
  const router   = useRouter()
  const supabase = createClient()

  const [templateItems, setTemplateItems] = useState<TemplateItem[]>([])
  const [severities,    setSeverities]    = useState<LookupVal[]>([])
  const [loading,       setLoading]       = useState(true)
  const [submitting,    setSubmitting]    = useState(false)
  const [serverErr,     setServerErr]     = useState<string | null>(null)
  const [inspTitle,     setInspTitle]     = useState('')

  const { register, control, handleSubmit, watch } = useForm<FormValues>({
    defaultValues: { notes: '', findings: [] },
  })

  const { fields, replace } = useFieldArray({ control, name: 'findings' })
  const findingsWatch = watch('findings')

  useEffect(() => {
    async function load() {
      // Load inspection to get template_id and title
      const { data: insp } = await supabase
        .from('inspections')
        .select('title, template_id')
        .eq('id', id)
        .single()

      if (!insp) { setLoading(false); return }
      setInspTitle(insp.title)

      // Load template items if a template is linked
      let items: TemplateItem[] = []
      if (insp.template_id) {
        const { data: itemRows } = await supabase
          .from('inspection_template_items')
          .select('id, item_text, response_type, is_mandatory, sort_order, guidance')
          .eq('template_id', insp.template_id)
          .order('sort_order', { ascending: true })

        items = (itemRows ?? []) as unknown as TemplateItem[]
      }

      // Load severity lookups
      const { data: sevRows } = await supabase
        .from('lookup_values')
        .select('id, label')
        .eq('category', 'severity')
        .order('label')

      setSeverities((sevRows ?? []) as unknown as LookupVal[])

      // Initialise field array from template items
      const initial: FindingField[] = items.map((item) => ({
        template_item_id: item.id,
        item_text:        item.item_text,
        response_type:    item.response_type,
        is_mandatory:     item.is_mandatory,
        guidance:         item.guidance,
        response:         '',
        finding_detail:   '',
        severity_id:      '',
      }))
      replace(initial)
      setTemplateItems(items)
      setLoading(false)
    }
    load()
  }, [id])

  async function onSubmit(values: FormValues) {
    setSubmitting(true)
    setServerErr(null)

    const today = new Date().toISOString().split('T')[0]

    // Determine overall outcome — any fail/no response = fail
    const hasFailure = values.findings.some((f) => {
      const r = f.response.toLowerCase()
      return r === 'fail' || r === 'no'
    })

    // 1. Update inspection status
    const { error: updateErr } = await supabase
      .from('inspections')
      .update({
        status:           'Completed',
        completed_date:   today,
        notes:            values.notes || null,
      })
      .eq('id', id)

    if (updateErr) {
      setServerErr(updateErr.message)
      setSubmitting(false)
      return
    }

    // 2. Insert findings
    const findingInserts = values.findings.map((f, i) => ({
      inspection_id:    id,
      template_item_id: f.template_item_id || null,
      item_text:        f.item_text,
      response:         f.response || null,
      finding_detail:   f.finding_detail || null,
      severity_id:      f.severity_id || null,
      sort_order:       i,
    }))

    let insertedFindings: { id: string; response: string | null; finding_detail: string | null; severity_id: string | null; item_text: string }[] = []

    if (findingInserts.length > 0) {
      const { data: inserted, error: findErr } = await supabase
        .from('inspection_findings')
        .insert(findingInserts)
        .select('id, response, finding_detail, severity_id, item_text')

      if (findErr) {
        setServerErr(findErr.message)
        setSubmitting(false)
        return
      }
      insertedFindings = inserted ?? []
    }

    // 3. Insert corrective actions for fail/no findings that have a severity
    const caInserts = insertedFindings
      .filter((f) => {
        const r = (f.response ?? '').toLowerCase()
        return (r === 'fail' || r === 'no') && f.severity_id && f.finding_detail
      })
      .map((f) => ({
        title:         `Finding: ${f.item_text}`,
        description:   f.finding_detail,
        source_module: 'inspections',
        source_id:     id,
        status:        'Open',
        priority:      'Medium',
      }))

    if (caInserts.length > 0) {
      const { data: caRows, error: caErr } = await supabase
        .from('corrective_actions')
        .insert(caInserts)
        .select('id')

      if (caErr) {
        // Non-fatal — log but continue
        console.error('CA insert error:', caErr.message)
      } else if (caRows) {
        // Link each CA back to its finding
        const failFindings = insertedFindings.filter((f) => {
          const r = (f.response ?? '').toLowerCase()
          return (r === 'fail' || r === 'no') && f.severity_id && f.finding_detail
        })

        await Promise.all(
          failFindings.map((f, i) =>
            caRows[i]
              ? supabase
                  .from('inspection_findings')
                  .update({ ca_id: caRows[i].id })
                  .eq('id', f.id)
              : Promise.resolve()
          )
        )
      }
    }

    router.push(`/inspections/${id}`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-sm text-slate-400">
        Loading inspection…
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Conduct Inspection</h1>
        <p className="mt-1 text-sm text-slate-500">{inspTitle}</p>
      </div>

      {serverErr && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {serverErr}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* No template warning */}
        {fields.length === 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-700">
            No template items found. You can still complete this inspection by adding notes below.
          </div>
        )}

        {/* Checklist items */}
        {fields.map((field, index) => {
          const currentResponse = findingsWatch[index]?.response ?? ''
          const needsDetail =
            currentResponse === 'fail' || currentResponse === 'no'
          const currentDetail = findingsWatch[index]?.finding_detail ?? ''

          return (
            <div
              key={field.id}
              className={`rounded-xl border bg-white p-5 shadow-sm transition-colors ${
                needsDetail ? 'border-red-200' : 'border-slate-200'
              }`}
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-800">
                    {index + 1}. {field.item_text}
                    {field.is_mandatory && (
                      <span className="ml-1 text-red-500">*</span>
                    )}
                  </p>
                  {field.guidance && (
                    <p className="mt-0.5 text-xs text-slate-400">{field.guidance}</p>
                  )}
                </div>
              </div>

              {/* Response input */}
              <Controller
                control={control}
                name={`findings.${index}.response`}
                render={({ field: f }) => {
                  if (field.response_type === 'pass_fail') {
                    return (
                      <ToggleButton
                        optionA="Pass"
                        optionB="Fail"
                        value={f.value}
                        onChange={f.onChange}
                      />
                    )
                  }
                  if (field.response_type === 'yes_no') {
                    return (
                      <ToggleButton
                        optionA="Yes"
                        optionB="No"
                        value={f.value}
                        onChange={f.onChange}
                      />
                    )
                  }
                  if (field.response_type === 'score_1_5') {
                    return <ScoreSelector value={f.value} onChange={f.onChange} />
                  }
                  // text
                  return (
                    <textarea
                      value={f.value}
                      onChange={f.onChange}
                      rows={2}
                      placeholder="Enter response…"
                      className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                    />
                  )
                }}
              />

              {/* Conditional finding detail */}
              {needsDetail && (
                <div className="mt-3 space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600">
                      Finding Detail <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      {...register(`findings.${index}.finding_detail`)}
                      rows={2}
                      placeholder="Describe the finding…"
                      className="mt-1 block w-full rounded-lg border border-red-300 px-3 py-2 text-sm shadow-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                    />
                  </div>

                  {/* Conditional severity (only if finding detail is filled) */}
                  {currentDetail.trim().length > 0 && (
                    <div>
                      <label className="block text-xs font-medium text-slate-600">
                        Severity
                      </label>
                      <select
                        {...register(`findings.${index}.severity_id`)}
                        className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                      >
                        <option value="">Select severity…</option>
                        {severities.map((s) => (
                          <option key={s.id} value={s.id}>{s.label}</option>
                        ))}
                      </select>
                      <p className="mt-1 text-xs text-slate-400">
                        A corrective action will be automatically created if severity is set.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}

        {/* Overall notes */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <label className="block text-sm font-medium text-slate-700">
            Overall Notes (optional)
          </label>
          <textarea
            {...register('notes')}
            rows={3}
            placeholder="Any additional notes about this inspection…"
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-orange-500 px-6 py-2 text-sm font-medium text-white shadow-sm hover:bg-orange-600 transition-colors disabled:opacity-60"
          >
            {submitting ? 'Submitting…' : 'Complete Inspection'}
          </button>
        </div>
      </form>
    </div>
  )
}
