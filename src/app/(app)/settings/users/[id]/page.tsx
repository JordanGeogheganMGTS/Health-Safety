import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import AdminUserControls from './AdminUserControls'

export default async function UserAdminPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
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

  const [{ data: profile }, { data: allRoles }, { data: allSites }] = await Promise.all([
    supabase
      .from('users')
      .select('id, first_name, last_name, email, is_active, must_change_password, role_id, site_id, roles(name), sites(name)')
      .eq('id', id)
      .single(),
    supabase.from('roles').select('id, name').order('name'),
    supabase.from('sites').select('id, name').eq('is_active', true).order('name'),
  ])

  if (!profile) notFound()

  const role = (profile.roles as unknown as { name: string } | null)?.name
  const site = (profile.sites as unknown as { name: string } | null)?.name
  const isSelf = authUser.id === id

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

      <AdminUserControls
        userId={id}
        isSelf={isSelf}
        isActive={profile.is_active}
        currentRoleId={profile.role_id}
        currentSiteId={profile.site_id ?? null}
        roleName={role ?? ''}
        siteName={site ?? 'All sites'}
        roles={(allRoles ?? []) as Array<{ id: string; name: string }>}
        sites={(allSites ?? []) as Array<{ id: string; name: string }>}
      />
    </div>
  )
}
