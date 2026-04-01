import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatDate, formatDateTime, isOverdue } from '@/lib/dates'

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    Draft: 'bg-slate-100 text-slate-700',
    Active: 'bg-green-100 text-green-700',
    'Under Review': 'bg-amber-100 text-amber-700',
    Superseded: 'bg-slate-200 text-slate-500',
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status] ?? 'bg-slate-100 text-slate-600'}`}>
      {status}
    </span>
  )
}

function RiskBadge({ rating }: { rating: string | null }) {
  if (!rating) return <span className="text-slate-400">—</span>
  const styles: Record<string, string> = {
    Low: 'bg-green-100 text-green-700',
    Medium: 'bg-amber-100 text-amber-700',
    High: 'bg-orange-100 text-orange-700',
    'Very High': 'bg-red-100 text-red-700',
  }
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${styles[rating] ?? 'bg-slate-100 text-slate-600'}`}>
      {rating}
    </span>
  )
}

async function approveCoshh(id: string) {
  'use server'
  const { createClient: createServerClient } = await import('@/lib/supabase/server')
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase
    .from('coshh_assessments')
    .update({ status: 'Active', approved_by: user.id, approved_at: new Date().toISOString() })
    .eq('id', id)
  const { revalidatePath } = await import('next/cache')
  revalidatePath(`/coshh/${id}`)
}

async function getSdsUrl(storageKey: string): Promise<string | null> {
  'use server'
  const { createClient: createServerClient } = await import('@/lib/supabase/server')
  const supabase = await createServerClient()
  const { data } = await supabase.storage
    .from('health-safety-files')
    .createSignedUrl(storageKey, 60 * 60)
  return data?.signedUrl ?? null
}

