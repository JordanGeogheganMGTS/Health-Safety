import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { formatDate, isOverdue } from '@/lib/dates'
import { getAuthUser } from '@/lib/permissions'
import { AssignAcknowledgementButton } from '@/components/AssignAcknowledgementButton'

function riskRatingStyles(rating: number | null): string {
  if (!rating) return 'bg-slate-100 text-slate-600'
  if (rating <= 4) return 'bg-green-100 text-green-700'
  if (rating <= 9) return 'bg-amber-100 text-amber-700'
  if (rating <= 15) return 'bg-orange-100 text-orange-700'
  return 'bg-red-100 text-red-700'
}

function avgTileStyles(rating: number | null): string {
  if (rating === null) return 'bg-slate-100 text-slate-500 border-slate-200'
  if (rating <= 4) return 'bg-green-500 text-white border-green-600'
  if (rating <= 9) return 'bg-amber-400 text-white border-amber-500'
  if (rating <= 15) return 'bg-orange-500 text-white border-orange-600'
  return 'bg-red-500 text-white border-red-600'
}

function RiskChip({ rating }: { rating: number | null }) {
  return (
    <span className={`inline-flex items-center justify-center rounded-full w-8 h-8 text-xs font-bold ${riskRatingStyles(rating)}`}>
      {rating ?? '—'}
    </span>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    Draft: 'bg-slate-100 text-slate-700',
    Active: 'bg-green-100 text-green-700',
    'Under Review': 'bg-amber-100 text-amber-700',
    Superseded: 'bg-orange-100 text-orange-700',
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status] ?? 'bg-slate-100 text-slate-600'}`}>
      {status}
    </span>
  )
}

// ── Server action: raise a hazard's additional controls as a corrective action ──
async function raiseHazardCA(hazardId: string) {
  'use server'
  const { createClient: createServerClient } = await import('@/lib/supabase/server')
  const { createAdminClient: createAdmin } = await import('@/lib/supabase/admin')
  const { revalidatePath } = await import('next/cache')

  const supabase = await createServerClient()
  const admin = createAdmin()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  // Fetch hazard + parent RA site
  const { data: hazard } = await admin
    .from('ra_hazards')
    .select('id, additional_controls, action_due_date, responsible_person, hazard_description, risk_assessment_id, risk_assessment:risk_assessments!ra_hazards_risk_assessment_id_fkey(title, site_id)')
    .eq('id', hazardId)
    .single()

  if (!hazard || !hazard.additional_controls || !hazard.action_due_date) return

  const ra = hazard.risk_assessment as unknown as { title: string; site_id: string } | null
  if (!ra) return

  // Look up Medium priority
  const { data: priority } = await admin
    .from('lookup_values')
    .select('id')
    .eq('value', 'medium')
    .limit(1)
    .single()

  if (!priority) return

  // Use responsible_person if set, otherwise fall back to current user
  const assignedTo = (hazard.responsible_person as string | null) ?? user.id

  // Derive title: RA title + first 80 chars of hazard description
  const shortHazard = hazard.hazard_description.length > 80
    ? hazard.hazard_description.slice(0, 77) + '…'
    : hazard.hazard_description
  const title = `${ra.title} — ${shortHazard}`

  await admin.from('corrective_actions').insert({
    title,
    description: hazard.additional_controls,
    site_id: ra.site_id,
    due_date: hazard.action_due_date,
    assigned_to: assignedTo,
    assigned_by: user.id,
    priority_id: priority.id,
    status: 'Open',
    source_table: 'ra_hazards',
    source_record_id: hazardId,
  })

  revalidatePath(`/risk-assessments/${hazard.risk_assessment_id}`)
}

export default async function RiskAssessmentDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()

  const [{ data: ra }, { data: hazards }] = await Promise.all([
    supabase
      .from('risk_assessments')
      .select(`
        id, title, assessment_date, review_due_date, status, overall_rating, approved_at, created_at,
        sites(name),
        assessor:users!risk_assessments_assessed_by_fkey(first_name, last_name),
        approver:users!risk_assessments_approved_by_fkey(first_name, last_name),
        category:lookup_values!risk_assessments_category_id_fkey(label)
      `)
      .eq('id', params.id)
      .single(),
    supabase
      .from('ra_hazards')
      .select(`
        id, hazard_description, who_is_affected, existing_controls, likelihood_before, severity_before, risk_rating_before,
        additional_controls, action_due_date, responsible_person, likelihood_after, severity_after, risk_rating_after, sort_order,
        rp_user:users!ra_hazards_responsible_person_fkey(first_name, last_name)
      `)
      .eq('risk_assessment_id', params.id)
      .order('sort_order'),
  ])

  if (!ra) notFound()

  const authUser = await getAuthUser()

  // Fetch any CAs already raised from hazards in this RA
  const hazardIds = (hazards ?? []).map((h) => h.id)
  let existingCAMap: Record<string, string> = {}
  if (hazardIds.length > 0) {
    const admin = createAdminClient()
    const { data: existingCAs } = await admin
      .from('corrective_actions')
      .select('id, source_record_id')
      .eq('source_table', 'ra_hazards')
      .in('source_record_id', hazardIds)
    for (const ca of existingCAs ?? []) {
      if (ca.source_record_id) existingCAMap[ca.source_record_id] = ca.id
    }
  }

  const site = ra.sites as unknown as { name: string } | null
  const assessor = ra.assessor as unknown as { first_name: string; last_name: string } | null
  const category = ra.category as unknown as { label: string } | null
  const overdue = isOverdue(ra.review_due_date)

  const hazardsWithRatings = (hazards ?? []).filter((h) => h.risk_rating_before != null)
  const hazardsWithResidual = (hazards ?? []).filter((h) => h.risk_rating_after != null)
  const avgRR = hazardsWithRatings.length
    ? Math.round((hazardsWithRatings.reduce((s, h) => s + (h.risk_rating_before ?? 0), 0) / hazardsWithRatings.length) * 10) / 10
    : null
  const avgResidual = hazardsWithResidual.length
    ? Math.round((hazardsWithResidual.reduce((s, h) => s + (h.risk_rating_after ?? 0), 0) / hazardsWithResidual.length) * 10) / 10
    : null

  const canEdit = authUser?.can('risk_assessments', 'edit') ?? false
  const canRaiseCA = authUser?.can('corrective_actions', 'create') ?? false
  const canAssign = authUser?.can('risk_assessments', 'approve') ?? false

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
            <Link href="/risk-assessments" className="hover:text-orange-600 transition-colors">Risk Assessments</Link>
            <span>/</span>
            <span>{ra.title}</span>
          </div>
          <h1 className="text-2xl font-semibold text-slate-900">{ra.title}</h1>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
          {canAssign && (
            <AssignAcknowledgementButton itemType="risk_assessment" itemId={ra.id} itemTitle={ra.title} />
          )}
          <a
            href={`/api/risk-assessments/${ra.id}/pdf`}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download PDF
          </a>
          {canEdit && (
            <Link
              href={`/risk-assessments/${ra.id}/edit`}
              className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-3 py-2 text-sm font-medium text-white hover:bg-orange-600 transition-colors shadow-sm shrink-0"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit
            </Link>
          )}
        </div>
      </div>

      {/* Header details */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Site', value: site?.name ?? '—' },
          { label: 'Category', value: category?.label ?? '—' },
          { label: 'Assessor', value: assessor ? `${assessor.first_name} ${assessor.last_name}` : '—' },
          { label: 'Status', value: <StatusBadge status={ra.status} /> },
          { label: 'Assessment Date', value: formatDate(ra.assessment_date) },
          {
            label: 'Review Date',
            value: (
              <span className={overdue ? 'text-red-600 font-medium' : ''}>
                {formatDate(ra.review_due_date)}{overdue && ' (Overdue)'}
              </span>
            ),
          },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">{label}</p>
            <div className="text-sm font-medium text-slate-900">{value}</div>
          </div>
        ))}

        {/* Avg Risk Rating tile — full colour */}
        <div className={`rounded-xl border p-4 shadow-sm ${avgTileStyles(avgRR)}`}>
          <p className="text-xs font-medium uppercase tracking-wider mb-1 opacity-80">Avg Risk Rating</p>
          <div className="text-3xl font-bold">{avgRR ?? '—'}</div>
          <p className="text-xs mt-1 opacity-70">
            {avgRR === null ? 'No hazards' : avgRR <= 4 ? 'Low' : avgRR <= 9 ? 'Medium' : avgRR <= 15 ? 'High' : 'Very High'}
          </p>
        </div>

        {/* Avg Residual Risk Rating tile — full colour */}
        <div className={`rounded-xl border p-4 shadow-sm ${avgTileStyles(avgResidual)}`}>
          <p className="text-xs font-medium uppercase tracking-wider mb-1 opacity-80">Avg Residual Risk</p>
          <div className="text-3xl font-bold">{avgResidual ?? '—'}</div>
          <p className="text-xs mt-1 opacity-70">
            {avgResidual === null ? 'No hazards' : avgResidual <= 4 ? 'Low' : avgResidual <= 9 ? 'Medium' : avgResidual <= 15 ? 'High' : 'Very High'}
          </p>
        </div>
      </div>

      {/* Hazards table */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">Hazards &amp; Controls</h2>
          <span className="text-xs text-slate-500">{hazards?.length ?? 0} hazard{(hazards?.length ?? 0) !== 1 ? 's' : ''}</span>
        </div>

        {!hazards || hazards.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400">
            <p className="text-sm">No hazards recorded yet.</p>
            <Link href={`/risk-assessments/${ra.id}/edit`} className="mt-2 text-sm text-orange-600 hover:text-orange-700 font-medium">
              Add hazards
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">#</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Hazard</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Persons at Risk</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Existing Controls</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">L</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">S</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">RR</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Additional Controls</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Residual</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Action Owner</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Due Date</th>
                  {canRaiseCA && (
                    <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Action</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {hazards.map((h, idx) => {
                  const rp = h.rp_user as unknown as { first_name: string; last_name: string } | null
                  const canRaise = !!(h.additional_controls && h.action_due_date)
                  const existingCAId = existingCAMap[h.id]
                  const raiseAction = raiseHazardCA.bind(null, h.id)

                  return (
                    <tr key={h.id} className="hover:bg-slate-50 align-top">
                      <td className="px-3 py-3 text-slate-500 font-mono text-xs">{idx + 1}</td>
                      <td className="px-3 py-3 text-slate-900 max-w-[160px]">{h.hazard_description}</td>
                      <td className="px-3 py-3 text-slate-600 max-w-[120px]">{h.who_is_affected}</td>
                      <td className="px-3 py-3 text-slate-600 max-w-[180px]">{h.existing_controls}</td>
                      <td className="px-3 py-3 text-center text-slate-700 font-medium">{h.likelihood_before}</td>
                      <td className="px-3 py-3 text-center text-slate-700 font-medium">{h.severity_before}</td>
                      <td className="px-3 py-3 text-center">
                        <RiskChip rating={h.risk_rating_before} />
                      </td>
                      <td className="px-3 py-3 text-slate-600 max-w-[180px]">{h.additional_controls ?? '—'}</td>
                      <td className="px-3 py-3 text-center">
                        <RiskChip rating={h.risk_rating_after} />
                      </td>
                      <td className="px-3 py-3 text-slate-600">
                        {rp ? `${rp.first_name} ${rp.last_name}` : '—'}
                      </td>
                      <td className="px-3 py-3 text-slate-600 whitespace-nowrap">{formatDate(h.action_due_date)}</td>
                      {canRaiseCA && (
                        <td className="px-3 py-3 whitespace-nowrap">
                          {existingCAId ? (
                            <Link
                              href={`/corrective-actions/${existingCAId}`}
                              className="inline-flex items-center gap-1 text-xs font-medium text-green-700 hover:text-green-800"
                            >
                              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              View CA
                            </Link>
                          ) : canRaise ? (
                            <form action={raiseAction}>
                              <button
                                type="submit"
                                className="inline-flex items-center gap-1 rounded-md bg-orange-50 px-2 py-1 text-xs font-medium text-orange-700 ring-1 ring-orange-200 hover:bg-orange-100 transition-colors"
                              >
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Raise CA
                              </button>
                            </form>
                          ) : (
                            <span className="text-xs text-slate-300">—</span>
                          )}
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-500">
        <span className="flex items-center gap-1"><span className="inline-block w-4 h-4 rounded-full bg-green-100 border border-green-200" /> ≤4 Low</span>
        <span className="flex items-center gap-1"><span className="inline-block w-4 h-4 rounded-full bg-amber-100 border border-amber-200" /> 5–9 Medium</span>
        <span className="flex items-center gap-1"><span className="inline-block w-4 h-4 rounded-full bg-orange-100 border border-orange-200" /> 10–15 High</span>
        <span className="flex items-center gap-1"><span className="inline-block w-4 h-4 rounded-full bg-red-100 border border-red-200" /> ≥16 Very High</span>
        <span className="ml-2">L = Likelihood, S = Severity, RR = Risk Rating</span>
      </div>
    </div>
  )
}
