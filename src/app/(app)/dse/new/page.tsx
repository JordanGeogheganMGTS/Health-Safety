import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getSetting } from '@/lib/settings'
import DseAssessmentForm from './DseAssessmentForm'

export default async function NewDseAssessmentPage({
  searchParams,
}: {
  searchParams: Promise<{ userId?: string }>
}) {
  const { userId } = await searchParams
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: currentProfile } = await supabase
    .from('users')
    .select('id, first_name, last_name, site_id')
    .eq('id', user.id)
    .single()

  const [{ data: questions }, { data: users }, { data: sites }, reviewIntervalRaw] = await Promise.all([
    supabase
      .from('dse_question_templates')
      .select('id, section_number, section_label, item_key, item_text, sort_order')
      .order('sort_order'),
    supabase
      .from('users')
      .select('id, first_name, last_name, site_id')
      .eq('is_active', true)
      .order('last_name'),
    supabase
      .from('sites')
      .select('id, name')
      .order('name'),
    getSetting('dse_review_interval_months'),
  ])

  const reviewIntervalMonths = reviewIntervalRaw ? Number(reviewIntervalRaw) : 12

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Conduct DSE Assessment</h1>
        <p className="mt-1 text-sm text-slate-500">
          Complete a Display Screen Equipment assessment for a staff member.
        </p>
      </div>

      <DseAssessmentForm
        questions={questions ?? []}
        users={users ?? []}
        sites={sites ?? []}
        reviewIntervalMonths={reviewIntervalMonths}
        preselectedUserId={userId ?? null}
        assessedById={currentProfile?.id ?? user.id}
        assessedByName={
          currentProfile
            ? `${currentProfile.first_name} ${currentProfile.last_name}`
            : user.email ?? 'Unknown'
        }
      />
    </div>
  )
}
