import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'
import { formatDate } from '@/lib/dates'

async function toggleSystemActive(id: string, current: boolean) {
  'use server'
  const supabase = await createClient()
  await supabase.from('fire_alarm_systems').update({ is_active: !current }).eq('id', id)
  revalidatePath('/settings/fire-alarm-systems')
}

export default async function FireAlarmSystemsPage() {
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

  const { data: systems } = await supabase
    .from('fire_alarm_systems')
    .select('id, panel_location, manufacturer, model, serial_number, installation_date, next_service_date, is_active, sites(name)')
    .order('is_active', { ascending: false })

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
        <span className="text-sm font-medium text-slate-900">Fire Alarm Systems</span>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Fire Alarm Systems</h1>
          <p className="mt-1 text-sm text-slate-500">Manage the fire alarm panels used when logging alarm tests.</p>
        </div>
        <Link
          href="/settings/fire-alarm-systems/new"
          className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add System
        </Link>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {!systems || systems.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">
            No fire alarm systems found. Add your first system to enable alarm test logging.
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Site</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Panel Location</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Make / Model</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Serial No.</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Next Service</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {(systems as unknown as Array<{
                id: string
                panel_location: string | null
                manufacturer: string | null
                model: string | null
                serial_number: string | null
                installation_date: string | null
                next_service_date: string | null
                is_active: boolean
                sites: { name: string } | null
              }>).map((sys) => (
                <tr key={sys.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-slate-900">{sys.sites?.name ?? '—'}</td>
                  <td className="px-6 py-4 text-sm text-slate-700">{sys.panel_location ?? '—'}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {[sys.manufacturer, sys.model].filter(Boolean).join(' ') || '—'}
                  </td>
                  <td className="px-6 py-4 text-sm font-mono text-slate-500">{sys.serial_number ?? '—'}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{formatDate(sys.next_service_date)}</td>
                  <td className="px-6 py-4">
                    <form action={async () => { 'use server'; await toggleSystemActive(sys.id, sys.is_active) }}>
                      <button type="submit" className="inline-flex cursor-pointer">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          sys.is_active
                            ? 'bg-green-100 text-green-800 hover:bg-green-200'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        } transition-colors`}>
                          {sys.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </button>
                    </form>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/settings/fire-alarm-systems/${sys.id}/edit`}
                      className="text-sm font-medium text-orange-600 hover:text-orange-700"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </div>
  )
}
