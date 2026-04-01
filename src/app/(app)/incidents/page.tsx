import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { formatDate } from '@/lib/dates'

// ─── Types ────────────────────────────────────────────────────────────────────

type IncidentStatus = 'Open' | 'Under Investigation' | 'Closed'

interface IncidentRow {
  id: string
  incident_date: string
  incident_time: string | null
  type: string
  location_description: string
  riddor_reportable: boolean
  status: IncidentStatus
  sites: { name: string } | null
  reported_by: { first_name: string; last_name: string } | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusBadgeClass(status: IncidentStatus): string {
  switch (status) {
    case 'Open': return 'bg-slate-100 text-slate-700 ring-slate-200'
    case 'Under Investigation': return 'bg-orange-100 text-orange-700 ring-blue-200'
    case 'Closed': return 'bg-green-100 text-green-700 ring-green-200'
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

interface PageProps {
  searchParams: Promise<{ status?: string; riddor?: string }>
}

export default async function IncidentsPage({ searchParams }: PageProps) {
  const { status, riddor } = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('incidents')
    .select(
      `id, incident_date, incident_time, type, location_description, riddor_reportable, status,
       sites(name),
       reported_by:reported_by_id(first_name, last_name)`
    )
    .order('incident_date', { ascending: false })

  if (status) query = query.eq('status', status)
  if (riddor === 'true') query = query.eq('riddor_reportable', true)

  const { data: rows, error } = await query

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        Unable to load incidents. Please try again later.
      </div>
    )
  }

  const incidents = (rows ?? []) as unknown as IncidentRow[]
  const statusOptions: IncidentStatus[] = ['Open', 'Under Investigation', 'Closed']

  function filterUrl(overrides: Record<string, string | undefined>): string {
    const params = new URLSearchParams()
    const base = { status, riddor, ...overrides }
    for (const [k, v] of Object.entries(base)) {
      if (v) params.set(k, v)
    }
    const str = params.toString()
    return `/incidents${str ? `?${str}` : ''}`
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Incident Log</h1>
          <p className="mt-1 text-sm text-slate-500">
            {incidents.length} record{incidents.length !== 1 ? 's' : ''} found
          </p>
        </div>
        <Link
          href="/incidents/new"
          className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-orange-600 transition-colors"
        >
          <span aria-hidden="true">+</span> Report Incident
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        {/* Status filter */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-medium text-slate-500">Status:</span>
          <Link
            href={filterUrl({ status: undefined })}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              !status ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All
          </Link>
          {statusOptions.map((s) => (
            <Link
              key={s}
              href={filterUrl({ status: s })}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                status === s ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {s}
            </Link>
          ))}
        </div>

        {/* RIDDOR filter */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-slate-500">RIDDOR:</span>
          <Link
            href={filterUrl({ riddor: undefined })}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              !riddor ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All
          </Link>
          <Link
            href={filterUrl({ riddor: 'true' })}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              riddor === 'true' ? 'bg-red-700 text-white' : 'bg-red-100 text-red-700 hover:bg-red-200'
            }`}
          >
            RIDDOR Only
          </Link>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {incidents.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="text-sm font-medium text-slate-500">No incidents found.</p>
            <p className="mt-1 text-xs text-slate-400">
              Try adjusting your filters or{' '}
              <Link href="/incidents/new" className="text-orange-600 hover:underline">
                report a new incident
              </Link>
              .
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100">
              <thead>
                <tr className="bg-slate-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Time</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Site</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Location</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">RIDDOR</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Reported By</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {incidents.map((inc) => (
                  <tr key={inc.id} className="group hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-sm text-slate-700">{formatDate(inc.incident_date)}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{inc.incident_time ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{inc.type}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{inc.sites?.[0]?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-slate-600 max-w-[160px] truncate">
                      {inc.location_description}
                    </td>
                    <td className="px-4 py-3">
                      {inc.riddor_reportable ? (
                        <span className="inline-flex rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700 ring-1 ring-inset ring-red-200">
                          RIDDOR
                        </span>
                      ) : (
                        <span className="text-slate-400 text-sm">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${statusBadgeClass(inc.status)}`}>
                        {inc.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {inc.reported_by
                        ? `${inc.reported_by.first_name} ${inc.reported_by.last_name}`
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/incidents/${inc.id}`}
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
