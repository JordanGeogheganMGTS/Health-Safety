import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Suspense } from 'react'
import { formatDate } from '@/lib/dates'
import { getAuthUser } from '@/lib/permissions'
import FilterBar from '@/components/ui/FilterBar'

// ─── Types ────────────────────────────────────────────────────────────────────

type CAStatus = 'Open' | 'In Progress' | 'Completed' | 'Overdue' | 'Closed'
type Priority = 'Low' | 'Medium' | 'High' | 'Critical'

interface CorrectiveActionRow {
  id: string
  title: string
  description: string | null
  source_table: string | null
  site_id: string | null
  priority: { label: Priority } | null
  due_date: string | null
  completed_at: string | null
  status: CAStatus
  created_at: string
  sites: { name: string } | null
  assigned: { first_name: string; last_name: string } | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatSourceTable(source: string | null): string {
  if (!source) return '—'
  const map: Record<string, string> = {
    inspections: 'Inspection',
    incidents: 'Incident',
    dse_assessments: 'DSE Assessment',
    risk_assessments: 'Risk Assessment',
    fire_safety: 'Fire Safety',
    manual: 'Manual',
  }
  return map[source] ?? source.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function statusBadgeClass(status: CAStatus): string {
  switch (status) {
    case 'Open': return 'bg-slate-100 text-slate-700 ring-slate-200'
    case 'In Progress': return 'bg-orange-100 text-orange-700 ring-blue-200'
    case 'Completed': return 'bg-green-100 text-green-700 ring-green-200'
    case 'Overdue': return 'bg-red-100 text-red-700 ring-red-200'
    case 'Closed': return 'bg-gray-100 text-gray-600 ring-gray-200'
  }
}

function priorityBadgeClass(priority: Priority): string {
  switch (priority) {
    case 'Critical': return 'bg-red-100 text-red-800 ring-red-200'
    case 'High': return 'bg-orange-100 text-orange-800 ring-orange-200'
    case 'Medium': return 'bg-amber-100 text-amber-800 ring-amber-200'
    case 'Low': return 'bg-green-100 text-green-800 ring-green-200'
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function parseFilter(value: string | undefined): string[] {
  return value ? value.split(',').filter(Boolean) : []
}

interface PageProps {
  searchParams: Promise<{ status?: string; priority?: string; site_id?: string }>
}

export default async function CorrectiveActionsPage({ searchParams }: PageProps) {
  const { status: statusParam, priority: priorityParam, site_id: siteParam } = await searchParams
  const statusFilters = parseFilter(statusParam)
  const priorityFilters = parseFilter(priorityParam)
  const siteFilters = parseFilter(siteParam)

  const supabase = await createClient()

  // Fetch reference data in parallel
  const [sitesRes, prioritiesRes] = await Promise.all([
    supabase.from('sites').select('id, name, is_all_sites').order('name'),
    supabase
      .from('lookup_values')
      .select('id, label, lookup_categories!inner(key)')
      .eq('lookup_categories.key', 'ca_priority')
      .eq('is_active', true)
      .order('sort_order'),
  ])

  const allSites = sitesRes.data ?? []
  const filterableSites = allSites.filter((s) => !(s as unknown as { is_all_sites: boolean }).is_all_sites)
  const priorityLookups = (prioritiesRes.data ?? []) as { id: string; label: string }[]

  // Map priority labels → UUIDs for DB filtering
  const selectedPriorityIds = priorityFilters
    .map((label) => priorityLookups.find((p) => p.label === label)?.id)
    .filter(Boolean) as string[]

  // Build query
  let query = supabase
    .from('corrective_actions')
    .select(
      `id, title, description, source_table, site_id, due_date,
       completed_at, status, created_at,
       priority:lookup_values!priority_id(label),
       sites(name),
       assigned:users!assigned_to(first_name, last_name)`
    )
    .order('due_date', { ascending: true, nullsFirst: false })

  if (statusFilters.length > 0) query = query.in('status', statusFilters)
  if (selectedPriorityIds.length > 0) query = query.in('priority_id', selectedPriorityIds)
  if (siteFilters.length > 0) query = query.in('site_id', siteFilters)

  const { data: rows, error } = await query

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        Unable to load corrective actions: {error.message}
      </div>
    )
  }

  const actions = (rows ?? []) as unknown as CorrectiveActionRow[]
  const authUser = await getAuthUser()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Corrective Actions</h1>
          <p className="mt-1 text-sm text-slate-500">
            {actions.length} record{actions.length !== 1 ? 's' : ''} found
          </p>
        </div>
        {authUser?.can('corrective_actions', 'create') && (
          <Link
            href="/corrective-actions/new"
            className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-orange-600 transition-colors"
          >
            <span aria-hidden="true">+</span> Add Corrective Action
          </Link>
        )}
      </div>

      {/* Filters */}
      <Suspense fallback={<div className="h-10" />}>
        <FilterBar filters={[
          {
            param: 'status',
            label: 'Status',
            options: (['Open', 'In Progress', 'Completed', 'Overdue', 'Closed'] as const).map((s) => ({ value: s, label: s })),
          },
          ...(priorityLookups.length > 0 ? [{
            param: 'priority',
            label: 'Priority',
            options: priorityLookups.map((p) => ({ value: p.label, label: p.label })),
          }] : []),
          ...(filterableSites.length > 0 ? [{
            param: 'site_id',
            label: 'Site',
            options: filterableSites.map((s) => ({ value: s.id, label: s.name })),
          }] : []),
        ]} />
      </Suspense>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {actions.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="text-sm font-medium text-slate-500">No corrective actions found.</p>
            <p className="mt-1 text-xs text-slate-400">
              Try adjusting your filters or{' '}
              <Link href="/corrective-actions/new" className="text-orange-600 hover:underline">
                add a new one
              </Link>
              .
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100">
              <thead>
                <tr className="bg-slate-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Title
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Source
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Site
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Priority
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Assigned To
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Due Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {actions.map((ca) => (
                  <tr
                    key={ca.id}
                    className="group hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/corrective-actions/${ca.id}`}
                        className="block max-w-xs truncate text-sm font-medium text-slate-800 group-hover:text-orange-700"
                      >
                        {ca.title}
                      </Link>
                      {ca.description && (
                        <p className="mt-0.5 max-w-xs truncate text-xs text-slate-400">
                          {ca.description}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {formatSourceTable(ca.source_table)}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {ca.sites?.name ?? <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {(() => {
                        const p = ca.priority?.label
                        return p ? (
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${priorityBadgeClass(p)}`}>
                            {p}
                          </span>
                        ) : <span className="text-slate-400">—</span>
                      })()}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {(() => {
                        const a = ca.assigned
                        return a ? `${a.first_name} ${a.last_name}` : <span className="text-slate-400">Unassigned</span>
                      })()}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {formatDate(ca.due_date)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${statusBadgeClass(ca.status)}`}
                      >
                        {ca.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/corrective-actions/${ca.id}`}
                        className="text-xs font-medium text-orange-600 hover:text-orange-700 hover:underline"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
