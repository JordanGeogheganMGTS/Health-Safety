import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { formatDate, formatDateTime } from '@/lib/dates'
import { AcknowledgeButton } from '@/components/AcknowledgeButton'

type ItemType = 'document' | 'risk_assessment' | 'method_statement' | 'coshh'

function itemHref(type: ItemType, id: string): string {
  const map: Record<ItemType, string> = {
    document: `/documents/${id}`,
    risk_assessment: `/risk-assessments/${id}`,
    method_statement: `/method-statements/${id}`,
    coshh: `/coshh/${id}`,
  }
  return map[type]
}

function itemTypeLabel(type: ItemType): string {
  const map: Record<ItemType, string> = {
    document: 'Document',
    risk_assessment: 'Risk Assessment',
    method_statement: 'Method Statement',
    coshh: 'COSHH Assessment',
  }
  return map[type]
}

function itemTypeBadge(type: ItemType) {
  const styles: Record<ItemType, string> = {
    document: 'bg-blue-100 text-blue-700',
    risk_assessment: 'bg-amber-100 text-amber-700',
    method_statement: 'bg-purple-100 text-purple-700',
    coshh: 'bg-green-100 text-green-700',
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${styles[type]}`}>
      {itemTypeLabel(type)}
    </span>
  )
}

interface AckRow {
  id: string
  item_type: ItemType
  item_id: string
  item_title: string
  notes: string | null
  assigned_at: string
  acknowledged_at: string | null
  assigned_by_name: string | null
}

export default async function MyReadingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()

  const { data: rows } = await admin
    .from('document_acknowledgements')
    .select(`
      id, item_type, item_id, item_title, notes, assigned_at, acknowledged_at,
      assigner:users!document_acknowledgements_assigned_by_fkey(first_name, last_name)
    `)
    .eq('user_id', user.id)
    .order('assigned_at', { ascending: false })

  const acks: AckRow[] = (rows ?? []).map((r) => {
    const assigner = r.assigner as unknown as { first_name: string; last_name: string } | null
    return {
      id: r.id,
      item_type: r.item_type as ItemType,
      item_id: r.item_id,
      item_title: r.item_title,
      notes: r.notes,
      assigned_at: r.assigned_at,
      acknowledged_at: r.acknowledged_at,
      assigned_by_name: assigner ? `${assigner.first_name} ${assigner.last_name}` : null,
    }
  })

  const pending = acks.filter((a) => !a.acknowledged_at)
  const completed = acks.filter((a) => a.acknowledged_at)

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">My Reading</h1>
        <p className="text-sm text-slate-500 mt-1">
          Documents, risk assessments and policies assigned to you for acknowledgement
        </p>
      </div>

      {/* Pending */}
      <section className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-base font-semibold text-slate-800">To Do</h2>
          {pending.length > 0 && (
            <span className="inline-flex items-center justify-center rounded-full bg-orange-500 px-2 py-0.5 text-xs font-bold text-white min-w-[20px]">
              {pending.length}
            </span>
          )}
        </div>

        {pending.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <svg className="mx-auto h-10 w-10 text-green-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm font-medium text-slate-600">All caught up!</p>
            <p className="text-xs text-slate-400 mt-1">No documents awaiting your acknowledgement.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pending.map((a) => (
              <div key={a.id} className="rounded-xl border border-orange-200 bg-white shadow-sm overflow-hidden">
                <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-slate-100">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      {itemTypeBadge(a.item_type)}
                      <span className="text-xs text-slate-400">
                        Assigned by {a.assigned_by_name ?? 'Admin'} on {formatDate(a.assigned_at)}
                      </span>
                    </div>
                    <Link
                      href={itemHref(a.item_type, a.item_id)}
                      target="_blank"
                      className="text-base font-semibold text-slate-900 hover:text-orange-600 transition-colors"
                    >
                      {a.item_title}
                      <svg className="inline ml-1.5 h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </Link>
                  </div>
                </div>
                <div className="px-5 py-4 space-y-4">
                  {a.notes && (
                    <div className="rounded-lg bg-slate-50 border border-slate-200 px-4 py-3">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Note from admin</p>
                      <p className="text-sm text-slate-700">{a.notes}</p>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <Link
                      href={itemHref(a.item_type, a.item_id)}
                      target="_blank"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      View document
                    </Link>
                    <AcknowledgeButton acknowledgementId={a.id} itemTitle={a.item_title} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Completed */}
      {completed.length > 0 && (
        <section>
          <h2 className="text-base font-semibold text-slate-800 mb-4">Completed</h2>
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Document</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Assigned By</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Acknowledged</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {completed.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link
                        href={itemHref(a.item_type, a.item_id)}
                        target="_blank"
                        className="font-medium text-slate-900 hover:text-orange-600 transition-colors"
                      >
                        {a.item_title}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{itemTypeBadge(a.item_type)}</td>
                    <td className="px-4 py-3 text-slate-600">{a.assigned_by_name ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 text-green-700 font-medium">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {formatDateTime(a.acknowledged_at)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {acks.length === 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <svg className="mx-auto h-10 w-10 text-slate-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <p className="text-sm font-medium text-slate-500">Nothing assigned yet</p>
          <p className="text-xs text-slate-400 mt-1">Documents will appear here when assigned to you by an admin.</p>
        </div>
      )}
    </div>
  )
}
