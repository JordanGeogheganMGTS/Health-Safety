import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatDate } from '@/lib/dates'
import IssueForm from './IssueForm'

interface PpeItem {
  id: string
  name: string
  has_sizes: boolean
  size_category_key: string | null
  replacement_months: number | null
  is_active: boolean
}

interface UserPpeRecord {
  id: string
  ppe_item_id: string
  size_value: string | null
  issued_date: string
  condition: string
  notes: string | null
  issued_by: { first_name: string; last_name: string } | null
  ppe_item: PpeItem | null
}

function TrafficLight({ records }: { records: UserPpeRecord[] }) {
  if (records.length === 0) return null
  return (
    <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-4 py-3">
      <span className="h-3 w-3 rounded-full bg-green-500 flex-shrink-0" />
      <span className="text-sm font-medium text-green-700">All PPE items up to date</span>
    </div>
  )
}

async function issuePpeAction(formData: FormData) {
  'use server'
  const { createClient: createServerClient } = await import('@/lib/supabase/server')
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  const userId = formData.get('user_id') as string
  const ppeItemId = formData.get('ppe_item_id') as string
  const sizeValueId = (formData.get('size_value_id') as string) || null
  const issuedDate = formData.get('issued_date') as string
  const condition = formData.get('condition') as string
  const notes = (formData.get('notes') as string) || null

  await supabase.from('user_ppe_records').insert({
    user_id: userId,
    ppe_item_id: ppeItemId,
    size_value_id: sizeValueId,
    issued_date: issuedDate,
    issued_by: user.id,
    condition,
    notes,
  })

  const { revalidatePath } = await import('next/cache')
  revalidatePath(`/ppe/${userId}`)
}

export default async function UserPpePage({ params }: { params: { userId: string } }) {
  const supabase = await createClient()

  const [{ data: profile }, { data: ppeRecords }, { data: ppeItems }] = await Promise.all([
    supabase
      .from('users')
      .select('id, first_name, last_name')
      .eq('id', params.userId)
      .single(),
    supabase
      .from('user_ppe_records')
      .select(`
        id, ppe_item_id, size_value, date_issued, condition, next_review_date, signature_obtained, notes,
        issued_by:users!user_ppe_records_issued_by_id_fkey(first_name, last_name),
        ppe_item:ppe_items!user_ppe_records_ppe_item_id_fkey(id, name, has_sizes, size_category_key, recommended_replacement_months, is_active)
      `)
      .eq('user_id', params.userId)
      .order('date_issued', { ascending: false }),
    supabase
      .from('ppe_items')
      .select('id, name, has_sizes, size_category_key, recommended_replacement_months, is_active')
      .eq('is_active', true)
      .order('sort_order'),
  ])

  if (!profile) notFound()

  const records = (ppeRecords ?? []) as unknown as UserPpeRecord[]
  const items = (ppeItems ?? []) as unknown as PpeItem[]

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
          <a href="/ppe" className="hover:text-orange-600 transition-colors">PPE Management</a>
          <span>/</span>
          <span>{profile.first_name} {profile.last_name}</span>
        </div>
        <h1 className="text-2xl font-semibold text-slate-900">{profile.first_name} {profile.last_name}</h1>
        <p className="text-sm text-slate-500 mt-1">PPE Issuance Record</p>
      </div>

      {/* Traffic light status */}
      {records.length > 0 && (
        <div className="mb-6">
          <TrafficLight records={records} />
        </div>
      )}

      {/* PPE Records Table */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm mb-8">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">Issued PPE</h2>
          <span className="text-xs text-slate-500">{records.length} record{records.length !== 1 ? 's' : ''}</span>
        </div>

        {records.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">
            No PPE records for this user yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Item</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Size</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Issued</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Condition</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Next Review</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Signature</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Issued By</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {records.map((r) => {
                  const overdue = r.next_review_date ? isOverdue(r.next_review_date) : false
                  const dueSoon = r.next_review_date ? isDueWithin(r.next_review_date, 30) : false
                  const issuedBy = r.issued_by as unknown as { first_name: string; last_name: string } | null
                  const item = r.ppe_item

                  return (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-900">{item?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{r.size_value ?? 'N/A'}</td>
                      <td className="px-4 py-3 text-slate-600">{formatDate(r.date_issued)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            r.condition === 'New'
                              ? 'bg-green-100 text-green-700'
                              : r.condition === 'Replacement'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {r.condition}
                        </span>
                      </td>
                      <td
                        className={`px-4 py-3 font-medium ${
                          overdue ? 'text-red-600' : dueSoon ? 'text-amber-600' : 'text-slate-600'
                        }`}
                      >
                        {r.next_review_date ? formatDate(r.next_review_date) : '—'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-sm font-bold ${r.signature_obtained ? 'text-green-600' : 'text-red-500'}`}>
                          {r.signature_obtained ? '✓' : '✗'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {issuedBy ? `${issuedBy.first_name} ${issuedBy.last_name}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-500 max-w-[180px] truncate">{r.notes ?? '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Issue PPE Form */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-700">Issue / Re-issue PPE</h2>
        </div>
        <IssueForm userId={params.userId} items={items} action={issuePpeAction} />
      </div>
    </div>
  )
}
