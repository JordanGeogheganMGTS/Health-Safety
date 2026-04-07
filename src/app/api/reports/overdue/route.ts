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
    { data: riskAssessments },
    { data: equipment },
    { data: fireExtinguishers },
    { data: trainingRecords },
  ] = await Promise.all([
    supabase
      .from('corrective_actions')
      .select('title, due_date, status, sites(name), priority:lookup_values!priority_id(label), assigned:users!assigned_to(first_name, last_name)')
      .not('status', 'in', '(Completed,Verified,Cancelled)')
      .lt('due_date', todayStr)
      .order('due_date', { ascending: true }),

    supabase
      .from('documents')
      .select('title, review_due_date, status, sites(name)')
      .not('review_due_date', 'is', null)
      .lt('review_due_date', todayStr)
      .not('status', 'in', '(Expired,Superseded)')
      .order('review_due_date', { ascending: true }),

    supabase
      .from('risk_assessments')
      .select('title, review_due_date, status, sites(name)')
      .not('review_due_date', 'is', null)
      .lt('review_due_date', todayStr)
      .not('status', 'in', '(Superseded,Archived)')
      .order('review_due_date', { ascending: true }),

    supabase
      .from('equipment')
      .select('name, next_inspection_date, sites(name)')
      .not('next_inspection_date', 'is', null)
      .lt('next_inspection_date', todayStr)
      .eq('is_active', true)
      .order('next_inspection_date', { ascending: true }),

    supabase
      .from('fire_extinguishers')
      .select('location, next_inspection_date, sites(name)')
      .not('next_inspection_date', 'is', null)
      .lt('next_inspection_date', todayStr)
      .eq('is_active', true)
      .order('next_inspection_date', { ascending: true }),

    supabase
      .from('training_records')
      .select('expiry_date, user:users!training_records_user_id_fkey(first_name, last_name), training_type:training_types!training_records_training_type_id_fkey(name)')
      .not('expiry_date', 'is', null)
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
      headers: ['Title', 'Site', 'Priority', 'Assigned To', 'Due Date', 'Status', 'Days Overdue'],
      data: (correctiveActions ?? []).map(r => {
        const row = r as any
        const assigned = row.assigned ?? null
        const assignedName = assigned ? `${assigned.first_name ?? ''} ${assigned.last_name ?? ''}`.trim() : ''
        return {
          'Title': row.title ?? '',
          'Site': row.sites?.name ?? '',
          'Priority': row.priority?.label ?? '',
          'Assigned To': assignedName,
          'Due Date': row.due_date ?? '',
          'Status': row.status ?? '',
          'Days Overdue': calcDaysOverdue(row.due_date),
        }
      }),
    },
    {
      name: 'Documents',
      headers: ['Title', 'Site', 'Status', 'Review Due Date', 'Days Overdue'],
      data: (documents ?? []).map(r => {
        const row = r as any
        return {
          'Title': row.title ?? '',
          'Site': row.sites?.name ?? '',
          'Status': row.status ?? '',
          'Review Due Date': row.review_due_date ?? '',
          'Days Overdue': calcDaysOverdue(row.review_due_date),
        }
      }),
    },
    {
      name: 'Risk Assessments',
      headers: ['Title', 'Site', 'Status', 'Review Due Date', 'Days Overdue'],
      data: (riskAssessments ?? []).map(r => {
        const row = r as any
        return {
          'Title': row.title ?? '',
          'Site': row.sites?.name ?? '',
          'Status': row.status ?? '',
          'Review Due Date': row.review_due_date ?? '',
          'Days Overdue': calcDaysOverdue(row.review_due_date),
        }
      }),
    },
    {
      name: 'Equipment',
      headers: ['Name', 'Site', 'Next Inspection Date', 'Days Overdue'],
      data: (equipment ?? []).map(r => {
        const row = r as any
        return {
          'Name': row.name ?? '',
          'Site': row.sites?.name ?? '',
          'Next Inspection Date': row.next_inspection_date ?? '',
          'Days Overdue': calcDaysOverdue(row.next_inspection_date),
        }
      }),
    },
    {
      name: 'Fire Extinguishers',
      headers: ['Location', 'Site', 'Next Inspection Date', 'Days Overdue'],
      data: (fireExtinguishers ?? []).map(r => {
        const row = r as any
        return {
          'Location': row.location ?? '',
          'Site': row.sites?.name ?? '',
          'Next Inspection Date': row.next_inspection_date ?? '',
          'Days Overdue': calcDaysOverdue(row.next_inspection_date),
        }
      }),
    },
    {
      name: 'Training',
      headers: ['Staff Member', 'Training Type', 'Expiry Date', 'Days Overdue'],
      data: (trainingRecords ?? []).map(r => {
        const row = r as any
        const u = row.user ?? null
        const tt = row.training_type ?? null
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
