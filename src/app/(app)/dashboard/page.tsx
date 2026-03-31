import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { formatDate } from '@/lib/dates'

// ─── Types ────────────────────────────────────────────────────────────────────

type CAStatus = 'Open' | 'In Progress' | 'Completed' | 'Overdue' | 'Closed'
type Priority = 'Low' | 'Medium' | 'High' | 'Critical'

interface CorrectiveAction {
  id: string
  title: string
  due_date: string | null
  status: CAStatus
  priority: Priority
  sites: { name: string }[] | null
}

interface UpcomingItem {
  id: string
  title: string
  due_date: string
  type: string
  href: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const today = new Date()
today.setHours(0, 0, 0, 0)

const in30Days = new Date(today)
in30Days.setDate(today.getDate() + 30)

const in60Days = new Date(today)
in60Days.setDate(today.getDate() + 60)

function isPast(dateStr: string | null): boolean {
  if (!dateStr) return false
  return new Date(dateStr) < today
}

function isDueWithin30(dateStr: string | null): boolean {
  if (!dateStr) return false
  const d = new Date(dateStr)
  return d >= today && d <= in30Days
}

function isDueWithin60(dateStr: string | null): boolean {
  if (!dateStr) return false
  const d = new Date(dateStr)
  return d >= today && d <= in60Days
}

const PRIORITY_ORDER: Record<Priority, number> = {
  Critical: 0,
  High: 1,
  Medium: 2,
  Low: 3,
}

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
    case 'In Progress': return 'bg-blue-100 text-blue-700'
    case 'Completed': return 'bg-green-100 text-green-700'
    case 'Overdue': return 'bg-red-100 text-red-700'
    case 'Closed': return 'bg-gray-100 text-gray-600'
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // ── Fetch all data in parallel ──────────────────────────────────────────────

  const [
    { data: correctiveActions },
    { data: documents },
    { data: equipment },
    { data: fireExtinguishers },
  ] = await Promise.all([
    supabase
      .from('corrective_actions')
      .select('id, title, due_date, status, priority, sites(name)')
      .order('due_date', { ascending: true }),
    supabase
      .from('documents')
      .select('id, title:name, review_date, status'),
    supabase
      .from('equipment')
      .select('id, name, next_service_due, site_id'),
    supabase
      .from('fire_extinguishers')
      .select('id, location, next_inspection_due, site_id'),
  ])

  // ── Tile 1: Overdue Items ───────────────────────────────────────────────────
  // Corrective actions where due_date past and status not Completed/Closed/Overdue
  const overdueCA = (correctiveActions ?? []).filter(
    (ca) =>
      isPast(ca.due_date) &&
      !['Completed', 'Closed', 'Overdue'].includes(ca.status)
  ).length

  // Documents where review_date is past
  const overdueDocuments = (documents ?? []).filter(
    (d) => isPast((d as unknown as { review_date: string | null }).review_date)
  ).length

  // Equipment where next_service_due is past
  const overdueEquipment = (equipment ?? []).filter(
    (e) => isPast((e as unknown as { next_service_due: string | null }).next_service_due)
  ).length

  // Fire extinguishers where next_inspection_due is past
  const overdueFireExt = (fireExtinguishers ?? []).filter(
    (f) => isPast((f as unknown as { next_inspection_due: string | null }).next_inspection_due)
  ).length

  const totalOverdue = overdueCA + overdueDocuments + overdueEquipment + overdueFireExt

  // ── Tile 2: Due Within 30 Days ─────────────────────────────────────────────
  const dueCA = (correctiveActions ?? []).filter(
    (ca) =>
      isDueWithin30(ca.due_date) &&
      !['Completed', 'Closed'].includes(ca.status)
  ).length

  const dueDocuments = (documents ?? []).filter(
    (d) => isDueWithin30((d as unknown as { review_date: string | null }).review_date)
  ).length

  const dueEquipment = (equipment ?? []).filter(
    (e) => isDueWithin30((e as unknown as { next_service_due: string | null }).next_service_due)
  ).length

  const dueFireExt = (fireExtinguishers ?? []).filter(
    (f) => isDueWithin30((f as unknown as { next_inspection_due: string | null }).next_inspection_due)
  ).length

  const totalDue30 = dueCA + dueDocuments + dueEquipment + dueFireExt

  // ── Tile 3: Open Corrective Actions ────────────────────────────────────────
  const openCAs = (correctiveActions ?? []).filter(
    (ca) => ca.status === 'Open' || ca.status === 'In Progress'
  ).length

  // ── Tile 4: Documents Due for Review (within 60 days) ──────────────────────
  const docsDue60 = (documents ?? []).filter(
    (d) => isDueWithin60((d as unknown as { review_date: string | null }).review_date)
  ).length

  // ── Upcoming Requirements (items due within 30 days) ───────────────────────
  const upcomingItems: UpcomingItem[] = []

  ;(correctiveActions ?? [])
    .filter(
      (ca) =>
        isDueWithin30(ca.due_date) &&
        !['Completed', 'Closed'].includes(ca.status)
    )
    .forEach((ca) => {
      upcomingItems.push({
        id: ca.id,
        title: ca.title,
        due_date: ca.due_date!,
        type: 'Corrective Action',
        href: `/corrective-actions/${ca.id}`,
      })
    })

