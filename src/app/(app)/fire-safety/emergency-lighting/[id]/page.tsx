import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { formatDate } from '@/lib/dates'

interface TestDetail {
  id: string
  test_date: string
  test_type: string
  overall_result: 'Pass' | 'Fail' | null
  notes: string | null
  created_at: string
  sites: { name: string } | null
  tested_by_user: { first_name: string; last_name: string } | null
}

interface ResultRow {
  id: string
  result: 'Pass' | 'Fail' | 'N/A'
  defects: string | null
  corrective_action: string | null
  light: { identifier: string; location: string | null; fitting_type: string | null } | null
}

interface PageProps { params: Promise<{ id: string }> }

export default async function EmergencyLightTestDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: testData, error }, { data: resultRows }] = await Promise.all([
    supabase
      .from('emergency_light_tests')
      .select('id, test_date, test_type, overall_result, notes, created_at, sites!site_id(name), tested_by_user:users!tested_by(first_name, last_name)')
      .eq('id', id)
      .single(),
    supabase
      .from('emergency_light_test_results')
      .select('id, result, defects, corrective_action, light:emergency_lights!light_id(identifier, location, fitting_type)')
      .eq('test_id', id)
      .order('created_at'),
  ])

  if (error || !testData) notFound()

  const test = testData as unknown as TestDetail
  const results = (resultRows ?? []) as unknown as ResultRow[]

  const passCount = results.filter((r) => r.result === 'Pass').length
  const failCount = results.filter((r) => r.result === 'Fail').length
  const naCount = results.filter((r) => r.result === 'N/A').length

  const overallBadge = test.overall_result === 'Pass'
    ? 'bg-green-100 text-green-700 ring-green-200'
    : test.overall_result === 'Fail'
    ? 'bg-red-100 text-red-700 ring-red-200'
    : 'bg-slate-100 text-slate-500 ring-slate-200'

  const siteName = (test.sites as unknown as { name: string } | null)?.name ?? '—'

  return (
    <div className="space-y-6">
      <nav className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/fire-safety" className="hover:text-slate-700 hover:underline">Fire Safety</Link>
        <span>/</span>
        <span className="font-medium text-slate-800">Emergency Lighting Test — {formatDate(test.test_date)}</span>
      </nav>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Emergency Lighting Test</h1>
          <p className="mt-1 text-sm text-slate-500">{siteName} · {test.test_type} · {formatDate(test.test_date)}</p>
        </div>
        <div className="flex items-center gap-3">
          {test.overall_result && (
            <span className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ring-1 ring-inset ${overallBadge}`}>
              Overall: {test.overall_result}
            </span>
          )}
          <Link
            href={`/fire-safety/emergency-lighting/${test.id}/edit`}
            className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
          >
            Edit
          </Link>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Test Date', value: formatDate(test.test_date) },
          { label: 'Test Type', value: test.test_type },
          { label: 'Tested By', value: test.tested_by_user ? `${test.tested_by_user.first_name} ${test.tested_by_user.last_name}` : '—' },
          { label: 'Site', value: siteName },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <dt className="text-xs font-medium text-slate-500">{label}</dt>
            <dd className="mt-1 text-sm font-semibold text-slate-800">{value}</dd>
          </div>
        ))}
      </div>

      {/* Results counts */}
      <div className="flex gap-4">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-700 ring-1 ring-inset ring-green-200">
          {passCount} Pass
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 text-sm font-semibold text-red-700 ring-1 ring-inset ring-red-200">
          {failCount} Fail
        </span>
        {naCount > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-600 ring-1 ring-inset ring-slate-200">
            {naCount} N/A
          </span>
        )}
      </div>

      {/* Results table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-100">
          <thead>
            <tr className="bg-slate-50">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Light / ID</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Location</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Fitting Type</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Result</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Defects</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Corrective Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {results.map((r) => (
              <tr key={r.id} className={`hover:bg-slate-50 transition-colors ${r.result === 'Fail' ? 'bg-red-50 hover:bg-red-50' : ''}`}>
                <td className="px-4 py-3 text-sm font-medium text-slate-800">{r.light?.identifier ?? '—'}</td>
                <td className="px-4 py-3 text-sm text-slate-600">{r.light?.location ?? '—'}</td>
                <td className="px-4 py-3 text-sm text-slate-600">{r.light?.fitting_type ?? '—'}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${
                    r.result === 'Pass' ? 'bg-green-100 text-green-700 ring-green-200'
                    : r.result === 'Fail' ? 'bg-red-100 text-red-700 ring-red-200'
                    : 'bg-slate-100 text-slate-500 ring-slate-200'
                  }`}>
                    {r.result}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-slate-600 max-w-[200px]">{r.defects ?? '—'}</td>
                <td className="px-4 py-3 text-sm text-slate-600 max-w-[200px]">{r.corrective_action ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {test.notes && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <dt className="text-xs font-medium text-slate-500">Notes</dt>
          <dd className="mt-1 text-sm text-slate-700 whitespace-pre-wrap">{test.notes}</dd>
        </div>
      )}

      <div>
        <Link href="/fire-safety" className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors">
          ← Back to Fire Safety
        </Link>
      </div>
    </div>
  )
}
