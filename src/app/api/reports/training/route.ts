import { createClient } from '@/lib/supabase/server'
import { buildWorkbook } from '@/lib/export'

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
      'completed_date, expiry_date, provider, ' +
      'users(first_name, last_name), ' +
      'training_types(name, is_mandatory, validity_years)'
    )
    .order('completed_date', { ascending: false })

  const buffer = buildWorkbook([{
    name: 'Training Records',
    data: (rows ?? []).map(r => {
      const row = r as any
      const user = row.users ?? null
      const trainingType = row.training_types ?? null

      const staffName = user
        ? `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim()
        : ''

      let status: string
      if (!row.expiry_date) {
        status = 'No Expiry'
      } else if (row.expiry_date < today) {
        status = 'Expired'
      } else if (row.expiry_date <= soonDateStr) {
        status = 'Expiring Soon'
      } else {
        status = 'Valid'
      }

      return {
        'Staff Member': staffName,
        'Training Type': trainingType?.name ?? '',
        'Mandatory': trainingType?.is_mandatory === true ? 'Yes' : trainingType?.is_mandatory === false ? 'No' : '',
        'Completed Date': row.completed_date ?? '',
        'Expiry Date': row.expiry_date ?? '',
        'Status': status,
        'Provider': row.provider ?? '',
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
