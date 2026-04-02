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
      id, assessment_date, status, next_review_date, overall_notes,
      subject:users!dse_assessments_user_id_fkey(first_name, last_name),
      assessed_by:users!dse_assessments_assessed_by_fkey(first_name, last_name)
    `)
    .eq('id', id)
    .single()

  if (!assessment) redirect('/dse')

  const [{ data: responses }, { data: templates }] = await Promise.all([
    supabase
      .from('dse_assessment_responses')
      .select('id, item_key, response, notes, ca_id, corrective_actions(id, title, status)')
      .eq('assessment_id', id),
    supabase
      .from('dse_question_templates')
      .select('item_key, section_number, section_label, item_text, sort_order')
      .order('sort_order'),
  ])

  // Build a lookup map from item_key → template
  const templateMap = new Map(
    (templates ?? []).map((t) => [t.item_key, t])
  )

  // Group responses by section using template data
  const sections = new Map<number, { label: string; items: { response: typeof responses extends (infer T)[] | null ? T : never; template: typeof templates extends (infer T)[] | null ? T : never }[] }>()
  for (const r of responses ?? []) {
    const tmpl = templateMap.get(r.item_key)
    if (!tmpl) continue
    if (!sections.has(tmpl.section_number)) {
      sections.set(tmpl.section_number, { label: tmpl.section_label, items: [] })
    }
    sections.get(tmpl.section_number)!.items.push({ response: r, template: tmpl })
  }
  // Sort items within each section by sort_order
  for (const sec of sections.values()) {
    sec.items.sort((a, b) => a.template.sort_order - b.template.sort_order)
  }
  const sortedSections = Array.from(sections.entries()).sort(([a], [b]) => a - b)

  const subjectUser = assessment.subject as unknown as { first_name: string; last_name: string } | null
  const assessedBy = assessment.assessed_by as unknown as { first_name: string; last_name: string } | null
  const overdue = isOverdue(assessment.next_review_date)

  const hasActions = (responses ?? []).some((r) => r.response === 'no')

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
          </div>
          <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
            hasActions ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'
          }`}>
            {hasActions ? 'Further Action Required' : 'No Further Action Required'}
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
            <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide">Next Review</dt>
            <dd className={`mt-1 text-sm font-medium ${overdue ? 'text-red-600' : 'text-slate-900'}`}>
              {formatDate(assessment.next_review_date)}
              {overdue && ' (Overdue)'}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide">Status</dt>
            <dd className="mt-1 text-sm font-medium text-slate-900">{assessment.status}</dd>
          </div>
        </div>
      </div>

      {/* Question Sections */}
      {sortedSections.map(([sectionNum, section]) => (
        <div key={sectionNum} className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
            <h2 className="text-base font-semibold text-slate-900">
              Section {sectionNum}: {section.label}
            </h2>
          </div>
          <div className="divide-y divide-slate-100">
            {section.items.map(({ response: r, template: tmpl }) => {
              const ca = r.corrective_actions as unknown as { id: string; title: string; status: string } | null
              return (
                <div key={r.id} className="px-6 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <p className="text-sm text-slate-800 leading-relaxed flex-1">{tmpl.item_text}</p>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium shrink-0 ${
                      r.response === 'yes'
                        ? 'bg-green-100 text-green-800'
                        : r.response === 'no'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {r.response === 'yes' ? 'Yes' : r.response === 'no' ? 'No' : 'N/A'}
                    </span>
                  </div>
                  {r.response === 'no' && r.notes && (
                    <div className="mt-3 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 space-y-2">
                      <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide">Notes / Action Required</p>
                      <p className="text-sm text-amber-900">{r.notes}</p>
                      {ca && (
                        <Link
                          href={`/corrective-actions/${ca.id}`}
                          className="inline-flex text-xs text-orange-600 hover:text-orange-700 font-medium"
                        >
                          CA: {ca.title} ({ca.status})
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {/* Overall Notes */}
      {assessment.overall_notes && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900 mb-2">Overall Notes</h2>
          <p className="text-sm text-slate-700 whitespace-pre-wrap">{assessment.overall_notes}</p>
        </div>
      )}
    </div>
  )
}