  ;(documents ?? [])
    .filter((d) => isDueWithin30((d as unknown as { review_date: string | null }).review_date))
    .forEach((d) => {
      const doc = d as unknown as { id: string; title: string; review_date: string | null }
      upcomingItems.push({
        id: doc.id,
        title: doc.title ?? 'Untitled Document',
        due_date: doc.review_date!,
        type: 'Document Review',
        href: `/documents/${doc.id}`,
      })
    })

  ;(equipment ?? [])
    .filter((e) => isDueWithin30((e as unknown as { next_service_due: string | null }).next_service_due))
    .forEach((e) => {
      const eq = e as unknown as { id: string; name: string; next_service_due: string | null }
      upcomingItems.push({
        id: eq.id,
        title: eq.name ?? 'Equipment',
        due_date: eq.next_service_due!,
        type: 'Equipment Service',
        href: `/equipment/${eq.id}`,
      })
    })

  ;(fireExtinguishers ?? [])
    .filter((f) => isDueWithin30((f as unknown as { next_inspection_due: string | null }).next_inspection_due))
    .forEach((f) => {
      const fe = f as unknown as { id: string; location: string; next_inspection_due: string | null }
      upcomingItems.push({
        id: fe.id,
        title: fe.location ?? 'Fire Extinguisher',
        due_date: fe.next_inspection_due!,
        type: 'Fire Extinguisher Inspection',
        href: `/fire-safety/${fe.id}`,
      })
    })

  upcomingItems.sort(
    (a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
  )

  // ── Open CAs for bottom list (top 10 by priority then due_date) ─────────────
  const openCAList = (correctiveActions ?? [])
    .filter((ca) => ca.status === 'Open' || ca.status === 'In Progress')
    .sort((a, b) => {
      const pa = PRIORITY_ORDER[a.priority as Priority] ?? 99
      const pb = PRIORITY_ORDER[b.priority as Priority] ?? 99
      if (pa !== pb) return pa - pb
      const da = a.due_date ? new Date(a.due_date).getTime() : Infinity
      const db = b.due_date ? new Date(b.due_date).getTime() : Infinity
      return da - db
    })
    .slice(0, 10) as CorrectiveAction[]

  // ── Render ─────────────────────────────────────────────────────────────────

  const tiles = [
    {
      label: 'Overdue Items',
      value: totalOverdue,
      sub: 'Across CAs, docs & equipment',
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-700',
      subText: 'text-red-500',
      dot: 'bg-red-400',
    },
    {
      label: 'Due Within 30 Days',
      value: totalDue30,
      sub: 'Requiring attention soon',
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      text: 'text-amber-700',
      subText: 'text-amber-500',
      dot: 'bg-amber-400',
    },
    {
      label: 'Open Corrective Actions',
      value: openCAs,
      sub: 'Open or In Progress',
      bg: 'bg-orange-50',
      border: 'border-orange-200',
      text: 'text-orange-700',
      subText: 'text-orange-500',
      dot: 'bg-orange-400',
    },
    {
      label: 'Docs Due for Review',
      value: docsDue60,
      sub: 'Within 60 days',
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-700',
      subText: 'text-blue-500',
      dot: 'bg-blue-400',
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

      {/* Stat tiles */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((tile) => (
          <div
            key={tile.label}
            className={`rounded-xl border ${tile.border} ${tile.bg} p-5 flex flex-col gap-1`}
          >
            <div className="flex items-center gap-2">
              <span className={`inline-block h-2 w-2 rounded-full ${tile.dot}`} />
              <span className={`text-xs font-semibold uppercase tracking-wide ${tile.subText}`}>
                {tile.sub}
              </span>
            </div>
            <div className={`text-4xl font-bold ${tile.text}`}>{tile.value}</div>
            <div className={`text-sm font-medium ${tile.text}`}>{tile.label}</div>
          </div>
        ))}
      </div>

      {/* Lower panels */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Upcoming Requirements */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h2 className="text-base font-semibold text-slate-800">
              Upcoming Requirements
            </h2>
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
              Next 30 days
            </span>
          </div>

          {upcomingItems.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="text-sm text-slate-400">No items due in the next 30 days.</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-50">
              {upcomingItems.map((item) => (
                <li key={`${item.type}-${item.id}`}>
                  <Link
                    href={item.href}
                    className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-800">
                        {item.title}
                      </p>
                      <p className="text-xs text-slate-400">{item.type}</p>
                    </div>
                    <div className="ml-4 shrink-0 text-right">
                      <span className="text-xs font-medium text-amber-700">
                        {formatDate(item.due_date)}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Open Corrective Actions */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h2 className="text-base font-semibold text-slate-800">
              Open Corrective Actions
            </h2>
            <Link
              href="/corrective-actions"
              className="text-xs font-medium text-blue-600 hover:underline"
            >
              View all →
            </Link>
          </div>

          {openCAList.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="text-sm text-slate-400">No open corrective actions.</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-50">
              {openCAList.map((ca) => (
                <li key={ca.id}>
                  <Link
                    href={`/corrective-actions/${ca.id}`}
                    className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-800">
                        {ca.title}
                      </p>
                      <p className="text-xs text-slate-400">
                        {ca.sites?.[0]?.name ?? 'No site'} &middot; Due{' '}
                        {formatDate(ca.due_date)}
                      </p>
                    </div>
                    <div className="ml-4 flex shrink-0 flex-col items-end gap-1">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${priorityBadgeClass(ca.priority)}`}
                      >
                        {ca.priority}
                      </span>
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeClass(ca.status)}`}
                      >
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
