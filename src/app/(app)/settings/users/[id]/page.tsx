import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'

async function toggleDseNotApplicable(userId: string, current: boolean) {
  'use server'
  const supabase = await createClient()
  await supabase.from('users').update({ dse_not_applicable: !current }).eq('id', userId)
  revalidatePath(`/settings/users/${userId}`)
}

export default async function UserAdminPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ confirm?: string }>
}) {
  const { id } = await params
  const { confirm } = await searchParams
  const supabase = await createClient()

  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const { data: currentProfile } = await supabase
    .from('users')
    .select('id, roles(name)')
    .eq('id', authUser.id)
    .single()

  const roleName = (currentProfile?.roles as unknown as { name: string } | null)?.name
  if (roleName !== 'System Admin') redirect('/dashboard')

  if (confirm === 'true') {
    await supabase.from('users').update({
      is_active: false,
      deactivated_at: new Date().toISOString(),
      deactivated_by: authUser.id,
    }).eq('id', id)
    revalidatePath(`/settings/users/${id}`)
    redirect(`/settings/users/${id}`)
  }

  const { data: profile } = await supabase
    .from('users')
    .select('id, first_name, last_name, email, is_active, dse_not_applicable, roles(name), sites(name)')
    .eq('id', id)
    .single()

  if (!profile) redirect('/settings/users')

  const role = (profile.roles as unknown as { name: string } | null)?.name
  const site = (profile.sites as unknown as { name: string } | null)?.name

  return (
    <div className="space-y-6 max-w-xl">
      <div className="flex items-center gap-3">
        <Link href="/settings" className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
          Settings
        </Link>
        <span className="text-slate-300">/</span>
        <Link href="/settings/users" className="text-sm text-slate-500 hover:text-slate-700">Users</Link>
        <span className="text-slate-300">/</span>
        <span className="text-sm font-medium text-slate-900">{profile.first_name} {profile.last_name}</span>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{profile.first_name} {profile.last_name}</h1>
          <p className="text-sm text-slate-500">{profile.email}</p>
        </div>
        <Link
          href={`/profile/${id}`}
          className="inline-flex items-center gap-1 rounded-lg border border-orange-300 px-3 py-1.5 text-sm font-medium text-orange-700 hover:bg-orange-50 transition-colors"
        >
          View Full Profile →
        </Link>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-900">Admin Settings</h2>
        </div>
        <div className="px-6 py-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide">Role</dt>
            <dd className="mt-1">
              {role ? (
                <span className="inline-flex items-center rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-medium text-orange-700">{role}</span>
              ) : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide">Site</dt>
            <dd className="mt-1 text-sm text-slate-900">{site ?? 'All sites'}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide">Account Status</dt>
            <dd className="mt-1">
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${profile.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {profile.is_active ? 'Active' : 'Inactive'}
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide">DSE Applicable</dt>
            <dd className="mt-1">
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${profile.dse_not_applicable ? 'bg-slate-100 text-slate-700' : 'bg-orange-50 text-orange-700'}`}>
                {profile.dse_not_applicable ? 'Not Applicable' : 'Applicable'}
              </span>
            </dd>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex flex-wrap gap-3">
          <form action={async () => { 'use server'; await toggleDseNotApplicable(id, profile.dse_not_applicable ?? false) }}>
            <button type="submit" className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors">
              {profile.dse_not_applicable ? 'Mark DSE as Applicable' : 'Mark DSE as Not Applicable'}
            </button>
          </form>
          {profile.is_active && profile.id !== currentProfile?.id && (
            <Link
              href={`/settings/users/${id}?confirm=true`}
              className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 transition-colors"
              onClick={(e: React.MouseEvent) => {
                if (!window.confirm(`Deactivate ${profile.first_name} ${profile.last_name}? This will prevent them from logging in.`)) {
                  e.preventDefault()
                }
              }}
            >
              Deactivate User
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
