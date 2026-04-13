import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { formatDate } from '@/lib/dates'
import { computeContractStatus, type ContractStatus } from './utils'
import { getAuthUser } from '@/lib/permissions'

function StatusBadge({ status }: { status: ContractStatus }) {
  const styles: Record<ContractStatus, string> = {
    'Active':        'bg-green-100 text-green-700',
    'Expiring Soon': 'bg-amber-100 text-amber-700',
    'Expired':       'bg-red-100 text-red-700',
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status]}`}>
      {status}
    </span>
  )
}

function fmt(value: number | null): string {
  if (value === null) return '—'
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(value)
}

export default async function ContractsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const authUser = await getAuthUser()
  if (!authUser?.can('contracts', 'view')) redirect('/dashboard')

  const canEdit = authUser.can('contracts', 'edit')

  const admin = createAdminClient()

  // Fetch contracts without join to avoid FK constraint name dependency
  const { data: rows } = await admin
    .from('contracts')
    .select('id, name, supplier, renewal_date, contract_value, notice_period_days, owner_id')
    .order('renewal_date', { ascending: true, nullsFirst: false })

  type Row = {
    id: string
    name: string
    supplier: string | null
    renewal_date: string | null
    contract_value: number | null
    notice_period_days: number | null
    owner_id: string | null
  }

  const contracts = (rows ?? []) as unknown as Row[]

  // Fetch owner names separately
  const ownerIds = Array.from(new Set(contracts.map((c) => c.owner_id).filter(Boolean))) as string[]
  const ownerMap: Record<string, string> = {}
  if (ownerIds.length > 0) {
    const { data: ownersData } = await admin
      .from('users')
      .select('id, first_name, last_name')
      .in('id', ownerIds)
    for (const u of ownersData ?? []) {
      ownerMap[u.id] = `${u.first_name} ${u.last_name}`
    }
  }

  // Compute status for summary counts
  const statuses = contracts.map((c) =>
    computeContractStatus(c.renewal_date, c.notice_period_days)
  )
  const expiringSoon = statuses.filter((s) => s === 'Expiring Soon').length
  const expired = statuses.filter((s) => s === 'Expired').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Contracts</h1>
          <p className="mt-1 text-sm text-slate-500">Supplier and service contract renewals</p>
        </div>
        {canEdit && (
          <Link
            href="/contracts/new"
            className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 transition-colors shrink-0"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Contract
          </Link>
        )}
      </div>

      {/* Summary tiles */}
      {(expiringSoon > 0 || expired > 0) && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:w-96">
          {expiringSoon > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">Expiring Soon</p>
              <p className="text-2xl font-bold text-amber-700 mt-0.5">{expiringSoon}</p>
            </div>
          )}
          {expired > 0 && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-red-600">Expired</p>
              <p className="text-2xl font-bold text-red-700 mt-0.5">{expired}</p>
            </div>
          )}
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {contracts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <svg className="h-12 w-12 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-base font-medium">No contracts yet</p>
            {canEdit && <p className="text-sm mt-1">Add your first contract using the button above.</p>}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Contract</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Supplier</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Owner</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Renewal Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Value</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 bg-white">
                {contracts.map((c, i) => {
                  const status = statuses[i]
                  const ownerName = c.owner_id ? (ownerMap[c.owner_id] ?? null) : null
                  return (
                    <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-slate-900">{c.name}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{c.supplier ?? <span className="text-slate-300">—</span>}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {ownerName ?? <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {c.renewal_date ? formatDate(c.renewal_date) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">{fmt(c.contract_value)}</td>
                      <td className="px-4 py-3"><StatusBadge status={status} /></td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/contracts/${c.id}`} className="text-xs font-medium text-orange-600 hover:text-orange-700">
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
  )
}
