import { createClient } from '@/lib/supabase/server'
import AlarmTestForm from './AlarmTestForm'

// ─── Types ────────────────────────────────────────────────────────────────────

interface AlarmSystem {
  id: string
  panel_location: string | null
  manufacturer: string | null
  model: string | null
  sites: { id: string; name: string } | null
}

// ─── Page (Server Component — loads systems, renders client form) ─────────────

export default async function NewAlarmTestPage() {
  const supabase = await createClient()

  const { data: systemRows } = await supabase
    .from('fire_alarm_systems')
    .select('id, panel_location, manufacturer, model, sites(id, name)')
    .order('id')

  const systems = (systemRows ?? []) as unknown as AlarmSystem[]

  return (
    <div className="space-y-6">
      <div>
        <nav className="flex items-center gap-2 text-sm text-slate-500 mb-4">
          <a href="/fire-safety" className="hover:text-slate-700 hover:underline">Fire Safety</a>
          <span>/</span>
          <span className="font-medium text-slate-800">Log Alarm Test</span>
        </nav>
        <h1 className="text-2xl font-semibold text-slate-900">Log Fire Alarm Test</h1>
        <p className="mt-1 text-sm text-slate-500">Record the outcome of a fire alarm test.</p>
      </div>

      <AlarmTestForm systems={systems} />
    </div>
  )
}
