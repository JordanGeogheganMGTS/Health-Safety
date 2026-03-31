import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { formatDate } from '@/lib/dates'

// ─── Types ────────────────────────────────────────────────────────────────────

type InspectionStatus = 'Scheduled' | 'In Progress' | 'Completed' | 'Overdue'

interface Inspection {
  id: string
  title: string
  scheduled_date: string
  completed_date: string | null
  status: InspectionStatus
  notes: string | null
  sites: { name: string } | null
  type: { label: string } | null
  template: { name: string } | null
  conducted_by: { first_name: string; last_name: string } | null
  overall_outcome: { label: string } | null
  approved_by: { first_name: string; last_name: string } | null
}

interface Finding {
  id: string
  item_text: string
  response: string | null
  finding_detail: string | null
  sort_order: number
  severity: { label: string } | null
  corrective_action: { id: string; title: string } | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusBadgeClass(status: InspectionStatus): string {
  switch (status) {
    case 'Scheduled':   return 'bg-slate-100 text-slate-700 ring-slate-200'
    case 'In Progress': return 'bg-blue-100 text-blue-700 ring-blue-200'
    case 'Completed':   return 'bg-green-100 text-green-700 ring-green-200'
    case 'Overdue':     return 'bg-red-100 text-red-700 ring-red-200'
  }
}

function responseBadgeClass(response: string | null): string {
  if (!response) return 'bg-slate-100 text-slate-500'
  const r = response.toLowerCase()
  if (r === 'pass' || r === 'yes') return 'bg-green-100 text-green-700'
  if (r === 'fail' || r === 'no')  return 'bg-red-100 text-red-700'
  return 'bg-slate-100 text-slate-700'
}

// ─── Page ─────────────────────────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function InspectionDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: insp, error } = await supabase
    .from('inspections')
    .select(
      `id, title, scheduled_date, completed_date, status, notes,
       sites(name),
       type:type_id(label),
       template:template_id(name),
       conducted_by:conducted_by_id(first_name, last_name),
       overall_outcome:overall_outcome_id(label),
       approved_by(first_name, last_name)`
    )
    .eq('id', id)
    .single()

  if (error || !insp) notFound()

  const inspection = insp as unknown as Inspection

  // Load findings if completed
  let findings: Finding[] = []
  if (inspection.status === 'Completed') {
    const { data: findingRows } = await supabase
      .from('inspection_findings')
      .select(
        `id, item_text, response, finding_detail, sort_order,
         severity:severity_id(label),
         corrective_action:ca_id(id, title)`
      )
      .eq('inspection_id', id)
      .order('sort_order', { ascending: true })

    findings = (findingRows ?? []) as unknown as Finding[]
  }

  const canConduct = inspection.status === 'Scheduled' || inspection.status === 'In Progress'

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-slate-900">{inspection.title}</h1>
            <span
              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${statusBadgeClass(inspection.status)}`}
            >
              {inspection.status}
            </span>
          </div>
          <p className="text-sm text-slate-500">
            {inspection.sites?.[0]?.name ?? 'Unknown site'} &bull; {inspection.type?.[0]?.label ?? 'Unknown type'}
          </p>
        </div>
        {canConduct && (
          <Link
            href={`/inspections/${id}/conduct`}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors whitespace-nowrap"
          >
            Conduct Inspection
          </Link>
        )}
      </div>

      {/* Details card */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">Inspection Details</h2>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
          <div>
            <dt className="text-xs font-medium text-slate-500">Scheduled Date</dt>
            <dd className="mt-0.5 text-sm text-slate-800">{formatDate(inspection.scheduled_date)}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-500">Completed Date</dt>
            <dd className="mt-0.5 text-sm text-slate-800">{formatDate(inspection.completed_date)}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-500">Template</dt>
            <dd className="mt-0.5 text-sm text-slate-800">{inspection.template?.name ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-500">Conducted By</dt>
            <dd className="mt-0.5 text-sm text-slate-800">
              {inspection.conducted_by
                ? `${inspection.conducted_by.first_name} ${inspection.conducted_by.last_name}`
                : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-500">Overall Outcome</dt>
            <dd className="mt-0.5 text-sm text-slate-800">{inspection.overall_outcome?.label ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-500">Approved By</dt>
            <dd className="mt-0.5 text-sm text-slate-800">
              {inspection.approved_by
                ? `${inspection.approved_by.first_name} ${inspection.approved_by.last_name}`
                : '—'}
            </dd>
          </div>
        </dl>
        {inspection.notes && (
          <div className="mt-4 border-t border-slate-100 pt-4">
            <dt className="text-xs font-medium text-slate-500">Notes</dt>
            <dd className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{inspection.notes}</dd>
          </div>
        )}
      </div>

      {/* Findings (completed only) */}
      {inspection.status === 'Completed' && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Inspection Findings ({findings.length})
            </h2>
          </div>
          {findings.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-slate-400">
              No findings recorded.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100">
                <thead>
                  <tr className="bg-slate-50">
                    {['#', 'Item', 'Response', 'Finding Detail', 'Severity', 'Corrective Action'].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {findings.map((f, i) => (
                    <tr key={f.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-xs text-slate-400">{i + 1}</td>
                      <td className="px-4 py-3 text-sm text-slate-800 max-w-xs">{f.item_text}</td>
                      <td className="px-4 py-3">
                        {f.response ? (
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${responseBadgeClass(f.response)}`}>
                            {f.response}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-sm">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 max-w-xs">
                        {f.finding_detail ?? <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {f.severity?.label ?? <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {f.corrective_action ? (
                          <Link
                            href={`/corrective-actions/${f.corrective_action.id}`}
                            className="text-blue-600 hover:underline"
                          >
                            {f.corrective_action.title}
                          </Link>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Back link */}
      <div>
        <Link href="/inspections" className="text-sm text-blue-600 hover:underline">
          &larr; Back to Inspections
        </Link>
      </div>
    </div>
  )
}
