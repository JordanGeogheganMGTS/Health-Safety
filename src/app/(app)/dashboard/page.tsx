import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { formatDate } from '@/lib/dates'

// ─── Types ────────────────────────────────────────────────────────────────────

type CAStatus = 'Open' | 'In Progress' | 'Completed' | 'Verified' | 'Overdue' | 'Cancelled'
type Priority = 'Low' | 'Medium' | 'High' | 'Critical'

interface OpenCA {
  id: string
  title: string
  due_date: string | null
  status: CAStatus
  sites: { name: string } | null
  priority: { label: Priority } | null
}

interface UpcomingItem {
  id: string
  title: string
  due_date: string
  type: string
  href: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function priorityBadgeClass(priority: Priority): string {
  switch (priority) {
    case 'Critical': return 'bg-red-100 text-red-800'
    case 'High': return 'bg-orange-100 text-orange-800'
    case 'Medium': return 'bg-amber-100 text-amber-800'
    case 'Low': return 'bg-green-100 text-green-800'
  }
}

function statusBadgeClass(status: CAStatus): string {
  switch (status) {
    case 'Open': return 'bg-slate-100 text-slate-700'
    case 'In Progress': return 'bg-orange-100 text-orange-700'
    case 'Completed': return 'bg-green-100 text-green-700'
    case 'Verified': return 'bg-green-100 text-green-800'
    case 'Overdue': return 'bg-red-100 text-red-700'
    case 'Cancelled': return 'bg-gray-100 text-gray-600'
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { site?: string }
}) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const todayIso = new Date().toISOString().split('T')[0]
  const in30 = new Date(Date.now() + 30 * 86_400_000).toISOString().split('T')[0]
  const in60 = new Date(Date.now() + 60 * 86_400_000).toISOString().split('T')[0]

  const TERMINAL_CA = '(Completed,Verified,Cancelled)'
  const TERMINAL_DOC = '(Expired,Superseded)'
  const TERMINAL_RA = '(Superseded,Archived)'

  // Site filter — only applied when a specific site is selected
  const siteId = searchParams.site?.trim() || null

  // Helper to apply optional site filter
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function withSite<T extends { eq: (col: string, val: string) => T }>(q: T): T {
    return siteId ? q.eq('site_id', siteId) : q
  }

