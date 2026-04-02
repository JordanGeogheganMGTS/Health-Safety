import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { formatDate, isOverdue } from '@/lib/dates'

export default async function DsePage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch all assessments with subject and assessor names
  const { data: assessments } = await supabase
    .from('dse_assessments')
    .select(`
      id, assessment_date, next_review_date, status,
      subject:users!dse_assessments_user_id_fkey(first_name, last_name),
      assessed_by:users!dse_assessments_assessed_by_fkey(first_name, last_name),
      site:sites!dse_assessments_site_id_fkey(name)
    `)
    .order('assessment_date', { ascending: false })

  // Fetch all "problem" responses so we can flag further action per assessment
  // Rules: response='no' on any question except final_discomfort
  //        response='yes' on final_discomfort
  const assessmentIds = (assessments ?? []).map((a) => a.id)
  let actionSet = new Set<string>()

  if (assessmentIds.length > 0) {
    const { data: problemResponses } = await supabase
      .from('dse_assessment_responses')
      .select('assessment_id, item_key, response')
      .in('assessment_id', assessmentIds)

    for (const r of problemResponses ?? []) {
      const isBad = r.item_key === 'final_discomfort'
        ? r.response === 'yes'
        : r.response === 'no'
      if (isBad) actionSet.add(r.assessment_id)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">DSE Assessments</h1>
          <p className="mt-1 text-sm text-slate-500">Display Screen Equipment assessment records.</p>
        </div>
        <Link
          href="/dse/new"
          className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Conduct Assessment
        </Link>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {!assessments || assessments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <svg className="h-12 w-12 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-base font-medium">No assessments yet</p>
            <p className="text-sm mt-1">Conduct your first DSE assessment to get started</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Staff Member</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Location</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Assessed By</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Outcome</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Next Review</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {assessments.map((a) => {
                  const subject = a.subject as unknown as { first_name: string; last_name: string } | null
                  const assessedBy = a.assessed_by as unknown as { first_name: string; last_name: string } | null
                  const site = a.site as unknown as { name: string } | null
                  const furtherAction = actionSet.has(a.id)
                  const overdue = isOverdue(a.next_review_date)

                  return (
                    <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3 text-sm font-medium text-slate-900">
                        {subject ? `${subject.first_name} ${subject.last_name}` : '—'}
                      </td>
                      <td className="px-5 py-3 text-sm text-slate-600">
                        {site?.name ?? '—'}
                      </td>
                      <td className="px-5 py-3 text-sm text-slate-600">
                        {formatDate(a.assessment_date)}
                      </td>
                      <td className="px-5 py-3 text-sm text-slate-600">
                        {assessedBy ? `${assessedBy.first_name} ${assessedBy.last_name}` : '—'}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          furtherAction ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {furtherAction ? 'Action Required' : 'No Action'}
                        </span>
                      </td>
                      <td className={`px-5 py-3 text-sm font-medium ${overdue ? 'text-red-600' : 'text-slate-600'}`}>
                        {a.next_review_date ? formatDate(a.next_review_date) : '—'}
                        {overdue && <span className="ml-1 text-xs">(Overdue)</span>}
                      </td>
                      <td className="px-5 py-3">
                        <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-slate-100 text-slate-600">
                          {a.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Link
                          href={`/dse/${a.id}`}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                          View
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                          </svg>
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
