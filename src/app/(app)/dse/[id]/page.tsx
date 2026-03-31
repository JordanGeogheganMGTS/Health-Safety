import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { formatDate, isOverdue } from '@/lib/dates'

export default async function DseAssessmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: assessment } = await supabase
    .from('dse_assessments')
    .select(`
      id, assessment_date, overall_outcome, review_date,
      workstation_location, additional_notes,
      user_discomfort_noted, discomfort_detail,
      eye_test_recommended, regular_breaks_confirmed,
      further_action_required,
      users!dse_assessments_user_id_fkey(first_name, last_name),
      assessed_by:users!dse_assessments_assessed_by_id_fkey(first_name, last_name)
    `)
    .eq('id', id)
    .single()

  if (!assessment) redirect('/dse')

  const { data: responses } = await supabase
    .from('dse_assessment_responses')
    .select(`
      id, section_number, section_label, item_key, item_text, sort_order,
      response, action_to_take, action_completed, ca_id,
      corrective_actions(id, title, status)
    `)
    .eq('assessment_id', id)
    .order('sort_order')

  // Group by section
  const sections = new Map<number, { label: string; responses: typeof responses }>()
  for (const r of responses ?? []) {
    if (!sections.has(r.section_number)) {
      sections.set(r.section_number, { label: r.section_label, responses: [] })
    }
    sections.get(r.section_number)!.responses!.push(r)
  }
  const sortedSections = Array.from(sections.entries()).sort(([a], [b]) => a - b)

  const subjectUser = assessment.users as unknown as { first_name: string; last_name: string } | null
  const assessedBy = assessment.assessed_by as unknown as { first_name: string; last_name: string } | null
  const overdue = isOverdue(assessment.review_date)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dse" className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
          DSE Assessments
        </Link>
        <span className="text-slate-300">/</span>
        <span className="text-sm font-medium text-slate-900">Assessment Detail</span>
      </div>

      {/* Assessment Header */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="px-6 py-5 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-xl font-semibold text-slate-900">
              DSE Assessment — {subjectUser ? `${subjectUser.first_name} ${subjectUser.last_name}` : 'Unknown User'}
            </h1>
            {assessment.workstation_location && (
              <p className="text-sm text-slate-500">Workstation: {assessment.workstation_location}</p>
            )}
          </div>
          <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
            assessment.overall_outcome === 'No Further Action Required'
              ? 'bg-green-100 text-green-800'
              : 'bg-amber-100 text-amber-800'
          }`}>
            {assessment.overall_outcome}
          </span>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide">Assessment Date</dt>
            <dd className="mt-1 text-sm font-medium text-slate-900">{formatDate(assessment.assessment_date)}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide">Assessed By</dt>
            <dd className="mt-1 text-sm font-medium text-slate-900">
              {assessedBy ? `${assessedBy.first_name} ${assessedBy.last_name}` : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide">Review Date</dt>
            <dd className={`mt-1 text-sm font-medium ${overdue ? 'text-red-600' : 'text-slate-900'}`}>
              {formatDate(assessment.review_date)}
              {overdue && ' (Overdue)'}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide">Eye Test</dt>
            <dd className="mt-1 text-sm font-medium text-slate-900">
              {assessment.eye_test_recommended ? (
                <span className="text-amber-600 font-medium">⚠ Recommended</span>
              ) : 'Not required'}
            </dd>
          </div>
        </div>
      </div>

      {/* Discomfort / Breaks Summary */}
      {(assessment.user_discomfort_noted || !assessment.regular_breaks_confirmed) && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 space-y-2">
          <h2 className="text-sm font-semibold text-amber-900">Health Observations</h2>
          {assessment.user_discomfort_noted && (
            <p className="text-sm text-amber-800">
              <span className="font-medium">Discomfort noted.</span>
              {assessment.discomfort_detail && ` ${assessment.discomfort_detail}`}
            </p>
          )}
          {!assessment.regular_breaks_confirmed && (
            <p className="text-sm text-amber-800">
              <span className="font-medium">Regular breaks not confirmed.</span>
            </p>
          )}
        </div>
      )}

      {/* Question Sections */}
      {sortedSections.map(([sectionNum, section]) => (
        <div key={sectionNum} className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
            <h2 className="text-base font-semibold text-slate-900">
              Section {sectionNum}: {section.label}
            </h2>
          </div>
          <div className="divide-y divide-slate-100">
            {(section.responses ?? []).map((r) => {
              const ca = r.corrective_actions as unknown as { id: string; title: string; status: string } | null
              return (
                <div key={r.id} className="px-6 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <p className="text-sm text-slate-800 leading-relaxed flex-1">{r.item_text}</p>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium shrink-0 ${
                      r.response === 'yes'
                        ? 'bg-green-100 text-green-800'
                        : r.response === 'no'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {r.response === 'yes' ? 'Yes' : r.response === 'no' ? 'No' : r.response === 'na' ? 'N/A' : '—'}
                    </span>
                  </div>
                  {r.response === 'no' && r.action_to_take && (
                    <div className="mt-3 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 space-y-2">
                      <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide">Action Required</p>
                      <p className="text-sm text-amber-900">{r.action_to_take}</p>
                      <div className="flex items-center gap-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          r.action_completed ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {r.action_completed ? 'Completed' : 'Pending'}
                        </span>
                        {ca && (
                          <Link
                            href={`/corrective-actions/${ca.id}`}
                            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                          >
                            CA: {ca.title} ({ca.status})
                          </Link>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {/* Additional Notes */}
      {assessment.additional_notes && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900 mb-2">Additional Notes</h2>
          <p className="text-sm text-slate-700 whitespace-pre-wrap">{assessment.additional_notes}</p>
        </div>
      )}
    </div>
  )
}
