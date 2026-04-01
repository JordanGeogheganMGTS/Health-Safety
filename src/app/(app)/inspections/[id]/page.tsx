import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { formatDate } from '@/lib/dates'

// ─── Types ────────────────────────────────────────────────────────────────────

type InspectionStatus = 'Draft' | 'Submitted' | 'Closed'

interface Inspection {
  id: string
  title: string
  inspection_date: string
  status: InspectionStatus
  summary_notes: string | null
  sites: { name: string } | null
  type: { label: string } | null
  template: { name: string } | null
  conducted_by: { first_name: string; last_name: string } | null
  overall_outcome: { label: string } | null
}

interface Finding {
  id: string
  description: string
  response: string | null
  response_text: string | null
  severity: { label: string }[] | null
  corrective_action: { id: string; title: string }[] | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusBadgeClass(status: InspectionStatus): string {
  switch (status) {
    case 'Draft':     return 'bg-slate-100 text-slate-700 ring-slate-200'
    case 'Submitted': return 'bg-orange-100 text-orange-700 ring-orange-200'
    case 'Closed':    return 'bg-green-100 text-green-700 ring-green-200'
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
      `id, title, inspection_date, status, summary_notes,
       sites(name),
       type:lookup_values!type_id(label),
       template:inspection_templates!template_id(name),
       conducted_by:users!inspected_by(first_name, last_name),
       overall_outcome:lookup_values!overall_outcome_id(label)`
    )
    .eq('id', id)
    .single()

  if (error || !insp) notFound()

  const inspection = insp as unknown as Inspection

  // Load findings if submitted or closed
  let findings: Finding[] = []
  if (inspection.status === 'Submitted' || inspection.status === 'Closed') {
    const { data: findingRows } = await supabase
      .from('inspection_findings')
      .select(
        `id, description, response, response_text, created_at,
         severity:lookup_values!severity_id(label),
         corrective_action:corrective_actions!ca_id(id, title)`
      )
      .eq('inspection_id', id)

    findings = (findingRows ?? []) as unknown as Finding[]
  }

  const canConduct = inspection.status === 'Draft'

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
            className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-orange-600 transition-colors whitespace-nowrap"
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
            <dt className="text-xs font-medium text-slate-500">Inspection Date</dt>
            <dd className="mt-0.5 text-sm text-slate-800">{formatDate(inspection.inspection_date)}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-500">Template</dt>
            <dd className="mt-0.5 text-sm text-slate-800">{inspection.template?.name ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-500">Conducted By</dt>
            <dd className="mt-0.5 text-sm text-slate-800">
              {(() => {
                const cb = (inspection.conducted_by as unknown as { first_name: string; last_name: string }[] | null)?.[0]
                return cb ? `${cb.first_name} ${cb.last_name}` : '—'
              })()}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-500">Overall Outcome</dt>
            <dd className="mt-0.5 text-sm text-slate-800">
              {(inspection.overall_outcome as unknown as { label: string }[] | null)?.[0]?.label ?? '—'}
            </dd>
          </div>
        </dl>
        {inspection.summary_notes && (
          <div className="mt-4 border-t border-slate-100 pt-4">
            <dt className="text-xs font-medium text-slate-500">Notes</dt>
            <dd className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{inspection.summary_notes}</dd>
          </div>
        )}
      </div>

      {/* Findings (submitted or closed only) */}
      {(inspection.status === 'Submitted' || inspection.status === 'Closed') && (
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
                      <td className="px-4 py-3 text-sm text-slate-800 max-w-xs">{f.description}</td>
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
                        {f.response_text ?? <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {(f.severity as unknown as { label: string }[] | null)?.[0]?.label ?? <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {(() => {
                          const ca = (f.corrective_action as unknown as { id: string; title: string }[] | null)?.[0]
                          return ca ? (
                            <Link
                              href={`/corrective-actions/${ca.id}`}
                              className="text-orange-600 hover:underline"
                            >
                              {ca.title}
                            </Link>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )
                        })()}
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
        <Link href="/inspections" className="text-sm text-orange-600 hover:underline">
          &larr; Back to Inspections
        </Link>
      </div>
    </div>
  )
}
