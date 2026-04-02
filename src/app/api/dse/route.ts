import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { addMonthsToDate } from '@/lib/dates'

interface ResponseItem {
  item_key: string
  response: 'yes' | 'no' | 'n/a' | null
  notes: string | null
}

interface DseRequestBody {
  user_id: string
  assessed_by: string
  assessment_date: string
  location: string | null
  overall_notes: string | null
  responses: ResponseItem[]
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
    assessment_date,
    location,
    overall_notes,
    responses,
    review_interval_months: bodyReviewInterval,
  } = body

  if (!user_id || !assessed_by || !assessment_date) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Get user's site_id (required NOT NULL on dse_assessments)
  const { data: userRecord } = await supabase
    .from('users')
    .select('site_id')
    .eq('id', user_id)
    .single()

  const userSiteId = userRecord?.site_id ?? null
  if (!userSiteId) {
    return NextResponse.json({ error: 'User has no site assigned — cannot create DSE assessment' }, { status: 400 })
  }

  // Determine next_review_date
  let reviewIntervalMonths = bodyReviewInterval ?? 12
  if (!bodyReviewInterval) {
    const { data: settingRow } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'dse_review_interval_months')
      .single()
    if (settingRow?.value) reviewIntervalMonths = parseInt(settingRow.value, 10)
  }

  const nextReviewDate = addMonthsToDate(assessment_date, reviewIntervalMonths)
    .toISOString()
    .split('T')[0]

  // INSERT dse_assessments
  const { data: assessment, error: assessmentError } = await supabase
    .from('dse_assessments')
    .insert({
      user_id,
      assessed_by,
      site_id: userSiteId,
      assessment_date,
      location: location || null,
      status: 'Submitted',
      overall_notes: overall_notes || null,
      next_review_date: nextReviewDate,
    })
    .select('id')
    .single()

  if (assessmentError || !assessment) {
    return NextResponse.json({ error: assessmentError?.message ?? 'Failed to create assessment' }, { status: 500 })
  }

  const assessmentId = assessment.id

  // INSERT dse_assessment_responses
  const responseRows = (responses ?? [])
    .filter((r) => r.response !== null)
    .map((r) => ({
      assessment_id: assessmentId,
      item_key: r.item_key,
      response: r.response,
      notes: r.notes || null,
    }))

  const { data: insertedResponses, error: responsesError } = await supabase
    .from('dse_assessment_responses')
    .insert(responseRows)
    .select('id, item_key, notes, response')

  if (responsesError) {
    return NextResponse.json({ error: responsesError.message }, { status: 500 })
  }

  // Create corrective actions for 'no' responses that have notes
  const failedResponses = (insertedResponses ?? []).filter(
    (r) => r.response === 'no' && r.notes
  )

  if (failedResponses.length > 0) {
    let mediumPriorityId: string | null = null
    const { data: catRow } = await supabase.from('lookup_categories').select('id').eq('key', 'ca_priority').single()
    if (catRow) {
      const { data: pvRow } = await supabase.from('lookup_values').select('id').ilike('label', 'Medium').eq('category_id', catRow.id).single()
      mediumPriorityId = pvRow?.id ?? null
    }

    for (const resp of failedResponses) {
      if (!mediumPriorityId) break
      const { data: ca, error: caError } = await supabase
        .from('corrective_actions')
        .insert({
          title: `DSE: ${resp.item_key}`,
          description: resp.notes,
          source_table: 'dse_assessments',
          source_record_id: assessmentId,
          site_id: userSiteId,
          priority_id: mediumPriorityId,
          due_date: nextReviewDate,
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
  }

  // Update users.dse_last_assessment_id
  await supabase
    .from('users')
    .update({ dse_last_assessment_id: assessmentId })
    .eq('id', user_id)

  return NextResponse.json({ assessmentId })
}