  const [
    // ── Overdue counts ─────────────────────────────────────────────────────────
    { count: ovCA },
    { count: ovDoc },
    { count: ovRA },
    { count: ovCOSHH },
    { count: ovEquip },
    { count: ovFireExt },
    { count: ovFireAlarm },
    // ── Due within 30 days counts ──────────────────────────────────────────────
    { count: d30CA },
    { count: d30Doc },
    { count: d30RA },
    { count: d30COSHH },
    { count: d30Equip },
    { count: d30FireExt },
    { count: d30FireAlarm },
    // ── Open CAs count ─────────────────────────────────────────────────────────
    { count: openCACount },
    // ── Docs due for review within 60 days (including overdue) ─────────────────
    { count: revDoc },
    { count: revRA },
    { count: revCOSHH },
    // ── Display data ───────────────────────────────────────────────────────────
    { data: openCARows },
    { data: upCA },
    { data: upDoc },
    { data: upEquip },
    { data: upFireExt },
    // ── PPE replacement: fetch all active (not returned) with replacement interval ─
    { data: ppeRows },
  ] = await Promise.all([
    // Overdue
    withSite(supabase.from('corrective_actions').select('id', { count: 'exact', head: true })
      .lt('due_date', todayIso).not('status', 'in', TERMINAL_CA)),
    withSite(supabase.from('documents').select('id', { count: 'exact', head: true })
      .not('review_due_date', 'is', null).lt('review_due_date', todayIso).not('status', 'in', TERMINAL_DOC)),
    withSite(supabase.from('risk_assessments').select('id', { count: 'exact', head: true })
      .not('review_due_date', 'is', null).lt('review_due_date', todayIso).not('status', 'in', TERMINAL_RA)),
    withSite(supabase.from('coshh_assessments').select('id', { count: 'exact', head: true })
      .not('review_due_date', 'is', null).lt('review_due_date', todayIso)),
    withSite(supabase.from('equipment').select('id', { count: 'exact', head: true })
      .not('next_inspection_date', 'is', null).lt('next_inspection_date', todayIso).eq('is_active', true)),
    withSite(supabase.from('fire_extinguishers').select('id', { count: 'exact', head: true })
      .not('next_inspection_date', 'is', null).lt('next_inspection_date', todayIso).eq('is_active', true)),
    withSite(supabase.from('fire_alarm_systems').select('id', { count: 'exact', head: true })
      .not('next_service_date', 'is', null).lt('next_service_date', todayIso).eq('is_active', true)),
    // Due within 30 days
    withSite(supabase.from('corrective_actions').select('id', { count: 'exact', head: true })
      .gte('due_date', todayIso).lte('due_date', in30).not('status', 'in', TERMINAL_CA)),
    withSite(supabase.from('documents').select('id', { count: 'exact', head: true })
      .gte('review_due_date', todayIso).lte('review_due_date', in30).not('status', 'in', TERMINAL_DOC)),
    withSite(supabase.from('risk_assessments').select('id', { count: 'exact', head: true })
      .gte('review_due_date', todayIso).lte('review_due_date', in30).not('status', 'in', TERMINAL_RA)),
    withSite(supabase.from('coshh_assessments').select('id', { count: 'exact', head: true })
      .gte('review_due_date', todayIso).lte('review_due_date', in30)),
    withSite(supabase.from('equipment').select('id', { count: 'exact', head: true })
      .gte('next_inspection_date', todayIso).lte('next_inspection_date', in30).eq('is_active', true)),
    withSite(supabase.from('fire_extinguishers').select('id', { count: 'exact', head: true })
      .gte('next_inspection_date', todayIso).lte('next_inspection_date', in30).eq('is_active', true)),
    withSite(supabase.from('fire_alarm_systems').select('id', { count: 'exact', head: true })
      .gte('next_service_date', todayIso).lte('next_service_date', in30).eq('is_active', true)),
    // Open CAs
    withSite(supabase.from('corrective_actions').select('id', { count: 'exact', head: true })
      .in('status', ['Open', 'In Progress'])),
    // Docs review within 60 days
    withSite(supabase.from('documents').select('id', { count: 'exact', head: true })
      .not('review_due_date', 'is', null).lte('review_due_date', in60).not('status', 'in', TERMINAL_DOC)),
    withSite(supabase.from('risk_assessments').select('id', { count: 'exact', head: true })
      .not('review_due_date', 'is', null).lte('review_due_date', in60).not('status', 'in', TERMINAL_RA)),
    withSite(supabase.from('coshh_assessments').select('id', { count: 'exact', head: true })
      .not('review_due_date', 'is', null).lte('review_due_date', in60)),
    // Open CA rows for display panel
    withSite(supabase.from('corrective_actions')
      .select('id, title, due_date, status, sites(name), priority:lookup_values!priority_id(label)')
      .in('status', ['Open', 'In Progress'])
      .order('due_date', { ascending: true, nullsFirst: false })
      .limit(10)),
    // Upcoming items for display panel (due within 30 days)
    withSite(supabase.from('corrective_actions')
      .select('id, title, due_date')
      .gte('due_date', todayIso).lte('due_date', in30)
      .not('status', 'in', TERMINAL_CA)
      .order('due_date').limit(20)),
    withSite(supabase.from('documents')
      .select('id, title, review_due_date')
      .gte('review_due_date', todayIso).lte('review_due_date', in30)
      .not('status', 'in', TERMINAL_DOC)
      .order('review_due_date').limit(20)),
    withSite(supabase.from('equipment')
      .select('id, name, next_inspection_date')
      .gte('next_inspection_date', todayIso).lte('next_inspection_date', in30)
      .eq('is_active', true).order('next_inspection_date').limit(20)),
    withSite(supabase.from('fire_extinguishers')
      .select('id, location, next_inspection_date')
      .gte('next_inspection_date', todayIso).lte('next_inspection_date', in30)
      .eq('is_active', true).order('next_inspection_date').limit(20)),
    // PPE active records (not returned) where item has a replacement interval
    (siteId
      ? supabase.from('user_ppe_records')
          .select('id, user_id, issued_date, ppe_item:ppe_items!user_ppe_records_ppe_item_id_fkey(name, replacement_months), person:users!user_ppe_records_user_id_fkey(first_name, last_name), sites(name)')
          .is('returned_date', null)
          .eq('site_id', siteId)
      : supabase.from('user_ppe_records')
          .select('id, user_id, issued_date, ppe_item:ppe_items!user_ppe_records_ppe_item_id_fkey(name, replacement_months), person:users!user_ppe_records_user_id_fkey(first_name, last_name), sites(name)')
          .is('returned_date', null)
    ),
  ])

