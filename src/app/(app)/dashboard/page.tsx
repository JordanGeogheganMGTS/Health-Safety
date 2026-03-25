import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900 mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        {/* Stat tiles - to be replaced with live data */}
        {[
          { label: 'Overdue Items', value: '—', color: 'bg-red-50 border-red-200 text-red-700' },
          { label: 'Due Within 30 Days', value: '—', color: 'bg-amber-50 border-amber-200 text-amber-700' },
          { label: 'Open Corrective Actions', value: '—', color: 'bg-orange-50 border-orange-200 text-orange-700' },
          { label: 'Docs Due for Review', value: '—', color: 'bg-blue-50 border-blue-200 text-blue-700' },
        ].map((tile) => (
          <div key={tile.label} className={`rounded-lg border p-4 ${tile.color}`}>
            <div className="text-2xl font-bold">{tile.value}</div>
            <div className="text-sm font-medium mt-1">{tile.label}</div>
          </div>
        ))}
      </div>
      <p className="text-slate-500 text-sm">Dashboard data will populate once records are entered in the system.</p>
    </div>
  )
}
