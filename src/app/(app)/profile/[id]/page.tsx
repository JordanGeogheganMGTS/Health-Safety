import { createClient } from '@/lib/supabase/server'
import { formatDate, isOverdue, isDueWithin } from '@/lib/dates'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function addMonths(dateStr: string, months: number): string {
  const d = new Date(dateStr)
  d.setMonth(d.getMonth() + months)
  return d.toISOString().split('T')[0]
}

function ExpiryBadge({ date }: { date: string | null }) {
  if (!date) return <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-slate-100 text-slate-500">No expiry</span>
  if (isOverdue(date)) return <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-red-100 text-red-700">Expired {formatDate(date)}</span>
  if (isDueWithin(date, 60)) return <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-amber-100 text-amber-700">Due {formatDate(date)}</span>
  return <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-green-100 text-green-700">Valid to {formatDate(date)}</span>
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-6 py-4">
        <h2 className="text-base font-semibold text-slate-800">{title}</h2>
      </div>
      {children}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const { data: currentProfile } = await supabase
    .from('users')
    .select('id, roles(name)')
    .eq('id', authUser.id)
    .single()

  const currentRole = (currentProfile?.roles as unknown as { name: string } | null)?.name
  const isAdmin = currentRole === 'System Admin' || currentRole === 'H&S Manager'
  const isOwnProfile = authUser.id === id

  // Only admins can view other people's profiles
  if (!isOwnProfile && !isAdmin) redirect('/dashboard')

  // ── Main profile data ──
  const { data: profile } = await supabase
    .from('users')
    .select(`
      id, email, first_name, last_name, is_active, last_login_at,
      dse_not_applicable, ppe_notes,
      roles(name),
      sites(name)
    `)
    .eq('id', id)
    .single()

  if (!profile) notFound()

  const role = (profile.roles as unknown as { name: string } | null)?.name
  const site = (profile.sites as unknown as { name: string } | null)?.name

  // ── Training records ──
  const { data: trainingRaw } = await supabase
    .from('training_records')
    .select(`
      id, completion_date, expiry_date, provider, certificate_file_path, certificate_file_name,
      training_type:training_types!training_records_training_type_id_fkey(name, is_mandatory)
    `)
    .eq('user_id', id)
    .order('completion_date', { ascending: false })

  // Generate signed URLs for certificates
  const training = await Promise.all(
    (trainingRaw ?? []).map(async (r) => {
      if (!r.certificate_file_path) return { ...r, certUrl: null }
      const { data } = await supabase.storage
        .from('health-safety-files')
        .createSignedUrl(r.certificate_file_path, 60 * 60)
      return { ...r, certUrl: data?.signedUrl ?? null }
    })
  )

  // ── PPE records (active = not returned) ──
  const { data: ppeRaw } = await supabase
    .from('user_ppe_records')
    .select(`
      id, issued_date, condition, notes,
      ppe_item:ppe_items!user_ppe_records_ppe_item_id_fkey(name, replacement_months)
    `)
    .eq('user_id', id)
    .is('returned_date', null)
    .order('issued_date', { ascending: false })

  const ppe = (ppeRaw ?? []) as unknown as Array<{
    id: string
    issued_date: string
    condition: string
    notes: string | null
    ppe_item: { name: string; replacement_months: number | null } | null
  }>

  // ── DSE assessments ──
  const { data: dseRaw } = await supabase
    .from('dse_assessments')
    .select(`
      id, assessment_date, status, next_review_date,
      site:sites!dse_assessments_site_id_fkey(name)
    `)
    .eq('user_id', id)
    .order('assessment_date', { ascending: false })

  const dse = (dseRaw ?? []) as unknown as Array<{
    id: string
    assessment_date: string
    status: string
    next_review_date: string | null
    site: { name: string } | null
  }>

  // ── Admin server actions ──
  async function toggleDseNotApplicable() {
    'use server'
    const supabase = await createClient()
    await supabase
      .from('users')
      .update({ dse_not_applicable: !(profile!.dse_not_applicable) })
      .eq('id', id)
    revalidatePath(`/profile/${id}`)
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Breadcrumb */}
      {isAdmin && !isOwnProfile ? (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Link href="/settings/users" className="hover:text-slate-700">Users</Link>
          <span>/</span>
          <span className="text-slate-800 font-medium">{profile.first_name} {profile.last_name}</span>
        </div>
      ) : null}

      {/* Header card */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-orange-500 text-white text-lg font-bold">
              {profile.first_name.charAt(0)}{profile.last_name.charAt(0)}
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">{profile.first_name} {profile.last_name}</h1>
              <p className="text-sm text-slate-500">{profile.email}</p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {role && (
                  <span className="inline-flex items-center rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-medium text-orange-700">{role}</span>
                )}
                <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">{site ?? 'All sites'}</span>
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${profile.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {profile.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>
          {isAdmin && (
            <div className="flex items-center gap-2 shrink-0">
              <Link
                href={`/settings/users/${id}`}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Admin Settings
              </Link>
            </div>
          )}
        </div>
        {profile.ppe_notes && (
          <div className="px-6 py-3 border-b border-slate-50">
            <p className="text-xs font-medium text-slate-500 mb-0.5">PPE Notes</p>
            <p className="text-sm text-slate-700">{profile.ppe_notes}</p>
          </div>
        )}
      </div>

      {/* Training Records */}
      <SectionCard title={`Training Records (${training.length})`}>
        {training.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-slate-400">No training records found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-50">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Training Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Completed</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Provider</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {(training as unknown as Array<{
                  id: string
                  completion_date: string
                  expiry_date: string | null
                  provider: string | null
                  certificate_file_name: string | null
                  certUrl: string | null
                  training_type: { name: string; is_mandatory: boolean } | null
                }>).map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-slate-800">{r.training_type?.name ?? '—'}</p>
                      {r.training_type?.is_mandatory && (
                        <span className="text-xs text-red-600 font-medium">Required</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{formatDate(r.completion_date)}</td>
                    <td className="px-4 py-3"><ExpiryBadge date={r.expiry_date} /></td>
                    <td className="px-4 py-3 text-sm text-slate-500">{r.provider ?? '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-3">
                        {r.certUrl && (
                          <a
                            href={r.certUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-medium text-orange-600 hover:underline"
                          >
                            Certificate ↗
                          </a>
                        )}
                        <Link href={`/training/${r.id}`} className="text-xs font-medium text-slate-500 hover:text-slate-700">
                          View →
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {/* PPE */}
      <SectionCard title={`PPE Assigned (${ppe.length} active)`}>
        {ppe.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-slate-400">No PPE currently assigned.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-50">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Item</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Issued</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Condition</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Replacement Due</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {ppe.map((r) => {
                  const replacementDue = r.ppe_item?.replacement_months
                    ? addMonths(r.issued_date, r.ppe_item.replacement_months)
                    : null
                  const condClass = r.condition === 'Good' ? 'bg-green-100 text-green-700'
                    : r.condition === 'Fair' ? 'bg-amber-100 text-amber-700'
                    : r.condition === 'Poor' ? 'bg-red-100 text-red-700'
                    : 'bg-slate-100 text-slate-600'
                  return (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm font-medium text-slate-800">{r.ppe_item?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{formatDate(r.issued_date)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${condClass}`}>
                          {r.condition}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {replacementDue
                          ? <ExpiryBadge date={replacementDue} />
                          : <span className="text-xs text-slate-400">No schedule</span>
                        }
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500">{r.notes ?? '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="border-t border-slate-50 px-6 py-3">
          <Link href={`/ppe/${id}`} className="text-sm font-medium text-orange-600 hover:text-orange-700">
            Manage PPE →
          </Link>
        </div>
      </SectionCard>

      {/* DSE */}
      <SectionCard title="DSE Assessments">
        {profile.dse_not_applicable ? (
          <div className="px-6 py-5 flex items-center gap-3">
            <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-600">Not Applicable</span>
            <span className="text-sm text-slate-500">DSE assessments are not required for this user.</span>
            {isAdmin && (
              <form action={toggleDseNotApplicable} className="ml-auto">
                <button type="submit" className="text-xs text-orange-600 hover:underline">Mark as applicable</button>
              </form>
            )}
          </div>
        ) : dse.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-slate-400">
            No DSE assessments on record.
            {isAdmin && (
              <div className="mt-3">
                <Link href={`/dse/new?userId=${id}`} className="inline-flex items-center gap-1 rounded-lg bg-orange-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-orange-600 transition-colors">
                  Conduct Assessment
                </Link>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-50">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Site</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Assessment Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Next Review</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {dse.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm font-medium text-slate-800">{d.site?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{formatDate(d.assessment_date)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          d.status === 'Reviewed' || d.status === 'Closed' ? 'bg-green-100 text-green-700' :
                          d.status === 'Submitted' ? 'bg-blue-100 text-blue-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {d.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <ExpiryBadge date={d.next_review_date} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/dse/${d.id}`} className="text-xs font-medium text-orange-600 hover:underline">View →</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {isAdmin && (
              <div className="border-t border-slate-50 px-6 py-3">
                <Link href={`/dse/new?userId=${id}`} className="text-sm font-medium text-orange-600 hover:text-orange-700">
                  + New Assessment
                </Link>
              </div>
            )}
          </>
        )}
      </SectionCard>
    </div>
  )
}
