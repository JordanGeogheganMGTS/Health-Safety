import { createClient } from '@/lib/supabase/server'
import { buildWorkbook } from '@/lib/export'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]

  const [
    { data: correctiveActions },
    { data: documents },
    { data: equipment },
    { data: fireExtinguishers },
    { data: trainingRecords },
  ] = await Promise.all([
    supabase
      .from('corrective_actions')
      .select('title, priority, assigned_to_id, due_date, status, sites(name)')
      .not('status', 'in', '("Completed","Closed")')
      .lt('due_date', todayStr)
      .order('due_date', { ascending: true }),

    supabase
      .from('documents')
      .select('title, version, status, review_date, sites(name)')
      .lt('review_date', todayStr)
      .order('review_date', { ascending: true }),

    supabase
      .from('equipment')
      .select('name, asset_tag, next_service_due, sites(name)')
      .lt('next_service_due', todayStr)
      .order('next_service_due', { ascending: true }),

    supabase
      .from('fire_extinguishers')
      .select('location, type, next_inspection_due, sites(name)')
      .lt('next_inspection_due', todayStr)
      .order('next_inspection_due', { ascending: true }),

    supabase
      .from('training_records')
      .select('expiry_date, users(first_name, last_name), training_types(name)')
      .lt('expiry_date', todayStr)
      .order('expiry_date', { ascending: true }),
  ])

  function calcDaysOverdue(dateStr: string | null | undefined): number {
    if (!dateStr) return 0
    const due = new Date(dateStr)
    return Math.floor((today.getTime() - due.getTime()) / 86400000)
  }

  const buffer = buildWorkbook([
    {
      name: 'Corrective Actions',
      data: (correctiveActions ?? []).map(r => {
        const row = r as any
        const site = row.sites ?? null
        return {
          'Title': row.title ?? '',
          'Site': site?.name ?? '',
          'Priority': row.priority ?? '',
          'Assigned To': row.assigned_to_id ?? '',
          'Due Date': row.due_date ?? '',
          'Status': row.status ?? '',
          'Days Overdue': calcDaysOverdue(row.due_date),
        }
      }),
    },
    {
      name: 'Documents',
      data: (documents ?? []).map(r => {
        const row = r as any
        const site = row.sites ?? null
        return {
          'Title': row.title ?? '',
          'Site': site?.name ?? '',
          'Version': row.version ?? '',
          'Status': row.status ?? '',
          'Review Date': row.review_date ?? '',
          'Days Overdue': calcDaysOverdue(row.review_date),
        }
      }),
    },
    {
      name: 'Equipment',
      data: (equipment ?? []).map(r => {
        const row = r as any
        const site = row.sites ?? null
        return {
          'Name': row.name ?? '',
          'Site': site?.name ?? '',
          'Asset Tag': row.asset_tag ?? '',
          'Next Service Due': row.next_service_due ?? '',
          'Days Overdue': calcDaysOverdue(row.next_service_due),
        }
      }),
    },
    {
      name: 'Fire Extinguishers',
      data: (fireExtinguishers ?? []).map(r => {
        const row = r as any
        const site = row.sites ?? null
        return {
          'Location': row.location ?? '',
          'Type': row.type ?? '',
          'Site': site?.name ?? '',
          'Next Inspection Due': row.next_inspection_due ?? '',
          'Days Overdue': calcDaysOverdue(row.next_inspection_due),
        }
      }),
    },
    {
      name: 'Training',
      data: (trainingRecords ?? []).map(r => {
        const row = r as any
        const u = row.users ?? null
        const tt = row.training_types ?? null
        const staffName = u ? `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim() : ''
        return {
          'Staff Member': staffName,
          'Training Type': tt?.name ?? '',
          'Expiry Date': row.expiry_date ?? '',
          'Days Overdue': calcDaysOverdue(row.expiry_date),
        }
      }),
    },
  ])

  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="overdue-items-report.xlsx"',
    },
  })
}
