import { createClient } from '@/lib/supabase/server'
import { buildWorkbook } from '@/lib/export'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]

  const { data: rows } = await supabase
    .from('equipment')
    .select(
      'name, asset_tag, serial_number, manufacturer, model, ' +
      'last_service_date, next_service_due, status, ' +
      'sites(name)'
    )
    .order('name', { ascending: true })

  const buffer = buildWorkbook([{
    name: 'Equipment Service',
    data: (rows ?? []).map(r => {
      const row = r as any
      const site = row.sites ?? null

      let daysOverdue = 0
      if (row.next_service_due && row.next_service_due < todayStr) {
        const dueDate = new Date(row.next_service_due)
        daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / 86400000)
      }

      return {
        'Name': row.name ?? '',
        'Site': site?.name ?? '',
        'Asset Tag': row.asset_tag ?? '',
        'Serial Number': row.serial_number ?? '',
        'Manufacturer': row.manufacturer ?? '',
        'Model': row.model ?? '',
        'Last Service Date': row.last_service_date ?? '',
        'Next Service Due': row.next_service_due ?? '',
        'Days Overdue': daysOverdue,
        'Status': row.status ?? '',
      }
    }),
  }])

  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="equipment-service.xlsx"',
    },
  })
}
