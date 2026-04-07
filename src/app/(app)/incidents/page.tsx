import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Suspense } from 'react'
import { formatDate } from '@/lib/dates'
import { getAuthUser } from '@/lib/permissions'
import FilterBar from '@/components/ui/FilterBar'
import SortLink from '@/components/ui/SortLink'

// ─── Types ────────────────────────────────────────────────────────────────────

type IncidentStatus = 'Open' | 'Under Investigation' | 'Closed'

interface IncidentRow {
  id: string
  incident_date: string
  incident_time: string | null
  title: string
  injured_person_name: string | null
  type: { label: string } | null
  location: string
  is_riddor_reportable: boolean
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
  searchParams: Promise<{ status?: string; riddor?: string; sort?: string; dir?: string }>
}

export default async function IncidentsPage({ searchParams }: PageProps) {
  const { status: statusParam, riddor, sort = 'incident_date', dir = 'desc' } = await searchParams
  const statusFilters = statusParam ? statusParam.split(',').filter(Boolean) : []
  const asc = dir === 'asc'
  const supabase = await createClient()

  const validSortCols = ['incident_date', 'status', 'injured_person_name'] as const
  type SortCol = typeof validSortCols[number]
  const sortCol: SortCol = validSortCols.includes(sort as SortCol) ? (sort as SortCol) : 'incident_date'

  let query = supabase
    .from('incidents')
    .select(
      `id, incident_date, incident_time, title, injured_person_name, location, is_riddor_reportable, status,
       type:lookup_values!type_id(label),
       sites(name),
       reported_by:users!reported_by(first_name, last_name)`
    )
    .order(sortCol, { ascending: asc })

  if (statusFilters.length > 0) query = query.in('status', statusFilters)
  if (riddor === 'true') query = query.eq('is_riddor_reportable', true)

  const { data: rows, error } = await query

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        Unable to load incidents: {error.message}
      </div>
    )
  }

  const incidents = (rows ?? []) as unknown as IncidentRow[]
  const authUser = await getAuthUser()

  const sp = await searchParams
  const baseParams = Object.fromEntries(
    Object.entries(sp).filter(([k]) => k !== 'sort' && k !== 'dir').map(([k, v]) => [k, v ?? ''])
  )

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
        {authUser?.can('incidents', 'create') && (
          <Link
            href="/incidents/new"
            className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-orange-600 transition-colors"
          >
            <span aria-hidden="true">+</span> Report Incident
          </Link>
        )}
      </div>

      {/* Filters */}
      <Suspense fallback={<div className="h-10" />}>
        <FilterBar filters={[
          {
            param: 'status',
            label: 'Status',
            options: (['Open', 'Under Investigation', 'Closed'] as const).map((s) => ({ value: s, label: s })),
          },
          {
            param: 'riddor',
            label: 'RIDDOR',
            multi: false,
            options: [{ value: 'true', label: 'RIDDOR Only' }],
          },
        ]} />
      </Suspense>

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
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <SortLink column="incident_date" label="Date" sort={sortCol} dir={dir} params={baseParams} />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Time</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <SortLink column="injured_person_name" label="Person" sort={sortCol} dir={dir} params={baseParams} />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Site</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Location</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">RIDDOR</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <SortLink column="status" label="Status" sort={sortCol} dir={dir} params={baseParams} />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Reported By</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {incidents.map((inc) => (
                  <tr key={inc.id} className="group hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-sm text-slate-700">{formatDate(inc.incident_date)}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{inc.incident_time ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {inc.type?.label ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {inc.injured_person_name ?? <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{(inc.sites as unknown as { name: string } | null)?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-slate-600 max-w-[140px] truncate">
                      {inc.location}
                    </td>
                    <td className="px-4 py-3">
                      {inc.is_riddor_reportable ? (
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
                      {(() => {
                        const rb = inc.reported_by as unknown as { first_name: string; last_name: string } | null
                        return rb ? `${rb.first_name} ${rb.last_name}` : '—'
                      })()}
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
