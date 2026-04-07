import { createClient } from '@/lib/supabase/server'
import { buildWorkbook } from '@/lib/export'

const HEADERS = ['Name', 'Email', 'Role', 'Site', 'DSE Status', 'Assessment Date', 'Review Date', 'Assessment Status', 'Notes']

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const today = new Date().toISOString().split('T')[0]

  // Two queries — users don't have a direct FK to dse_assessments
  const [{ data: users }, { data: assessments }] = await Promise.all([
    supabase
      .from('users')
      .select('id, first_name, last_name, email, dse_not_applicable, roles(name), sites(name)')
      .order('last_name'),
    supabase
      .from('dse_assessments')
      .select('user_id, assessment_date, next_review_date, status, overall_notes')
      .order('assessment_date', { ascending: false }),
  ])

  // Latest assessment per user
  const latestByUser: Record<string, Record<string, unknown>> = {}
  for (const a of assessments ?? []) {
    const row = a as Record<string, unknown>
    const uid = row.user_id as string
    if (!latestByUser[uid]) latestByUser[uid] = row
  }

  const buffer = buildWorkbook([{
    name: 'DSE Compliance',
    headers: HEADERS,
    data: (users ?? []).map(u => {
      const row = u as Record<string, unknown>
      const assessment = latestByUser[row.id as string] ?? null
      const role = row.roles as { name: string } | null
      const site = row.sites as { name: string } | null
      const fullName = `${row.first_name ?? ''} ${row.last_name ?? ''}`.trim()

      let dseStatus: string
      if (row.dse_not_applicable === true) {
        dseStatus = 'Not Applicable'
      } else if (!assessment) {
        dseStatus = 'No Assessment'
      } else if (assessment.next_review_date && (assessment.next_review_date as string) < today) {
        dseStatus = 'Overdue'
      } else {
        dseStatus = 'Current'
      }

      return {
        'Name': fullName,
        'Email': (row.email as string) ?? '',
        'Role': role?.name ?? '',
        'Site': site?.name ?? '',
        'DSE Status': dseStatus,
        'Assessment Date': (assessment?.assessment_date as string) ?? '',
        'Review Date': (assessment?.next_review_date as string) ?? '',
        'Assessment Status': (assessment?.status as string) ?? '',
        'Notes': (assessment?.overall_notes as string) ?? '',
      }
    }),
  }])

  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="dse-compliance.xlsx"',
    },
  })
}
