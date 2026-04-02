'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface DseQuestion {
  id: string
  section_number: number
  section_label: string
  item_key: string
  item_text: string
  sort_order: number
}

interface User {
  id: string
  first_name: string
  last_name: string
}

interface Props {
  questions: DseQuestion[]
  users: User[]
  reviewIntervalMonths: number
  preselectedUserId: string | null
  assessedById: string
  assessedByName: string
}

interface ResponseState {
  response: 'yes' | 'no' | 'na' | null
  action_to_take: string
}

// Section 7 item keys that map to specific assessment fields
const SECTION7_KEYS = {
  discomfort: 'section7_discomfort',
  eye_test: 'section7_eye_test',
  breaks: 'section7_breaks',
}

function groupBySection(questions: DseQuestion[]) {
  const map = new Map<number, { label: string; questions: DseQuestion[] }>()
  for (const q of questions) {
    if (!map.has(q.section_number)) {
      map.set(q.section_number, { label: q.section_label, questions: [] })
    }
    map.get(q.section_number)!.questions.push(q)
  }
  return Array.from(map.entries()).sort(([a], [b]) => a - b)
}

export default function DseAssessmentForm({
  questions,
  users,
  reviewIntervalMonths,
  preselectedUserId,
  assessedById,
  assessedByName,
}: Props) {
  const router = useRouter()

  const today = new Date().toISOString().split('T')[0]

  const [userId, setUserId] = useState(preselectedUserId ?? '')
  const [workstationLocation, setWorkstationLocation] = useState('')
  const [assessmentDate, setAssessmentDate] = useState(today)
  const [additionalNotes, setAdditionalNotes] = useState('')
  const [discomfortDetail, setDiscomfortDetail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Initialise responses map keyed by item_key
  const initialResponses: Record<string, ResponseState> = {}
  for (const q of questions) {
    initialResponses[q.item_key] = { response: null, action_to_take: '' }
  }
  const [responses, setResponses] = useState<Record<string, ResponseState>>(initialResponses)

  // Reset responses when questions change (shouldn't happen, but safe)
  useEffect(() => {
    const init: Record<string, ResponseState> = {}
    for (const q of questions) {
      init[q.item_key] = { response: null, action_to_take: '' }
    }
    setResponses(init)
  }, [questions])

  function setResponse(itemKey: string, value: 'yes' | 'no' | 'na') {
    setResponses((prev) => ({
      ...prev,
      [itemKey]: { ...prev[itemKey], response: value, action_to_take: prev[itemKey]?.action_to_take ?? '' },
    }))
  }

  function setActionToTake(itemKey: string, value: string) {
    setResponses((prev) => ({
      ...prev,
      [itemKey]: { ...prev[itemKey], action_to_take: value },
    }))
  }

  const sections = groupBySection(questions)
  const isSection7 = (sectionNum: number) => sectionNum === 7

  // Derive section 7 booleans
  const discomfortResponse = responses[SECTION7_KEYS.discomfort]?.response
  const eyeTestResponse = responses[SECTION7_KEYS.eye_test]?.response
  const breaksResponse = responses[SECTION7_KEYS.breaks]?.response

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (!userId) {
      setError('Please select a user')
      return
    }

    // Build payload
    const questionResponses = questions.map((q) => ({
      section_number: q.section_number,
      section_label: q.section_label,
      item_key: q.item_key,
      item_text: q.item_text,
      sort_order: q.sort_order,
      response: responses[q.item_key]?.response ?? null,
      action_to_take: responses[q.item_key]?.action_to_take || null,
    }))

    // Validate: all non-section-7 questions must have a response
    for (const q of questions) {
      if (!isSection7(q.section_number) && !responses[q.item_key]?.response) {
        setError(`Please answer all questions (missing: ${q.item_text.substring(0, 50)}…)`)
        return
      }
    }

    setSubmitting(true)
    setError(null)

    const payload = {
      user_id: userId,
      workstation_location: workstationLocation || null,
      assessment_date: assessmentDate,
      assessed_by: assessedById,
      overall_notes: additionalNotes || null,
      user_discomfort_noted: discomfortResponse === 'yes',
      discomfort_detail: discomfortResponse === 'yes' ? discomfortDetail || null : null,
      eye_test_recommended: eyeTestResponse === 'yes',
      regular_breaks_confirmed: breaksResponse === 'yes',
      review_interval_months: reviewIntervalMonths,
      responses: questionResponses,
    }

    try {
      const res = await fetch('/api/dse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to save assessment')
        return
      }

      router.push(`/dse/${data.assessmentId}`)
      router.refresh()
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Header Section */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
        <h2 className="text-base font-semibold text-slate-900">Assessment Details</h2>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="user_id" className="block text-sm font-medium text-slate-700 mb-1">
              Staff Member <span className="text-red-500">*</span>
            </label>
            <select
              id="user_id"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              required
              className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
            >
              <option value="">Select staff member…</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.last_name}, {u.first_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="assessment_date" className="block text-sm font-medium text-slate-700 mb-1">
              Assessment Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              id="assessment_date"
              value={assessmentDate}
              onChange={(e) => setAssessmentDate(e.target.value)}
              required
              className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
            />
          </div>

          <div>
            <label htmlFor="workstation_location" className="block text-sm font-medium text-slate-700 mb-1">
              Workstation Location
            </label>
            <input
              type="text"
              id="workstation_location"
              value={workstationLocation}
              onChange={(e) => setWorkstationLocation(e.target.value)}
              className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
              placeholder="e.g. Desk 4, 2nd Floor"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Assessed By</label>
            <div className="flex items-center h-[38px] px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-700">
              {assessedByName}
            </div>
          </div>
        </div>
      </div>

      {/* Question Sections */}
      {sections.map(([sectionNum, section]) => (
        <div key={sectionNum} className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
            <h2 className="text-base font-semibold text-slate-900">
              Section {sectionNum}: {section.label}
            </h2>
          </div>
          <div className="divide-y divide-slate-100">
            {section.questions.map((q) => {
              const resp = responses[q.item_key]
              const isSection7Q = isSection7(sectionNum)
              const showDiscomfortDetail =
                isSection7Q &&
                q.item_key === SECTION7_KEYS.discomfort &&
                resp?.response === 'yes'

              return (
                <div key={q.id} className="px-6 py-4 space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <p className="text-sm text-slate-800 leading-relaxed flex-1">{q.item_text}</p>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {(['yes', 'no', 'na'] as const).map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setResponse(q.item_key, val)}
                          className={`rounded-md px-3 py-1.5 text-xs font-medium border transition-colors ${
                            resp?.response === val
                              ? val === 'yes'
                                ? 'bg-green-600 text-white border-green-600'
                                : val === 'no'
                                ? 'bg-red-600 text-white border-red-600'
                                : 'bg-slate-500 text-white border-slate-500'
                              : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'
                          }`}
                        >
                          {val === 'yes' ? 'Yes' : val === 'no' ? 'No' : 'N/A'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Action required when 'No' is selected (non-section 7) */}
                  {!isSection7Q && resp?.response === 'no' && (
                    <div>
                      <label className="block text-xs font-medium text-amber-700 mb-1">
                        Action to take <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        value={resp.action_to_take}
                        onChange={(e) => setActionToTake(q.item_key, e.target.value)}
                        required
                        rows={2}
                        className="block w-full rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 resize-none"
                        placeholder="Describe the corrective action required…"
                      />
                    </div>
                  )}

                  {/* Discomfort detail */}
                  {showDiscomfortDetail && (
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Describe discomfort
                      </label>
                      <textarea
                        value={discomfortDetail}
                        onChange={(e) => setDiscomfortDetail(e.target.value)}
                        rows={2}
                        className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 resize-none"
                        placeholder="Describe the discomfort or symptoms…"
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {/* Additional Notes */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <label htmlFor="overall_notes" className="block text-sm font-medium text-slate-700 mb-2">
          Additional Notes
        </label>
        <textarea
          id="overall_notes"
          value={additionalNotes}
          onChange={(e) => setAdditionalNotes(e.target.value)}
          rows={4}
          className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 resize-none"
          placeholder="Any additional observations or recommendations…"
        />
      </div>

      <div className="flex items-center justify-end gap-3 pb-8">
        <a
          href="/dse"
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
        >
          Cancel
        </a>
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-6 py-2.5 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50 transition-colors"
        >
          {submitting ? (
            <>
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Saving…
            </>
          ) : (
            'Complete Assessment'
          )}
        </button>
      </div>
    </form>
  )
}
