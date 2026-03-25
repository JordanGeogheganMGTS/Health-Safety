import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { formatDate } from '@/lib/dates'

// ─── Types ────────────────────────────────────────────────────────────────────

type CAStatus = 'Open' | 'In Progress' | 'Completed' | 'Overdue' | 'Closed'
type Priority = 'Low' | 'Medium' | 'High' | 'Critical'

interface CorrectiveActionRow {
  id: string
  title: string
  description: string | null
  source_module: string | null
  site_id: string | null
  priority: Priority
  due_date: string | null
  completed_date: string | null
  status: CAStatus
  created_at: string
  sites: { name: string } | null
  assigned: { first_name: string; last_name: string } | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatSourceModule(source: string | null): string {
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
    case 'In Progress': return 'bg-blue-100 text-blue-700 ring-blue-200'
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

interface PageProps {
  searchParams: { status?: string; priority?: string; site_id?: string }
}

export default async function CorrectiveActionsPage({ searchParams }: PageProps) {
  const supabase = await createClient()

  // Build query with optional filters
  let query = supabase
    .from('corrective_actions')
    .select(
      `id, title, description, source_module, site_id, priority, due_date,
       completed_date, status, created_at,
       sites(name),
       assigned:assigned_to_id(first_name, last_name)`
    )
    .order('due_date', { ascending: true, nullsFirst: false })

  if (searchParams.status) {
    query = query.eq('status', searchParams.status)
  }
  if (searchParams.priority) {
    query = query.eq('priority', searchParams.priority)
  }
  if (searchParams.site_id) {
    query = query.eq('site_id', searchParams.site_id)
  }

  const { data: rows, error } = await query

  // Fetch sites for the filter dropdown
  const { data: sites } = await supabase
    .from('sites')
    .select('id, name')
    .order('name')

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        Unable to load corrective actions. Please try again later.
      </div>
    )
  }

  const actions = (rows ?? []) as unknown as CorrectiveActionRow[]

  const statusOptions: CAStatus[] = ['Open', 'In Progress', 'Completed', 'Overdue', 'Closed']
  const priorityOptions: Priority[] = ['Low', 'Medium', 'High', 'Critical']

  // Build filter URL helper
  function filterUrl(overrides: Record<string, string | undefined>): string {
    const params = new URLSearchParams()
    const base = {
      status: searchParams.status,
      priority: searchParams.priority,
      site_id: searchParams.site_id,
      ...overrides,
    }
    for (const [k, v] of Object.entries(base)) {
      if (v) params.set(k, v)
    }
    const str = params.toString()
    return `/corrective-actions${str ? `?${str}` : ''}`
  }

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
        <Link
          href="/corrective-actions/new"
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors"
        >
          <span aria-hidden="true">+</span> Add Corrective Action
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        {/* Status filter */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-slate-500">Status:</span>
          <Link
            href={filterUrl({ status: undefined })}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              !searchParams.status
                ? 'bg-slate-800 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All
          </Link>
          {statusOptions.map((s) => (
            <Link
              key={s}
              href={filterUrl({ status: s })}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                searchParams.status === s
                  ? 'bg-slate-800 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {s}
            </Link>
          ))}
        </div>

        {/* Priority filter */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-slate-500">Priority:</span>
          <Link
            href={filterUrl({ priority: undefined })}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              !searchParams.priority
                ? 'bg-slate-800 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All
          </Link>
          {priorityOptions.map((p) => (
            <Link
              key={p}
              href={filterUrl({ priority: p })}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                searchParams.priority === p
                  ? 'bg-slate-800 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {p}
            </Link>
          ))}
        </div>

        {/* Site filter */}
        {sites && sites.length > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-slate-500">Site:</span>
            <Link
              href={filterUrl({ site_id: undefined })}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                !searchParams.site_id
                  ? 'bg-slate-800 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All
            </Link>
            {sites.map((site) => (
              <Link
                key={site.id}
                href={filterUrl({ site_id: site.id })}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  searchParams.site_id === site.id
                    ? 'bg-slate-800 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {site.name}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {actions.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="text-sm font-medium text-slate-500">No corrective actions found.</p>
            <p className="mt-1 text-xs text-slate-400">
              Try adjusting your filters or{' '}
              <Link href="/corrective-actions/new" className="text-blue-600 hover:underline">
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
                        className="block max-w-xs truncate text-sm font-medium text-slate-800 group-hover:text-blue-700"
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
                      {formatSourceModule(ca.source_module)}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {ca.sites?.name ?? <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${priorityBadgeClass(ca.priority)}`}
                      >
                        {ca.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {ca.assigned
                        ? `${ca.assigned.first_name} ${ca.assigned.last_name}`
                        : <span className="text-slate-400">Unassigned</span>}
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
                        className="text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline"
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
