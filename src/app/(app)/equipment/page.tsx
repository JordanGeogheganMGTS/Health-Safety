import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Suspense } from 'react'
import { formatDate, isOverdue, isDueWithin } from '@/lib/dates'
import FilterBar from '@/components/ui/FilterBar'
import { getAuthUser } from '@/lib/permissions'

// ─── Types ────────────────────────────────────────────────────────────────────

type EquipmentStatus = 'Operational' | 'Out of Service' | 'Awaiting Service' | 'Decommissioned'

interface EquipmentRow {
  id: string
  name: string
  asset_tag: string | null
  serial_number: string | null
  next_inspection_date: string
  status: string | null
  sites: { name: string } | null
  responsible: { first_name: string; last_name: string } | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusBadgeClass(status: EquipmentStatus): string {
  switch (status) {
    case 'Operational': return 'bg-green-100 text-green-700 ring-green-200'
    case 'Out of Service': return 'bg-red-100 text-red-700 ring-red-200'
    case 'Awaiting Service': return 'bg-amber-100 text-amber-700 ring-amber-200'
    case 'Decommissioned': return 'bg-slate-100 text-slate-600 ring-slate-200'
  }
}

function dueDateClass(dateStr: string): string {
  if (isOverdue(dateStr)) return 'text-red-600 font-semibold'
  if (isDueWithin(dateStr, 30)) return 'text-amber-600 font-semibold'
  return 'text-slate-600'
}

// ─── Page ─────────────────────────────────────────────────────────────────────

interface PageProps {
  searchParams: Promise<{ site_id?: string; status?: string }>
}

export default async function EquipmentPage({ searchParams }: PageProps) {
  const { site_id: siteParam } = await searchParams
  const supabase = await createClient()
  const authUser = await getAuthUser()

  const isSiteScoped = authUser?.role === 'Site Manager' || authUser?.role === 'Staff'

  let query = supabase
    .from('equipment')
    .select(
      `id, name, asset_tag, serial_number, next_inspection_date, status,
       sites(name),
       responsible:users!responsible_person(first_name, last_name)`
    )
    .order('name')

  if (isSiteScoped && authUser?.siteId) {
    // Restrict to their site only — ignore any URL filter param
    query = query.eq('site_id', authUser.siteId)
  } else {
    const siteFilters = siteParam ? siteParam.split(',').filter(Boolean) : []
    if (siteFilters.length > 0) query = query.in('site_id', siteFilters)
  }

  const { data: rows, error } = await query
  const { data: sites } = await supabase.from('sites').select('id, name').order('name')

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        Unable to load equipment: {error.message}
      </div>
    )
  }

  const equipment = (rows ?? []) as unknown as EquipmentRow[]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Equipment Register</h1>
          <p className="mt-1 text-sm text-slate-500">
            {equipment.length} record{equipment.length !== 1 ? 's' : ''} found
          </p>
        </div>
        {authUser?.can('equipment', 'create') && (
          <Link
            href="/equipment/new"
            className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-orange-600 transition-colors"
          >
            <span aria-hidden="true">+</span> Add Equipment
          </Link>
        )}
      </div>

      {/* Filters */}
      {!isSiteScoped && (
        <Suspense fallback={<div className="h-10" />}>
          <FilterBar filters={[
            ...(sites && sites.length > 0 ? [{
              param: 'site_id',
              label: 'Site',
              options: sites.map((s) => ({ value: s.id, label: s.name })),
            }] : []),
          ]} />
        </Suspense>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {equipment.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="text-sm font-medium text-slate-500">No equipment records found.</p>
            {authUser?.can('equipment', 'create') && (
              <p className="mt-1 text-xs text-slate-400">
                Try adjusting your filters or{' '}
                <Link href="/equipment/new" className="text-orange-600 hover:underline">
                  add new equipment
                </Link>
                .
              </p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100">
              <thead>
                <tr className="bg-slate-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Site</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Asset Tag</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Serial No.</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Next Service Due</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Responsible Person</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {equipment.map((eq) => (
                  <tr key={eq.id} className="group hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <Link
                        href={`/equipment/${eq.id}`}
                        className="block text-sm font-medium text-slate-800 group-hover:text-orange-700"
                      >
                        {eq.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {(eq.sites as { name: string } | null)?.name ?? <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {eq.asset_tag ?? <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {eq.serial_number ?? <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={dueDateClass(eq.next_inspection_date)}>
                        {formatDate(eq.next_inspection_date)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {eq.status ? (
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${statusBadgeClass(eq.status as EquipmentStatus)}`}>
                          {eq.status}
                        </span>
                      ) : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {(() => {
                        const r = eq.responsible as { first_name: string; last_name: string } | null
                        return r ? `${r.first_name} ${r.last_name}` : <span className="text-slate-400">—</span>
                      })()}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/equipment/${eq.id}`}
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
