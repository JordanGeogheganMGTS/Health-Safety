import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getAuthUser } from '@/lib/permissions'

interface PpeItem {
  id: string
  name: string
  has_sizes: boolean
  size_category_key: string | null
  replacement_months: number | null
  is_active: boolean
  sort_order: number
}

interface UserPpeRecord {
  id: string
  user_id: string
  ppe_item_id: string
}

interface UserProfile {
  id: string
  first_name: string
  last_name: string
  sites: { name: string } | null
}

export default async function PpePage() {
  const [supabase, authUser] = await Promise.all([
    createClient(),
    getAuthUser(),
  ])

  const isAdmin = authUser?.role === 'System Admin'

  const [{ data: ppeItems }, { data: activeUsers }, { data: allPpeRecords }] = await Promise.all([
    supabase
      .from('ppe_items')
      .select('id, name, has_sizes, size_category_key, replacement_months, is_active, sort_order')
      .order('sort_order'),
    supabase
      .from('users')
      .select('id, first_name, last_name, sites(name)')
      .eq('is_active', true)
      .order('first_name'),
    supabase
      .from('user_ppe_records')
      .select('id, user_id, ppe_item_id')
      .order('created_at', { ascending: false }),
  ])

  // Build compliance overview: for each user, find their most recent record per ppe_item
  const records = (allPpeRecords ?? []) as unknown as UserPpeRecord[]
  const users = (activeUsers ?? []) as unknown as UserProfile[]
  const items = (ppeItems ?? []) as unknown as PpeItem[]

  const complianceRows = users.map((u) => {
    const userRecords = records.filter((r) => r.user_id === u.id)

    // Most recent per item
    const latestPerItem: Record<string, UserPpeRecord> = {}
    for (const r of userRecords) {
      if (!latestPerItem[r.ppe_item_id]) {
        latestPerItem[r.ppe_item_id] = r
      }
    }

    const latestRecords = Object.values(latestPerItem)
    const totalIssued = latestRecords.length

    return {
      user: u,
      totalIssued,
    }
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">PPE Management</h1>
          <p className="text-sm text-slate-500 mt-1">Personal protective equipment issuance and compliance</p>
        </div>
        {isAdmin && (
          <Link
            href="/ppe/items/new"
            className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add PPE Item
          </Link>
        )}
      </div>

      {/* PPE Items Register */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm mb-8">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">PPE Items Register</h2>
          <span className="text-xs text-slate-500">{items.length} item{items.length !== 1 ? 's' : ''}</span>
        </div>

        {items.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-sm">
            No PPE items configured yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Has Sizes</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Size Category</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Replacement Interval</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Active</th>
                  {isAdmin && <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">{item.name}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {item.has_sizes ? (
                        <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-orange-100 text-orange-700">Yes</span>
                      ) : (
                        <span className="text-slate-400">No</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{item.size_category_key ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {item.replacement_months
                        ? `${item.replacement_months} month${item.replacement_months !== 1 ? 's' : ''}`
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {item.is_active ? (
                        <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-green-100 text-green-700">Active</span>
                      ) : (
                        <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-slate-100 text-slate-500">Inactive</span>
                      )}
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3 text-right">
                        <Link href={`/ppe/items/${item.id}/edit`} className="text-xs text-orange-600 hover:text-orange-700 font-medium">
                          Edit
                        </Link>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* PPE Compliance Overview */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Staff PPE Compliance</h2>

        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
          {complianceRows.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-sm">
              No active staff members found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Staff Member</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Site</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Items Issued</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {complianceRows.map(({ user, totalIssued }) => (
                    <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <Link href={`/ppe/${user.id}`} className="text-sm font-medium text-slate-900 hover:text-orange-600 transition-colors">
                          {user.first_name} {user.last_name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {user.sites ? (user.sites as unknown as { name: string }).name : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700 font-medium">{totalIssued}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
