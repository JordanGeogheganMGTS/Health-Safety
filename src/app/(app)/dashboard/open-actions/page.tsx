import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { formatDate } from '@/lib/dates'

type CAStatus = 'Open' | 'In Progress' | 'Completed' | 'Verified' | 'Overdue' | 'Cancelled'
type Priority = 'Low' | 'Medium' | 'High' | 'Critical'

interface OpenCA {
  id: string
  title: string
  description: string
  due_date: string | null
  status: CAStatus
  sites: { name: string } | null
  priority: { label: Priority } | null
  assigned: { first_name: string; last_name: string } | null
}

function priorityBadgeClass(p: Priority): string {
  switch (p) {
    case 'Critical': return 'bg-red-100 text-red-800 ring-red-200'
    case 'High':     return 'bg-orange-100 text-orange-800 ring-orange-200'
    case 'Medium':   return 'bg-amber-100 text-amber-800 ring-amber-200'
    case 'Low':      return 'bg-green-100 text-green-800 ring-green-200'
  }
}

function statusBadgeClass(s: CAStatus): string {
  switch (s) {
    case 'Open':        return 'bg-slate-100 text-slate-700 ring-slate-200'
    case 'In Progress': return 'bg-orange-100 text-orange-700 ring-orange-200'
    default:            return 'bg-gray-100 text-gray-600 ring-gray-200'
  }
}

export default async function OpenActionsPage({
  searchParams,
}: {
  searchParams: { site?: string }
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const today = new Date().toISOString().split('T')[0]
  const siteId = searchParams.site?.trim() || null

  let query = supabase
    .from('corrective_actions')
    .select(`
      id, title, description, due_date, status,
      sites(name),
      priority:lookup_values!priority_id(label),
      assigned:users!assigned_to(first_name, last_name)
    `)
    .in('status', ['Open', 'In Progress'])
    .order('due_date', { ascending: true, nullsFirst: false })

  if (siteId) {
    query = query.eq('site_id', siteId)
  }

  const { data: rows } = await query

  const actions = (rows ?? []) as unknown as OpenCA[]

  const overdue = actions.filter((ca) => ca.due_date && ca.due_date < today)
  const current = actions.filter((ca) => !ca.due_date || ca.due_date >= today)

  function renderTable(items: OpenCA[], highlight?: 'overdue') {
    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-100">
          <thead>
            <tr className="bg-slate-50">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Title</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Site</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Priority</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Assigned To</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Due Date</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {items.map((ca) => (
              <tr key={ca.id} className="group hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3">
                  <p className="max-w-xs truncate text-sm font-medium text-slate-800">{ca.title}</p>
                  {ca.description && (
                    <p className="mt-0.5 max-w-xs truncate text-xs text-slate-400">{ca.description}</p>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-slate-500">{ca.sites?.name ?? <span className="text-slate-300">—</span>}</td>
                <td className="px-4 py-3">
                  {ca.priority?.label ? (
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${priorityBadgeClass(ca.priority.label)}`}>
                      {ca.priority.label}
                    </span>
                  ) : <span className="text-slate-300">—</span>}
                </td>
                <td className="px-4 py-3 text-sm text-slate-500">
                  {ca.assigned ? `${ca.assigned.first_name} ${ca.assigned.last_name}` : <span className="text-slate-300">—</span>}
                </td>
                <td className={`px-4 py-3 text-sm font-medium ${highlight === 'overdue' ? 'text-red-600' : 'text-slate-700'}`}>
                  {formatDate(ca.due_date)}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${statusBadgeClass(ca.status)}`}>
                    {ca.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Link href={`/corrective-actions/${ca.id}`} className="text-xs font-medium text-orange-600 hover:text-orange-700 hover:underline">
                    View →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/dashboard${siteId ? `?site=${siteId}` : ''}`} className="text-sm text-slate-500 hover:text-slate-700">← Dashboard</Link>
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Open Corrective Actions</h1>
            <p className="mt-0.5 text-sm text-slate-500">
              {actions.length} action{actions.length !== 1 ? 's' : ''} open or in progress
            </p>
          </div>
        </div>
        <Link
          href="/corrective-actions/new"
          className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-orange-600 transition-colors"
        >
          + Add Action
        </Link>
      </div>

      {actions.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
          <p className="text-sm font-medium text-slate-500">No open corrective actions — great work!</p>
        </div>
      ) : (
        <div className="space-y-6">
          {overdue.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-red-200 bg-white shadow-sm">
              <div className="border-b border-red-100 bg-red-50 px-5 py-3 flex items-center gap-2">
                <span className="inline-block h-2 w-2 rounded-full bg-red-400" />
                <h2 className="text-sm font-semibold text-red-700">
                  Overdue ({overdue.length})
                </h2>
              </div>
              {renderTable(overdue, 'overdue')}
            </div>
          )}

          {current.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              {overdue.length > 0 && (
                <div className="border-b border-slate-100 bg-slate-50 px-5 py-3 flex items-center gap-2">
                  <span className="inline-block h-2 w-2 rounded-full bg-slate-400" />
                  <h2 className="text-sm font-semibold text-slate-700">
                    On Track ({current.length})
                  </h2>
                </div>
              )}
              {renderTable(current)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