  // ── PPE replacement counts (computed from issued_date + months) ───────────────
  function addMonths(dateStr: string, months: number): string {
    const d = new Date(dateStr)
    d.setMonth(d.getMonth() + months)
    return d.toISOString().split('T')[0]
  }

  type PpeRow = { id: string; user_id: string; issued_date: string; ppe_item: { name: string; replacement_months: number | null } | null; person: { first_name: string; last_name: string } | null; sites: { name: string } | null }
  const ppeActive = ((ppeRows ?? []) as unknown as PpeRow[]).filter((r) => r.ppe_item?.replacement_months)
  const ovPPE = ppeActive.filter((r) => addMonths(r.issued_date, r.ppe_item!.replacement_months!) < todayIso).length
  const d30PPE = ppeActive.filter((r) => {
    const due = addMonths(r.issued_date, r.ppe_item!.replacement_months!)
    return due >= todayIso && due <= in30
  }).length

  // ── Totals ────────────────────────────────────────────────────────────────────
  const totalOverdue = (ovCA ?? 0) + (ovDoc ?? 0) + (ovRA ?? 0) + (ovCOSHH ?? 0) +
    (ovEquip ?? 0) + (ovFireExt ?? 0) + (ovFireAlarm ?? 0) + ovPPE

  const totalDue30 = (d30CA ?? 0) + (d30Doc ?? 0) + (d30RA ?? 0) + (d30COSHH ?? 0) +
    (d30Equip ?? 0) + (d30FireExt ?? 0) + (d30FireAlarm ?? 0) + d30PPE

  const totalDocsReview = (revDoc ?? 0) + (revRA ?? 0) + (revCOSHH ?? 0)