export default async function CoshhDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()

  const { data: ca } = await supabase
    .from('coshh_assessments')
    .select(`
      id, substance_name, location_used, supplier, sds_reference, sds_storage_key,
      hazard_classification, persons_at_risk, exposure_route, existing_controls,
      ppe_required, storage_requirements, disposal_method, first_aid_measures,
      emergency_procedures, risk_rating, assessment_date, review_date,
      status, approved_at, created_at,
      sites(name),
      assessor:users!coshh_assessments_assessor_id_fkey(first_name, last_name),
      approver:users!coshh_assessments_approved_by_fkey(first_name, last_name)
    `)
    .eq('id', params.id)
    .single()

  if (!ca) notFound()

  const site = ca.sites as unknown as { name: string } | null
  const assessor = ca.assessor as unknown as { first_name: string; last_name: string } | null
  const approver = ca.approver as unknown as { first_name: string; last_name: string } | null
  const overdue = isOverdue(ca.review_date)

  let sdsUrl: string | null = null
  if (ca.sds_storage_key) {
    sdsUrl = await getSdsUrl(ca.sds_storage_key)
  }

  const approveAction = approveCoshh.bind(null, ca.id)

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
            <Link href="/coshh" className="hover:text-orange-600 transition-colors">COSHH Assessments</Link>
            <span>/</span>
            <span>{ca.substance_name}</span>
          </div>
          <h1 className="text-2xl font-semibold text-slate-900">{ca.substance_name}</h1>
          <div className="flex items-center gap-3 mt-2">
            <RiskBadge rating={ca.risk_rating} />
            <StatusBadge status={ca.status} />
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {sdsUrl && (
            <a
              href={sdsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download SDS
            </a>
          )}
          {(ca.status === 'Draft' || ca.status === 'Under Review') && (
            <form action={approveAction}>
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors shadow-sm"
              >
                Approve
              </button>
            </form>
          )}
          <Link
            href={`/coshh/${ca.id}/edit`}
            className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-3 py-2 text-sm font-medium text-white hover:bg-orange-600 transition-colors shadow-sm"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit
          </Link>
        </div>
      </div>

      {/* Substance Information */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm mb-6">
        <h2 className="text-sm font-semibold text-slate-700 border-b border-slate-100 pb-3 mb-4">Substance Information</h2>
        <dl className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-4 text-sm">
          <div>
            <dt className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Site</dt>
            <dd className="text-slate-900">{site?.name ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Location Used</dt>
            <dd className="text-slate-900">{ca.location_used ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Supplier</dt>
            <dd className="text-slate-900">{ca.supplier ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">SDS Reference</dt>
            <dd className="text-slate-900">{ca.sds_reference ?? '—'}</dd>
          </div>
        </dl>
      </div>

      {/* Hazard Information */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm mb-6">
        <h2 className="text-sm font-semibold text-slate-700 border-b border-slate-100 pb-3 mb-4">Hazard Information</h2>
        <dl className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4 text-sm">
          <div>
            <dt className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Classification</dt>
            <dd className="text-slate-900">{ca.hazard_classification ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Persons at Risk</dt>
            <dd className="text-slate-900">{ca.persons_at_risk}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Exposure Route</dt>
            <dd className="text-slate-900">{ca.exposure_route ?? '—'}</dd>
          </div>
        </dl>
      </div>

      {/* Controls */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm mb-6">
        <h2 className="text-sm font-semibold text-slate-700 border-b border-slate-100 pb-3 mb-4">Controls</h2>
        <div className="space-y-4 text-sm">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Existing Controls</p>
            <p className="text-slate-900 whitespace-pre-wrap">{ca.existing_controls}</p>
          </div>
          {ca.ppe_required && (
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">PPE Required</p>
              <p className="text-slate-900 whitespace-pre-wrap">{ca.ppe_required}</p>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ca.storage_requirements && (
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Storage Requirements</p>
                <p className="text-slate-900 whitespace-pre-wrap">{ca.storage_requirements}</p>
              </div>
            )}
            {ca.disposal_method && (
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Disposal Method</p>
                <p className="text-slate-900 whitespace-pre-wrap">{ca.disposal_method}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Emergency Information */}
      {(ca.first_aid_measures || ca.emergency_procedures) && (
        <div className="rounded-xl border border-red-100 bg-red-50 p-6 shadow-sm mb-6">
          <h2 className="text-sm font-semibold text-red-700 border-b border-red-100 pb-3 mb-4">Emergency Information</h2>
          <div className="space-y-4 text-sm">
            {ca.first_aid_measures && (
              <div>
                <p className="text-xs font-medium text-red-600 uppercase tracking-wider mb-1">First Aid Measures</p>
                <p className="text-slate-900 whitespace-pre-wrap">{ca.first_aid_measures}</p>
              </div>
            )}
            {ca.emergency_procedures && (
              <div>
                <p className="text-xs font-medium text-red-600 uppercase tracking-wider mb-1">Emergency Procedures</p>
                <p className="text-slate-900 whitespace-pre-wrap">{ca.emergency_procedures}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Assessment Details */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-700 border-b border-slate-100 pb-3 mb-4">Assessment Details</h2>
        <dl className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-4 text-sm">
          <div>
            <dt className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Assessor</dt>
            <dd className="text-slate-900">{assessor ? `${assessor.first_name} ${assessor.last_name}` : '—'}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Assessment Date</dt>
            <dd className="text-slate-900">{formatDate(ca.assessment_date)}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Review Date</dt>
            <dd className={overdue ? 'text-red-600 font-medium' : 'text-slate-900'}>
              {formatDate(ca.review_date)}{overdue && ' (Overdue)'}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Approved By</dt>
            <dd className="text-slate-900">{approver ? `${approver.first_name} ${approver.last_name}` : '—'}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Approved At</dt>
            <dd className="text-slate-900">{formatDateTime(ca.approved_at)}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Created</dt>
            <dd className="text-slate-900">{formatDate(ca.created_at)}</dd>
          </div>
        </dl>
      </div>
    </div>
  )
}
