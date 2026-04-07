import { createClient } from '@/lib/supabase/server'
import { buildWorkbook } from '@/lib/export'

const HEADERS = ['Name', 'Email', 'Role', 'Site', 'Assessment Date', 'Review Date', 'Assessment Status', 'Outcome', 'Assessed By', 'Notes']

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const [{ data: users }, { data: assessments }] = await Promise.all([
    supabase
      .from('users')
      .select('id, first_name, last_name, email, roles(name)')
      .eq('is_active', true)
      .order('last_name'),
    supabase
      .from('dse_assessments')
      .select(`
        id, user_id, assessment_date, next_review_date, status, overall_notes,
        site:sites!dse_assessments_site_id_fkey(name),
        assessed_by:users!dse_assessments_assessed_by_fkey(first_name, last_name)
      `)
      .order('assessment_date', { ascending: false }),
  ])

  // Fetch responses to determine outcome (actions raised or not)
  const assessmentIds = (assessments ?? []).map((a) => (a as Record<string, unknown>).id as string)
  const responsesByAssessment: Record<string, { item_key: string; response: string }[]> = {}

  if (assessmentIds.length > 0) {
    const { data: responses } = await supabase
      .from('dse_assessment_responses')
      .select('assessment_id, item_key, response')
      .in('assessment_id', assessmentIds)

    for (const r of responses ?? []) {
      const row = r as Record<string, unknown>
      const aid = row.assessment_id as string
      if (!responsesByAssessment[aid]) responsesByAssessment[aid] = []
      responsesByAssessment[aid].push({ item_key: row.item_key as string, response: row.response as string })
    }
  }

  // Group assessments by user_id
  const assessmentsByUser: Record<string, Record<string, unknown>[]> = {}
  for (const a of assessments ?? []) {
    const row = a as Record<string, unknown>
    const uid = row.user_id as string
    if (!assessmentsByUser[uid]) assessmentsByUser[uid] = []
    assessmentsByUser[uid].push(row)
  }

  const data: Record<string, unknown>[] = []

  for (const u of users ?? []) {
    const userRow = u as Record<string, unknown>
    const role = userRow.roles as { name: string } | null
    const fullName = `${userRow.first_name ?? ''} ${userRow.last_name ?? ''}`.trim()
    const userAssessments = assessmentsByUser[userRow.id as string] ?? []

    if (userAssessments.length === 0) {
      // User has no assessments — show one row flagging this
      data.push({
        'Name': fullName,
        'Email': (userRow.email as string) ?? '',
        'Role': role?.name ?? '',
        'Site': '',
        'Assessment Date': '',
        'Review Date': '',
        'Assessment Status': 'Not Completed',
        'Outcome': '',
        'Assessed By': '',
        'Notes': '',
      })
    } else {
      for (const a of userAssessments) {
        const site = a.site as { name: string } | null
        const assessedBy = a.assessed_by as { first_name: string; last_name: string } | null
        const assessedByName = assessedBy
          ? `${assessedBy.first_name ?? ''} ${assessedBy.last_name ?? ''}`.trim()
          : ''

        const resps = responsesByAssessment[a.id as string] ?? []
        const hasActions = resps.some((r) =>
          r.item_key === 'final_discomfort' ? r.response === 'yes' : r.response === 'no'
        )
        const outcome = resps.length === 0 ? '' : hasActions ? 'Actions Required' : 'No Actions Required'

        data.push({
          'Name': fullName,
          'Email': (userRow.email as string) ?? '',
          'Role': role?.name ?? '',
          'Site': site?.name ?? '',
          'Assessment Date': (a.assessment_date as string) ?? '',
          'Review Date': (a.next_review_date as string) ?? '',
          'Assessment Status': (a.status as string) ?? '',
          'Outcome': outcome,
          'Assessed By': assessedByName,
          'Notes': (a.overall_notes as string) ?? '',
        })
      }
    }
  }

  const buffer = buildWorkbook([{ name: 'DSE Compliance', headers: HEADERS, data }])

  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="dse-compliance.xlsx"',
    },
  })
}
