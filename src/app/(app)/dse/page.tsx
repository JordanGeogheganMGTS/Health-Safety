import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { formatDate, isOverdue } from '@/lib/dates'

export default async function DsePage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch all users with DSE info
  const { data: users } = await supabase
    .from('users')
    .select(`
      id, first_name, last_name, is_active, dse_not_applicable,
      dse_last_assessment_id,
      roles(name), sites(name),
      dse_assessments!users_dse_last_assessment_id_fkey(
        id, assessment_date, overall_outcome, review_date, eye_test_recommended
      )
    `)
    .eq('is_active', true)
    .order('last_name')

  // Fetch outstanding CAs count per assessment
  const { data: caData } = await supabase
    .from('dse_assessment_responses')
    .select('assessment_id, action_completed')
    .eq('action_completed', false)
    .not('action_to_take', 'is', null)

  const caCountMap: Record<string, number> = {}
  for (const row of caData ?? []) {
    if (row.assessment_id) {
      caCountMap[row.assessment_id] = (caCountMap[row.assessment_id] ?? 0) + 1
    }
  }

  function getDseStatus(u: typeof users extends (infer T)[] | null ? T : never) {
    if (!u) return { label: 'Unknown', color: 'bg-slate-100 text-slate-600' }
    const assessment = (u.dse_assessments as unknown as {
      id: string
      assessment_date: string
      overall_outcome: string
      review_date: string
      eye_test_recommended: boolean
    }[] | null)?.[0] ?? null

    if (u.dse_not_applicable) return { label: 'N/A', color: 'bg-slate-100 text-slate-600' }
    if (!assessment) return { label: 'No Assessment', color: 'bg-yellow-100 text-yellow-800' }
    if (isOverdue(assessment.review_date)) return { label: 'Overdue', color: 'bg-red-100 text-red-800' }
    return { label: 'Current', color: 'bg-green-100 text-green-800' }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">DSE Assessments</h1>
          <p className="mt-1 text-sm text-slate-500">Display Screen Equipment compliance tracking for all staff.</p>
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
        {!users || users.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">No active users found.</div>
        ) : (
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Name</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Role</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Site</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">DSE Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Last Assessment</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Outcome</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Review Date</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Flags</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Outstanding CAs</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {users.map((u) => {
                const role = (u.roles as unknown as { name: string } | null)?.name
                const site = (u.sites as unknown as { name: string } | null)?.name
                const assessment = (u.dse_assessments as unknown as {
                  id: string
                  assessment_date: string
                  overall_outcome: string
                  review_date: string
                  eye_test_recommended: boolean
                }[] | null)?.[0] ?? null
                const status = getDseStatus(u)
                const outstandingCAs = assessment ? (caCountMap[assessment.id] ?? 0) : 0

                return (
                  <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">
                      <Link href={`/settings/users/${u.id}`} className="hover:text-orange-600">
                        {u.first_name} {u.last_name}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{role ?? '—'}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{site ?? 'All sites'}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${status.color}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {assessment ? (
                        <Link href={`/dse/${assessment.id}`} className="text-orange-600 hover:text-orange-700">
                          {formatDate(assessment.assessment_date)}
                        </Link>
                      ) : '—'}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {assessment ? (
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          assessment.overall_outcome === 'No Further Action Required'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {assessment.overall_outcome === 'No Further Action Required' ? 'No Action' : 'Action Reqd'}
                        </span>
                      ) : '—'}
                    </td>
                    <td className={`px-6 py-4 text-sm font-medium ${
                      assessment && isOverdue(assessment.review_date) ? 'text-red-600' : 'text-slate-600'
                    }`}>
                      {assessment ? formatDate(assessment.review_date) : '—'}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {assessment?.eye_test_recommended && (
                        <span title="Eye test recommended" className="text-amber-500">⚠</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {outstandingCAs > 0 ? (
                        <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
                          {outstandingCAs}
                        </span>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
