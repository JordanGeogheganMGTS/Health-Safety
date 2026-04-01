import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatDate, formatDateTime, isOverdue } from '@/lib/dates'

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

async function approveMethodStatement(id: string) {
  'use server'
  const { createClient: createServerClient } = await import('@/lib/supabase/server')
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase
    .from('method_statements')
    .update({ status: 'Active', approved_by: user.id, approved_at: new Date().toISOString() })
    .eq('id', id)
  const { revalidatePath } = await import('next/cache')
  revalidatePath(`/method-statements/${id}`)
}

export default async function MethodStatementDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()

  const [{ data: ms }, { data: steps }] = await Promise.all([
    supabase
      .from('method_statements')
      .select(`
        id, title, task_description, category, ppe_required, equipment_required,
        emergency_procedures, status, review_date, approved_at, created_at,
        sites(name),
        author:users!method_statements_author_id_fkey(first_name, last_name),
        approver:users!method_statements_approved_by_fkey(first_name, last_name)
      `)
      .eq('id', params.id)
      .single(),
    supabase
      .from('method_statement_steps')
      .select('id, step_number, description, hazards, controls')
      .eq('ms_id', params.id)
      .order('step_number'),
  ])

  if (!ms) notFound()

  const site = ms.sites as unknown as { name: string } | null
  const author = ms.author as unknown as { first_name: string; last_name: string } | null
  const approver = ms.approver as unknown as { first_name: string; last_name: string } | null
  const overdue = isOverdue(ms.review_date)

  const approveAction = approveMethodStatement.bind(null, ms.id)

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
            <Link href="/method-statements" className="hover:text-orange-600 transition-colors">Method Statements</Link>
            <span>/</span>
            <span>{ms.title}</span>
          </div>
          <h1 className="text-2xl font-semibold text-slate-900">{ms.title}</h1>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {ms.status === 'Draft' && (
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
            href={`/method-statements/${ms.id}/edit`}
            className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-3 py-2 text-sm font-medium text-white hover:bg-orange-600 transition-colors shadow-sm"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit
          </Link>
        </div>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Site', value: site?.name ?? '—' },
          { label: 'Status', value: <StatusBadge status={ms.status} /> },
          { label: 'Author', value: author ? `${author.first_name} ${author.last_name}` : '—' },
          {
            label: 'Review Date',
            value: (
              <span className={overdue ? 'text-red-600 font-medium' : ''}>
                {formatDate(ms.review_date)}{overdue && ' (Overdue)'}
              </span>
            ),
          },
          { label: 'Category', value: ms.category ?? '—' },
          { label: 'Approved By', value: approver ? `${approver.first_name} ${approver.last_name}` : '—' },
          { label: 'Approved At', value: formatDateTime(ms.approved_at) },
          { label: 'Created', value: formatDate(ms.created_at) },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">{label}</p>
            <div className="text-sm font-medium text-slate-900">{value}</div>
          </div>
        ))}
      </div>

      {/* Task description */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm mb-6">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Task Description</h2>
        <p className="text-sm text-slate-700 whitespace-pre-wrap">{ms.task_description}</p>
      </div>

      {/* Details */}
      {(ms.ppe_required || ms.equipment_required || ms.emergency_procedures) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {ms.ppe_required && (
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">PPE Required</h2>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{ms.ppe_required}</p>
            </div>
          )}
          {ms.equipment_required && (
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Equipment Required</h2>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{ms.equipment_required}</p>
            </div>
          )}
          {ms.emergency_procedures && (
            <div className="rounded-xl border border-red-100 bg-red-50 p-5 shadow-sm">
              <h2 className="text-xs font-semibold text-red-600 uppercase tracking-wider mb-2">Emergency Procedures</h2>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{ms.emergency_procedures}</p>
            </div>
          )}
        </div>
      )}

      {/* Steps */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">Method Sequence</h2>
          <span className="text-xs text-slate-500">{steps?.length ?? 0} step{(steps?.length ?? 0) !== 1 ? 's' : ''}</span>
        </div>

        {!steps || steps.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400">
            <p className="text-sm">No steps added yet.</p>
            <Link href={`/method-statements/${ms.id}/edit`} className="mt-2 text-sm text-orange-600 hover:text-orange-700 font-medium">
              Add steps
            </Link>
          </div>
        ) : (
          <ol className="divide-y divide-slate-100">
            {steps.map((step) => (
              <li key={step.id} className="p-5">
                <div className="flex items-start gap-4">
                  <span className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-orange-50 text-orange-700 text-sm font-bold border border-blue-100">
                    {step.step_number}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-900 whitespace-pre-wrap">{step.description}</p>
                    {step.hazards && (
                      <div className="mt-3 rounded-lg bg-amber-50 border border-amber-100 px-3 py-2">
                        <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-1">Hazards</p>
                        <p className="text-sm text-amber-900 whitespace-pre-wrap">{step.hazards}</p>
                      </div>
                    )}
                    {step.controls && (
                      <div className="mt-2 rounded-lg bg-green-50 border border-green-100 px-3 py-2">
                        <p className="text-xs font-semibold text-green-700 uppercase tracking-wider mb-1">Controls</p>
                        <p className="text-sm text-green-900 whitespace-pre-wrap">{step.controls}</p>
                      </div>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  )
}
