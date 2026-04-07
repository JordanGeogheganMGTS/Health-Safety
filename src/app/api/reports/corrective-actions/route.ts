import { createClient } from '@/lib/supabase/server'
import { buildWorkbook } from '@/lib/export'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { data: rows } = await supabase
    .from('corrective_actions')
    .select(
      'title, description, source_table, due_date, completed_at, status, created_at, ' +
      'priority:lookup_values!priority_id(label), ' +
      'sites(name), ' +
      'assigned:users!assigned_to(first_name, last_name)'
    )
    .order('created_at', { ascending: false })

  const buffer = buildWorkbook([{
    name: 'Corrective Actions',
    headers: ['Title', 'Description', 'Source', 'Site', 'Priority', 'Assigned To', 'Due Date', 'Status', 'Completed Date', 'Created Date'],
    data: (rows ?? []).map(r => {
      const row = r as any
      const assignedUser = row.assigned ?? null
      const site = row.sites ?? null
      const assignedName = assignedUser
        ? `${assignedUser.first_name ?? ''} ${assignedUser.last_name ?? ''}`.trim()
        : ''

      return {
        'Title': row.title ?? '',
        'Description': row.description ?? '',
        'Source': row.source_table ?? '',
        'Site': site?.name ?? '',
        'Priority': row.priority?.label ?? '',
        'Assigned To': assignedName,
        'Due Date': row.due_date ?? '',
        'Status': row.status ?? '',
        'Completed Date': row.completed_at ? row.completed_at.split('T')[0] : '',
        'Created Date': row.created_at ? row.created_at.split('T')[0] : '',
      }
    }),
  }])

  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="corrective-actions.xlsx"',
    },
  })
}
