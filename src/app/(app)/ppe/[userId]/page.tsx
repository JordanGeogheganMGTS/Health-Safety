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
  size_value_id: string | null
  issued_date: string
  condition: string
  notes: string | null
  issued_by_user: { first_name: string; last_name: string } | null
  ppe_item: PpeItem | null
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
  const issuedDate = (formData.get('date_issued') as string) || new Date().toISOString().split('T')[0]
  const condition = (formData.get('condition') as string) || 'Good'
  const notes = (formData.get('notes') as string) || null

  // site_id is required — use the user's site_id from the users table
  const { data: userData } = await supabase
    .from('users')
    .select('site_id')
    .eq('id', userId)
    .single()

  await supabase.from('user_ppe_records').insert({
    user_id: userId,
    ppe_item_id: ppeItemId,
    site_id: userData?.site_id ?? null,
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
        id, ppe_item_id, size_value_id, issued_date, condition, notes,
        issued_by_user:users!user_ppe_records_issued_by_fkey(first_name, last_name),
        ppe_item:ppe_items!user_ppe_records_ppe_item_id_fkey(id, name, has_sizes, size_category_key, replacement_months, is_active)
      `)
      .eq('user_id', params.userId)
      .order('issued_date', { ascending: false }),
    supabase
      .from('ppe_items')
      .select('id, name, has_sizes, size_category_key, replacement_months, is_active')
      .eq('is_active', true)
      .order('name'),
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
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Issued</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Condition</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Issued By</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {records.map((r) => {
                  const issuedBy = r.issued_by_user as unknown as { first_name: string; last_name: string } | null
                  const item = r.ppe_item

                  return (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-900">{item?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{formatDate(r.issued_date)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            r.condition === 'Good'
                              ? 'bg-green-100 text-green-700'
                              : r.condition === 'Fair'
                              ? 'bg-amber-100 text-amber-700'
                              : r.condition === 'Poor'
                              ? 'bg-orange-100 text-orange-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {r.condition}
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
