import { createClient } from '@/lib/supabase/server'
import { buildWorkbook } from '@/lib/export'

const HEADERS = ['Date', 'Time', 'Type', 'Site', 'Location', 'Description', 'RIDDOR Reportable', 'RIDDOR Reference', 'RIDDOR Reported Date', 'Status', 'Reported By', 'Investigated By', 'Closed Date']

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { data: rows } = await supabase
    .from('incidents')
    .select(
      `incident_date, incident_time, location, description,
       is_riddor_reportable, riddor_reference, riddor_reported_date,
       status, closed_at,
       type:lookup_values!type_id(label),
       sites(name),
       reported_by:users!reported_by(first_name, last_name),
       investigated_by:users!investigated_by_id(first_name, last_name)`
    )
    .order('incident_date', { ascending: false })

  const buffer = buildWorkbook([{
    name: 'Incidents',
    headers: HEADERS,
    data: (rows ?? []).map(r => {
      const row = r as Record<string, unknown>
      const type = row.type as { label: string } | null
      const site = row.sites as { name: string } | null
      const reportedBy = row.reported_by as { first_name: string; last_name: string } | null
      // investigated_by is returned as an array by PostgREST for some FK shapes
      const ibRaw = row.investigated_by
      const ib = Array.isArray(ibRaw) ? ibRaw[0] : ibRaw as { first_name: string; last_name: string } | null

      const reportedByName = reportedBy ? `${reportedBy.first_name ?? ''} ${reportedBy.last_name ?? ''}`.trim() : ''
      const investigatedByName = ib ? `${ib.first_name ?? ''} ${ib.last_name ?? ''}`.trim() : ''

      return {
        'Date': (row.incident_date as string) ?? '',
        'Time': (row.incident_time as string) ?? '',
        'Type': type?.label ?? '',
        'Site': site?.name ?? '',
        'Location': (row.location as string) ?? '',
        'Description': (row.description as string) ?? '',
        'RIDDOR Reportable': row.is_riddor_reportable === true ? 'Yes' : row.is_riddor_reportable === false ? 'No' : '',
        'RIDDOR Reference': (row.riddor_reference as string) ?? '',
        'RIDDOR Reported Date': (row.riddor_reported_date as string) ?? '',
        'Status': (row.status as string) ?? '',
        'Reported By': reportedByName,
        'Investigated By': investigatedByName,
        'Closed Date': row.closed_at ? (row.closed_at as string).split('T')[0] : '',
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
