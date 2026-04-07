import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'
import AddLookupValueForm from './AddLookupValueForm'
import EditLookupValueRow from './EditLookupValueRow'

// ─── Server Actions ────────────────────────────────────────────────────────────

async function toggleValueActive(valueId: string, current: boolean, categoryId: string) {
  'use server'
  const supabase = await createClient()
  await supabase
    .from('lookup_values')
    .update({ is_active: !current })
    .eq('id', valueId)
  revalidatePath(`/settings/lookups/${categoryId}`)
}

async function setDefaultValue(valueId: string, categoryId: string) {
  'use server'
  const supabase = await createClient()
  await supabase.from('lookup_values').update({ is_default: false }).eq('category_id', categoryId)
  await supabase.from('lookup_values').update({ is_default: true }).eq('id', valueId)
  revalidatePath(`/settings/lookups/${categoryId}`)
}

async function updateValue(
  valueId: string,
  label: string,
  value: string,
  sortOrder: number,
  categoryId: string,
) {
  'use server'
  const supabase = await createClient()
  await supabase
    .from('lookup_values')
    .update({ label, value, sort_order: sortOrder })
    .eq('id', valueId)
  revalidatePath(`/settings/lookups/${categoryId}`)
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default async function LookupCategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('roles(name)')
    .eq('id', user.id)
    .single()

  const roleName = (profile?.roles as unknown as { name: string } | null)?.name
  if (roleName !== 'System Admin') redirect('/dashboard')

  const { data: category } = await supabase
    .from('lookup_categories')
    .select('id, key, label, description')
    .eq('id', id)
    .single()

  if (!category) redirect('/settings/lookups')

  const { data: values } = await supabase
    .from('lookup_values')
    .select('id, label, value, sort_order, is_default, is_active')
    .eq('category_id', id)
    .order('sort_order')

  async function addValue(formData: FormData) {
    'use server'
    const supabase = await createClient()
    const label = formData.get('label') as string
    const value = formData.get('value') as string
    const sort_order = parseInt(formData.get('sort_order') as string) || 0

    await supabase.from('lookup_values').insert({
      category_id: id,
      label,
      value,
      sort_order,
      is_active: true,
      is_default: false,
    })
    revalidatePath(`/settings/lookups/${id}`)
  }

  // Bind category id into each action so the client component doesn't need it
  async function boundToggleActive(valueId: string, current: boolean) {
    'use server'
    await toggleValueActive(valueId, current, id)
  }

  async function boundSetDefault(valueId: string) {
    'use server'
    await setDefaultValue(valueId, id)
  }

  async function boundUpdateValue(valueId: string, label: string, value: string, sortOrder: number) {
    'use server'
    await updateValue(valueId, label, value, sortOrder, id)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/settings" className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
          Settings
        </Link>
        <span className="text-slate-300">/</span>
        <Link href="/settings/lookups" className="text-sm text-slate-500 hover:text-slate-700">Lookups</Link>
        <span className="text-slate-300">/</span>
        <span className="text-sm font-medium text-slate-900">{category.label}</span>
      </div>

      <div>
        <h1 className="text-2xl font-semibold text-slate-900">{category.label}</h1>
        {category.description && <p className="mt-1 text-sm text-slate-500">{category.description}</p>}
        <p className="mt-1 text-xs font-mono text-slate-400">key: {category.key}</p>
      </div>

      {/* Add Value Form */}
      <AddLookupValueForm addValue={addValue} />

      {/* Values Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {!values || values.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">No values found. Add your first value above.</div>
        ) : (
          <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Label</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Value</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Sort Order</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Default</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {values.map((val) => (
                <EditLookupValueRow
                  key={val.id}
                  val={val}
                  categoryId={id}
                  updateValue={boundUpdateValue}
                  toggleActive={boundToggleActive}
                  setDefault={boundSetDefault}
                />
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </div>
  )
}
