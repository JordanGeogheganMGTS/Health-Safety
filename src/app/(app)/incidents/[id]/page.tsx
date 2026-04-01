import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { formatDate, formatDateTime } from '@/lib/dates'

// ─── Types ────────────────────────────────────────────────────────────────────

type IncidentStatus = 'Open' | 'Under Investigation' | 'Closed'

interface IncidentDetail {
  id: string
  incident_date: string
  incident_time: string | null
  type: string
  location_description: string
  description: string
  persons_involved: string | null
  immediate_actions: string | null
  riddor_reportable: boolean
  riddor_reference: string | null
  riddor_reported_date: string | null
  status: IncidentStatus
  investigation_summary: string | null
  closed_at: string | null
  created_at: string
  sites: { name: string } | null
  reported_by: { first_name: string; last_name: string } | null
  investigated_by: { first_name: string; last_name: string } | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusBadgeClass(status: IncidentStatus): string {
  switch (status) {
    case 'Open': return 'bg-slate-100 text-slate-700 ring-slate-200'
    case 'Under Investigation': return 'bg-orange-100 text-orange-700 ring-blue-200'
    case 'Closed': return 'bg-green-100 text-green-700 ring-green-200'
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function IncidentDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('incidents')
    .select(
      `id, incident_date, incident_time, type, location_description, description,
       persons_involved, immediate_actions, riddor_reportable, riddor_reference,
       riddor_reported_date, status, investigation_summary, closed_at, created_at,
       sites(name),
       reported_by:reported_by_id(first_name, last_name),
       investigated_by:investigated_by_id(first_name, last_name)`
    )
    .eq('id', id)
    .single()

  if (error || !data) notFound()

  const incident = data as unknown as IncidentDetail

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/incidents" className="hover:text-slate-700 hover:underline">Incident Log</Link>
        <span>/</span>
        <span className="font-medium text-slate-800 truncate max-w-xs">{incident.type} — {formatDate(incident.incident_date)}</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-slate-900">{incident.type}</h1>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${statusBadgeClass(incident.status)}`}>
              {incident.status}
            </span>
            {incident.riddor_reportable && (
              <span className="inline-flex rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700 ring-1 ring-inset ring-red-200">
                RIDDOR
              </span>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          {incident.status === 'Open' && (
            <Link
              href={`/incidents/${incident.id}/edit?action=investigate`}
              className="inline-flex items-center rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-orange-600 transition-colors"
            >
              Start Investigation
            </Link>
          )}
          {incident.status === 'Under Investigation' && (
            <Link
              href={`/incidents/${incident.id}/edit?action=close`}
              className="inline-flex items-center rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 transition-colors"
            >
              Close Incident
            </Link>
          )}
          <Link
            href={`/incidents/${incident.id}/edit`}
            className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
          >
            Edit
          </Link>
        </div>
      </div>

      {/* 3-section detail layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column (spans 2) */}
        <div className="lg:col-span-2 space-y-6">

          {/* Section 1: Incident Details */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-semibold text-slate-700">Incident Details</h2>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-sm">
              <div>
                <dt className="text-xs font-medium text-slate-500">Date</dt>
                <dd className="mt-0.5 text-slate-800">{formatDate(incident.incident_date)}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-500">Time</dt>
                <dd className="mt-0.5 text-slate-800">{incident.incident_time ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-500">Type</dt>
                <dd className="mt-0.5 text-slate-800">{incident.type}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-500">Site</dt>
                <dd className="mt-0.5 text-slate-800">{incident.sites?.[0]?.name ?? '—'}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs font-medium text-slate-500">Location</dt>
                <dd className="mt-0.5 text-slate-800">{incident.location_description}</dd>
              </div>
            </dl>
            <div>
              <dt className="text-xs font-medium text-slate-500">Description</dt>
              <dd className="mt-1 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{incident.description}</dd>
            </div>
          </div>

          {/* Section 2: Persons & Response */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-semibold text-slate-700">Persons &amp; Response</h2>

            <div>
              <dt className="text-xs font-medium text-slate-500">Persons Involved</dt>
              <dd className="mt-1 text-sm text-slate-700 whitespace-pre-wrap">
                {incident.persons_involved ?? <span className="text-slate-400 italic">None recorded.</span>}
              </dd>
            </div>

            <div>
              <dt className="text-xs font-medium text-slate-500">Immediate Actions Taken</dt>
              <dd className="mt-1 text-sm text-slate-700 whitespace-pre-wrap">
                {incident.immediate_actions ?? <span className="text-slate-400 italic">None recorded.</span>}
              </dd>
            </div>

            {incident.riddor_reportable && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 space-y-3">
                <p className="text-xs font-semibold text-red-700 uppercase tracking-wide">RIDDOR Reporting</p>
                <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-sm">
                  <div>
                    <dt className="text-xs font-medium text-red-600">Reference Number</dt>
                    <dd className="mt-0.5 text-red-800">{incident.riddor_reference ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-red-600">Date Reported to HSE</dt>
                    <dd className="mt-0.5 text-red-800">{formatDate(incident.riddor_reported_date)}</dd>
                  </div>
                </dl>
              </div>
            )}
          </div>

          {/* Section 3: Investigation */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-700">Investigation</h2>
              <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${statusBadgeClass(incident.status)}`}>
                {incident.status}
              </span>
            </div>

            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-sm">
              <div>
                <dt className="text-xs font-medium text-slate-500">Investigated By</dt>
                <dd className="mt-0.5 text-slate-800">
                  {incident.investigated_by
                    ? `${incident.investigated_by.first_name} ${incident.investigated_by.last_name}`
                    : <span className="text-slate-400">—</span>}
                </dd>
              </div>
              {incident.closed_at && (
                <div>
                  <dt className="text-xs font-medium text-slate-500">Closed At</dt>
                  <dd className="mt-0.5 text-slate-800">{formatDateTime(incident.closed_at)}</dd>
                </div>
              )}
            </dl>

            <div>
              <dt className="text-xs font-medium text-slate-500">Investigation Summary</dt>
              <dd className="mt-1 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                {incident.investigation_summary ?? <span className="text-slate-400 italic">No summary recorded yet.</span>}
              </dd>
            </div>
          </div>
        </div>

        {/* Right column — metadata */}
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-semibold text-slate-700">Record Details</h2>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-xs font-medium text-slate-500">Reported By</dt>
                <dd className="mt-0.5 text-slate-800">
                  {incident.reported_by
                    ? `${incident.reported_by.first_name} ${incident.reported_by.last_name}`
                    : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-500">Created</dt>
                <dd className="mt-0.5 text-slate-800">{formatDateTime(incident.created_at)}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-500">Status</dt>
                <dd className="mt-0.5">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${statusBadgeClass(incident.status)}`}>
                    {incident.status}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-500">RIDDOR</dt>
                <dd className="mt-0.5">
                  {incident.riddor_reportable ? (
                    <span className="text-red-700 font-semibold text-xs">Yes — RIDDOR Reportable</span>
                  ) : (
                    <span className="text-slate-500">No</span>
                  )}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  )
}
