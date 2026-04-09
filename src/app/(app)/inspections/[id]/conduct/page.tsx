'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { createClient } from '@/lib/supabase/client'

// ─── Types ────────────────────────────────────────────────────────────────────

type ResponseType = 'pass_fail' | 'yes_no' | 'yes_no_na' | 'numeric' | 'text'

interface TemplateItem {
  id: string
  item_text: string
  response_type: ResponseType
  is_required: boolean
  sort_order: number
  guidance: string | null
}

interface LookupVal { id: string; label: string }

interface FindingField {
  template_item_id: string
  item_text:        string
  response_type:    ResponseType
  is_required:      boolean
  guidance:         string | null
  response:         string   // yes/no/pass/fail/n/a
  response_text:    string   // text-type answer or finding detail
  response_numeric: string   // numeric-type answer
  severity_id:      string
}

interface FormValues {
  summary_notes: string
  findings: FindingField[]
}

// ─── Toggle button (2-way) ────────────────────────────────────────────────────

function ToggleButton({
  optionA, optionB, value, onChange,
}: {
  optionA: string; optionB: string; value: string; onChange: (v: string) => void
}) {
  const a = optionA.toLowerCase()
  const b = optionB.toLowerCase()
  const isGood  = (v: string) => v === 'pass' || v === 'yes'
  const isBad   = (v: string) => v === 'fail' || v === 'no'
  return (
    <div className="inline-flex rounded-lg border border-slate-300 overflow-hidden">
      <button type="button" onClick={() => onChange(a)}
        className={`px-4 py-1.5 text-sm font-medium transition-colors ${
          value === a
            ? isGood(a) ? 'bg-green-600 text-white' : isBad(a) ? 'bg-red-600 text-white' : 'bg-slate-600 text-white'
            : 'bg-white text-slate-600 hover:bg-slate-50'
        }`}>{optionA}</button>
      <button type="button" onClick={() => onChange(b)}
        className={`px-4 py-1.5 text-sm font-medium border-l border-slate-300 transition-colors ${
          value === b
            ? isBad(b) ? 'bg-red-600 text-white' : isGood(b) ? 'bg-green-600 text-white' : 'bg-slate-600 text-white'
            : 'bg-white text-slate-600 hover:bg-slate-50'
        }`}>{optionB}</button>
    </div>
  )
}

// ─── 3-way toggle (Yes / No / N/A) ───────────────────────────────────────────

