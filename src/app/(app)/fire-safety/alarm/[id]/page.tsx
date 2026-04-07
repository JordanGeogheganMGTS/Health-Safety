import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { formatDate } from '@/lib/dates'

interface AlarmTestDetail {
  id: string
  test_date: string
  test_time: string | null
  call_point_tested: string | null
  fault_description: string | null
  remedial_action: string | null
  notes: string | null
  created_at: string
  test_type: { label: string } | null
  outcome: { label: string } | null
  tested_by_user: { first_name: string; last_name: string } | null
  system: {
    panel_location: string | null
    sites: { name: string } | null
  } | null
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function AlarmTestDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('fire_alarm_tests')
    .select(
      `id, test_date, test_time, call_point_tested, fault_description,
       remedial_action, notes, created_at,
       test_type:lookup_values!test_type_id(label),
       outcome:lookup_values!outcome_id(label),
       tested_by_user:users!tested_by(first_name, last_name),
       system:fire_alarm_systems!fire_alarm_system_id(panel_location, sites(name))`
    )
    .eq('id', id)
    .single()

  if (error || !data) notFound()

  const test = data as unknown as AlarmTestDetail
  const outcomeLabel = test.outcome?.label ?? '—'
  const outcomeBadge =
    outcomeLabel.toLowerCase() === 'pass'
      ? 'bg-green-100 text-green-700 ring-green-200'
      : outcomeLabel.toLowerCase() === 'fail'
      ? 'bg-red-100 text-red-700 ring-red-200'
      : 'bg-amber-100 text-amber-700 ring-amber-200'

  const siteName = (test.system?.sites as unknown as { name: string } | null)?.name ?? '—'

  return (
    <div className="space-y-6">
      <nav className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/fire-safety" className="hover:text-slate-700 hover:underline">Fire Safety</Link>
        <span>/</span>
        <span className="font-medium text-slate-800">Alarm Test — {formatDate(test.test_date)}</span>
      </nav>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Fire Alarm Test</h1>
          <p className="mt-1 text-sm text-slate-500">{siteName} · {formatDate(test.test_date)}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ring-1 ring-inset ${outcomeBadge}`}>
            {outcomeLabel}
          </span>
          <Link
            href={`/fire-safety/alarm/${test.id}/edit`}
            className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
          >
            Edit
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Test Details */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <h2 className="text-sm font-semibold text-slate-700">Test Details</h2>
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-xs font-medium text-slate-500">Site</dt>
              <dd className="mt-0.5 text-slate-800">{siteName}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">Panel Location</dt>
              <dd className="mt-0.5 text-slate-800">{test.system?.panel_location ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">Date</dt>
              <dd className="mt-0.5 text-slate-800">{formatDate(test.test_date)}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">Time</dt>
              <dd className="mt-0.5 text-slate-800">{test.test_time ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">Test Type</dt>
              <dd className="mt-0.5 text-slate-800">{test.test_type?.label ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">Call Point Tested</dt>
              <dd className="mt-0.5 text-slate-800">{test.call_point_tested ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">Tested By</dt>
              <dd className="mt-0.5 text-slate-800">
                {test.tested_by_user
                  ? `${test.tested_by_user.first_name} ${test.tested_by_user.last_name}`
                  : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">Outcome</dt>
              <dd className="mt-0.5">
                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${outcomeBadge}`}>
                  {outcomeLabel}
                </span>
              </dd>
            </div>
          </dl>
        </div>

        {/* Faults & Actions */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <h2 className="text-sm font-semibold text-slate-700">Faults &amp; Actions</h2>
          <div className="space-y-4 text-sm">
            <div>
              <dt className="text-xs font-medium text-slate-500">Fault Description</dt>
              <dd className="mt-1 text-slate-700 whitespace-pre-wrap">
                {test.fault_description ?? <span className="text-slate-400 italic">No faults recorded.</span>}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">Remedial Action</dt>
              <dd className="mt-1 text-slate-700 whitespace-pre-wrap">
                {test.remedial_action ?? <span className="text-slate-400 italic">None recorded.</span>}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">Notes</dt>
              <dd className="mt-1 text-slate-700 whitespace-pre-wrap">
                {test.notes ?? <span className="text-slate-400 italic">None.</span>}
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
