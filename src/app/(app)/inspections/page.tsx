import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { formatDate } from '@/lib/dates'

// ─── Types ────────────────────────────────────────────────────────────────────

type InspectionStatus = 'Scheduled' | 'In Progress' | 'Completed' | 'Overdue'

interface InspectionRow {
  id: string
  title: string
  scheduled_date: string
  completed_date: string | null
  status: InspectionStatus
  sites: { name: string } | null
  type: { label: string } | null
  conducted_by: { first_name: string; last_name: string } | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusBadgeClass(status: InspectionStatus): string {
  switch (status) {
    case 'Scheduled':   return 'bg-slate-100 text-slate-700 ring-slate-200'
    case 'In Progress': return 'bg-orange-100 text-orange-700 ring-blue-200'
    case 'Completed':   return 'bg-green-100 text-green-700 ring-green-200'
    case 'Overdue':     return 'bg-red-100 text-red-700 ring-red-200'
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

interface PageProps {
  searchParams: Promise<{ status?: string }>
}

export default async function InspectionsPage({ searchParams }: PageProps) {
  const { status: statusFilter } = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('inspections')
    .select(
      `id, title, scheduled_date, completed_date, status,
       sites(name),
       type:type_id(label),
       conducted_by:conducted_by_id(first_name, last_name)`
    )
    .order('scheduled_date', { ascending: false })

  if (statusFilter) {
    query = query.eq('status', statusFilter)
  }

  const { data: rows, error } = await query

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        Unable to load inspections. Please try again later.
      </div>
    )
  }

  const inspections = (rows ?? []) as unknown as InspectionRow[]
  const statusOptions: InspectionStatus[] = ['Scheduled', 'In Progress', 'Completed', 'Overdue']

  function filterUrl(overrides: Record<string, string | undefined>): string {
    const params = new URLSearchParams()
    const base = { status: statusFilter, ...overrides }
    for (const [k, v] of Object.entries(base)) {
      if (v) params.set(k, v)
    }
    const str = params.toString()
    return `/inspections${str ? `?${str}` : ''}`
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Inspections &amp; Audits</h1>
          <p className="mt-1 text-sm text-slate-500">
            {inspections.length} record{inspections.length !== 1 ? 's' : ''} found
          </p>
        </div>
        <Link
          href="/inspections/new"
          className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-orange-600 transition-colors"
        >
          <span aria-hidden="true">+</span> Schedule Inspection
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs font-medium text-slate-500">Status:</span>
        <Link
          href={filterUrl({ status: undefined })}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            !statusFilter ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          All
        </Link>
        {statusOptions.map((s) => (
          <Link
            key={s}
            href={filterUrl({ status: s })}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              statusFilter === s ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {s}
          </Link>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {inspections.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="text-sm font-medium text-slate-500">No inspections found.</p>
            <p className="mt-1 text-xs text-slate-400">
              Try adjusting your filters or{' '}
              <Link href="/inspections/new" className="text-orange-600 hover:underline">
                schedule a new inspection
              </Link>
              .
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100">
              <thead>
                <tr className="bg-slate-50">
                  {['Title', 'Site', 'Type', 'Scheduled Date', 'Status', 'Conducted By', 'Actions'].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {inspections.map((insp) => (
                  <tr key={insp.id} className="group hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <Link
                        href={`/inspections/${insp.id}`}
                        className="block max-w-xs truncate text-sm font-medium text-slate-800 group-hover:text-orange-700"
                      >
                        {insp.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {insp.sites?.[0]?.name ?? <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {insp.type?.[0]?.label ?? <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {formatDate(insp.scheduled_date)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${statusBadgeClass(insp.status)}`}
                      >
                        {insp.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {insp.conducted_by
                        ? `${insp.conducted_by.first_name} ${insp.conducted_by.last_name}`
                        : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/inspections/${insp.id}`}
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
