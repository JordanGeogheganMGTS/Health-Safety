import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { formatDate, isOverdue, isDueWithin } from '@/lib/dates'
import { getAuthUser } from '@/lib/permissions'

// ─── Types ────────────────────────────────────────────────────────────────────

type InspectionOutcome = 'Pass' | 'Fail' | 'Advisory'
type AlarmTestOutcome = 'Pass' | 'Fail'

interface ExtinguisherRow {
  id: string
  location: string
  type: { label: string } | null
  next_inspection_date: string | null
  status: { label: string } | null
  sites: { name: string } | null
}

interface AlarmTestRow {
  id: string
  test_date: string
  test_type_lookup: { label: string } | null
  call_point_tested: string | null
  outcome_lookup: { label: string } | null
  fault_description: string | null
  system: {
    site_id: string
    sites: { name: string } | null
  } | null
  tested_by_user: { first_name: string; last_name: string } | null
}

interface DrillRow {
  id: string
  drill_date: string
  drill_time: string | null
  evacuation_time_secs: number | null
  number_evacuated: number | null
  issues_identified: string | null
  notes: string | null
  sites: { name: string } | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extStatusBadgeClass(label: string): string {
  const l = label.toLowerCase()
  if (l === 'serviceable') return 'bg-green-100 text-green-700 ring-green-200'
  if (l === 'out of service') return 'bg-red-100 text-red-700 ring-red-200'
  return 'bg-amber-100 text-amber-700 ring-amber-200'
}

function outcomeBadgeClass(outcome: InspectionOutcome | AlarmTestOutcome): string {
  switch (outcome) {
    case 'Pass': return 'bg-green-100 text-green-700 ring-green-200'
    case 'Fail': return 'bg-red-100 text-red-700 ring-red-200'
    case 'Advisory': return 'bg-amber-100 text-amber-700 ring-amber-200'
  }
}

function dueDateClass(dateStr: string): string {
  if (isOverdue(dateStr)) return 'text-red-600 font-semibold'
  if (isDueWithin(dateStr, 30)) return 'text-amber-600 font-semibold'
  return 'text-slate-600'
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function FireSafetyPage() {
  const supabase = await createClient()

  const [
    { data: extRows },
    { data: alarmTestRows },
    { data: drillRows },
  ] = await Promise.all([
    supabase
      .from('fire_extinguishers')
      .select('id, location, next_inspection_date, sites!site_id(name), type:lookup_values!type_id(label), status:lookup_values!status_id(label)')
      .order('next_inspection_date', { ascending: true }),
    supabase
      .from('fire_alarm_tests')
      .select(
        `id, test_date, call_point_tested, fault_description,
         test_type_lookup:test_type_id(label),
         outcome_lookup:outcome_id(label),
         system:fire_alarm_system_id(site_id, sites(name)),
         tested_by_user:tested_by(first_name, last_name)`
      )
      .order('test_date', { ascending: false })
      .limit(50),
    supabase
      .from('fire_drills')
      .select('id, drill_date, drill_time, evacuation_time_secs, number_evacuated, issues_identified, notes, sites!site_id(name)')
      .order('drill_date', { ascending: false })
      .limit(50),
  ])

  const extinguishers = (extRows ?? []) as unknown as ExtinguisherRow[]
  const alarmTests = (alarmTestRows ?? []) as unknown as AlarmTestRow[]
  const drills = (drillRows ?? []) as unknown as DrillRow[]

  const authUser = await getAuthUser()

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Fire Safety</h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage fire extinguishers, alarm tests, and evacuation drills.
        </p>
      </div>

      {/* ── Card 1: Fire Extinguishers ─────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Fire Extinguishers</h2>
          {authUser?.can('fire_safety', 'create') && (
            <Link
              href="/fire-safety/extinguisher/new"
              className="inline-flex items-center gap-1.5 rounded-lg bg-orange-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-orange-600 transition-colors"
            >
              <span aria-hidden="true">+</span> Add Extinguisher
            </Link>
          )}
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {extinguishers.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-sm font-medium text-slate-500">No extinguishers recorded.</p>
              <p className="mt-1 text-xs text-slate-400">
                <Link href="/fire-safety/extinguisher/new" className="text-orange-600 hover:underline">
                  Add the first extinguisher
                </Link>
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Location</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Site</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Next Inspection</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {extinguishers.map((ext) => (
                    <tr key={ext.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-slate-800">{ext.location}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{(ext.sites as unknown as { name: string } | null)?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{ext.type?.label ?? '—'}</td>
                      <td className="px-4 py-3 text-sm">
                        {ext.next_inspection_date ? (
                          <span className={dueDateClass(ext.next_inspection_date)}>
                            {formatDate(ext.next_inspection_date)}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {ext.status?.label ? (
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${extStatusBadgeClass(ext.status.label)}`}>
                            {ext.status.label}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/fire-safety/extinguisher/${ext.id}/inspect`}
                          className="text-xs font-medium text-orange-600 hover:text-orange-700 hover:underline"
                        >
                          Inspect
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

      {/* ── Card 2: Fire Alarm Tests ───────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Fire Alarm Tests</h2>
          {authUser?.can('fire_safety', 'create') && (
            <Link
              href="/fire-safety/alarm/new"
              className="inline-flex items-center gap-1.5 rounded-lg bg-orange-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-orange-600 transition-colors"
            >
              <span aria-hidden="true">+</span> Log Alarm Test
            </Link>
          )}
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {alarmTests.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-sm font-medium text-slate-500">No alarm tests recorded.</p>
              <p className="mt-1 text-xs text-slate-400">
                <Link href="/fire-safety/alarm/new" className="text-orange-600 hover:underline">
                  Log the first alarm test
                </Link>
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Site</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Call Point</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Outcome</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Faults</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Recorded By</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {alarmTests.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-sm text-slate-700">{(t.system?.sites as unknown as { name: string } | null)?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{formatDate(t.test_date)}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{(t.test_type_lookup as unknown as { label: string } | null)?.label ?? '—'}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{t.call_point_tested ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${outcomeBadgeClass(((t.outcome_lookup as unknown as { label: string } | null)?.label ?? 'Pass') as AlarmTestOutcome)}`}>
                          {(t.outcome_lookup as unknown as { label: string } | null)?.label ?? '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 max-w-[200px] truncate">
                        {t.fault_description ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {t.tested_by_user ? `${(t.tested_by_user as unknown as { first_name: string; last_name: string }).first_name} ${(t.tested_by_user as unknown as { first_name: string; last_name: string }).last_name}` : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/fire-safety/alarm/${t.id}`} className="text-xs font-medium text-orange-600 hover:text-orange-700 hover:underline">View</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Card 3: Fire Drills ────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Fire Drills</h2>
          {authUser?.can('fire_safety', 'create') && (
            <Link
              href="/fire-safety/drill/new"
              className="inline-flex items-center gap-1.5 rounded-lg bg-orange-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-orange-600 transition-colors"
            >
              <span aria-hidden="true">+</span> Log Drill
            </Link>
          )}
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {drills.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-sm font-medium text-slate-500">No fire drills recorded.</p>
              <p className="mt-1 text-xs text-slate-400">
                <Link href="/fire-safety/drill/new" className="text-orange-600 hover:underline">
                  Log the first fire drill
                </Link>
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Site</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Time</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Evacuation (secs)</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">No. Evacuated</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Issues Identified</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Notes</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {drills.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-sm text-slate-700">{(d.sites as unknown as { name: string } | null)?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{formatDate(d.drill_date)}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{d.drill_time ?? '—'}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {d.evacuation_time_secs != null ? d.evacuation_time_secs : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {d.number_evacuated != null ? d.number_evacuated : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 max-w-[200px] truncate">
                        {d.issues_identified ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 max-w-[200px] truncate">
                        {d.notes ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/fire-safety/drill/${d.id}`} className="text-xs font-medium text-orange-600 hover:text-orange-700 hover:underline">View</Link>
                      </td>
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
