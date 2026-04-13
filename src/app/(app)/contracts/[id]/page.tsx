import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { formatDate } from '@/lib/dates'
import { deleteContract } from '../actions'
import { computeContractStatus, type ContractStatus } from '../utils'
import { getAuthUser } from '@/lib/permissions'

function StatusBadge({ status }: { status: ContractStatus }) {
  const styles: Record<ContractStatus, string> = {
    'Active':        'bg-green-100 text-green-700',
    'Expiring Soon': 'bg-amber-100 text-amber-700',
    'Expired':       'bg-red-100 text-red-700',
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status]}`}>
      {status}
    </span>
  )
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:gap-4 py-3 border-b border-slate-50 last:border-0">
      <dt className="min-w-[180px] text-sm font-medium text-slate-500">{label}</dt>
      <dd className="text-sm text-slate-800 mt-0.5 sm:mt-0">{value ?? <span className="text-slate-300">—</span>}</dd>
    </div>
  )
}

export default async function ContractDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const authUser = await getAuthUser()
  if (!authUser?.can('contracts', 'view')) redirect('/dashboard')

  const canEdit = authUser.can('contracts', 'edit')
  const canDelete = authUser.can('contracts', 'delete')

  const admin = createAdminClient()
  const { data: row } = await admin
    .from('contracts')
    .select(`
      id, name, supplier, signed_date, renewal_date, contract_value,
      notice_period_days, notes, file_path, file_name, created_at, updated_at,
      owner:users!contracts_owner_id_fkey(first_name, last_name),
      created_by_user:users!contracts_created_by_fkey(first_name, last_name),
      updated_by_user:users!contracts_updated_by_fkey(first_name, last_name)
    `)
    .eq('id', id)
    .single()

  if (!row) notFound()

  type ContractRow = {
    id: string
    name: string
    supplier: string | null
    signed_date: string | null
    renewal_date: string | null
    contract_value: number | null
    notice_period_days: number
    notes: string | null
    file_path: string | null
    file_name: string | null
    created_at: string
    updated_at: string
    owner: { first_name: string; last_name: string } | null
    created_by_user: { first_name: string; last_name: string } | null
    updated_by_user: { first_name: string; last_name: string } | null
  }

  const c = row as unknown as ContractRow
  const status = computeContractStatus(c.renewal_date, c.notice_period_days)

  // Generate signed URL for contract document
  let fileUrl: string | null = null
  if (c.file_path) {
    const { data } = await admin.storage
      .from('health-safety-files')
      .createSignedUrl(c.file_path, 60 * 60)
    fileUrl = data?.signedUrl ?? null
  }

  const deleteWithId = deleteContract.bind(null, id)

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/contracts" className="hover:text-slate-700">Contracts</Link>
        <span>/</span>
        <span className="text-slate-800 font-medium">{c.name}</span>
      </div>

      {/* Header */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <h1 className="text-xl font-bold text-slate-900">{c.name}</h1>
            {c.supplier && <p className="mt-0.5 text-sm text-slate-500">{c.supplier}</p>}
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
            <StatusBadge status={status} />
            {canEdit && (
              <Link
                href={`/contracts/${id}/edit`}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Edit
              </Link>
            )}
            {canDelete && (
              <form action={deleteWithId}>
                <button
                  type="submit"
                  onClick={(e) => {
                    if (!confirm(`Delete "${c.name}"? This cannot be undone.`)) e.preventDefault()
                  }}
                  className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                >
                  Delete
                </button>
              </form>
            )}
          </div>
        </div>

        <dl className="px-6 py-2">
          <InfoRow label="Contract Name" value={c.name} />
          <InfoRow label="Supplier / Provider" value={c.supplier} />
          <InfoRow
            label="Contract Owner"
            value={c.owner ? `${c.owner.first_name} ${c.owner.last_name}` : null}
          />
          <InfoRow label="Signed Date" value={c.signed_date ? formatDate(c.signed_date) : null} />
          <InfoRow label="Renewal Date" value={c.renewal_date ? formatDate(c.renewal_date) : null} />
          <InfoRow
            label="Contract Value"
            value={c.contract_value !== null
              ? new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(c.contract_value)
              : null}
          />
          <InfoRow label="Notice Period" value={`${c.notice_period_days} days`} />
          <InfoRow label="Status" value={<StatusBadge status={status} />} />
          {c.notes && (
            <InfoRow label="Notes" value={<span className="whitespace-pre-wrap">{c.notes}</span>} />
          )}
          <InfoRow
            label="Last Updated"
            value={
              c.updated_by_user
                ? `${c.updated_by_user.first_name} ${c.updated_by_user.last_name} on ${formatDate(c.updated_at)}`
                : formatDate(c.updated_at)
            }
          />
        </dl>
      </div>

      {/* Contract Document */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-800">Contract Document</h2>
        </div>
        <div className="px-6 py-5">
          {fileUrl ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-800">{c.file_name ?? 'Contract file'}</p>
                <p className="text-xs text-slate-400 mt-0.5">Click to open in a new tab</p>
              </div>
              <a
                href={fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 transition-colors"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Open Document
              </a>
            </div>
          ) : (
            <p className="text-sm text-slate-400 italic">No document uploaded for this contract.</p>
          )}
        </div>
      </div>

      <div>
        <Link href="/contracts" className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
          Back to Contracts
        </Link>
      </div>
    </div>
  )
}
