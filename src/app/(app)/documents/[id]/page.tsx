import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatDate } from '@/lib/dates'

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    Draft: 'bg-slate-100 text-slate-700',
    Current: 'bg-green-100 text-green-700',
    'Under Review': 'bg-amber-100 text-amber-700',
    Superseded: 'bg-orange-100 text-orange-700',
    Expired: 'bg-red-100 text-red-700',
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status] ?? 'bg-slate-100 text-slate-600'}`}>
      {status}
    </span>
  )
}

async function getDownloadUrl(storageKey: string): Promise<string | null> {
  'use server'
  const supabase = await createClient()
  const { data } = await supabase.storage
    .from('health-safety-files')
    .createSignedUrl(storageKey, 60 * 60) // 1 hour
  return data?.signedUrl ?? null
}

export default async function DocumentDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()

  const { data: doc } = await supabase
    .from('documents')
    .select(`
      id,
      title,
      version,
      status,
      review_due_date,
      file_path,
      approved_at,
      created_at,
      updated_at,
      sites(name),
      owner:users!documents_owner_id_fkey(first_name, last_name),
      approver:users!documents_approved_by_fkey(first_name, last_name),
      category:lookup_values!documents_category_id_fkey(label)
    `)
    .eq('id', params.id)
    .single()

  if (!doc) notFound()

  const owner = doc.owner as unknown as { first_name: string; last_name: string } | null
  const approver = doc.approver as unknown as { first_name: string; last_name: string } | null
  const site = doc.sites as unknown as { name: string } | null
  const category = doc.category as unknown as { label: string } | null

  let downloadUrl: string | null = null
  if (doc.file_path) {
    downloadUrl = await getDownloadUrl(doc.file_path)
  }

  const fields = [
    { label: 'Title', value: doc.title },
    { label: 'Category', value: category?.label ?? '—' },
    { label: 'Site', value: site?.name ?? '—' },
    { label: 'Version', value: doc.version ?? '—' },
    { label: 'Status', value: <StatusBadge status={doc.status} /> },
    { label: 'Document Owner', value: owner ? `${owner.first_name} ${owner.last_name}` : '—' },
    { label: 'Review Date', value: formatDate(doc.review_due_date) },
    { label: 'Approved By', value: approver ? `${approver.first_name} ${approver.last_name}` : '—' },
    { label: 'Approved At', value: formatDate(doc.approved_at) },
    { label: 'Created', value: formatDate(doc.created_at) },
    { label: 'Last Updated', value: formatDate(doc.updated_at) },
  ]

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
            <Link href="/documents" className="hover:text-orange-600 transition-colors">Document Library</Link>
            <span>/</span>
            <span>{doc.title}</span>
          </div>
          <h1 className="text-2xl font-semibold text-slate-900">{doc.title}</h1>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {downloadUrl && (
            <a
              href={downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download
            </a>
          )}
          <Link
            href={`/documents/${doc.id}/edit`}
            className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-3 py-2 text-sm font-medium text-white hover:bg-orange-600 transition-colors shadow-sm"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit
          </Link>
        </div>
      </div>

      {/* Details card */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-700">Document Details</h2>
        </div>
        <dl className="divide-y divide-slate-100">
          {fields.map(({ label, value }) => (
            <div key={label} className="grid grid-cols-3 px-6 py-3 gap-4">
              <dt className="text-sm font-medium text-slate-500">{label}</dt>
              <dd className="col-span-2 text-sm text-slate-900">{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Storage key info */}
      {doc.file_path && (
        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-xs text-slate-500">
            <span className="font-medium">Storage key:</span> {doc.file_path}
          </p>
        </div>
      )}
    </div>
  )
}
