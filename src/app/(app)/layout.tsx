import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/layout/AppShell'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('id, email, first_name, last_name, is_active, site_id, dse_not_applicable, must_change_password, roles(name), sites(name)')
    .eq('id', user.id)
    .single()

  if (!profile || !profile.is_active) redirect('/login')

  // Force password change if flagged
  const headersList = await headers()
  const pathname = headersList.get('x-pathname') ?? ''
  if (profile.must_change_password && !pathname.startsWith('/change-password')) {
    redirect('/change-password')
  }

  const userProfile = {
    id: profile.id,
    email: profile.email,
    firstName: profile.first_name,
    lastName: profile.last_name,
    role: (profile.roles as unknown as { name: string }).name,
    siteId: profile.site_id,
    siteName: profile.sites ? (profile.sites as unknown as { name: string }).name : null,
  }

  return <AppShell user={userProfile}>{children}</AppShell>
}
