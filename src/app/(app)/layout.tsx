import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { AppShell } from '@/components/layout/AppShell'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const today = new Date().toISOString().split('T')[0]

  const [profileResult, sitesResult, overdueResult, pendingAckResult] = await Promise.all([
    supabase
      .from('users')
      .select('id, email, first_name, last_name, is_active, site_id, last_login_at, dse_not_applicable, roles(name), sites(name)')
      .eq('id', user.id)
      .single(),
    supabase
      .from('sites')
      .select('id, name, is_all_sites')
      .eq('is_active', true)
      .order('name'),
    supabase
      .from('corrective_actions')
      .select('id', { count: 'exact', head: true })
      .lt('due_date', today)
      .not('status', 'in', '(Completed,Verified,Cancelled,Closed)'),
    supabase
      .from('document_acknowledgements')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .is('acknowledged_at', null),
  ])

  const profile = profileResult.data
  if (!profile || !profile.is_active) redirect('/login')

  const admin = createAdminClient()

  // Update last_login_at if null or more than 1 hour stale
  const lastLogin = (profile as unknown as { last_login_at: string | null }).last_login_at
  const now = new Date()
  if (!lastLogin || now.getTime() - new Date(lastLogin).getTime() > 60 * 60 * 1000) {
    // Fire-and-forget; don't block page render
    admin.from('users').update({ last_login_at: now.toISOString() }).eq('id', user.id).then(() => {})
  }

  // Auto-mark corrective actions as Overdue when due_date has passed and still open/in-progress
  admin
    .from('corrective_actions')
    .update({ status: 'Overdue' })
    .lt('due_date', today)
    .in('status', ['Open', 'In Progress'])
    .then(() => {})

  // Exclude the special "All Sites" record from the dropdown
  const allSitesRaw = (sitesResult.data ?? []) as unknown as { id: string; name: string; is_all_sites?: boolean }[]
  const regularSites = allSitesRaw.filter((s) => !s.is_all_sites)

  const notificationCount = overdueResult.count ?? 0
  const pendingAcknowledgements = pendingAckResult.count ?? 0

  const userProfile = {
    id: profile.id,
    email: profile.email,
    firstName: profile.first_name,
    lastName: profile.last_name,
    role: (profile.roles as unknown as { name: string }).name,
    siteId: profile.site_id,
    siteName: profile.sites ? (profile.sites as unknown as { name: string }).name : null,
  }

  return (
    <AppShell user={userProfile} sites={regularSites} notificationCount={notificationCount} pendingAcknowledgements={pendingAcknowledgements}>
      {children}
    </AppShell>
  )
}
