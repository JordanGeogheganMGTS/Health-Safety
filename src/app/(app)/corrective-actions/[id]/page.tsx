import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { formatDate, formatDateTime } from '@/lib/dates'

// ─── Types ────────────────────────────────────────────────────────────────────

type CAStatus = 'Open' | 'In Progress' | 'Completed' | 'Overdue' | 'Closed'
type Priority = 'Low' | 'Medium' | 'High' | 'Critical'

interface CorrectiveActionDetail {
  id: string
  title: string
  description: string | null
  source_table: string | null
  source_record_id: string | null
  priority: { label: Priority } | null
  due_date: string | null
  completed_at: string | null
  status: CAStatus
  completion_notes: string | null
  created_at: string
  updated_at: string
  sites: { name: string } | null
  assigned: { id: string; first_name: string; last_name: string } | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatSourceTable(source: string | null): string {
  if (!source) return '—'
  const map: Record<string, string> = {
    inspections: 'Inspection',
    incidents: 'Incident',
    dse_assessments: 'DSE Assessment',
    risk_assessments: 'Risk Assessment',
    fire_safety: 'Fire Safety',
    manual: 'Manual Entry',
  }
  return map[source] ?? source.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function sourceTableHref(table: string | null, sourceId: string | null): string | null {
  if (!table || !sourceId) return null
  const map: Record<string, string> = {
    inspections: '/inspections',
    incidents: '/incidents',
    dse_assessments: '/dse',
    risk_assessments: '/risk-assessments',
    fire_safety: '/fire-safety',
  }
  const base = map[table]
  if (!base) return null
  return `${base}/${sourceId}`
}

function statusBadgeClass(status: CAStatus): string {
  switch (status) {
    case 'Open': return 'bg-slate-100 text-slate-700 ring-slate-200'
    case 'In Progress': return 'bg-orange-100 text-orange-700 ring-blue-200'
    case 'Completed': return 'bg-green-100 text-green-700 ring-green-200'
    case 'Overdue': return 'bg-red-100 text-red-700 ring-red-200'
    case 'Closed': return 'bg-gray-100 text-gray-600 ring-gray-200'
  }
}

function priorityBadgeClass(priority: Priority): string {
  switch (priority) {
    case 'Critical': return 'bg-red-100 text-red-800 ring-red-200'
    case 'High': return 'bg-orange-100 text-orange-800 ring-orange-200'
    case 'Medium': return 'bg-amber-100 text-amber-800 ring-amber-200'
    case 'Low': return 'bg-green-100 text-green-800 ring-green-200'
  }
}

function statusTimelineStep(status: CAStatus): number {
  const steps: CAStatus[] = ['Open', 'In Progress', 'Completed', 'Closed']
  if (status === 'Overdue') return 0
  return steps.indexOf(status)
}

// ─── Page ─────────────────────────────────────────────────────────────────────

interface PageProps {
  params: { id: string }
}

export default async function CorrectiveActionDetailPage({ params }: PageProps) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('corrective_actions')
    .select(
      `id, title, description, source_table, source_record_id, due_date,
       completed_at, status, completion_notes, created_at, updated_at,
       priority:priority_id(label),
       sites(name),
       assigned:assigned_to(id, first_name, last_name)`
    )
    .eq('id', params.id)
    .single()

  if (error || !data) {
    notFound()
  }

  const ca = data as unknown as CorrectiveActionDetail

  const sourceHref = sourceTableHref(ca.source_table, ca.source_record_id)
  const priorityLabel = (ca.priority as unknown as { label: Priority }[] | null)?.[0]?.label ?? null
  const timelineStep = statusTimelineStep(ca.status)
  const timelineSteps: { label: string; status: CAStatus }[] = [
    { label: 'Open', status: 'Open' },
    { label: 'In Progress', status: 'In Progress' },
    { label: 'Completed', status: 'Completed' },
    { label: 'Closed', status: 'Closed' },
  ]

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/corrective-actions" className="hover:text-slate-700 hover:underline">
          Corrective Actions
        </Link>
        <span>/</span>
        <span className="text-slate-800 font-medium truncate max-w-xs">{ca.title}</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-slate-900">{ca.title}</h1>
          <div className="flex flex-wrap items-center gap-2">
            {priorityLabel && (
              <span
                className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${priorityBadgeClass(priorityLabel)}`}
              >
                {priorityLabel} Priority
              </span>
            )}
            <span
              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${statusBadgeClass(ca.status)}`}
            >
              {ca.status}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <Link
            href={`/corrective-actions/${ca.id}/edit`}
            className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
          >
            Edit
          </Link>
          {ca.status !== 'Closed' && (
            <Link
              href={`/corrective-actions/${ca.id}/edit?action=close`}
              className="inline-flex items-center rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-700 transition-colors"
            >
              Close Action
            </Link>
          )}
        </div>
      </div>

      {/* Status timeline */}
      {ca.status !== 'Overdue' && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-slate-700">Progress</h2>
          <ol className="flex items-center gap-0">
            {timelineSteps.map((step, idx) => {
              const isComplete = idx < timelineStep
              const isCurrent = idx === timelineStep
              return (
                <li key={step.status} className="flex flex-1 items-center">
                  <div className="flex flex-col items-center gap-1">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ${
                        isComplete
                          ? 'bg-green-500 text-white'
                          : isCurrent
                          ? 'bg-orange-500 text-white ring-4 ring-orange-100'
                          : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      {isComplete ? (
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        idx + 1
                      )}
                    </div>
                    <span
                      className={`text-xs font-medium ${
                        isCurrent ? 'text-orange-700' : isComplete ? 'text-green-700' : 'text-slate-400'
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                  {idx < timelineSteps.length - 1 && (
                    <div
                      className={`mx-1 h-0.5 flex-1 ${
                        idx < timelineStep ? 'bg-green-400' : 'bg-slate-200'
                      }`}
                    />
                  )}
                </li>
              )
            })}
          </ol>
        </div>
      )}

      {ca.status === 'Overdue' && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          This corrective action is <strong>overdue</strong>. It was due on{' '}
          {formatDate(ca.due_date)}. Please update the status or due date.
        </div>
      )}

      {/* Main details */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-slate-700">Description</h2>
            {ca.description ? (
              <p className="whitespace-pre-wrap text-sm text-slate-700 leading-relaxed">
                {ca.description}
              </p>
            ) : (
              <p className="text-sm text-slate-400 italic">No description provided.</p>
            )}
          </div>

          {/* Completion notes */}
          {(ca.status === 'Completed' || ca.status === 'Closed') && ca.completion_notes && (
            <div className="rounded-xl border border-green-200 bg-green-50 p-5">
              <h2 className="mb-3 text-sm font-semibold text-green-800">Completion Notes</h2>
              <p className="whitespace-pre-wrap text-sm text-green-800 leading-relaxed">
                {ca.completion_notes}
              </p>
            </div>
          )}

          {/* Source */}
          {ca.source_table && ca.source_table !== 'manual' && (
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-3 text-sm font-semibold text-slate-700">Source</h2>
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-700">{formatSourceTable(ca.source_table)}</span>
                {sourceHref && (
                  <Link
                    href={sourceHref}
                    className="text-xs font-medium text-orange-600 hover:underline"
                  >
                    View source record →
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right column — metadata */}
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-semibold text-slate-700">Details</h2>

            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-xs font-medium text-slate-500">Site</dt>
                <dd className="mt-0.5 text-slate-800">{ca.sites?.[0]?.name ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-500">Assigned To</dt>
                <dd className="mt-0.5 text-slate-800">
                  {(() => {
                    const a = (ca.assigned as unknown as { first_name: string; last_name: string }[] | null)?.[0]
                    return a ? `${a.first_name} ${a.last_name}` : '—'
                  })()}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-500">Due Date</dt>
                <dd className="mt-0.5 text-slate-800">{formatDate(ca.due_date)}</dd>
              </div>
              {ca.completed_at && (
                <div>
                  <dt className="text-xs font-medium text-slate-500">Completed</dt>
                  <dd className="mt-0.5 text-slate-800">{formatDateTime(ca.completed_at)}</dd>
                </div>
              )}
              <div>
                <dt className="text-xs font-medium text-slate-500">Priority</dt>
                <dd className="mt-0.5">
                  {priorityLabel ? (
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${priorityBadgeClass(priorityLabel)}`}
                    >
                      {priorityLabel}
                    </span>
                  ) : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-500">Status</dt>
                <dd className="mt-0.5">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${statusBadgeClass(ca.status)}`}
                  >
                    {ca.status}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-500">Source</dt>
                <dd className="mt-0.5 text-slate-800">{formatSourceTable(ca.source_table)}</dd>
              </div>
              <div className="border-t border-slate-100 pt-3">
                <dt className="text-xs font-medium text-slate-500">Created</dt>
                <dd className="mt-0.5 text-slate-800">{formatDateTime(ca.created_at)}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-500">Last Updated</dt>
                <dd className="mt-0.5 text-slate-800">{formatDateTime(ca.updated_at)}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  )
}
