import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { getAuthUser } from '@/lib/permissions'
import EditContractForm from '../../EditContractForm'

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
    contract_value: number | null; notice_period_days: number | null
    notes: string | null; file_path: string | null; file_name: string | null
  }

  const c = row as unknown as ContractRow
  const users = (usersRaw ?? []) as { id: string; first_name: string; last_name: string }[]

  return (
    <div className="max-w-4xl space-y-6">
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

        <EditContractForm
          id={id}
          name={c.name}
          supplier={c.supplier}
          ownerId={c.owner_id}
          signedDate={c.signed_date}
          renewalDate={c.renewal_date}
          contractValue={c.contract_value}
          noticePeriodDays={c.notice_period_days}
          notes={c.notes}
          existingFilePath={c.file_path}
          existingFileName={c.file_name}
          users={users}
        />
      </div>
    </div>
  )
}
