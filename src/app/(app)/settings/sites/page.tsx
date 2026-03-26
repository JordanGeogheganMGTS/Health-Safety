import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'
import { formatDate } from '@/lib/dates'

async function toggleSiteActive(id: string, current: boolean) {
  'use server'
  const supabase = await createClient()
  await supabase
    .from('sites')
    .update({ is_active: !current })
    .eq('id', id)
  revalidatePath('/settings/sites')
}

export default async function SitesPage() {
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

  const { data: sites } = await supabase
    .from('sites')
    .select('id, name, address, postcode, is_active, created_at')
    .order('name')

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
        <span className="text-sm font-medium text-slate-900">Site Management</span>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Site Management</h1>
          <p className="mt-1 text-sm text-slate-500">Add and manage MGTS sites.</p>
        </div>
        <Link
          href="/settings/sites/new"
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Site
        </Link>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {!sites || sites.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">No sites found. Add your first site to get started.</div>
        ) : (
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Name</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Address</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Postcode</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Created</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {sites.map((site) => (
                <tr key={site.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-slate-900">{site.name}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{site.address ?? '—'}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{site.postcode ?? '—'}</td>
                  <td className="px-6 py-4">
                    <form
                      action={async () => {
                        'use server'
                        await toggleSiteActive(site.id, site.is_active)
                      }}
                    >
                      <button type="submit" className="inline-flex cursor-pointer">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          site.is_active
                            ? 'bg-green-100 text-green-800 hover:bg-green-200'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        } transition-colors`}>
                          {site.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </button>
                    </form>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">{formatDate(site.created_at)}</td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/settings/sites/${site.id}/edit`}
                      className="text-sm font-medium text-blue-600 hover:text-blue-800"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
