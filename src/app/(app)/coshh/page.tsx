import Link from 'next/link'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { formatDate, isOverdue } from '@/lib/dates'
import { getAuthUser } from '@/lib/permissions'
import FilterBar from '@/components/ui/FilterBar'

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    Draft: 'bg-slate-100 text-slate-700',
    Active: 'bg-green-100 text-green-700',
    'Under Review': 'bg-amber-100 text-amber-700',
    Superseded: 'bg-slate-200 text-slate-500',
    Archived: 'bg-slate-200 text-slate-500',
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status] ?? 'bg-slate-100 text-slate-600'}`}>
      {status}
    </span>
  )
}

export default async function CoshhPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status: statusParam } = await searchParams
  const statusFilters = statusParam ? statusParam.split(',').filter(Boolean) : []
  const supabase = await createClient()

  let query = supabase
    .from('coshh_assessments')
    .select(`
      id,
      product_name,
      status,
      assessment_date,
      review_due_date,
      sites(name),
      assessor:users!coshh_assessments_assessed_by_fkey(first_name, last_name)
    `)
    .order('created_at', { ascending: false })

  if (statusFilters.length > 0) query = query.in('status', statusFilters)

  const { data: assessments } = await query

  const statusOptions = ['Draft', 'Active', 'Under Review', 'Superseded', 'Archived']

  const authUser = await getAuthUser()

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">COSHH Assessments</h1>
          <p className="text-sm text-slate-500 mt-1">Control of Substances Hazardous to Health</p>
        </div>
        {authUser?.can('coshh_assessments', 'create') && (
          <Link
            href="/coshh/new"
            className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New COSHH Assessment
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="mb-4">
        <Suspense fallback={<div className="h-10" />}>
          <FilterBar filters={[
            {
              param: 'status',
              label: 'Status',
              options: statusOptions.map((s) => ({ value: s, label: s })),
            },
          ]} />
        </Suspense>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        {!assessments || assessments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <svg className="h-12 w-12 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
            <p className="text-base font-medium">No COSHH assessments found</p>
            <p className="text-sm mt-1">Create your first assessment to get started</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Product</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Site</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Assessment Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Review Due</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Assessed By</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {assessments.map((ca) => {
                  const site = ca.sites as unknown as { name: string } | null
                  const assessor = ca.assessor as unknown as { first_name: string; last_name: string } | null
                  const overdue = isOverdue(ca.review_due_date)

                  return (
                    <tr key={ca.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <Link href={`/coshh/${ca.id}`} className="font-medium text-slate-900 hover:text-orange-600 transition-colors">
                          {ca.product_name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">{site?.name ?? '—'}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={ca.status} />
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">{formatDate(ca.assessment_date)}</td>
                      <td className={`px-4 py-3 text-sm font-medium ${overdue ? 'text-red-600' : 'text-slate-600'}`}>
                        {formatDate(ca.review_due_date)}
                        {overdue && <span className="ml-1 text-xs">(Overdue)</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {assessor ? `${assessor.first_name} ${assessor.last_name}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/coshh/${ca.id}`} className="text-xs text-orange-600 hover:text-orange-700 font-medium">
                          View
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
