import { createClient } from '@/lib/supabase/server'
import { buildWorkbook } from '@/lib/export'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { data: rows } = await supabase
    .from('corrective_actions')
    .select(
      'title, description, source_module, priority, due_date, status, completed_date, created_at, ' +
      'sites(name), ' +
      'users!corrective_actions_assigned_to_id_fkey(first_name, last_name), ' +
      'users!corrective_actions_created_by_id_fkey(first_name, last_name)'
    )
    .order('created_at', { ascending: false })

  const buffer = buildWorkbook([{
    name: 'Corrective Actions',
    data: (rows ?? []).map(r => {
      // Handle both array and object shapes Supabase may return for FK joins
      const assignedUser = (r as any)['users!corrective_actions_assigned_to_id_fkey'] ?? null
      const createdByUser = (r as any)['users!corrective_actions_created_by_id_fkey'] ?? null
      const site = (r as any).sites ?? null

      const assignedName = assignedUser
        ? `${assignedUser.first_name ?? ''} ${assignedUser.last_name ?? ''}`.trim()
        : ''
      const createdByName = createdByUser
        ? `${createdByUser.first_name ?? ''} ${createdByUser.last_name ?? ''}`.trim()
        : ''

      return {
        'Title': (r as any).title ?? '',
        'Description': (r as any).description ?? '',
        'Source Module': (r as any).source_module ?? '',
        'Site': site?.name ?? '',
        'Priority': (r as any).priority ?? '',
        'Assigned To': assignedName,
        'Due Date': (r as any).due_date ?? '',
        'Status': (r as any).status ?? '',
        'Completed Date': (r as any).completed_date ?? '',
        'Created By': createdByName,
        'Created Date': (r as any).created_at ? (r as any).created_at.split('T')[0] : '',
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
