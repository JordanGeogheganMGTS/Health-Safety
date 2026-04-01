import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatDate, isOverdue } from '@/lib/dates'

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

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: { status?: string }
}) {
  const supabase = await createClient()

  let query = supabase
    .from('documents')
    .select(`
      id,
      title,
      version,
      status,
      review_date,
      storage_key,
      sites(name),
      owner:users!documents_owner_id_fkey(first_name, last_name),
      category:lookup_values!documents_category_id_fkey(label)
    `)
    .order('created_at', { ascending: false })

  if (searchParams.status) {
    query = query.eq('status', searchParams.status)
  }

  const { data: documents } = await query

  const statuses = ['Draft', 'Current', 'Under Review', 'Superseded', 'Expired']

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Document Library</h1>
          <p className="text-sm text-slate-500 mt-1">Manage and track all health &amp; safety documents</p>
        </div>
        <Link
          href="/documents/new"
          className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Upload Document
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <Link
          href="/documents"
          className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${!searchParams.status ? 'bg-orange-500 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
        >
          All
        </Link>
        {statuses.map((s) => (
          <Link
            key={s}
            href={`/documents?status=${encodeURIComponent(s)}`}
            className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${searchParams.status === s ? 'bg-orange-500 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
          >
            {s}
          </Link>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        {!documents || documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <svg className="h-12 w-12 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-base font-medium">No documents found</p>
            <p className="text-sm mt-1">
              {searchParams.status ? `No documents with status "${searchParams.status}"` : 'Upload your first document to get started'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Title</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Category</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Site</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Version</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Owner</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Review Date</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {documents.map((doc) => {
                  const owner = doc.owner as unknown as { first_name: string; last_name: string } | null
                  const site = doc.sites as unknown as { name: string } | null
                  const category = doc.category as unknown as { label: string } | null
                  const overdue = isOverdue(doc.review_date)

                  return (
                    <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <Link href={`/documents/${doc.id}`} className="font-medium text-slate-900 hover:text-orange-600 transition-colors">
                          {doc.title}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">{category?.label ?? '—'}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{site?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{doc.version ?? '—'}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={doc.status} />
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {owner ? `${owner.first_name} ${owner.last_name}` : '—'}
                      </td>
                      <td className={`px-4 py-3 text-sm font-medium ${overdue ? 'text-red-600' : 'text-slate-600'}`}>
                        {formatDate(doc.review_date)}
                        {overdue && <span className="ml-1 text-xs">(Overdue)</span>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/documents/${doc.id}`}
                            className="text-xs text-orange-600 hover:text-orange-700 font-medium"
                          >
                            View
                          </Link>
                          <Link
                            href={`/documents/${doc.id}/edit`}
                            className="text-xs text-slate-600 hover:text-slate-900 font-medium"
                          >
                            Edit
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
