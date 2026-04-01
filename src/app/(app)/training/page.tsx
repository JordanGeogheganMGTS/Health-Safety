import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatDate, isOverdue, isDueWithin } from '@/lib/dates'

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

interface SearchParams {
  type?: string
  expired?: string
}

export default async function TrainingPage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = await createClient()

  const [{ data: trainingTypes }, { data: allTypes }] = await Promise.all([
    supabase
      .from('training_types')
      .select('id, name, description, validity_years, is_mandatory, is_active')
      .order('name'),
    supabase.from('training_types').select('id, name').order('name'),
  ])

  let recordsQuery = supabase
    .from('training_records')
    .select(`
      id,
      completed_date,
      expiry_date,
      provider,
      user:users!training_records_user_id_fkey(id, first_name, last_name),
      training_type:training_types!training_records_training_type_id_fkey(id, name, is_mandatory)
    `)
    .order('completed_date', { ascending: false })

  if (searchParams.type) {
    recordsQuery = recordsQuery.eq('training_type_id', searchParams.type)
  }
  if (searchParams.expired === 'true') {
    const today = new Date().toISOString().split('T')[0]
    recordsQuery = recordsQuery.lt('expiry_date', today)
  }

  const { data: records } = await recordsQuery

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Training Records</h1>
          <p className="text-sm text-slate-500 mt-1">Staff training and certification management</p>
        </div>
        <Link
          href="/training/new"
          className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Record Training
        </Link>
      </div>

      {/* Training Types Section */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm mb-8">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">Training Types</h2>
          <Link
            href="/training/types/new"
            className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-orange-50 px-3 py-1.5 text-xs font-medium text-orange-700 hover:bg-orange-100 transition-colors"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Training Type
          </Link>
        </div>
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
                      {tt.validity_years ? `${tt.validity_years} year${tt.validity_years > 1 ? 's' : ''}` : 'No expiry'}
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

      {/* Training Records Section */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Training Records</h2>
          <div className="flex flex-wrap gap-2 items-center">
            {/* Type filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-500">Type:</span>
              <div className="flex gap-1">
                <Link
                  href={`/training${searchParams.expired === 'true' ? '?expired=true' : ''}`}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${!searchParams.type ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  All
                </Link>
                {(allTypes ?? []).map((t) => (
                  <Link
                    key={t.id}
                    href={`/training?type=${t.id}${searchParams.expired === 'true' ? '&expired=true' : ''}`}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${searchParams.type === t.id ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                  >
                    {t.name}
                  </Link>
                ))}
              </div>
            </div>
            {/* Expired filter */}
            <Link
              href={`/training${searchParams.expired === 'true' ? '' : '?expired=true'}${searchParams.type ? `${searchParams.expired === 'true' ? '?' : '&'}type=${searchParams.type}` : ''}`}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${searchParams.expired === 'true' ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              Expired only
            </Link>
          </div>
        </div>

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
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Completed</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Expiry</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Provider</th>
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
                        <td className="px-4 py-3 text-sm text-slate-700">
                          {trainingType?.name ?? '—'}
                        </td>
                        <td className="px-4 py-3">
                          {trainingType?.is_mandatory ? (
                            <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-red-100 text-red-700">Required</span>
                          ) : (
                            <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-slate-100 text-slate-500">Optional</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">{formatDate(r.completed_date)}</td>
                        <td className="px-4 py-3">
                          <ExpiryBadge expiry={r.expiry_date} />
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">{r.provider ?? '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
