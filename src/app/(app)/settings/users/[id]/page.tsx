import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'
import { formatDate, formatDateTime } from '@/lib/dates'
import { isOverdue } from '@/lib/dates'

async function toggleDseNotApplicable(userId: string, current: boolean) {
  'use server'
  const supabase = await createClient()
  await supabase
    .from('users')
    .update({ dse_not_applicable: !current })
    .eq('id', userId)
  revalidatePath(`/settings/users/${userId}`)
}

export default async function UserProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ confirm?: string }>
}) {
  const { id } = await params
  const { confirm } = await searchParams
  const supabase = await createClient()

  const { data: { user: currentAuthUser } } = await supabase.auth.getUser()
  if (!currentAuthUser) redirect('/login')

  const { data: currentProfile } = await supabase
    .from('users')
    .select('id, roles(name)')
    .eq('id', currentAuthUser.id)
    .single()

  const roleName = (currentProfile?.roles as unknown as { name: string } | null)?.name
  if (roleName !== 'System Admin') redirect('/dashboard')

  // Handle deactivation confirmation
  if (confirm === 'true') {
    await supabase
      .from('users')
      .update({
        is_active: false,
        deactivated_at: new Date().toISOString(),
        deactivated_by: currentAuthUser.id,
      })
      .eq('id', id)
    revalidatePath(`/settings/users/${id}`)
    redirect(`/settings/users/${id}`)
  }

  const { data: profile } = await supabase
    .from('users')
    .select(`
      id, email, first_name, last_name, is_active, last_login_at,
      dse_not_applicable, ppe_notes, dse_last_assessment_id,
      roles(name), sites(name),
      dse_assessments!users_dse_last_assessment_id_fkey(
        id, assessment_date, overall_outcome, review_date
      )
    `)
    .eq('id', id)
    .single()

  if (!profile) redirect('/settings/users')

  const role = (profile.roles as unknown as { name: string } | null)?.name
  const site = (profile.sites as unknown as { name: string } | null)?.name
  const lastAssessment = (profile.dse_assessments as unknown as {
    id: string
    assessment_date: string
    overall_outcome: string
    review_date: string
  }[] | null)?.[0] ?? null

  // Fetch PPE summary
  const { data: ppeRecords } = await supabase
    .from('user_ppe_records')
    .select('id, next_replacement_due')
    .eq('user_id', id)

  const ppeCount = ppeRecords?.length ?? 0
  const ppeOverdue = ppeRecords?.filter((r) => r.next_replacement_due && isOverdue(r.next_replacement_due)).length ?? 0

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/settings" className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
          Settings
        </Link>
        <span className="text-slate-300">/</span>
        <Link href="/settings/users" className="text-sm text-slate-500 hover:text-slate-700">Users</Link>
        <span className="text-slate-300">/</span>
        <span className="text-sm font-medium text-slate-900">{profile.first_name} {profile.last_name}</span>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{profile.first_name} {profile.last_name}</h1>
          <p className="mt-1 text-sm text-slate-500">{profile.email}</p>
        </div>
        <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
          profile.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {profile.is_active ? 'Active' : 'Inactive'}
        </span>
      </div>

      {/* Section 1 — Account Details */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-900">Account Details</h2>
        </div>
        <div className="px-6 py-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide">Full Name</dt>
            <dd className="mt-1 text-sm text-slate-900">{profile.first_name} {profile.last_name}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide">Email</dt>
            <dd className="mt-1 text-sm text-slate-900">{profile.email}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide">Role</dt>
            <dd className="mt-1">
              {role ? (
                <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">{role}</span>
              ) : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide">Site</dt>
            <dd className="mt-1 text-sm text-slate-900">{site ?? 'All sites'}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide">Last Login</dt>
            <dd className="mt-1 text-sm text-slate-900">{formatDateTime(profile.last_login_at)}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide">DSE Not Applicable</dt>
            <dd className="mt-1">
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                profile.dse_not_applicable ? 'bg-slate-100 text-slate-700' : 'bg-blue-50 text-blue-700'
              }`}>
                {profile.dse_not_applicable ? 'Not Applicable' : 'Applicable'}
              </span>
            </dd>
          </div>
          {profile.ppe_notes && (
            <div className="sm:col-span-2">
              <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide">PPE Notes</dt>
              <dd className="mt-1 text-sm text-slate-900">{profile.ppe_notes}</dd>
            </div>
          )}
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex items-center gap-3 flex-wrap">
          <form
            action={async () => {
              'use server'
              await toggleDseNotApplicable(id, profile.dse_not_applicable ?? false)
            }}
          >
            <button
              type="submit"
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              {profile.dse_not_applicable ? 'Mark DSE as Applicable' : 'Mark DSE as Not Applicable'}
            </button>
          </form>

          {profile.is_active && profile.id !== currentProfile?.id && (
            <Link
              href={`/settings/users/${id}?confirm=true`}
              className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 transition-colors"
              onClick={(e) => {
                if (!window.confirm(`Deactivate ${profile.first_name} ${profile.last_name}? This will prevent them from logging in.`)) {
                  e.preventDefault()
                }
              }}
            >
              Deactivate User
            </Link>
          )}
        </div>
      </div>

      {/* Section 2 — PPE Summary */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-900">PPE Summary</h2>
        </div>
        <div className="px-6 py-5 flex items-center justify-between">
          <p className="text-sm text-slate-700">
            <span className="font-medium">{ppeCount}</span> PPE item{ppeCount !== 1 ? 's' : ''} on record.
            {ppeOverdue > 0 && (
              <span className="ml-1 text-red-600 font-medium">{ppeOverdue} overdue.</span>
            )}
          </p>
          <Link
            href={`/ppe/${id}`}
            className="text-sm font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            Manage PPE
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
          </Link>
        </div>
      </div>

      {/* Section 3 — DSE Status */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-900">DSE Status</h2>
        </div>
        <div className="px-6 py-5">
          {profile.dse_not_applicable ? (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-600">
                Not Applicable
              </span>
              <span className="text-sm text-slate-500">DSE assessments are not required for this user.</span>
            </div>
          ) : lastAssessment ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide">Last Assessment</dt>
                  <dd className="mt-1 text-sm text-slate-900">{formatDate(lastAssessment.assessment_date)}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide">Outcome</dt>
                  <dd className="mt-1">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      lastAssessment.overall_outcome === 'No Further Action Required'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {lastAssessment.overall_outcome}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide">Review Date</dt>
                  <dd className={`mt-1 text-sm font-medium ${
                    isOverdue(lastAssessment.review_date) ? 'text-red-600' : 'text-slate-900'
                  }`}>
                    {formatDate(lastAssessment.review_date)}
                    {isOverdue(lastAssessment.review_date) && ' (Overdue)'}
                  </dd>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  href={`/dse/${lastAssessment.id}`}
                  className="text-sm font-medium text-blue-600 hover:text-blue-800"
                >
                  View Assessment
                </Link>
                <Link
                  href={`/dse/new?userId=${id}`}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Conduct New Assessment
                </Link>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-600">No assessment on record.</p>
              <Link
                href={`/dse/new?userId=${id}`}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
              >
                Conduct Assessment
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
