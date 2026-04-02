import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { addMonthsToDate } from '@/lib/dates'

interface ResponseItem {
  section_number: number
  section_label: string
  item_key: string
  item_text: string
  response: 'yes' | 'no' | 'na' | null
  action_to_take: string | null
  sort_order: number
}

interface DseRequestBody {
  user_id: string
  assessed_by: string
  workstation_location: string | null
  assessment_date: string
  overall_notes: string | null
  responses: ResponseItem[]
  user_discomfort_noted: boolean
  discomfort_detail: string | null
  eye_test_recommended: boolean
  regular_breaks_confirmed: boolean
  review_interval_months?: number
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: DseRequestBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const {
    user_id,
    assessed_by,
    workstation_location,
    assessment_date,
    overall_notes,
    responses,
    user_discomfort_noted,
    discomfort_detail,
    eye_test_recommended,
    regular_breaks_confirmed,
    review_interval_months: bodyReviewInterval,
  } = body

  if (!user_id || !assessed_by || !assessment_date) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Step 1: Get user's site_id
  const { data: userRecord } = await supabase
    .from('users')
    .select('site_id')
    .eq('id', user_id)
    .single()

  const userSiteId = userRecord?.site_id ?? null

  // Step 2: Determine overall_outcome
  const hasFailure = (responses ?? []).some((r) => r.response === 'no')
  const overallOutcome = hasFailure ? 'Further Action Required' : 'No Further Action Required'
  const furtherActionRequired = hasFailure

  // Step 3: Get dse_review_interval_months from system_settings (fallback to body value, then 12)
  let reviewIntervalMonths = bodyReviewInterval ?? 12
  if (!bodyReviewInterval) {
    const { data: settingRow } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'dse_review_interval_months')
      .single()
    if (settingRow?.value) reviewIntervalMonths = parseInt(settingRow.value, 10)
  }

  const reviewDate = addMonthsToDate(assessment_date, reviewIntervalMonths)
    .toISOString()
    .split('T')[0]

  // Step 4: INSERT dse_assessments
  const { data: assessment, error: assessmentError } = await supabase
    .from('dse_assessments')
    .insert({
      user_id,
      assessed_by,
      workstation_location: workstation_location || null,
      assessment_date,
      overall_outcome: overallOutcome,
      further_action_required: furtherActionRequired,
      user_discomfort_noted,
      discomfort_detail: user_discomfort_noted ? (discomfort_detail || null) : null,
      eye_test_recommended,
      regular_breaks_confirmed,
      overall_notes: overall_notes || null,
      review_date: reviewDate,
    })
    .select('id')
    .single()

  if (assessmentError || !assessment) {
    return NextResponse.json({ error: assessmentError?.message ?? 'Failed to create assessment' }, { status: 500 })
  }

  const assessmentId = assessment.id

  // Step 5: INSERT all dse_assessment_responses
  const responseRows = (responses ?? []).map((r) => ({
    assessment_id: assessmentId,
    section_number: r.section_number,
    section_label: r.section_label,
    item_key: r.item_key,
    item_text: r.item_text,
    response: r.response,
    action_to_take: r.action_to_take || null,
    action_completed: false,
    ca_id: null,
    sort_order: r.sort_order,
  }))

  const { data: insertedResponses, error: responsesError } = await supabase
    .from('dse_assessment_responses')
    .insert(responseRows)
    .select('id, item_key, action_to_take, response')

  if (responsesError) {
    return NextResponse.json({ error: responsesError.message }, { status: 500 })
  }

  // Step 6: For each 'no' response with action_to_take — create corrective actions
  const failedResponses = (insertedResponses ?? []).filter(
    (r) => r.response === 'no' && r.action_to_take
  )

  // Look up 'Medium' priority UUID
  let mediumPriorityId: string | null = null
  if (failedResponses.length > 0) {
    const { data: catRow } = await supabase.from('lookup_categories').select('id').eq('key', 'ca_priority').single()
    if (catRow) {
      const { data: pvRow } = await supabase.from('lookup_values').select('id').ilike('label', 'Medium').eq('category_id', catRow.id).single()
      mediumPriorityId = pvRow?.id ?? null
    }
  }

  for (const resp of failedResponses) {
    if (!mediumPriorityId) break
    const { data: ca, error: caError } = await supabase
      .from('corrective_actions')
      .insert({
        title: `DSE: ${resp.item_key}`,
        description: resp.action_to_take,
        source_table: 'dse_assessments',
        source_record_id: assessmentId,
        site_id: userSiteId,
        priority_id: mediumPriorityId,
        due_date: reviewDate,
        status: 'Open',
        assigned_by: assessed_by,
      })
      .select('id')
      .single()

    if (!caError && ca) {
      await supabase
        .from('dse_assessment_responses')
        .update({ ca_id: ca.id })
        .eq('id', resp.id)
    }
  }

  // Step 7: UPDATE users SET dse_last_assessment_id
  await supabase
    .from('users')
    .update({ dse_last_assessment_id: assessmentId })
    .eq('id', user_id)

  return NextResponse.json({ assessmentId })
}
