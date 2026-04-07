import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { formatDate, isOverdue, isDueWithin } from '@/lib/dates'
import { getAuthUser } from '@/lib/permissions'
import SortLink from '@/components/ui/SortLink'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ExtinguisherRow {
  id: string
  location: string
  next_inspection_date: string | null
  type: { label: string } | null
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
  system: { site_id: string; sites: { name: string } | null } | null
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

interface EmergencyLightTestRow {
  id: string
  test_date: string
  test_type: string
  overall_result: 'Pass' | 'Fail' | null
  sites: { name: string } | null
  tested_by_user: { first_name: string; last_name: string } | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function outcomeBadgeClass(outcome: string): string {
  const l = outcome.toLowerCase()
  if (l === 'pass') return 'bg-green-100 text-green-700 ring-green-200'
  if (l === 'fail') return 'bg-red-100 text-red-700 ring-red-200'
  return 'bg-amber-100 text-amber-700 ring-amber-200'
}

function dueDateClass(dateStr: string | null): string {
  if (!dateStr) return 'text-slate-600'
  if (isOverdue(dateStr)) return 'text-red-600 font-semibold'
  if (isDueWithin(dateStr, 30)) return 'text-amber-600 font-semibold'
  return 'text-slate-600'
}

const TAB_LINKS = [
  { key: 'extinguishers', label: 'Fire Extinguishers', href: '/fire-safety?tab=extinguishers' },
  { key: 'alarm', label: 'Fire Alarm Tests', href: '/fire-safety?tab=alarm' },
  { key: 'drills', label: 'Fire Drills', href: '/fire-safety?tab=drills' },
  { key: 'emergency', label: 'Emergency Lighting', href: '/fire-safety?tab=emergency' },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

interface PageProps {
  searchParams: Promise<{ tab?: string; sort?: string; dir?: string }>
}

export default async function FireSafetyPage({ searchParams }: PageProps) {
  const sp = await searchParams
  const activeTab = ['extinguishers', 'alarm', 'drills', 'emergency'].includes(sp.tab ?? '') ? sp.tab! : 'extinguishers'
  const sort = sp.sort ?? ''
  const dir = sp.dir === 'desc' ? 'desc' : 'asc'
  const asc = dir === 'asc'

  const baseParams = Object.fromEntries(
    Object.entries(sp).filter(([k]) => k !== 'sort' && k !== 'dir')
  ) as Record<string, string>

  const supabase = await createClient()
  const authUser = await getAuthUser()

  // ── Extinguishers ──
  let extinguishers: ExtinguisherRow[] = []
  if (activeTab === 'extinguishers') {
    const extSort = sort === 'location' ? 'location' : 'next_inspection_date'
    const { data } = await supabase
      .from('fire_extinguishers')
      .select('id, location, next_inspection_date, sites!site_id(name), type:lookup_values!type_id(label), status:lookup_values!status_id(label)')
      .order(extSort, { ascending: asc })
    extinguishers = (data ?? []) as unknown as ExtinguisherRow[]
  }

  // ── Alarm Tests ──
  let alarmTests: AlarmTestRow[] = []
  if (activeTab === 'alarm') {
    const { data } = await supabase
      .from('fire_alarm_tests')
      .select(`id, test_date, call_point_tested, fault_description,
         test_type_lookup:test_type_id(label),
         outcome_lookup:outcome_id(label),
         system:fire_alarm_system_id(site_id, sites(name)),
         tested_by_user:tested_by(first_name, last_name)`)
      .order('test_date', { ascending: sort === 'test_date' ? asc : false })
      .limit(100)
    alarmTests = (data ?? []) as unknown as AlarmTestRow[]
  }

  // ── Drills ──
  let drills: DrillRow[] = []
  if (activeTab === 'drills') {
    const drillSort = ['drill_date', 'evacuation_time_secs', 'number_evacuated'].includes(sort)
      ? sort : 'drill_date'
    const { data } = await supabase
      .from('fire_drills')
      .select('id, drill_date, drill_time, evacuation_time_secs, number_evacuated, issues_identified, notes, sites!site_id(name)')
      .order(drillSort, { ascending: sort === drillSort ? asc : false })
      .limit(100)
    drills = (data ?? []) as unknown as DrillRow[]
  }

  // ── Emergency Lighting ──
  let elTests: EmergencyLightTestRow[] = []
  if (activeTab === 'emergency') {
    const { data } = await supabase
      .from('emergency_light_tests')
      .select('id, test_date, test_type, overall_result, sites!site_id(name), tested_by_user:users!tested_by(first_name, last_name)')
      .order('test_date', { ascending: sort === 'test_date' ? asc : false })
      .limit(100)
    elTests = (data ?? []) as unknown as EmergencyLightTestRow[]
  }

  const tabClass = (key: string) =>
    `whitespace-nowrap pb-3 px-1 border-b-2 text-sm font-medium transition-colors ${
      activeTab === key
        ? 'border-orange-500 text-orange-600'
        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
    }`

  const thClass = 'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500'

  const addButton: Record<string, { href: string; label: string }> = {
    extinguishers: { href: '/fire-safety/extinguisher/new', label: 'Add Extinguisher' },
    alarm: { href: '/fire-safety/alarm/new', label: 'Log Alarm Test' },
    drills: { href: '/fire-safety/drill/new', label: 'Log Drill' },
    emergency: { href: '/fire-safety/emergency-lighting/new', label: 'Log Test' },
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Fire Safety</h1>
          <p className="mt-1 text-sm text-slate-500">Manage fire extinguishers, alarm tests, drills and emergency lighting.</p>
        </div>
        {authUser?.can('fire_safety', 'create') && (
          <Link
            href={addButton[activeTab].href}
            className="inline-flex items-center gap-1.5 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 transition-colors"
          >
            <span aria-hidden="true">+</span> {addButton[activeTab].label}
          </Link>
        )}
      </div>

      {/* Tab bar */}
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex gap-6 overflow-x-auto" aria-label="Fire Safety tabs">
          {TAB_LINKS.map(({ key, label, href }) => (
            <Link key={key} href={href} className={tabClass(key)}>{label}</Link>
          ))}
        </nav>
      </div>

      {/* ── Fire Extinguishers ─────────────────────────────────────────────── */}
      {activeTab === 'extinguishers' && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {extinguishers.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-sm font-medium text-slate-500">No extinguishers recorded.</p>
              {authUser?.can('fire_safety', 'create') && <Link href="/fire-safety/extinguisher/new" className="mt-1 text-xs text-orange-600 hover:underline">Add the first extinguisher</Link>}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100">
                <thead>
                  <tr className="bg-slate-50">
                    <th className={thClass}><SortLink column="location" label="Location" sort={sort} dir={dir} params={baseParams} /></th>
                    <th className={thClass}>Site</th>
                    <th className={thClass}>Type</th>
                    <th className={thClass}><SortLink column="next_inspection_date" label="Next Inspection" sort={sort} dir={dir} params={baseParams} /></th>
                    <th className={thClass}>Status</th>
                    <th className={thClass}></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {extinguishers.map((ext) => (
                    <tr key={ext.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-slate-800">{ext.location}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{(ext.sites as unknown as { name: string } | null)?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{ext.type?.label ?? '—'}</td>
                      <td className="px-4 py-3 text-sm">
                        {ext.next_inspection_date
                          ? <span className={dueDateClass(ext.next_inspection_date)}>{formatDate(ext.next_inspection_date)}</span>
                          : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {ext.status?.label ? (
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${outcomeBadgeClass(ext.status.label)}`}>
                            {ext.status.label}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/fire-safety/extinguisher/${ext.id}/inspect`} className="text-xs font-medium text-orange-600 hover:underline">Inspect</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Fire Alarm Tests ───────────────────────────────────────────────── */}
      {activeTab === 'alarm' && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {alarmTests.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-sm font-medium text-slate-500">No alarm tests recorded.</p>
              {authUser?.can('fire_safety', 'create') && <Link href="/fire-safety/alarm/new" className="mt-1 text-xs text-orange-600 hover:underline">Log the first alarm test</Link>}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100">
                <thead>
                  <tr className="bg-slate-50">
                    <th className={thClass}>Site</th>
                    <th className={thClass}><SortLink column="test_date" label="Date" sort={sort} dir={dir} params={baseParams} /></th>
                    <th className={thClass}>Type</th>
                    <th className={thClass}>Call Point</th>
                    <th className={thClass}>Outcome</th>
                    <th className={thClass}>Faults</th>
                    <th className={thClass}>Recorded By</th>
                    <th className={thClass}></th>
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
                        {(() => {
                          const label = (t.outcome_lookup as unknown as { label: string } | null)?.label
                          return label ? (
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${outcomeBadgeClass(label)}`}>{label}</span>
                          ) : '—'
                        })()}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 max-w-[180px] truncate">{t.fault_description ?? '—'}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {t.tested_by_user ? `${(t.tested_by_user as unknown as { first_name: string; last_name: string }).first_name} ${(t.tested_by_user as unknown as { first_name: string; last_name: string }).last_name}` : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/fire-safety/alarm/${t.id}`} className="text-xs font-medium text-orange-600 hover:underline">View</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Fire Drills ────────────────────────────────────────────────────── */}
      {activeTab === 'drills' && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {drills.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-sm font-medium text-slate-500">No fire drills recorded.</p>
              {authUser?.can('fire_safety', 'create') && <Link href="/fire-safety/drill/new" className="mt-1 text-xs text-orange-600 hover:underline">Log the first fire drill</Link>}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100">
                <thead>
                  <tr className="bg-slate-50">
                    <th className={thClass}>Site</th>
                    <th className={thClass}><SortLink column="drill_date" label="Date" sort={sort} dir={dir} params={baseParams} /></th>
                    <th className={thClass}>Time</th>
                    <th className={thClass}><SortLink column="evacuation_time_secs" label="Evacuation (secs)" sort={sort} dir={dir} params={baseParams} /></th>
                    <th className={thClass}><SortLink column="number_evacuated" label="No. Evacuated" sort={sort} dir={dir} params={baseParams} /></th>
                    <th className={thClass}>Issues Identified</th>
                    <th className={thClass}>Notes</th>
                    <th className={thClass}></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {drills.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-sm text-slate-700">{(d.sites as unknown as { name: string } | null)?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{formatDate(d.drill_date)}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{d.drill_time ?? '—'}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{d.evacuation_time_secs ?? '—'}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{d.number_evacuated ?? '—'}</td>
                      <td className="px-4 py-3 text-sm text-slate-600 max-w-[180px] truncate">{d.issues_identified ?? '—'}</td>
                      <td className="px-4 py-3 text-sm text-slate-600 max-w-[180px] truncate">{d.notes ?? '—'}</td>
                      <td className="px-4 py-3">
                        <Link href={`/fire-safety/drill/${d.id}`} className="text-xs font-medium text-orange-600 hover:underline">View</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Emergency Lighting Tests ───────────────────────────────────────── */}
      {activeTab === 'emergency' && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {elTests.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-sm font-medium text-slate-500">No emergency lighting tests recorded.</p>
              {authUser?.can('fire_safety', 'create') && <Link href="/fire-safety/emergency-lighting/new" className="mt-1 text-xs text-orange-600 hover:underline">Log the first test</Link>}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100">
                <thead>
                  <tr className="bg-slate-50">
                    <th className={thClass}>Site</th>
                    <th className={thClass}><SortLink column="test_date" label="Date" sort={sort} dir={dir} params={baseParams} /></th>
                    <th className={thClass}>Test Type</th>
                    <th className={thClass}>Overall Result</th>
                    <th className={thClass}>Tested By</th>
                    <th className={thClass}></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {elTests.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-sm text-slate-700">{(t.sites as unknown as { name: string } | null)?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{formatDate(t.test_date)}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{t.test_type}</td>
                      <td className="px-4 py-3">
                        {t.overall_result ? (
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${t.overall_result === 'Pass' ? 'bg-green-100 text-green-700 ring-green-200' : 'bg-red-100 text-red-700 ring-red-200'}`}>
                            {t.overall_result}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {t.tested_by_user ? `${(t.tested_by_user as unknown as { first_name: string; last_name: string }).first_name} ${(t.tested_by_user as unknown as { first_name: string; last_name: string }).last_name}` : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/fire-safety/emergency-lighting/${t.id}`} className="text-xs font-medium text-orange-600 hover:underline">View</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
