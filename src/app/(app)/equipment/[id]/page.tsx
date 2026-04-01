import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { formatDate, formatDateTime } from '@/lib/dates'

// ─── Types ────────────────────────────────────────────────────────────────────

type EquipmentStatus = 'Operational' | 'Out of Service' | 'Awaiting Service' | 'Decommissioned'
type ServiceOutcome = 'Pass' | 'Fail' | 'Advisory'

interface EquipmentDetail {
  id: string
  name: string
  description: string | null
  location: string | null
  serial_number: string | null
  asset_tag: string | null
  manufacturer: string | null
  model: string | null
  purchase_date: string | null
  service_interval_months: number
  last_service_date: string | null
  next_service_due: string
  status: EquipmentStatus
  notes: string | null
  created_at: string
  sites: { name: string } | null
  responsible: { first_name: string; last_name: string } | null
}

interface ServiceRecord {
  id: string
  service_date: string
  service_type: string
  engineer_name: string | null
  company: string | null
  outcome: ServiceOutcome
  notes: string | null
  next_service_due: string | null
  recorded_at: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusBadgeClass(status: EquipmentStatus): string {
  switch (status) {
    case 'Operational': return 'bg-green-100 text-green-700 ring-green-200'
    case 'Out of Service': return 'bg-red-100 text-red-700 ring-red-200'
    case 'Awaiting Service': return 'bg-amber-100 text-amber-700 ring-amber-200'
    case 'Decommissioned': return 'bg-slate-100 text-slate-600 ring-slate-200'
  }
}

function outcomeBadgeClass(outcome: ServiceOutcome): string {
  switch (outcome) {
    case 'Pass': return 'bg-green-100 text-green-700 ring-green-200'
    case 'Fail': return 'bg-red-100 text-red-700 ring-red-200'
    case 'Advisory': return 'bg-amber-100 text-amber-700 ring-amber-200'
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EquipmentDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: eqData, error: eqError } = await supabase
    .from('equipment')
    .select(
      `id, name, description, location, serial_number, asset_tag, manufacturer, model,
       purchase_date, service_interval_months, last_service_date, next_service_due,
       status, notes, created_at,
       sites(name),
       responsible:responsible_person_id(first_name, last_name)`
    )
    .eq('id', id)
    .single()

  if (eqError || !eqData) notFound()

  const eq = eqData as unknown as EquipmentDetail

  const { data: serviceRows } = await supabase
    .from('equipment_service_records')
    .select('id, service_date, service_type, engineer_name, company, outcome, notes, next_service_due, recorded_at')
    .eq('equipment_id', id)
    .order('service_date', { ascending: false })

  const records = (serviceRows ?? []) as unknown as ServiceRecord[]

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/equipment" className="hover:text-slate-700 hover:underline">Equipment Register</Link>
        <span>/</span>
        <span className="font-medium text-slate-800 truncate max-w-xs">{eq.name}</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-slate-900">{eq.name}</h1>
          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${statusBadgeClass(eq.status)}`}>
            {eq.status}
          </span>
        </div>
        <div className="flex shrink-0 gap-2">
          <Link
            href={`/equipment/${eq.id}/edit`}
            className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
          >
            Edit
          </Link>
        </div>
      </div>

      {/* Detail card */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left — main fields */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-semibold text-slate-700">Equipment Details</h2>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-sm">
              <div>
                <dt className="text-xs font-medium text-slate-500">Site</dt>
                <dd className="mt-0.5 text-slate-800">{eq.sites?.[0]?.name ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-500">Location</dt>
                <dd className="mt-0.5 text-slate-800">{eq.location ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-500">Manufacturer</dt>
                <dd className="mt-0.5 text-slate-800">{eq.manufacturer ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-500">Model</dt>
                <dd className="mt-0.5 text-slate-800">{eq.model ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-500">Serial Number</dt>
                <dd className="mt-0.5 text-slate-800">{eq.serial_number ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-500">Asset Tag</dt>
                <dd className="mt-0.5 text-slate-800">{eq.asset_tag ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-500">Purchase Date</dt>
                <dd className="mt-0.5 text-slate-800">{formatDate(eq.purchase_date)}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-500">Responsible Person</dt>
                <dd className="mt-0.5 text-slate-800">
                  {eq.responsible ? `${eq.responsible.first_name} ${eq.responsible.last_name}` : '—'}
                </dd>
              </div>
            </dl>

            {eq.description && (
              <div>
                <dt className="text-xs font-medium text-slate-500">Description</dt>
                <dd className="mt-0.5 text-sm text-slate-700 whitespace-pre-wrap">{eq.description}</dd>
              </div>
            )}

            {eq.notes && (
              <div>
                <dt className="text-xs font-medium text-slate-500">Notes</dt>
                <dd className="mt-0.5 text-sm text-slate-700 whitespace-pre-wrap">{eq.notes}</dd>
              </div>
            )}
          </div>
        </div>

        {/* Right — service summary */}
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
            <h2 className="text-sm font-semibold text-slate-700">Service Summary</h2>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-xs font-medium text-slate-500">Service Interval</dt>
                <dd className="mt-0.5 text-slate-800">{eq.service_interval_months} month{eq.service_interval_months !== 1 ? 's' : ''}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-500">Last Service Date</dt>
                <dd className="mt-0.5 text-slate-800">{formatDate(eq.last_service_date)}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-500">Next Service Due</dt>
                <dd className="mt-0.5 text-slate-800">{formatDate(eq.next_service_due)}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-500">Added</dt>
                <dd className="mt-0.5 text-slate-800">{formatDateTime(eq.created_at)}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      {/* Service Records */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Service Records</h2>
          <Link
            href={`/equipment/${eq.id}/service/new`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-orange-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-orange-600 transition-colors"
          >
            <span aria-hidden="true">+</span> Log Service Record
          </Link>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {records.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-sm font-medium text-slate-500">No service records yet.</p>
              <p className="mt-1 text-xs text-slate-400">
                <Link href={`/equipment/${eq.id}/service/new`} className="text-orange-600 hover:underline">
                  Log the first service record
                </Link>
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Engineer</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Company</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Outcome</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Notes</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Next Due</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {records.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-sm text-slate-700">{formatDate(r.service_date)}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{r.service_type}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{r.engineer_name ?? '—'}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{r.company ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${outcomeBadgeClass(r.outcome)}`}>
                          {r.outcome}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 max-w-xs truncate">{r.notes ?? '—'}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{formatDate(r.next_service_due)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
