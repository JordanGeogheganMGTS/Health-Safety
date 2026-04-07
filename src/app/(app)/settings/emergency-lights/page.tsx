import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

interface LightRow {
  id: string
  identifier: string
  location: string | null
  fitting_type: string | null
  is_active: boolean
  notes: string | null
  sites: { name: string } | null
}

export default async function EmergencyLightsPage() {
  const supabase = await createClient()

  const { data: rows } = await supabase
    .from('emergency_lights')
    .select('id, identifier, location, fitting_type, is_active, notes, sites!site_id(name)')
    .order('is_active', { ascending: false })
    .order('identifier')

  const lights = (rows ?? []) as unknown as LightRow[]

  // Group by site
  const bySite = lights.reduce<Record<string, { siteName: string; lights: LightRow[] }>>(
    (acc, l) => {
      const siteName = (l.sites as unknown as { name: string } | null)?.name ?? 'Unknown Site'
      if (!acc[siteName]) acc[siteName] = { siteName, lights: [] }
      acc[siteName].lights.push(l)
      return acc
    },
    {}
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Emergency Lights</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage the register of emergency light fittings. These automatically appear on test forms for their site.
          </p>
        </div>
        <Link
          href="/settings/emergency-lights/new"
          className="inline-flex items-center gap-1.5 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 transition-colors"
        >
          <span aria-hidden="true">+</span> Add Light
        </Link>
      </div>

      {Object.keys(bySite).length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-sm">
          <p className="text-sm font-medium text-slate-500">No emergency lights registered yet.</p>
          <p className="mt-1 text-xs text-slate-400">
            <Link href="/settings/emergency-lights/new" className="text-orange-600 hover:underline">
              Add the first light fitting
            </Link>
          </p>
        </div>
      ) : (
        Object.values(bySite).map(({ siteName, lights: siteLights }) => (
          <div key={siteName} className="space-y-2">
            <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">{siteName}</h2>
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <table className="min-w-full divide-y divide-slate-100">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">ID / Name</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Location</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Fitting Type</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {siteLights.map((l) => (
                    <tr key={l.id} className={`hover:bg-slate-50 transition-colors ${!l.is_active ? 'opacity-50' : ''}`}>
                      <td className="px-4 py-3 text-sm font-medium text-slate-800">{l.identifier}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{l.location ?? '—'}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{l.fitting_type ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${l.is_active ? 'bg-green-100 text-green-700 ring-green-200' : 'bg-slate-100 text-slate-500 ring-slate-200'}`}>
                          {l.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/settings/emergency-lights/${l.id}/edit`}
                          className="text-xs font-medium text-orange-600 hover:text-orange-700 hover:underline"
                        >
                          Edit
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
    </div>
  )
}
