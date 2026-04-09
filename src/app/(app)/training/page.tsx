import Link from 'next/link'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { formatDate, isOverdue, isDueWithin } from '@/lib/dates'
import { getAuthUser } from '@/lib/permissions'
import FilterBar from '@/components/ui/FilterBar'
import SortLink from '@/components/ui/SortLink'

function ExpiryBadge({ expiry }: { expiry: string | null }) {
  if (!expiry) {
    return <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-slate-100 text-slate-500">No expiry</span>
  }
  if (isOverdue(expiry)) {
    return <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-red-100 text-red-700">Expired {formatDate(expiry)}</span>
  }
  if (isDueWithin(expiry, 60)) {
    return <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-amber-100 text-amber-700">Expires {formatDate(expiry)}</span>
  }
  return <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-green-100 text-green-700">Valid to {formatDate(expiry)}</span>
}

export default async function TrainingPage({ searchParams: spPromise }: { searchParams: Promise<{ type?: string; expired?: string; tab?: string; user_id?: string; sort?: string; dir?: string }> }) {
  const sp = await spPromise
  const activeTab = sp.tab === 'types' ? 'types' : 'records'
  const sortCol = sp.sort === 'expiry_date' ? 'expiry_date' : 'completion_date'
  const dir = sp.dir === 'asc' ? 'asc' : 'desc'
  const asc = dir === 'asc'

  const supabase = await createClient()

  const authUser = await getAuthUser()
  const isTdaStaff = authUser?.role === 'Staff'
  const canSeeTypesTab = authUser?.role === 'System Admin' || authUser?.role === 'H&S Manager'
  // If restricted role somehow lands on types tab, fall back to records
  const effectiveTab = activeTab === 'types' && !canSeeTypesTab ? 'records' : activeTab

  const [{ data: trainingTypes }, { data: allTypes }, { data: allUsers }] = await Promise.all([
    supabase
      .from('training_types')
      .select('id, name, description, validity_months, is_mandatory, is_active')
      .order('name'),
    supabase.from('training_types').select('id, name').order('name'),
    // TDA/Staff only see their own records so the user filter dropdown is not needed
    isTdaStaff
      ? Promise.resolve({ data: [] })
      : supabase.from('users').select('id, first_name, last_name').eq('is_active', true).order('last_name'),
  ])

  let records = null
  if (activeTab === 'records') {
    let recordsQuery = supabase
      .from('training_records')
      .select(`
        id,
        completion_date,
        expiry_date,
        provider,
        certificate_file_path,
        user:users!training_records_user_id_fkey(id, first_name, last_name),
        training_type:training_types!training_records_training_type_id_fkey(id, name, is_mandatory)
      `)
      .order(sortCol, { ascending: asc })

    // TDA/Staff: always filter to own records only
    if (isTdaStaff && authUser) {
      recordsQuery = recordsQuery.eq('user_id', authUser.id)
    } else {
      if (sp.user_id) recordsQuery = recordsQuery.eq('user_id', sp.user_id)
    }

    if (sp.type) recordsQuery = recordsQuery.eq('training_type_id', sp.type)
    if (sp.expired === 'true') {
      const today = new Date().toISOString().split('T')[0]
      recordsQuery = recordsQuery.lt('expiry_date', today)
    }

    const { data } = await recordsQuery
    records = data
  }

  const baseParams = Object.fromEntries(
    Object.entries(sp).filter(([k]) => k !== 'sort' && k !== 'dir').map(([k, v]) => [k, v ?? ''])
  )

  const users = (allUsers ?? []) as { id: string; first_name: string; last_name: string }[]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Training</h1>
          <p className="text-sm text-slate-500 mt-1">Staff training and certification management</p>
        </div>
        {authUser?.can('training', 'create') && (
          effectiveTab === 'types' ? (
            <Link
              href="/training/types/new"
              className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Training Type
            </Link>
          ) : (
            <Link
              href="/training/new"
              className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Record Training
            </Link>
          )
        )}
      </div>

      {/* Tab bar */}
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex gap-0">
          <Link
            href="/training"
            className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
              effectiveTab === 'records'
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            Training Records
          </Link>
          {canSeeTypesTab && (
            <Link
              href="/training?tab=types"
              className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                effectiveTab === 'types'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              Training Types
            </Link>
          )}
        </nav>
      </div>

      {/* ── Training Records tab ── */}
      {effectiveTab === 'records' && (
        <div className="space-y-4">
          <Suspense fallback={<div className="h-10" />}>
            <FilterBar filters={[
              {
                param: 'user_id',
                label: 'Staff Member',
                multi: false,
                options: users.map((u) => ({ value: u.id, label: `${u.first_name} ${u.last_name}` })),
              },
              {
                param: 'type',
                label: 'Training Type',
                multi: false,
                options: (allTypes ?? []).map((t) => ({ value: t.id, label: t.name })),
              },
              {
                param: 'expired',
                label: 'Expiry',
                multi: false,
                options: [{ value: 'true', label: 'Expired Only' }],
              },
            ]} />
          </Suspense>

          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
            {!records || records.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <svg className="h-12 w-12 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
                <p className="text-base font-medium">No training records found</p>
                <p className="text-sm mt-1">Start by recording completed training</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Staff Member</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Training Type</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Mandatory</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        <SortLink column="completion_date" label="Completed" sort={sortCol} dir={dir} params={baseParams} />
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        <SortLink column="expiry_date" label="Expiry" sort={sortCol} dir={dir} params={baseParams} />
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Provider</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {records.map((r) => {
                      const user = r.user as unknown as { id: string; first_name: string; last_name: string } | null
                      const trainingType = r.training_type as unknown as { id: string; name: string; is_mandatory: boolean } | null

                      return (
                        <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 text-sm font-medium text-slate-900">
                            {user ? `${user.first_name} ${user.last_name}` : '—'}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-700">{trainingType?.name ?? '—'}</td>
                          <td className="px-4 py-3">
                            {trainingType?.is_mandatory ? (
                              <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-red-100 text-red-700">Required</span>
                            ) : (
                              <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-slate-100 text-slate-500">Optional</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600">{formatDate(r.completion_date)}</td>
                          <td className="px-4 py-3"><ExpiryBadge expiry={r.expiry_date} /></td>
                          <td className="px-4 py-3 text-sm text-slate-600">{r.provider ?? '—'}</td>
                          <td className="px-4 py-3 text-right">
                            <Link href={`/training/${r.id}`} className="text-xs font-medium text-orange-600 hover:text-orange-700">
                              View →
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
      )}

      {/* ── Training Types tab ── */}
      {effectiveTab === 'types' && (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
          {!trainingTypes || trainingTypes.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-sm">
              No training types configured yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Mandatory</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Validity</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Active</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {trainingTypes.map((tt) => (
                    <tr key={tt.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-slate-900">{tt.name}</p>
                        {tt.description && <p className="text-xs text-slate-500 mt-0.5">{tt.description}</p>}
                      </td>
                      <td className="px-4 py-3">
                        {tt.is_mandatory ? (
                          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-red-100 text-red-700">Required</span>
                        ) : (
                          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-slate-100 text-slate-500">Optional</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {tt.validity_months ? `${tt.validity_months} month${tt.validity_months !== 1 ? 's' : ''}` : 'No expiry'}
                      </td>
                      <td className="px-4 py-3">
                        {tt.is_active ? (
                          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-green-100 text-green-700">Active</span>
                        ) : (
                          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-slate-100 text-slate-500">Inactive</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
