import { createClient } from '@/lib/supabase/server'
import { formatDate } from '@/lib/dates'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import ContractorApprovalButton from './ApprovalButton'
import UploadDocumentForm from './UploadDocumentForm'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ContractorDocument {
  id: string
  title: string
  expiry_date: string | null
  created_at: string
  file_path: string | null
  signedUrl: string | null
  lookup_values: { label: string; key?: string } | null
  uploader: { first_name: string; last_name: string } | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function expiryStatus(date: string | null): 'expired' | 'expiring' | 'valid' | 'none' {
  if (!date) return 'none'
  const d = new Date(date)
  const now = new Date()
  const in60 = new Date()
  in60.setDate(now.getDate() + 60)
  if (d < now) return 'expired'
  if (d <= in60) return 'expiring'
  return 'valid'
}

function ExpiryBadge({ date }: { date: string | null }) {
  const status = expiryStatus(date)
  if (status === 'none') return <span className="text-slate-400 text-sm">No expiry</span>
  const cls = {
    expired: 'bg-red-100 text-red-700 font-semibold',
    expiring: 'bg-amber-100 text-amber-700 font-semibold',
    valid: 'bg-green-100 text-green-700',
  }[status]
  const label = status === 'expired' ? `Expired ${formatDate(date)}` : formatDate(date)
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs ${cls}`}>
      {label}
    </span>
  )
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:gap-4">
      <dt className="min-w-[180px] text-sm font-medium text-slate-500">{label}</dt>
      <dd className="text-sm text-slate-800">{value ?? <span className="text-slate-300">—</span>}</dd>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ContractorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: contractor }, { data: documents }, { data: docTypes }] = await Promise.all([
    supabase
      .from('contractors')
      .select(`
        id, name, contact_name, contact_email, contact_phone, address, postcode,
        is_approved, is_active,
        approved_at, notes,
        lookup_values(label),
        approved_by_user:users!contractors_approved_by_fkey(first_name, last_name)
      `)
      .eq('id', id)
      .single(),
    supabase
      .from('contractor_documents')
      .select(`
        id, title, expiry_date, created_at, file_path,
        lookup_values(label),
        uploader:users!contractor_documents_uploaded_by_fkey(first_name, last_name)
      `)
      .eq('contractor_id', id)
      .order('created_at', { ascending: false }),
    supabase
      .from('lookup_values')
      .select('id, label, sort_order, lookup_categories!inner(key)')
      .eq('lookup_categories.key', 'contractor_doc_type')
      .eq('is_active', true)
      .order('sort_order'),
  ])

  if (!contractor) notFound()

  const c = contractor as typeof contractor & {
    lookup_values: { label: string } | null
    approved_by_user: { first_name: string; last_name: string } | null
  }

  // Generate signed URLs for each document that has a file
  const rawDocs = (documents ?? []) as unknown as Omit<ContractorDocument, 'signedUrl'>[]
  const docs: ContractorDocument[] = await Promise.all(
    rawDocs.map(async (doc) => {
      if (!doc.file_path) return { ...doc, signedUrl: null }
      const { data } = await supabase.storage
        .from('health-safety-files')
        .createSignedUrl(doc.file_path, 60 * 60)
      return { ...doc, signedUrl: data?.signedUrl ?? null }
    })
  )

  // Insurance overview: find PL and EL docs (most recent each)
  const plDoc = docs.find((d) => (d.lookup_values as { label: string; key?: string } | null)?.label === 'Public Liability Insurance')
  const elDoc = docs.find((d) => (d.lookup_values as { label: string; key?: string } | null)?.label === 'Employers Liability Insurance')

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/contractors" className="hover:text-slate-700">Contractors</Link>
        <span>/</span>
        <span className="text-slate-800 font-medium">{c.name}</span>
      </div>

      {/* Header card */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
          <div className="flex items-center gap-3 flex-wrap">
            <div>
              <h1 className="text-xl font-bold text-slate-900">{c.name}</h1>
              {c.lookup_values?.label && (
                <p className="mt-0.5 text-sm text-slate-500">{c.lookup_values.label}</p>
              )}
            </div>
            {c.is_approved ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-700">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 00-1.414 0L8 12.586 4.707 9.293a1 1 0 00-1.414 1.414l4 4a1 1 0 001.414 0l8-8a1 1 0 000-1.414z" clipRule="evenodd" />
                </svg>
                Approved
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-sm font-semibold text-red-700">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                Not Approved
              </span>
            )}
            <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${c.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
              {c.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <ContractorApprovalButton
              contractorId={c.id}
              isApproved={c.is_approved}
              userId={user?.id ?? ''}
            />
            <Link
              href={`/contractors/${c.id}/edit`}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Edit
            </Link>
          </div>
        </div>

        {/* Details */}
        <div className="px-6 py-5 space-y-3">
          <dl className="space-y-3">
            <InfoRow label="Contact Name" value={c.contact_name} />
            <InfoRow label="Email" value={c.contact_email ? (
              <a href={`mailto:${c.contact_email}`} className="text-orange-600 hover:underline">{c.contact_email}</a>
            ) : null} />
            <InfoRow label="Phone" value={c.contact_phone} />
            <InfoRow label="Address" value={[c.address, c.postcode].filter(Boolean).join(', ') || null} />
            {c.is_approved && (
              <InfoRow
                label="Approved By"
                value={
                  c.approved_by_user
                    ? `${c.approved_by_user.first_name} ${c.approved_by_user.last_name} on ${formatDate(c.approved_at)}`
                    : formatDate(c.approved_at)
                }
              />
            )}
            {c.notes && <InfoRow label="Notes" value={<span className="whitespace-pre-wrap">{c.notes}</span>} />}
          </dl>
        </div>
      </div>

      {/* Insurance Overview */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-800">Insurance</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
          {/* Public Liability */}
          <div className="px-6 py-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Public Liability Insurance</p>
            {plDoc ? (
              <div className="space-y-1">
                <ExpiryBadge date={plDoc.expiry_date} />
                <p className="text-sm text-slate-700 mt-1">{plDoc.title}</p>
                {plDoc.signedUrl && (
                  <a href={plDoc.signedUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-orange-600 hover:underline mt-1">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                    View certificate
                  </a>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-400 italic">No certificate uploaded</p>
            )}
          </div>
          {/* Employers Liability */}
          <div className="px-6 py-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Employers Liability Insurance</p>
            {elDoc ? (
              <div className="space-y-1">
                <ExpiryBadge date={elDoc.expiry_date} />
                <p className="text-sm text-slate-700 mt-1">{elDoc.title}</p>
                {elDoc.signedUrl && (
                  <a href={elDoc.signedUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-orange-600 hover:underline mt-1">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                    View certificate
                  </a>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-400 italic">No certificate uploaded</p>
            )}
          </div>
        </div>
      </div>

      {/* Documents Section */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-800">Documents &amp; Certificates</h2>
          <span className="text-xs text-slate-400">{docs.length} document{docs.length !== 1 ? 's' : ''}</span>
        </div>

        {docs.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <p className="text-sm text-slate-400">No documents uploaded yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-50">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Title</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Expiry</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Uploaded</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {docs.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm text-slate-600">{doc.lookup_values?.label ?? '—'}</td>
                    <td className="px-4 py-3 text-sm font-medium text-slate-800">{doc.title}</td>
                    <td className="px-4 py-3 text-sm">
                      <ExpiryBadge date={doc.expiry_date} />
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500">
                      {doc.uploader ? `${doc.uploader.first_name} ${doc.uploader.last_name}` : '—'}
                      <span className="ml-1 text-xs text-slate-400">{formatDate(doc.created_at)}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {doc.signedUrl ? (
                        <a
                          href={doc.signedUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-medium text-orange-600 hover:underline"
                        >
                          View ↗
                        </a>
                      ) : (
                        <span className="text-xs text-slate-300">No file</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Upload form */}
        <div className="border-t border-slate-100 px-6 py-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Upload Document</h3>
          <UploadDocumentForm
            contractorId={c.id}
            userId={user?.id ?? ''}
            docTypes={(docTypes ?? []) as unknown as Array<{ id: string; label: string }>}
          />
        </div>
      </div>
    </div>
  )
}
