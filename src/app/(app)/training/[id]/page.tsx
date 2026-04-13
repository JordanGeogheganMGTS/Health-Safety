import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { formatDate, isOverdue, isDueWithin } from '@/lib/dates'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getAuthUser } from '@/lib/permissions'

function ExpiryBadge({ expiry }: { expiry: string | null }) {
  if (!expiry) return <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-slate-100 text-slate-500">No expiry</span>
  if (isOverdue(expiry)) return <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-red-100 text-red-700">Expired {formatDate(expiry)}</span>
  if (isDueWithin(expiry, 60)) return <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-amber-100 text-amber-700">Expires {formatDate(expiry)}</span>
  return <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-green-100 text-green-700">Valid to {formatDate(expiry)}</span>
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:gap-4 py-3 border-b border-slate-50 last:border-0">
      <dt className="min-w-[180px] text-sm font-medium text-slate-500">{label}</dt>
      <dd className="text-sm text-slate-800 mt-0.5 sm:mt-0">{value ?? <span className="text-slate-300">—</span>}</dd>
    </div>
  )
}

export default async function TrainingRecordDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: record } = await supabase
    .from('training_records')
    .select(`
      id,
      user_id,
      completion_date,
      expiry_date,
      provider,
      notes,
      certificate_file_path,
      certificate_file_name,
      created_at,
      user:users!training_records_user_id_fkey(first_name, last_name),
      training_type:training_types!training_records_training_type_id_fkey(name, validity_months, is_mandatory),
      recorded_by_user:users!training_records_recorded_by_fkey(first_name, last_name)
    `)
    .eq('id', id)
    .single()

  if (!record) notFound()

  const r = record as typeof record & {
    user_id: string
    user: { first_name: string; last_name: string } | null
    training_type: { name: string; validity_months: number | null; is_mandatory: boolean } | null
    recorded_by_user: { first_name: string; last_name: string } | null
  }

  const authUser = await getAuthUser()

  // Generate signed URL for uploaded certificate if one exists
  let certificateUrl: string | null = null
  if (r.certificate_file_path) {
    const { data } = await supabase.storage
      .from('health-safety-files')
      .createSignedUrl(r.certificate_file_path, 60 * 60)
    certificateUrl = data?.signedUrl ?? null
  }

  // For Skills Sign-Off records, find the linked skill competency for the generated certificate
  let skillCertHref: string | null = null
  if (r.training_type?.name === 'Skills Sign-Off') {
    const admin = createAdminClient()
    const { data: comp } = await admin
      .from('skill_competencies')
      .select('skill_id')
      .eq('training_record_id', id)
      .maybeSingle()
    if (comp?.skill_id) {
      skillCertHref = `/api/certificates/skill/${r.user_id}/${comp.skill_id}`
    }
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/training" className="hover:text-slate-700">Training</Link>
        <span>/</span>
        <span className="text-slate-800 font-medium">
          {r.user ? `${r.user.first_name} ${r.user.last_name}` : 'Record'} — {r.training_type?.name}
        </span>
      </div>

      {/* Header */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              {r.training_type?.name ?? 'Training Record'}
            </h1>
            <p className="mt-0.5 text-sm text-slate-500">
              {r.user ? `${r.user.first_name} ${r.user.last_name}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <ExpiryBadge expiry={r.expiry_date} />
            {r.training_type?.is_mandatory && (
              <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-red-100 text-red-700">Required</span>
            )}
            {authUser?.can('training', 'edit') && (
              <Link
                href={`/training/${id}/edit`}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Edit
              </Link>
            )}
          </div>
        </div>

        <dl className="px-6 py-2">
          <InfoRow label="Staff Member" value={r.user ? `${r.user.first_name} ${r.user.last_name}` : null} />
          <InfoRow label="Training Type" value={r.training_type?.name} />
          <InfoRow label="Completion Date" value={formatDate(r.completion_date)} />
          <InfoRow label="Expiry Date" value={r.expiry_date ? formatDate(r.expiry_date) : 'No expiry'} />
          {r.training_type?.validity_months && (
            <InfoRow label="Validity Period" value={`${r.training_type.validity_months} month${r.training_type.validity_months !== 1 ? 's' : ''}`} />
          )}
          <InfoRow label="Provider" value={r.provider} />
          {r.notes && <InfoRow label="Notes" value={<span className="whitespace-pre-wrap">{r.notes}</span>} />}
          <InfoRow
            label="Recorded By"
            value={r.recorded_by_user ? `${r.recorded_by_user.first_name} ${r.recorded_by_user.last_name} on ${formatDate(r.created_at)}` : formatDate(r.created_at)}
          />
        </dl>
      </div>

      {/* Certificate */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-800">Certificate</h2>
        </div>
        <div className="px-6 py-5">
          {certificateUrl ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-800">
                  {r.certificate_file_name ?? 'Certificate file'}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">Click to open in a new tab</p>
              </div>
              <a
                href={certificateUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 transition-colors"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download Certificate
              </a>
            </div>
          ) : skillCertHref ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-800">System-generated sign-off certificate</p>
                <p className="text-xs text-slate-400 mt-0.5">Generated on-demand by MGTS Sentinel — opens in a new tab</p>
              </div>
              <a
                href={skillCertHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 transition-colors"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                View Certificate
              </a>
            </div>
          ) : (
            <p className="text-sm text-slate-400 italic">No certificate uploaded for this record.</p>
          )}
        </div>
      </div>

      {/* Back link */}
      <div>
        <Link href="/training" className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
          Back to Training Records
        </Link>
      </div>
    </div>
  )
}
