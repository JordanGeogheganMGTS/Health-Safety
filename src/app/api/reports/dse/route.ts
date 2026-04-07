import { createClient } from '@/lib/supabase/server'
import { buildWorkbook } from '@/lib/export'

const HEADERS = ['Name', 'Email', 'Role', 'Site', 'Assessment Date', 'Review Date', 'Assessment Status', 'Assessed By', 'Notes']

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { data: rows } = await supabase
    .from('dse_assessments')
    .select(`
      assessment_date, next_review_date, status, overall_notes,
      subject:users!dse_assessments_user_id_fkey(first_name, last_name, email, roles(name)),
      site:sites!dse_assessments_site_id_fkey(name),
      assessed_by:users!dse_assessments_assessed_by_fkey(first_name, last_name)
    `)
    .order('assessment_date', { ascending: false })

  const buffer = buildWorkbook([{
    name: 'DSE Compliance',
    headers: HEADERS,
    data: (rows ?? []).map(r => {
      const row = r as Record<string, unknown>
      const subject = row.subject as { first_name: string; last_name: string; email: string; roles: { name: string } | null } | null
      const site = row.site as { name: string } | null
      const assessedBy = row.assessed_by as { first_name: string; last_name: string } | null

      const fullName = subject ? `${subject.first_name ?? ''} ${subject.last_name ?? ''}`.trim() : ''
      const assessedByName = assessedBy ? `${assessedBy.first_name ?? ''} ${assessedBy.last_name ?? ''}`.trim() : ''

      return {
        'Name': fullName,
        'Email': subject?.email ?? '',
        'Role': subject?.roles?.name ?? '',
        'Site': site?.name ?? '',
        'Assessment Date': (row.assessment_date as string) ?? '',
        'Review Date': (row.next_review_date as string) ?? '',
        'Assessment Status': (row.status as string) ?? '',
        'Assessed By': assessedByName,
        'Notes': (row.overall_notes as string) ?? '',
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
