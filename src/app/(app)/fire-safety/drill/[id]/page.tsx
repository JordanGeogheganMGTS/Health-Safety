import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { formatDate } from '@/lib/dates'

interface DrillDetail {
  id: string
  drill_date: string
  drill_time: string | null
  evacuation_time_secs: number | null
  number_evacuated: number | null
  issues_identified: string | null
  notes: string | null
  created_at: string
  sites: { name: string } | null
  coordinated_by_user: { first_name: string; last_name: string } | null
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function DrillDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('fire_drills')
    .select(
      `id, drill_date, drill_time, evacuation_time_secs, number_evacuated,
       issues_identified, notes, created_at,
       sites!site_id(name),
       coordinated_by_user:users!coordinated_by(first_name, last_name)`
    )
    .eq('id', id)
    .single()

  if (error || !data) notFound()

  const drill = data as unknown as DrillDetail

  const evac = drill.evacuation_time_secs != null
    ? `${Math.floor(drill.evacuation_time_secs / 60)}m ${drill.evacuation_time_secs % 60}s (${drill.evacuation_time_secs}s)`
    : '—'

  return (
    <div className="space-y-6">
      <nav className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/fire-safety" className="hover:text-slate-700 hover:underline">Fire Safety</Link>
        <span>/</span>
        <span className="font-medium text-slate-800">Fire Drill — {formatDate(drill.drill_date)}</span>
      </nav>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Fire Drill</h1>
          <p className="mt-1 text-sm text-slate-500">
            {(drill.sites as unknown as { name: string } | null)?.name ?? '—'} · {formatDate(drill.drill_date)}
          </p>
        </div>
        <Link
          href={`/fire-safety/drill/${drill.id}/edit`}
          className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
        >
          Edit
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Drill Details */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <h2 className="text-sm font-semibold text-slate-700">Drill Details</h2>
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-xs font-medium text-slate-500">Site</dt>
              <dd className="mt-0.5 text-slate-800">{(drill.sites as unknown as { name: string } | null)?.name ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">Date</dt>
              <dd className="mt-0.5 text-slate-800">{formatDate(drill.drill_date)}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">Time</dt>
              <dd className="mt-0.5 text-slate-800">{drill.drill_time ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">Coordinated By</dt>
              <dd className="mt-0.5 text-slate-800">
                {drill.coordinated_by_user
                  ? `${drill.coordinated_by_user.first_name} ${drill.coordinated_by_user.last_name}`
                  : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">Evacuation Time</dt>
              <dd className="mt-0.5 text-slate-800">{evac}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">Number Evacuated</dt>
              <dd className="mt-0.5 text-slate-800">{drill.number_evacuated ?? '—'}</dd>
            </div>
          </dl>
        </div>

        {/* Issues & Notes */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <h2 className="text-sm font-semibold text-slate-700">Issues &amp; Notes</h2>
          <div className="space-y-4 text-sm">
            <div>
              <dt className="text-xs font-medium text-slate-500">Issues Identified</dt>
              <dd className="mt-1 text-slate-700 whitespace-pre-wrap">
                {drill.issues_identified ?? <span className="text-slate-400 italic">No issues identified.</span>}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">Notes</dt>
              <dd className="mt-1 text-slate-700 whitespace-pre-wrap">
                {drill.notes ?? <span className="text-slate-400 italic">None.</span>}
              </dd>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-start">
        <Link
          href="/fire-safety"
          className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
        >
          ← Back to Fire Safety
        </Link>
      </div>
    </div>
  )
}
