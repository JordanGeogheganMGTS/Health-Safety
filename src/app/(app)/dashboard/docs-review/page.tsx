import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { formatDate } from '@/lib/dates'

type ItemType = 'Document' | 'Risk Assessment' | 'COSHH Assessment'

interface ReviewItem {
  id: string
  type: ItemType
  title: string
  site: string | null
  date: string
  status: string | null
  href: string
  isOverdue: boolean
}

const TYPE_COLOURS: Record<ItemType, string> = {
  'Document':         'bg-blue-100 text-blue-700',
  'Risk Assessment':  'bg-purple-100 text-purple-700',
  'COSHH Assessment': 'bg-yellow-100 text-yellow-700',
}

export default async function DocsReviewPage({
  searchParams,
}: {
  searchParams: { site?: string }
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const today = new Date().toISOString().split('T')[0]
  const in60 = new Date(Date.now() + 60 * 86_400_000).toISOString().split('T')[0]
  const siteId = searchParams.site?.trim() || null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function withSite<T extends { eq: (col: string, val: string) => T }>(q: T): T {
    return siteId ? q.eq('site_id', siteId) : q
  }

  const [
    { data: docs },
    { data: ras },
    { data: coshh },
  ] = await Promise.all([
    withSite(supabase.from('documents')
      .select('id, title, review_due_date, status, sites(name)')
      .not('review_due_date', 'is', null)
      .lte('review_due_date', in60)
      .not('status', 'in', '(Expired,Superseded)')
      .order('review_due_date')),
    withSite(supabase.from('risk_assessments')
      .select('id, title, review_due_date, status, sites(name)')
      .not('review_due_date', 'is', null)
      .lte('review_due_date', in60)
      .not('status', 'in', '(Superseded,Archived)')
      .order('review_due_date')),
    withSite(supabase.from('coshh_assessments')
      .select('id, product_name, review_due_date, sites(name)')
      .not('review_due_date', 'is', null)
      .lte('review_due_date', in60)
      .order('review_due_date')),
  ])

  const items: ReviewItem[] = [
    ...(docs ?? []).map((r) => {
      const row = r as unknown as { id: string; title: string; review_due_date: string; status: string; sites: { name: string } | null }
      return { id: row.id, type: 'Document' as ItemType, title: row.title, site: row.sites?.name ?? null, date: row.review_due_date, status: row.status, href: `/documents/${row.id}`, isOverdue: row.review_due_date < today }
    }),
    ...(ras ?? []).map((r) => {
      const row = r as unknown as { id: string; title: string; review_due_date: string; status: string; sites: { name: string } | null }
      return { id: row.id, type: 'Risk Assessment' as ItemType, title: row.title, site: row.sites?.name ?? null, date: row.review_due_date, status: row.status, href: `/risk-assessments/${row.id}`, isOverdue: row.review_due_date < today }
    }),
    ...(coshh ?? []).map((r) => {
      const row = r as unknown as { id: string; product_name: string; review_due_date: string; sites: { name: string } | null }
      return { id: row.id, type: 'COSHH Assessment' as ItemType, title: row.product_name, site: row.sites?.name ?? null, date: row.review_due_date, status: null, href: `/coshh/${row.id}`, isOverdue: row.review_due_date < today }
    }),
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  const overdueItems = items.filter((i) => i.isOverdue)
  const upcomingItems = items.filter((i) => !i.isOverdue)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/dashboard${siteId ? `?site=${siteId}` : ''}`} className="text-sm text-slate-500 hover:text-slate-700">← Dashboard</Link>
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Documents Due for Review</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {items.length} item{items.length !== 1 ? 's' : ''} — documents, risk assessments and COSHH assessments due for review within 60 days
          </p>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
          <p className="text-sm font-medium text-slate-500">No documents due for review in the next 60 days.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {overdueItems.length > 0 && (
            <section>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-red-700">
                <span className="inline-block h-2 w-2 rounded-full bg-red-400" />
                Overdue ({overdueItems.length})
              </h2>
              <ReviewTable items={overdueItems} dateClass="text-red-600" />
            </section>
          )}

          {upcomingItems.length > 0 && (
            <section>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-amber-700">
                <span className="inline-block h-2 w-2 rounded-full bg-amber-400" />
                Due Within 60 Days ({upcomingItems.length})
              </h2>
              <ReviewTable items={upcomingItems} dateClass="text-amber-700" />
            </section>
          )}
        </div>
      )}
    </div>
  )
}

function ReviewTable({ items, dateClass }: { items: ReviewItem[]; dateClass: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-100">
          <thead>
            <tr className="bg-slate-50">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Type</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Title</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Site</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Review Date</th>
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
                <td className={`px-4 py-3 text-sm font-medium ${dateClass}`}>{formatDate(item.date)}</td>
                <td className="px-4 py-3 text-sm text-slate-500">{item.status ?? <span className="text-slate-300">—</span>}</td>
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
