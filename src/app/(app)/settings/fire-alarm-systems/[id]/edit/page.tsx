import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import FireAlarmSystemForm from '../../FireAlarmSystemForm'

export default async function EditFireAlarmSystemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
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

  const [{ data: system }, { data: sites }] = await Promise.all([
    supabase
      .from('fire_alarm_systems')
      .select('id, site_id, panel_location, manufacturer, model, serial_number, installation_date, last_service_date, next_service_date, notes')
      .eq('id', id)
      .single(),
    supabase
      .from('sites')
      .select('id, name')
      .eq('is_active', true)
      .order('name'),
  ])

  if (!system) notFound()

  async function updateSystem(formData: FormData) {
    'use server'
    const supabase = await createClient()
    await supabase.from('fire_alarm_systems').update({
      site_id: formData.get('site_id') as string,
      panel_location: (formData.get('panel_location') as string) || null,
      manufacturer: (formData.get('manufacturer') as string) || null,
      model: (formData.get('model') as string) || null,
      serial_number: (formData.get('serial_number') as string) || null,
      installation_date: (formData.get('installation_date') as string) || null,
      last_service_date: (formData.get('last_service_date') as string) || null,
      next_service_date: (formData.get('next_service_date') as string) || null,
      notes: (formData.get('notes') as string) || null,
    }).eq('id', id)
    redirect('/settings/fire-alarm-systems')
  }

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
        <Link href="/settings/fire-alarm-systems" className="text-sm text-slate-500 hover:text-slate-700">Fire Alarm Systems</Link>
        <span className="text-slate-300">/</span>
        <span className="text-sm font-medium text-slate-900">Edit</span>
      </div>

      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Edit Fire Alarm System</h1>
      </div>

      <FireAlarmSystemForm
        sites={(sites ?? []) as Array<{ id: string; name: string }>}
        action={updateSystem}
        submitLabel="Save Changes"
        defaultValues={{
          site_id: system.site_id,
          panel_location: system.panel_location ?? '',
          manufacturer: system.manufacturer ?? '',
          model: system.model ?? '',
          serial_number: system.serial_number ?? '',
          installation_date: system.installation_date ?? '',
          last_service_date: system.last_service_date ?? '',
          next_service_date: system.next_service_date ?? '',
          notes: system.notes ?? '',
        }}
      />
    </div>
  )
}
