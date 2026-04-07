import { createClient } from '@/lib/supabase/server'
import { buildWorkbook } from '@/lib/export'

const HEADERS = ['Staff Member', 'Training Type', 'Mandatory', 'Completed Date', 'Expiry Date', 'Status', 'Provider']

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const today = new Date().toISOString().split('T')[0]
  const soonDate = new Date()
  soonDate.setDate(soonDate.getDate() + 60)
  const soonDateStr = soonDate.toISOString().split('T')[0]

  const { data: rows } = await supabase
    .from('training_records')
    .select(
      `completion_date, expiry_date, provider,
       user:users!training_records_user_id_fkey(first_name, last_name),
       training_type:training_types!training_records_training_type_id_fkey(name, is_mandatory)`
    )
    .order('completion_date', { ascending: false })

  const buffer = buildWorkbook([{
    name: 'Training Records',
    headers: HEADERS,
    data: (rows ?? []).map(r => {
      const row = r as Record<string, unknown>
      const u = row.user as { first_name: string; last_name: string } | null
      const tt = row.training_type as { name: string; is_mandatory: boolean } | null
      const staffName = u ? `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim() : ''
      const expiry = row.expiry_date as string | null

      let status: string
      if (!expiry) {
        status = 'No Expiry'
      } else if (expiry < today) {
        status = 'Expired'
      } else if (expiry <= soonDateStr) {
        status = 'Expiring Soon'
      } else {
        status = 'Valid'
      }

      return {
        'Staff Member': staffName,
        'Training Type': tt?.name ?? '',
        'Mandatory': tt?.is_mandatory === true ? 'Yes' : tt?.is_mandatory === false ? 'No' : '',
        'Completed Date': (row.completion_date as string) ?? '',
        'Expiry Date': expiry ?? '',
        'Status': status,
        'Provider': (row.provider as string) ?? '',
      }
    }),
  }])

  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="training-records.xlsx"',
    },
  })
}
