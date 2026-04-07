import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { formatDate } from '@/lib/dates'

// ─── Types ────────────────────────────────────────────────────────────────────

type ItemType =
  | 'Corrective Action'
  | 'Document'
  | 'Risk Assessment'
  | 'COSHH Assessment'
  | 'Equipment'
  | 'Fire Extinguisher'
  | 'Fire Alarm System'
  | 'Training Record'

interface DashItem {
  id: string
  type: ItemType
  title: string
  site: string | null
  date: string
  extra: string | null   // status, priority, person — whatever is relevant
  href: string
}

const TYPE_COLOURS: Record<ItemType, string> = {
  'Corrective Action':  'bg-orange-100 text-orange-700',
  'Document':           'bg-blue-100 text-blue-700',
  'Risk Assessment':    'bg-purple-100 text-purple-700',
  'COSHH Assessment':   'bg-yellow-100 text-yellow-700',
  'Equipment':          'bg-slate-100 text-slate-700',
  'Fire Extinguisher':  'bg-red-100 text-red-700',
  'Fire Alarm System':  'bg-red-100 text-red-700',
  'Training Record':    'bg-green-100 text-green-700',
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function OverduePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const today = new Date().toISOString().split('T')[0]

  const [
    { data: cas },
    { data: docs },
    { data: ras },
    { data: coshh },
    { data: equip },
    { data: fireExt },
    { data: fireAlarm },
    { data: training },
  ] = await Promise.all([
    supabase.from('corrective_actions')
      .select('id, title, due_date, status, sites(name), priority:lookup_values!priority_id(label)')
      .lt('due_date', today)
      .not('status', 'in', '(Completed,Verified,Cancelled)')
      .order('due_date'),
    supabase.from('documents')
      .select('id, title, review_due_date, status, sites(name)')
      .not('review_due_date', 'is', null)
      .lt('review_due_date', today)
      .not('status', 'in', '(Expired,Superseded)')
      .order('review_due_date'),
    supabase.from('risk_assessments')
      .select('id, title, review_due_date, status, sites(name)')
      .not('review_due_date', 'is', null)
      .lt('review_due_date', today)
      .not('status', 'in', '(Superseded,Archived)')
      .order('review_due_date'),
    supabase.from('coshh_assessments')
      .select('id, product_name, review_due_date, sites(name)')
      .not('review_due_date', 'is', null)
      .lt('review_due_date', today)
      .order('review_due_date'),
    supabase.from('equipment')
      .select('id, name, next_inspection_date, sites(name)')
      .not('next_inspection_date', 'is', null)
      .lt('next_inspection_date', today)
      .eq('is_active', true)
      .order('next_inspection_date'),
    supabase.from('fire_extinguishers')
      .select('id, location, next_inspection_date, sites(name)')
      .not('next_inspection_date', 'is', null)
      .lt('next_inspection_date', today)
      .eq('is_active', true)
      .order('next_inspection_date'),
    supabase.from('fire_alarm_systems')
      .select('id, panel_location, next_service_date, sites(name)')
      .not('next_service_date', 'is', null)
      .lt('next_service_date', today)
      .eq('is_active', true)
      .order('next_service_date'),
    supabase.from('training_records')
      .select('id, expiry_date, training_types(name), users!user_id(first_name, last_name), sites(name)')
      .not('expiry_date', 'is', null)
      .lt('expiry_date', today)
      .order('expiry_date'),
  ])

  const items: DashItem[] = [
    ...(cas ?? []).map((r) => {
      const row = r as unknown as { id: string; title: string; due_date: string; status: string; sites: { name: string } | null; priority: { label: string } | null }
      return { id: row.id, type: 'Corrective Action' as ItemType, title: row.title, site: row.sites?.name ?? null, date: row.due_date, extra: row.status, href: `/corrective-actions/${row.id}` }
    }),
    ...(docs ?? []).map((r) => {
      const row = r as unknown as { id: string; title: string; review_due_date: string; status: string; sites: { name: string } | null }
      return { id: row.id, type: 'Document' as ItemType, title: row.title, site: row.sites?.name ?? null, date: row.review_due_date, extra: row.status, href: `/documents/${row.id}` }
    }),
    ...(ras ?? []).map((r) => {
      const row = r as unknown as { id: string; title: string; review_due_date: string; status: string; sites: { name: string } | null }
      return { id: row.id, type: 'Risk Assessment' as ItemType, title: row.title, site: row.sites?.name ?? null, date: row.review_due_date, extra: row.status, href: `/risk-assessments/${row.id}` }
    }),
    ...(coshh ?? []).map((r) => {
      const row = r as unknown as { id: string; product_name: string; review_due_date: string; sites: { name: string } | null }
      return { id: row.id, type: 'COSHH Assessment' as ItemType, title: row.product_name, site: row.sites?.name ?? null, date: row.review_due_date, extra: null, href: `/coshh/${row.id}` }
    }),
    ...(equip ?? []).map((r) => {
      const row = r as unknown as { id: string; name: string; next_inspection_date: string; sites: { name: string } | null }
      return { id: row.id, type: 'Equipment' as ItemType, title: row.name, site: row.sites?.name ?? null, date: row.next_inspection_date, extra: null, href: `/equipment/${row.id}` }
    }),
    ...(fireExt ?? []).map((r) => {
      const row = r as unknown as { id: string; location: string; next_inspection_date: string; sites: { name: string } | null }
      return { id: row.id, type: 'Fire Extinguisher' as ItemType, title: `Extinguisher — ${row.location}`, site: row.sites?.name ?? null, date: row.next_inspection_date, extra: null, href: `/fire-safety` }
    }),
    ...(fireAlarm ?? []).map((r) => {
      const row = r as unknown as { id: string; panel_location: string | null; next_service_date: string; sites: { name: string } | null }
      return { id: row.id, type: 'Fire Alarm System' as ItemType, title: row.panel_location ? `Fire Alarm — ${row.panel_location}` : 'Fire Alarm System', site: row.sites?.name ?? null, date: row.next_service_date, extra: null, href: `/fire-safety` }
    }),
    ...(training ?? []).map((r) => {
      const row = r as unknown as { id: string; expiry_date: string; training_types: { name: string } | null; users: { first_name: string; last_name: string } | null; sites: { name: string } | null }
      const person = row.users ? `${row.users.first_name} ${row.users.last_name}` : null
      const title = [row.training_types?.name, person].filter(Boolean).join(' — ')
      return { id: row.id, type: 'Training Record' as ItemType, title: title || 'Training Record', site: row.sites?.name ?? null, date: row.expiry_date, extra: 'Expired', href: `/training/${row.id}` }
    }),
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard" className="text-sm text-slate-500 hover:text-slate-700">← Dashboard</Link>
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Overdue Items</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {items.length} item{items.length !== 1 ? 's' : ''} past their due or review date
          </p>
        </div>
      </div>

      <ItemsTable items={items} emptyMessage="No overdue items — everything is on track." />
    </div>
  )
}

// ─── Shared table ─────────────────────────────────────────────────────────────

function ItemsTable({ items, emptyMessage }: { items: DashItem[]; emptyMessage: string }) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
        <p className="text-sm font-medium text-slate-500">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-100">
          <thead>
            <tr className="bg-slate-50">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Type</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Name / Title</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Site</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Date</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {items.map((item) => (
              <tr key={`${item.type}-${item.id}`} className="group hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_COLOURS[item.type]}`}>
                    {item.type}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm font-medium text-slate-800 max-w-xs truncate">{item.title}</td>
                <td className="px-4 py-3 text-sm text-slate-500">{item.site ?? <span className="text-slate-300">—</span>}</td>
                <td className="px-4 py-3 text-sm font-medium text-red-600">{formatDate(item.date)}</td>
                <td className="px-4 py-3 text-sm text-slate-500">{item.extra ?? <span className="text-slate-300">—</span>}</td>
                <td className="px-4 py-3">
                  <Link href={item.href} className="text-xs font-medium text-orange-600 hover:text-orange-700 hover:underline">
                    View →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
