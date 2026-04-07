import { notFound, redirect } from 'next/navigation'
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
  returned_date: string | null
  condition: string
  notes: string | null
  issued_by_user: { first_name: string; last_name: string } | null
  ppe_item: PpeItem | null
  size_value: { label: string } | null
}

async function issuePpeAction(formData: FormData): Promise<{ error?: string } | void> {
  'use server'
  const { createClient: createServerClient } = await import('@/lib/supabase/server')
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const userId = formData.get('user_id') as string
  const ppeItemId = formData.get('ppe_item_id') as string
  if (!ppeItemId) return { error: 'Please select a PPE item' }

  const issuedDate = (formData.get('date_issued') as string) || new Date().toISOString().split('T')[0]
  const condition = (formData.get('condition') as string) || 'Good'
  const notes = (formData.get('notes') as string) || null
  const sizeValueId = (formData.get('size_value_id') as string) || null

  const { data: userData } = await supabase
    .from('users')
    .select('site_id')
    .eq('id', userId)
    .single()

  const { error } = await supabase.from('user_ppe_records').insert({
    user_id: userId,
    ppe_item_id: ppeItemId,
    site_id: userData?.site_id ?? null,
    issued_date: issuedDate,
    issued_by: user.id,
    condition,
    notes,
    size_value_id: sizeValueId || null,
  })

  if (error) {
    return { error: error.message }
  }

  const { revalidatePath } = await import('next/cache')
  revalidatePath(`/ppe/${userId}`)
  revalidatePath('/ppe')
  redirect(`/ppe/${userId}`)
}

interface PageProps {
  params: Promise<{ userId: string }>
}

export default async function UserPpePage({ params }: PageProps) {
  const { userId } = await params
  const supabase = await createClient()

  const [{ data: profile }, { data: ppeRecords }, { data: ppeItemsData }] = await Promise.all([
    supabase
      .from('users')
      .select('id, first_name, last_name')
      .eq('id', userId)
      .single(),
    supabase
      .from('user_ppe_records')
      .select(`
        id, ppe_item_id, size_value_id, issued_date, returned_date, condition, notes,
        issued_by_user:users!user_ppe_records_issued_by_fkey(first_name, last_name),
        ppe_item:ppe_items!user_ppe_records_ppe_item_id_fkey(id, name, has_sizes, size_category_key, replacement_months, is_active),
        size_value:lookup_values!user_ppe_records_size_value_id_fkey(label)
      `)
      .eq('user_id', userId)
      .order('issued_date', { ascending: false }),
    supabase
      .from('ppe_items')
      .select('id, name, has_sizes, size_category_key, replacement_months, is_active')
      .eq('is_active', true)
      .order('sort_order'),
  ])

  if (!profile) notFound()

  const items = (ppeItemsData ?? []) as unknown as PpeItem[]
  const records = (ppeRecords ?? []) as unknown as UserPpeRecord[]

  // Fetch size lookup options for any PPE items that have sizes
  const sizeCategoryKeys = [...new Set(
    items.filter((i) => i.has_sizes && i.size_category_key).map((i) => i.size_category_key!)
  )]

  const sizeOptions: Record<string, { id: string; label: string }[]> = {}
  const sizeLabels: Record<string, string> = {}

  if (sizeCategoryKeys.length > 0) {
    const { data: sizeData } = await supabase
      .from('lookup_values')
      .select('id, label, lookup_categories!inner(key, name)')
      .in('lookup_categories.key', sizeCategoryKeys)
      .eq('is_active', true)
      .order('sort_order')

    for (const row of (sizeData ?? []) as unknown as { id: string; label: string; lookup_categories: { key: string; name: string } }[]) {
      const key = row.lookup_categories.key
      if (!sizeOptions[key]) {
        sizeOptions[key] = []
        sizeLabels[key] = row.lookup_categories.name
      }
      sizeOptions[key].push({ id: row.id, label: row.label })
    }
  }

  // Split into active (not returned) and returned
  const activeRecords = records.filter((r) => !r.returned_date)
  const returnedRecords = records.filter((r) => r.returned_date)

  const today = new Date().toISOString().split('T')[0]

  function getReplacementDue(r: UserPpeRecord): string | null {
    const months = r.ppe_item?.replacement_months
    if (!months || !r.issued_date) return null
    const d = new Date(r.issued_date)
    d.setMonth(d.getMonth() + months)
    return d.toISOString().split('T')[0]
  }

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

      {/* Currently Issued PPE */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm mb-6">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">Currently Issued</h2>
          <span className="text-xs text-slate-500">{activeRecords.length} active item{activeRecords.length !== 1 ? 's' : ''}</span>
        </div>

        {activeRecords.length === 0 ? (
          <div className="py-10 text-center text-slate-400 text-sm">
            No active PPE issued to this person.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Item</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Size</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Issued</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Replace By</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Condition</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Issued By</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {activeRecords.map((r) => {
                  const issuedBy = r.issued_by_user
                  const item = r.ppe_item
                  const replaceDue = getReplacementDue(r)
                  const isOverdue = replaceDue ? replaceDue < today : false

                  return (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-900">{item?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {r.size_value?.label ?? <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{formatDate(r.issued_date)}</td>
                      <td className="px-4 py-3">
                        {replaceDue ? (
                          <span className={isOverdue ? 'font-medium text-red-600' : 'text-slate-600'}>
                            {formatDate(replaceDue)}
                            {isOverdue && <span className="ml-1 text-xs">(overdue)</span>}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          r.condition === 'Good' ? 'bg-green-100 text-green-700'
                          : r.condition === 'Fair' ? 'bg-amber-100 text-amber-700'
                          : r.condition === 'Poor' ? 'bg-orange-100 text-orange-700'
                          : 'bg-slate-100 text-slate-600'
                        }`}>
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
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-700">Issue / Re-issue PPE</h2>
        </div>
        <IssueForm
          userId={userId}
          items={items}
          sizeOptions={sizeOptions}
          sizeLabels={sizeLabels}
          action={issuePpeAction}
        />
      </div>

      {/* Previously Returned PPE */}
      {returnedRecords.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-400">Previously Returned</h2>
            <span className="text-xs text-slate-400">{returnedRecords.length} record{returnedRecords.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Item</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Size</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Issued</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Returned</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Condition</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {returnedRecords.map((r) => (
                  <tr key={r.id} className="opacity-60">
                    <td className="px-4 py-3 text-slate-600">{r.ppe_item?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-500">{r.size_value?.label ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-500">{formatDate(r.issued_date)}</td>
                    <td className="px-4 py-3 text-slate-500">{formatDate(r.returned_date)}</td>
                    <td className="px-4 py-3 text-slate-500">{r.condition}</td>
                    <td className="px-4 py-3 text-slate-400 max-w-[180px] truncate">{r.notes ?? '—'}</td>
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
