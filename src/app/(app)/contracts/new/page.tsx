import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getAuthUser } from '@/lib/permissions'
import NewContractForm from '../NewContractForm'

export default async function NewContractPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const authUser = await getAuthUser()
  if (!authUser?.can('contracts', 'create')) redirect('/contracts')

  const admin = createAdminClient()
  const { data: usersRaw } = await admin
    .from('users')
    .select('id, first_name, last_name')
    .eq('is_active', true)
    .order('last_name')

  const users = (usersRaw ?? []) as { id: string; first_name: string; last_name: string }[]

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/contracts" className="hover:text-slate-700">Contracts</Link>
        <span>/</span>
        <span className="text-slate-800 font-medium">New Contract</span>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-5">
          <h1 className="text-xl font-bold text-slate-900">Add Contract</h1>
          <p className="mt-0.5 text-sm text-slate-500">Record a new supplier or service contract</p>
        </div>
        <NewContractForm users={users} />
      </div>
    </div>
  )
}
