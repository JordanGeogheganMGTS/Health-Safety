import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatDate, isOverdue } from '@/lib/dates'

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    Draft: 'bg-slate-100 text-slate-700',
    Active: 'bg-green-100 text-green-700',
    Superseded: 'bg-slate-200 text-slate-500',
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status] ?? 'bg-slate-100 text-slate-600'}`}>
      {status}
    </span>
  )
}

export default async function MethodStatementsPage() {
  const supabase = await createClient()

  const { data: statements } = await supabase
    .from('method_statements')
    .select(`
      id,
      title,
      status,
      review_date,
      sites(name),
      author:users!method_statements_author_id_fkey(first_name, last_name)
    `)
    .order('created_at', { ascending: false })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Method Statements</h1>
          <p className="text-sm text-slate-500 mt-1">Safe systems of work and task procedures</p>
        </div>
        <Link
          href="/method-statements/new"
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Method Statement
        </Link>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        {!statements || statements.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <svg className="h-12 w-12 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
            <p className="text-base font-medium">No method statements found</p>
            <p className="text-sm mt-1">Create your first method statement to get started</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Title</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Site</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Author</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Review Date</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {statements.map((ms) => {
                  const site = ms.sites as unknown as { name: string } | null
                  const author = ms.author as unknown as { first_name: string; last_name: string } | null
                  const overdue = isOverdue(ms.review_date)

                  return (
                    <tr key={ms.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <Link href={`/method-statements/${ms.id}`} className="font-medium text-slate-900 hover:text-blue-600 transition-colors">
                          {ms.title}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">{site?.name ?? '—'}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={ms.status} />
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {author ? `${author.first_name} ${author.last_name}` : '—'}
                      </td>
                      <td className={`px-4 py-3 text-sm font-medium ${overdue ? 'text-red-600' : 'text-slate-600'}`}>
                        {formatDate(ms.review_date)}
                        {overdue && <span className="ml-1 text-xs">(Overdue)</span>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/method-statements/${ms.id}`}
                          className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                        >
                          View
                        </Link>
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