function ThreeWayToggle({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const options = [
    { val: 'yes', label: 'Yes', activeClass: 'bg-green-600 text-white' },
    { val: 'no',  label: 'No',  activeClass: 'bg-red-600 text-white' },
    { val: 'n/a', label: 'N/A', activeClass: 'bg-slate-500 text-white' },
  ]
  return (
    <div className="inline-flex rounded-lg border border-slate-300 overflow-hidden">
      {options.map((opt, i) => (
        <button
          key={opt.val}
          type="button"
          onClick={() => onChange(opt.val)}
          className={`px-4 py-1.5 text-sm font-medium transition-colors ${i > 0 ? 'border-l border-slate-300' : ''} ${
            value === opt.val ? opt.activeClass : 'bg-white text-slate-600 hover:bg-slate-50'
          }`}
        >{opt.label}</button>
      ))}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ConductInspectionPage() {
  const params   = useParams<{ id: string }>()
  const id       = params.id
  const router   = useRouter()
  const supabase = createClient()

  const [severities, setSeverities] = useState<LookupVal[]>([])
  const [loading,    setLoading]    = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [serverErr,  setServerErr]  = useState<string | null>(null)
  const [inspTitle,  setInspTitle]  = useState('')

  const { register, control, handleSubmit, watch } = useForm<FormValues>({
    defaultValues: { summary_notes: '', findings: [] },
  })

  const { fields, replace } = useFieldArray({ control, name: 'findings' })
  const findingsWatch = watch('findings')

  useEffect(() => {
    async function load() {
      // Load inspection
      const { data: insp } = await supabase
        .from('inspections')
        .select('title, template_id')
        .eq('id', id)
        .single()

      if (!insp) { setLoading(false); return }
      setInspTitle(insp.title)

      // Load template items if linked
      let items: TemplateItem[] = []
      if (insp.template_id) {
        const { data: itemRows } = await supabase
          .from('inspection_template_items')
          .select('id, item_text, response_type, is_required, sort_order, guidance')
          .eq('template_id', insp.template_id)
          .order('sort_order', { ascending: true })
        items = (itemRows ?? []) as unknown as TemplateItem[]
      }

      // Load finding severity lookups (direct join)
      const { data: sevRows } = await supabase
        .from('lookup_values')
        .select('id, label, lookup_categories!inner(key)')
        .eq('lookup_categories.key', 'finding_severity')
        .eq('is_active', true)
        .order('sort_order')
      setSeverities((sevRows ?? []) as LookupVal[])

      // Initialise field array
      replace(items.map((item) => ({
        template_item_id: item.id,
        item_text:        item.item_text,
        response_type:    item.response_type,
        is_required:      item.is_required,
        guidance:         item.guidance,
        response:         '',
        response_text:    '',
        response_numeric: '',
        severity_id:      '',
      })))

      setLoading(false)
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function onSubmit(values: FormValues) {
    setSubmitting(true)
    setServerErr(null)

    // Update inspection to Submitted with summary notes
    const { error: updateErr } = await supabase
      .from('inspections')
      .update({
        status:        'Submitted',
        summary_notes: values.summary_notes || null,
      })
      .eq('id', id)

    if (updateErr) {
      setServerErr(updateErr.message)
      setSubmitting(false)
      return
    }

    // Insert findings (one per checklist item)
    if (values.findings.length > 0) {
      const findingInserts = values.findings.map((f) => {
        const isToggleType = ['yes_no', 'yes_no_na', 'pass_fail'].includes(f.response_type)
        return {
          inspection_id:    id,
          template_item_id: f.template_item_id || null,
          description:      f.item_text,
          severity_id:      f.severity_id || null,
          // Toggle types → response column; others → null
          response:         isToggleType ? (f.response || null) : null,
          // Text type answer or finding detail for fail/no responses
          response_text:    f.response_type === 'text'
            ? (f.response_text || null)
            : (f.response_text || null),
          // Numeric type answer
          response_numeric: f.response_type === 'numeric' && f.response_numeric
            ? parseFloat(f.response_numeric)
            : null,
        }
      })

      const { error: findErr } = await supabase
        .from('inspection_findings')
        .insert(findingInserts)

      if (findErr) {
        setServerErr(findErr.message)
        setSubmitting(false)
        return
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
    <div className="max-w-4xl space-y-6">
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
          const fw = findingsWatch[index]
          const response = fw?.response ?? ''
          const needsDetail = response === 'fail' || response === 'no'
          const responseText = fw?.response_text ?? ''

          return (
            <div
              key={field.id}
              className={`rounded-xl border bg-white p-5 shadow-sm transition-colors ${
                needsDetail ? 'border-red-200' : 'border-slate-200'
              }`}
            >
              <div className="mb-3">
                <p className="text-sm font-medium text-slate-800">
                  {index + 1}. {field.item_text}
                  {field.is_required && <span className="ml-1 text-red-500">*</span>}
                </p>
                {field.guidance && (
                  <p className="mt-0.5 text-xs text-slate-400">{field.guidance}</p>
                )}
              </div>

              {/* Response input */}
              <Controller
                control={control}
                name={`findings.${index}.response`}
                render={({ field: f }) => {
                  if (field.response_type === 'pass_fail') {
                    return <ToggleButton optionA="Pass" optionB="Fail" value={f.value} onChange={f.onChange} />
                  }
                  if (field.response_type === 'yes_no') {
                    return <ToggleButton optionA="Yes" optionB="No" value={f.value} onChange={f.onChange} />
                  }
                  if (field.response_type === 'yes_no_na') {
                    return <ThreeWayToggle value={f.value} onChange={f.onChange} />
                  }
                  return null
                }}
              />

              {/* Numeric input */}
              {field.response_type === 'numeric' && (
                <input
                  type="number"
                  step="any"
                  {...register(`findings.${index}.response_numeric`)}
                  placeholder="Enter value…"
                  className="block w-40 rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
              )}

              {/* Text input */}
              {field.response_type === 'text' && (
                <textarea
                  {...register(`findings.${index}.response_text`)}
                  rows={2}
                  placeholder="Enter response…"
                  className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
              )}

              {/* Finding detail for fail/no responses */}
              {needsDetail && (
                <div className="mt-3 space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600">
                      Finding Detail <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      {...register(`findings.${index}.response_text`)}
                      rows={2}
                      placeholder="Describe the finding…"
                      className="mt-1 block w-full rounded-lg border border-red-300 px-3 py-2 text-sm shadow-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                    />
                  </div>
                  {responseText.trim().length > 0 && (
                    <div>
                      <label className="block text-xs font-medium text-slate-600">Severity</label>
                      <select
                        {...register(`findings.${index}.severity_id`)}
                        className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                      >
                        <option value="">Select severity…</option>
                        {severities.map((s) => (
                          <option key={s.id} value={s.id}>{s.label}</option>
                        ))}
                      </select>
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
            {...register('summary_notes')}
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
