import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SiteEditForm from './SiteEditForm'
import Link from 'next/link'

export default async function EditSitePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('roles(name)')
    .eq('id', user.id)
    .single()

  const roleName = (profile?.roles as { name: string } | null)?.name
  if (roleName !== 'System Admin') redirect('/dashboard')

  const { data: site } = await supabase
    .from('sites')
    .select('id, name, address, postcode, is_active')
    .eq('id', id)
    .single()

  if (!site) redirect('/settings/sites')

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
        <Link href="/settings/sites" className="text-sm text-slate-500 hover:text-slate-700">Sites</Link>
        <span className="text-slate-300">/</span>
        <span className="text-sm font-medium text-slate-900">Edit Site</span>
      </div>

      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Edit Site</h1>
        <p className="mt-1 text-sm text-slate-500">Update site details.</p>
      </div>

      <SiteEditForm site={site} />
    </div>
  )
}
