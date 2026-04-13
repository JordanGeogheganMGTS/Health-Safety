import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { getAuthUser } from '@/lib/permissions'
import { updateContract } from '../../actions'
import RemoveFileButton from '../../RemoveFileButton'

export default async function EditContractPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const authUser = await getAuthUser()
  if (!authUser?.can('contracts', 'edit')) redirect(`/contracts/${id}`)

  const admin = createAdminClient()

  const [{ data: row }, { data: usersRaw }] = await Promise.all([
    admin.from('contracts').select('*').eq('id', id).single(),
    admin.from('users').select('id, first_name, last_name').eq('is_active', true).order('last_name'),
  ])

  if (!row) notFound()

  type ContractRow = {
    id: string; name: string; supplier: string | null; owner_id: string | null
    signed_date: string | null; renewal_date: string | null
    contract_value: number | null; notice_period_days: number
    notes: string | null; file_path: string | null; file_name: string | null
  }

  const c = row as unknown as ContractRow
  const users = (usersRaw ?? []) as { id: string; first_name: string; last_name: string }[]

  const updateWithId = updateContract.bind(null, id)

  return (
    <div className="max-w-4xl space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/contracts" className="hover:text-slate-700">Contracts</Link>
        <span>/</span>
        <Link href={`/contracts/${id}`} className="hover:text-slate-700">{c.name}</Link>
        <span>/</span>
        <span className="text-slate-800 font-medium">Edit</span>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-5">
          <h1 className="text-xl font-bold text-slate-900">Edit Contract</h1>
          <p className="mt-0.5 text-sm text-slate-500">{c.name}</p>
        </div>

        <form action={updateWithId} encType="multipart/form-data" className="px-6 py-6 space-y-5">
          {/* Contract Name */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Contract Name <span className="text-red-500">*</span>
            </label>
            <input
              name="name"
              required
              type="text"
              defaultValue={c.name}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
            />
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {/* Supplier */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Supplier / Provider</label>
              <input
                name="supplier"
                type="text"
                defaultValue={c.supplier ?? ''}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
              />
            </div>

            {/* Contract Owner */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Contract Owner</label>
              <select
                name="owner_id"
                defaultValue={c.owner_id ?? ''}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
              >
                <option value="">— Select owner —</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>
                ))}
              </select>
            </div>

            {/* Signed Date */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Signed Date</label>
              <input
                name="signed_date"
                type="date"
                defaultValue={c.signed_date ?? ''}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
              />
            </div>

            {/* Renewal Date */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Renewal Date</label>
              <input
                name="renewal_date"
                type="date"
                defaultValue={c.renewal_date ?? ''}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
              />
            </div>

            {/* Contract Value */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Contract Value (£)</label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400 text-sm">£</span>
                <input
                  name="contract_value"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={c.contract_value ?? ''}
                  className="w-full rounded-lg border border-slate-300 pl-7 pr-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
              </div>
            </div>

            {/* Notice Period */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Notice Period</label>
              <div className="relative">
                <input
                  name="notice_period_days"
                  type="number"
                  min="1"
                  defaultValue={c.notice_period_days}
                  className="w-full rounded-lg border border-slate-300 px-3 pr-12 py-2 text-sm text-slate-900 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-400 text-sm">days</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
            <textarea
              name="notes"
              rows={3}
              defaultValue={c.notes ?? ''}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
            />
          </div>

          {/* Contract Document */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Contract Document</label>
            {c.file_name ? (
              <div className="mb-3 flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <div className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="text-sm text-slate-700">{c.file_name}</span>
                </div>
                <RemoveFileButton />
              </div>
            ) : null}
            <input
              name="file"
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx"
              className="w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-orange-50 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-orange-700 hover:file:bg-orange-100"
            />
            {c.file_name ? (
              <p className="text-xs text-slate-400 mt-1">Upload a new file to replace the current document. The old file will be deleted.</p>
            ) : (
              <p className="text-xs text-slate-400 mt-1">PDF, Word, or Excel.</p>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
            <Link href={`/contracts/${id}`} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
              Cancel
            </Link>
            <button
              type="submit"
              className="rounded-lg bg-orange-500 px-5 py-2 text-sm font-medium text-white hover:bg-orange-600 transition-colors"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
