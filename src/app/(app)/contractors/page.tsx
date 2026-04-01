import { createClient } from '@/lib/supabase/server'
import { formatDate } from '@/lib/dates'
import Link from 'next/link'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Contractor {
  id: string
  company_name: string
  contact_name: string | null
  contact_email: string | null
  contact_phone: string | null
  public_liability_expiry: string
  employers_liability_expiry: string | null
  is_approved: boolean
  is_active: boolean
  lookup_values: { label: string } | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function dateClass(dateStr: string | null): string {
  if (!dateStr) return 'text-slate-400'
  const d = new Date(dateStr)
  const now = new Date()
  const in30 = new Date()
  in30.setDate(now.getDate() + 30)
  if (d < now) return 'text-red-600 font-semibold'
  if (d <= in30) return 'text-amber-600 font-semibold'
  return 'text-slate-700'
}

function ExpiryCell({ date }: { date: string | null }) {
  return <span className={dateClass(date)}>{formatDate(date)}</span>
}

function ApprovedBadge({ approved }: { approved: boolean }) {
  return approved ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">
      <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 00-1.414 0L8 12.586 4.707 9.293a1 1 0 00-1.414 1.414l4 4a1 1 0 001.414 0l8-8a1 1 0 000-1.414z" clipRule="evenodd" />
      </svg>
      Approved
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">
      <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
      </svg>
      Not Approved
    </span>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ContractorsPage({
  searchParams,
}: {
  searchParams: Promise<{ approved?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('contractors')
    .select('id, company_name, contact_name, contact_email, contact_phone, public_liability_expiry, employers_liability_expiry, is_approved, is_active, lookup_values(label)')
    .order('company_name', { ascending: true })

  if (params.approved === 'true') {
    query = query.eq('is_approved', true)
  } else if (params.approved === 'false') {
    query = query.eq('is_approved', false)
  }

  const { data: contractors } = await query

  const list = (contractors ?? []) as unknown as Contractor[]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Contractor Management</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage approved contractors, insurance and document records.
          </p>
        </div>
        <Link
          href="/contractors/new"
          className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-orange-600 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Contractor
        </Link>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-slate-500 font-medium">Filter:</span>
        <Link
          href="/contractors"
          className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${!params.approved ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
        >
          All
        </Link>
        <Link
          href="/contractors?approved=true"
          className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${params.approved === 'true' ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
        >
          Approved
        </Link>
        <Link
          href="/contractors?approved=false"
          className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${params.approved === 'false' ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
        >
          Not Approved
        </Link>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {list.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <svg className="mx-auto h-10 w-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <p className="mt-3 text-sm text-slate-500">No contractors found.</p>
            <Link href="/contractors/new" className="mt-2 inline-block text-sm font-medium text-orange-600 hover:underline">
              Add the first contractor
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Company</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Contact</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">PL Expiry</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">EL Expiry</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Approved</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Active</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {list.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold text-slate-800">{c.company_name}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {c.lookup_values?.label ?? <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-slate-700">{c.contact_name ?? <span className="text-slate-300">—</span>}</p>
                      {c.contact_email && (
                        <p className="text-xs text-slate-400">{c.contact_email}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <ExpiryCell date={c.public_liability_expiry} />
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <ExpiryCell date={c.employers_liability_expiry} />
                    </td>
                    <td className="px-4 py-3">
                      <ApprovedBadge approved={c.is_approved} />
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${c.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                        {c.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/contractors/${c.id}`}
                        className="text-xs font-medium text-orange-600 hover:underline"
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