  // ── Upcoming items list ────────────────────────────────────────────────────────
  const upcomingItems: UpcomingItem[] = [
    ...(upCA ?? []).map((r) => ({
      id: r.id, title: r.title, due_date: r.due_date!,
      type: 'Corrective Action', href: `/corrective-actions/${r.id}`,
    })),
    ...(upDoc ?? []).map((r) => {
      const d = r as unknown as { id: string; title: string; review_due_date: string }
      return { id: d.id, title: d.title, due_date: d.review_due_date, type: 'Document Review', href: `/documents/${d.id}` }
    }),
    ...(upEquip ?? []).map((r) => {
      const e = r as unknown as { id: string; name: string; next_inspection_date: string }
      return { id: e.id, title: e.name, due_date: e.next_inspection_date, type: 'Equipment Inspection', href: `/equipment/${e.id}` }
    }),
    ...(upFireExt ?? []).map((r) => {
      const f = r as unknown as { id: string; location: string; next_inspection_date: string }
      return { id: f.id, title: f.location, due_date: f.next_inspection_date, type: 'Fire Extinguisher', href: `/fire-safety` }
    }),
    // PPE replacements due within 30 days
    ...ppeActive.filter((r) => {
      const due = addMonths(r.issued_date, r.ppe_item!.replacement_months!)
      return due >= todayIso && due <= in30
    }).map((r) => ({
      id: r.id,
      title: `${r.ppe_item!.name}${r.person ? ` — ${r.person.first_name} ${r.person.last_name}` : ''}`,
      due_date: addMonths(r.issued_date, r.ppe_item!.replacement_months!),
      type: 'PPE Replacement',
      href: `/ppe/${r.user_id}`,
    })),
  ].sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())

  const openCAs = (openCARows ?? []) as unknown as OpenCA[]

  // ── Build site-aware tile links ───────────────────────────────────────────────
  const siteQ = siteId ? `?site=${siteId}` : ''

  // ── Tiles ─────────────────────────────────────────────────────────────────────
  const tiles = [
    {
      label: 'Overdue Items',
      value: totalOverdue,
      sub: 'Across CAs, docs & equipment',
      bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700',
      subText: 'text-red-500', dot: 'bg-red-400',
      href: `/dashboard/overdue${siteQ}`,
    },
    {
      label: 'Due Within 30 Days',
      value: totalDue30,
      sub: 'Requiring attention soon',
      bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700',
      subText: 'text-amber-500', dot: 'bg-amber-400',
      href: `/dashboard/due-soon${siteQ}`,
    },
    {
      label: 'Open Corrective Actions',
      value: openCACount ?? 0,
      sub: 'Open or In Progress',
      bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700',
      subText: 'text-orange-500', dot: 'bg-orange-400',
      href: `/dashboard/open-actions${siteQ}`,
    },
    {
      label: 'Docs Due for Review',
      value: totalDocsReview,
      sub: 'Within 60 days',
      bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700',
      subText: 'text-blue-500', dot: 'bg-blue-400',
      href: `/dashboard/docs-review${siteQ}`,
    },
  ]

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">
          Health &amp; Safety overview for your organisation
        </p>
      </div>

      {/* Stat tiles — each is a clickable link */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((tile) => (
          <Link
            key={tile.label}
            href={tile.href}
            className={`group rounded-xl border ${tile.border} ${tile.bg} p-5 flex flex-col gap-1 hover:shadow-md transition-shadow`}
          >
            <div className="flex items-center gap-2">
              <span className={`inline-block h-2 w-2 rounded-full ${tile.dot}`} />
              <span className={`text-xs font-semibold uppercase tracking-wide ${tile.subText}`}>
                {tile.sub}
              </span>
            </div>
            <div className={`text-4xl font-bold ${tile.text}`}>{tile.value}</div>
            <div className={`text-sm font-medium ${tile.text}`}>{tile.label}</div>
            <div className="mt-1 text-xs text-slate-400 group-hover:text-slate-600 transition-colors">
              View details →
            </div>
          </Link>
        ))}
      </div>

      {/* Lower panels */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Upcoming Requirements */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h2 className="text-base font-semibold text-slate-800">Upcoming Requirements</h2>
            <Link href={`/dashboard/due-soon${siteQ}`} className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 hover:bg-amber-200 transition-colors">
              Next 30 days
            </Link>
          </div>

          {upcomingItems.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="text-sm text-slate-400">No items due in the next 30 days.</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-50">
              {upcomingItems.slice(0, 10).map((item) => (
                <li key={`${item.type}-${item.id}`}>
                  <Link
                    href={item.href}
                    className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-800">{item.title}</p>
                      <p className="text-xs text-slate-400">{item.type}</p>
                    </div>
                    <div className="ml-4 shrink-0 text-right">
                      <span className="text-xs font-medium text-amber-700">{formatDate(item.due_date)}</span>
                    </div>
                  </Link>
                </li>
              ))}
              {upcomingItems.length > 10 && (
                <li className="px-5 py-3 text-center">
                  <Link href={`/dashboard/due-soon${siteQ}`} className="text-xs font-medium text-orange-600 hover:underline">
                    View all {upcomingItems.length} items →
                  </Link>
                </li>
              )}
            </ul>
          )}
        </div>

        {/* Open Corrective Actions */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h2 className="text-base font-semibold text-slate-800">Open Corrective Actions</h2>
            <Link href={`/dashboard/open-actions${siteQ}`} className="text-xs font-medium text-orange-600 hover:underline">
              View all →
            </Link>
          </div>

          {openCAs.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="text-sm text-slate-400">No open corrective actions.</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-50">
              {openCAs.map((ca) => (
                <li key={ca.id}>
                  <Link
                    href={`/corrective-actions/${ca.id}`}
                    className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-800">{ca.title}</p>
                      <p className="text-xs text-slate-400">
                        {ca.sites?.name ?? 'No site'} &middot; Due {formatDate(ca.due_date)}
                      </p>
                    </div>
                    <div className="ml-4 flex shrink-0 flex-col items-end gap-1">
                      {ca.priority?.label && (
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${priorityBadgeClass(ca.priority.label)}`}>
                          {ca.priority.label}
                        </span>
                      )}
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeClass(ca.status)}`}>
                        {ca.status}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
