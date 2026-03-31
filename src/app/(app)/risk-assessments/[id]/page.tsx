import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatDate, isOverdue } from '@/lib/dates'

function riskRatingStyles(rating: number | null): string {
  if (!rating) return 'bg-slate-100 text-slate-600'
  if (rating <= 4) return 'bg-green-100 text-green-700'
  if (rating <= 9) return 'bg-amber-100 text-amber-700'
  if (rating <= 15) return 'bg-orange-100 text-orange-700'
  return 'bg-red-100 text-red-700'
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

export default async function RiskAssessmentDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()

  const [{ data: ra }, { data: hazards }] = await Promise.all([
    supabase
      .from('risk_assessments')
      .select(`
        id, title, assessment_date, review_date, status, overall_rating, approved_at, created_at,
        sites(name),
        assessor:users!risk_assessments_assessor_id_fkey(first_name, last_name),
        approver:users!risk_assessments_approved_by_fkey(first_name, last_name),
        category:lookup_values!risk_assessments_category_id_fkey(label)
      `)
      .eq('id', params.id)
      .single(),
    supabase
      .from('ra_hazards')
      .select(`
        id, hazard, persons_at_risk, existing_controls, likelihood, severity, risk_rating,
        additional_controls, action_due_date, residual_likelihood, residual_severity, residual_risk_rating, sort_order,
        action_owner:users!ra_hazards_action_owner_id_fkey(first_name, last_name)
      `)
      .eq('ra_id', params.id)
      .order('sort_order'),
  ])

  if (!ra) notFound()

  const site = ra.sites as unknown as { name: string } | null
  const assessor = ra.assessor as unknown as { first_name: string; last_name: string } | null
  const approver = ra.approver as unknown as { first_name: string; last_name: string } | null
  const category = ra.category as unknown as { label: string } | null
  const overdue = isOverdue(ra.review_date)

  return (
    <div className="max-w-6xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
            <Link href="/risk-assessments" className="hover:text-blue-600 transition-colors">Risk Assessments</Link>
            <span>/</span>
            <span>{ra.title}</span>
          </div>
          <h1 className="text-2xl font-semibold text-slate-900">{ra.title}</h1>
        </div>
        <Link
          href={`/risk-assessments/${ra.id}/edit`}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors shadow-sm shrink-0"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Edit
        </Link>
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
                {formatDate(ra.review_date)}{overdue && ' (Overdue)'}
              </span>
            ),
          },
          { label: 'Approved By', value: approver ? `${approver.first_name} ${approver.last_name}` : '—' },
          { label: 'Approved At', value: formatDate(ra.approved_at) },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">{label}</p>
            <div className="text-sm font-medium text-slate-900">{value}</div>
          </div>
        ))}
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
            <Link href={`/risk-assessments/${ra.id}/edit`} className="mt-2 text-sm text-blue-600 hover:text-blue-800 font-medium">
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
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {hazards.map((h, idx) => {
                  const actionOwner = h.action_owner as unknown as { first_name: string; last_name: string } | null
                  return (
                    <tr key={h.id} className="hover:bg-slate-50 align-top">
                      <td className="px-3 py-3 text-slate-500 font-mono text-xs">{idx + 1}</td>
                      <td className="px-3 py-3 text-slate-900 max-w-[160px]">{h.hazard}</td>
                      <td className="px-3 py-3 text-slate-600 max-w-[120px]">{h.persons_at_risk}</td>
                      <td className="px-3 py-3 text-slate-600 max-w-[180px]">{h.existing_controls}</td>
                      <td className="px-3 py-3 text-center text-slate-700 font-medium">{h.likelihood}</td>
                      <td className="px-3 py-3 text-center text-slate-700 font-medium">{h.severity}</td>
                      <td className="px-3 py-3 text-center">
                        <RiskChip rating={h.risk_rating} />
                      </td>
                      <td className="px-3 py-3 text-slate-600 max-w-[180px]">{h.additional_controls ?? '—'}</td>
                      <td className="px-3 py-3 text-center">
                        <RiskChip rating={h.residual_risk_rating} />
                      </td>
                      <td className="px-3 py-3 text-slate-600">
                        {actionOwner ? `${actionOwner.first_name} ${actionOwner.last_name}` : '—'}
                      </td>
                      <td className="px-3 py-3 text-slate-600 whitespace-nowrap">{formatDate(h.action_due_date)}</td>
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
