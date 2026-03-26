import { createClient } from '@/lib/supabase/server'
import { buildWorkbook } from '@/lib/export'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const today = new Date().toISOString().split('T')[0]

  const { data: rows } = await supabase
    .from('users')
    .select(
      'first_name, last_name, email, dse_not_applicable, ' +
      'roles(name), ' +
      'sites(name), ' +
      'dse_assessments!users_dse_last_assessment_id_fkey(assessment_date, overall_outcome, review_date, eye_test_recommended, further_action_required)'
    )
    .order('last_name', { ascending: true })

  const buffer = buildWorkbook([{
    name: 'DSE Compliance',
    data: (rows ?? []).map(r => {
      const row = r as any
      const assessment = row['dse_assessments!users_dse_last_assessment_id_fkey'] ?? null
      const role = row.roles ?? null
      const site = row.sites ?? null

      let dseStatus: string
      if (row.dse_not_applicable === true) {
        dseStatus = 'Not Applicable'
      } else if (!assessment) {
        dseStatus = 'No Assessment'
      } else if (assessment.review_date && assessment.review_date < today) {
        dseStatus = 'Overdue'
      } else {
        dseStatus = 'Current'
      }

      const fullName = `${row.first_name ?? ''} ${row.last_name ?? ''}`.trim()

      return {
        'Name': fullName,
        'Email': row.email ?? '',
        'Role': role?.name ?? '',
        'Site': site?.name ?? '',
        'DSE Status': dseStatus,
        'Last Assessment Date': assessment?.assessment_date ?? '',
        'Outcome': assessment?.overall_outcome ?? '',
        'Review Date': assessment?.review_date ?? '',
        'Eye Test Required': assessment?.eye_test_recommended === true ? 'Yes' : assessment?.eye_test_recommended === false ? 'No' : '',
        'Further Action Required': assessment?.further_action_required === true ? 'Yes' : assessment?.further_action_required === false ? 'No' : '',
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
