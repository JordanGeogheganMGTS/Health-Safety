import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatDate, formatDateTime, isOverdue } from '@/lib/dates'
import { getAuthUser } from '@/lib/permissions'
import { AssignAcknowledgementButton } from '@/components/AssignAcknowledgementButton'

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    Draft: 'bg-slate-100 text-slate-700',
    Active: 'bg-green-100 text-green-700',
    'Under Review': 'bg-amber-100 text-amber-700',
    Superseded: 'bg-slate-200 text-slate-500',
    Archived: 'bg-slate-200 text-slate-500',
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status] ?? 'bg-slate-100 text-slate-600'}`}>
      {status}
    </span>
  )
}

function BoolRow({ label, value }: { label: string; value: boolean }) {
  return value ? (
    <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700 mr-1.5 mb-1.5">{label}</span>
  ) : null
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
      id, product_name, supplier, product_reference, cas_number,
      location_of_use, description_of_use, quantity_used, frequency_of_use,
      is_flammable, is_oxidising, is_toxic, is_corrosive, is_irritant,
      is_harmful, is_carcinogenic, is_sensitiser, other_hazards,
      exposure_inhalation, exposure_skin, exposure_ingestion, exposure_eyes,
      engineering_controls, ppe_required, storage_requirements, disposal_method,
      first_aid_measures, spillage_procedure, sds_url, sds_file_path, sds_file_name, sds_issue_date,
      status, version, assessment_date, review_due_date, approved_at, created_at,
      sites(name),
      assessor:users!coshh_assessments_assessed_by_fkey(first_name, last_name),
      approver:users!coshh_assessments_approved_by_fkey(first_name, last_name)
    `)
    .eq('id', params.id)
    .single()

  if (!ca) notFound()

  const authUser = await getAuthUser()
  const canEdit = authUser?.can('coshh_assessments', 'edit') ?? false
  const canAssign = authUser?.can('coshh_assessments', 'approve') ?? false

  const site = ca.sites as unknown as { name: string } | null
  const assessor = ca.assessor as unknown as { first_name: string; last_name: string } | null
  const approver = ca.approver as unknown as { first_name: string; last_name: string } | null
  const overdue = isOverdue(ca.review_due_date)

  let sdsUrl: string | null = null
  if (ca.sds_file_path) {
    sdsUrl = await getSdsUrl(ca.sds_file_path)
  }

  const approveAction = approveCoshh.bind(null, ca.id)

  const anyHazard = ca.is_flammable || ca.is_oxidising || ca.is_toxic || ca.is_corrosive ||
    ca.is_irritant || ca.is_harmful || ca.is_carcinogenic || ca.is_sensitiser
  const anyExposure = ca.exposure_inhalation || ca.exposure_skin || ca.exposure_ingestion || ca.exposure_eyes

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
            <Link href="/coshh" className="hover:text-orange-600 transition-colors">COSHH Assessments</Link>
            <span>/</span>
            <span>{ca.product_name}</span>
          </div>
          <h1 className="text-2xl font-semibold text-slate-900">{ca.product_name}</h1>
          <div className="flex items-center gap-3 mt-2">
            <StatusBadge status={ca.status} />
            {ca.version && <span className="text-xs text-slate-500">v{ca.version}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
          {canAssign && (
            <AssignAcknowledgementButton itemType="coshh" itemId={ca.id} itemTitle={ca.product_name} />
          )}
          <a
            href={`/api/coshh/${ca.id}/pdf`}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download PDF
          </a>
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
          {canEdit && (ca.status === 'Draft' || ca.status === 'Under Review') && (
            <form action={approveAction}>
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors shadow-sm"
              >
                Approve
              </button>
            </form>
          )}
          {canEdit && (
          <Link
            href={`/coshh/${ca.id}/edit`}
            className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-3 py-2 text-sm font-medium text-white hover:bg-orange-600 transition-colors shadow-sm"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit
          </Link>
          )}
        </div>
      </div>

      {/* Product Information */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm mb-6">
        <h2 className="text-sm font-semibold text-slate-700 border-b border-slate-100 pb-3 mb-4">Product Information</h2>
        <dl className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-4 text-sm">
          <div>
            <dt className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Site</dt>
            <dd className="text-slate-900">{site?.name ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Supplier</dt>
            <dd className="text-slate-900">{ca.supplier ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Product Reference</dt>
            <dd className="text-slate-900">{ca.product_reference ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">CAS Number</dt>
            <dd className="text-slate-900">{ca.cas_number ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Location of Use</dt>
            <dd className="text-slate-900">{ca.location_of_use ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Quantity Used</dt>
            <dd className="text-slate-900">{ca.quantity_used ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Frequency of Use</dt>
            <dd className="text-slate-900">{ca.frequency_of_use ?? '—'}</dd>
          </div>
          <div className="col-span-2 md:col-span-4">
            <dt className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Safety Data Sheet</dt>
            <dd>
              {ca.sds_url ? (
                <a
                  href={ca.sds_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-orange-600 hover:text-orange-700 underline underline-offset-2 break-all"
                >
                  <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  {ca.sds_url}
                </a>
              ) : <span className="text-sm text-slate-400">—</span>}
            </dd>
          </div>
        </dl>
        {ca.description_of_use && (
          <div className="mt-4">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Description of Use</p>
            <p className="text-sm text-slate-900 whitespace-pre-wrap">{ca.description_of_use}</p>
          </div>
        )}
      </div>

      {/* Hazard Information */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm mb-6">
        <h2 className="text-sm font-semibold text-slate-700 border-b border-slate-100 pb-3 mb-4">Hazard Information</h2>
        <div className="space-y-3">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Hazard Classifications</p>
            {anyHazard ? (
              <div className="flex flex-wrap">
                <BoolRow label="Flammable" value={ca.is_flammable} />
                <BoolRow label="Oxidising" value={ca.is_oxidising} />
                <BoolRow label="Toxic" value={ca.is_toxic} />
                <BoolRow label="Corrosive" value={ca.is_corrosive} />
                <BoolRow label="Irritant" value={ca.is_irritant} />
                <BoolRow label="Harmful" value={ca.is_harmful} />
                <BoolRow label="Carcinogenic" value={ca.is_carcinogenic} />
                <BoolRow label="Sensitiser" value={ca.is_sensitiser} />
              </div>
            ) : (
              <p className="text-sm text-slate-400">None specified</p>
            )}
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Exposure Routes</p>
            {anyExposure ? (
              <div className="flex flex-wrap">
                <BoolRow label="Inhalation" value={ca.exposure_inhalation} />
                <BoolRow label="Skin Contact" value={ca.exposure_skin} />
                <BoolRow label="Ingestion" value={ca.exposure_ingestion} />
                <BoolRow label="Eyes" value={ca.exposure_eyes} />
              </div>
            ) : (
              <p className="text-sm text-slate-400">None specified</p>
            )}
          </div>
          {ca.other_hazards && (
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Other Hazards</p>
              <p className="text-sm text-slate-900 whitespace-pre-wrap">{ca.other_hazards}</p>
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm mb-6">
        <h2 className="text-sm font-semibold text-slate-700 border-b border-slate-100 pb-3 mb-4">Controls</h2>
        <div className="space-y-4 text-sm">
          {ca.engineering_controls && (
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Engineering Controls</p>
              <p className="text-slate-900 whitespace-pre-wrap">{ca.engineering_controls}</p>
            </div>
          )}
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
      {(ca.first_aid_measures || ca.spillage_procedure) && (
        <div className="rounded-xl border border-red-100 bg-red-50 p-6 shadow-sm mb-6">
          <h2 className="text-sm font-semibold text-red-700 border-b border-red-100 pb-3 mb-4">Emergency Information</h2>
          <div className="space-y-4 text-sm">
            {ca.first_aid_measures && (
              <div>
                <p className="text-xs font-medium text-red-600 uppercase tracking-wider mb-1">First Aid Measures</p>
                <p className="text-slate-900 whitespace-pre-wrap">{ca.first_aid_measures}</p>
              </div>
            )}
            {ca.spillage_procedure && (
              <div>
                <p className="text-xs font-medium text-red-600 uppercase tracking-wider mb-1">Spillage Procedure</p>
                <p className="text-slate-900 whitespace-pre-wrap">{ca.spillage_procedure}</p>
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
            <dt className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Assessed By</dt>
            <dd className="text-slate-900">{assessor ? `${assessor.first_name} ${assessor.last_name}` : '—'}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Assessment Date</dt>
            <dd className="text-slate-900">{formatDate(ca.assessment_date)}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Review Due</dt>
            <dd className={overdue ? 'text-red-600 font-medium' : 'text-slate-900'}>
              {formatDate(ca.review_due_date)}{overdue && ' (Overdue)'}
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
