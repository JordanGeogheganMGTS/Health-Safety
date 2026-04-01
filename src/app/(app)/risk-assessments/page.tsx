import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatDate, isOverdue } from '@/lib/dates'

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

function RatingBadge({ rating }: { rating: string | null }) {
  if (!rating) return <span className="text-slate-400 text-sm">—</span>
  const styles: Record<string, string> = {
    Low: 'bg-green-100 text-green-700',
    Medium: 'bg-amber-100 text-amber-700',
    High: 'bg-orange-100 text-orange-700',
    'Very High': 'bg-red-100 text-red-700',
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[rating] ?? 'bg-slate-100 text-slate-600'}`}>
      {rating}
    </span>
  )
}

export default async function RiskAssessmentsPage() {
  const supabase = await createClient()

  const { data: assessments } = await supabase
    .from('risk_assessments')
    .select(`
      id,
      title,
      assessment_date,
      review_date,
      status,
      overall_rating,
      sites(name),
      assessor:users!risk_assessments_assessor_id_fkey(first_name, last_name),
      category:lookup_values!risk_assessments_category_id_fkey(label)
    `)
    .order('created_at', { ascending: false })

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Risk Assessments</h1>
          <p className="text-sm text-slate-500 mt-1">Identify and manage workplace hazards and risks</p>
        </div>
        <Link
          href="/risk-assessments/new"
          className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Risk Assessment
        </Link>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        {!assessments || assessments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <svg className="h-12 w-12 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <p className="text-base font-medium">No risk assessments found</p>
            <p className="text-sm mt-1">Create your first risk assessment to get started</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Title</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Site</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Category</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Assessment Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Review Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Overall Rating</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {assessments.map((ra) => {
                  const site = ra.sites as unknown as { name: string } | null
                  const category = ra.category as unknown as { label: string } | null
                  const overdue = isOverdue(ra.review_date)

                  return (
                    <tr key={ra.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <Link href={`/risk-assessments/${ra.id}`} className="font-medium text-slate-900 hover:text-orange-600 transition-colors">
                          {ra.title}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">{site?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{category?.label ?? '—'}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{formatDate(ra.assessment_date)}</td>
                      <td className={`px-4 py-3 text-sm font-medium ${overdue ? 'text-red-600' : 'text-slate-600'}`}>
                        {formatDate(ra.review_date)}
                        {overdue && <span className="ml-1 text-xs">(Overdue)</span>}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={ra.status} />
                      </td>
                      <td className="px-4 py-3">
                        <RatingBadge rating={ra.overall_rating} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/risk-assessments/${ra.id}`}
                            className="text-xs text-orange-600 hover:text-orange-700 font-medium"
                          >
                            View
                          </Link>
                          <Link
                            href={`/risk-assessments/${ra.id}/edit`}
                            className="text-xs text-slate-600 hover:text-slate-900 font-medium"
                          >
                            Edit
                          </Link>
                        </div>
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
