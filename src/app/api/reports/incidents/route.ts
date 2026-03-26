import { createClient } from '@/lib/supabase/server'
import { buildWorkbook } from '@/lib/export'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { data: rows } = await supabase
    .from('incidents')
    .select(
      'incident_date, incident_time, type, location, description, ' +
      'riddor_reportable, riddor_reference, riddor_reported_date, ' +
      'status, closed_date, ' +
      'sites(name), ' +
      'users!incidents_reported_by_id_fkey(first_name, last_name), ' +
      'users!incidents_investigated_by_id_fkey(first_name, last_name)'
    )
    .order('incident_date', { ascending: false })

  const buffer = buildWorkbook([{
    name: 'Incidents',
    data: (rows ?? []).map(r => {
      const row = r as any
      const site = row.sites ?? null
      const reportedBy = row['users!incidents_reported_by_id_fkey'] ?? null
      const investigatedBy = row['users!incidents_investigated_by_id_fkey'] ?? null

      const reportedByName = reportedBy
        ? `${reportedBy.first_name ?? ''} ${reportedBy.last_name ?? ''}`.trim()
        : ''
      const investigatedByName = investigatedBy
        ? `${investigatedBy.first_name ?? ''} ${investigatedBy.last_name ?? ''}`.trim()
        : ''

      return {
        'Date': row.incident_date ?? '',
        'Time': row.incident_time ?? '',
        'Type': row.type ?? '',
        'Site': site?.name ?? '',
        'Location': row.location ?? '',
        'Description': row.description ?? '',
        'RIDDOR Reportable': row.riddor_reportable === true ? 'Yes' : row.riddor_reportable === false ? 'No' : '',
        'RIDDOR Reference': row.riddor_reference ?? '',
        'RIDDOR Reported Date': row.riddor_reported_date ?? '',
        'Status': row.status ?? '',
        'Reported By': reportedByName,
        'Investigated By': investigatedByName,
        'Closed Date': row.closed_date ?? '',
      }
    }),
  }])

  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="incidents.xlsx"',
    },
  })
}
