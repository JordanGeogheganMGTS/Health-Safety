import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { formatDate } from '@/lib/dates'

type ItemType =
  | 'Corrective Action'
  | 'Document'
  | 'Risk Assessment'
  | 'COSHH Assessment'
  | 'Equipment'
  | 'Fire Extinguisher'
  | 'Fire Alarm System'
  | 'Training Record'
  | 'PPE Replacement'

interface DashItem {
  id: string
  type: ItemType
  title: string
  site: string | null
  date: string
  extra: string | null
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
  'PPE Replacement':    'bg-teal-100 text-teal-700',
}

export default async function DueSoonPage({
  searchParams,
}: {
  searchParams: { site?: string }
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const today = new Date().toISOString().split('T')[0]
  const in30 = new Date(Date.now() + 30 * 86_400_000).toISOString().split('T')[0]
  const siteId = searchParams.site?.trim() || null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function withSite<T extends { eq: (col: string, val: string) => T }>(q: T): T {
    return siteId ? q.eq('site_id', siteId) : q
  }

  const [
    { data: cas },
    { data: docs },
    { data: ras },
    { data: coshh },
    { data: equip },
    { data: fireExt },
    { data: fireAlarm },
    { data: training },
    { data: ppeRows },
  ] = await Promise.all([
    withSite(supabase.from('corrective_actions')
      .select('id, title, due_date, status, sites(name), priority:lookup_values!priority_id(label)')
      .gte('due_date', today).lte('due_date', in30)
      .not('status', 'in', '(Completed,Verified,Cancelled)')
      .order('due_date')),
    withSite(supabase.from('documents')
      .select('id, title, review_due_date, status, sites(name)')
      .gte('review_due_date', today).lte('review_due_date', in30)
      .not('status', 'in', '(Expired,Superseded)')
      .order('review_due_date')),
    withSite(supabase.from('risk_assessments')
      .select('id, title, review_due_date, status, sites(name)')
      .gte('review_due_date', today).lte('review_due_date', in30)
      .not('status', 'in', '(Superseded,Archived)')
      .order('review_due_date')),
    withSite(supabase.from('coshh_assessments')
      .select('id, product_name, review_due_date, sites(name)')
      .gte('review_due_date', today).lte('review_due_date', in30)
      .order('review_due_date')),
    withSite(supabase.from('equipment')
      .select('id, name, next_inspection_date, sites(name)')
      .gte('next_inspection_date', today).lte('next_inspection_date', in30)
      .eq('is_active', true)
      .order('next_inspection_date')),
    withSite(supabase.from('fire_extinguishers')
      .select('id, location, next_inspection_date, sites(name)')
      .gte('next_inspection_date', today).lte('next_inspection_date', in30)
      .eq('is_active', true)
      .order('next_inspection_date')),
    withSite(supabase.from('fire_alarm_systems')
      .select('id, panel_location, next_service_date, sites(name)')
      .gte('next_service_date', today).lte('next_service_date', in30)
      .eq('is_active', true)
      .order('next_service_date')),
    withSite(supabase.from('training_records')
      .select('id, expiry_date, training_types(name), users!user_id(first_name, last_name), sites(name)')
      .gte('expiry_date', today).lte('expiry_date', in30)
      .order('expiry_date')),
    // PPE active (not returned) with replacement interval — filter in JS
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

  function addMonths(dateStr: string, months: number): string {
    const d = new Date(dateStr); d.setMonth(d.getMonth() + months); return d.toISOString().split('T')[0]
  }
  type PpeRow = { id: string; user_id: string; issued_date: string; ppe_item: { name: string; replacement_months: number | null } | null; person: { first_name: string; last_name: string } | null; sites: { name: string } | null }
  const ppeDueSoon = ((ppeRows ?? []) as unknown as PpeRow[]).filter((r) => {
    if (!r.ppe_item?.replacement_months) return false
    const due = addMonths(r.issued_date, r.ppe_item.replacement_months)
    return due >= today && due <= in30
  })

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
      return { id: row.id, type: 'Training Record' as ItemType, title: title || 'Training Record', site: row.sites?.name ?? null, date: row.expiry_date, extra: 'Expiring', href: `/training/${row.id}` }
    }),
    ...ppeDueSoon.map((r) => {
      const due = addMonths(r.issued_date, r.ppe_item!.replacement_months!)
      const person = r.person ? `${r.person.first_name} ${r.person.last_name}` : null
      const title = [r.ppe_item!.name, person].filter(Boolean).join(' — ')
      return { id: r.id, type: 'PPE Replacement' as ItemType, title, site: r.sites?.name ?? null, date: due, extra: 'Due', href: `/ppe/${r.user_id}` }
    }),
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/dashboard${siteId ? `?site=${siteId}` : ''}`} className="text-sm text-slate-500 hover:text-slate-700">← Dashboard</Link>
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Due Within 30 Days</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {items.length} item{items.length !== 1 ? 's' : ''} due between now and {new Date(Date.now() + 30 * 86_400_000).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
          <p className="text-sm font-medium text-slate-500">Nothing due in the next 30 days — all clear!</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100">
              <thead>
                <tr className="bg-slate-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Name / Title</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Site</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Due Date</th>
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
                    <td className="px-4 py-3 text-sm font-medium text-amber-700">{formatDate(item.date)}</td>
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
      )}
    </div>
  )
}
