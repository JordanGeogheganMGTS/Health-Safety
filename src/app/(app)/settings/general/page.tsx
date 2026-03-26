'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'
import GeneralSettingsTable from './GeneralSettingsTable'

async function updateSetting(key: string, value: string) {
  'use server'
  const supabase = await createClient()
  await supabase
    .from('system_settings')
    .update({ value, updated_at: new Date().toISOString() })
    .eq('key', key)
  revalidatePath('/settings/general')
}

export default async function GeneralSettingsPage() {
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

  const { data: settings } = await supabase
    .from('system_settings')
    .select('key, value, description, updated_at')
    .order('key')

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/settings"
          className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
          Settings
        </Link>
        <span className="text-slate-300">/</span>
        <span className="text-sm font-medium text-slate-900">General Settings</span>
      </div>

      <div>
        <h1 className="text-2xl font-semibold text-slate-900">General Settings</h1>
        <p className="mt-1 text-sm text-slate-500">Configure thresholds and system-wide settings.</p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {!settings || settings.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">No settings found.</div>
        ) : (
          <GeneralSettingsTable settings={settings} updateSetting={updateSetting} />
        )}
      </div>
    </div>
  )
}
