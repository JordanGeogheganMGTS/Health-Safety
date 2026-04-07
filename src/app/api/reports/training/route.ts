import { createClient } from '@/lib/supabase/server'
import { buildWorkbook } from '@/lib/export'

const HEADERS = ['Staff Member', 'Email', 'Training Type', 'Mandatory', 'Completed Date', 'Expiry Date', 'Status', 'Provider']

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const today = new Date().toISOString().split('T')[0]
  const soonDate = new Date()
  soonDate.setDate(soonDate.getDate() + 60)
  const soonDateStr = soonDate.toISOString().split('T')[0]

  const [{ data: users }, { data: allTypes }, { data: records }] = await Promise.all([
    supabase
      .from('users')
      .select('id, first_name, last_name, email')
      .eq('is_active', true)
      .order('last_name'),
    supabase
      .from('training_types')
      .select('id, name, is_mandatory, validity_months')
      .eq('is_active', true)
      .order('name'),
    supabase
      .from('training_records')
      .select('user_id, training_type_id, completion_date, expiry_date, provider'),
  ])

  const mandatoryTypes = (allTypes ?? []).filter((t) => t.is_mandatory)

  // Index records by user_id → training_type_id → latest record
  const recordIndex: Record<string, Record<string, { completion_date: string | null; expiry_date: string | null; provider: string | null }>> = {}
  for (const r of records ?? []) {
    const row = r as Record<string, unknown>
    const uid = row.user_id as string
    const tid = row.training_type_id as string
    if (!recordIndex[uid]) recordIndex[uid] = {}
    // Keep the most recent completion_date
    const existing = recordIndex[uid][tid]
    const rDate = row.completion_date as string | null
    if (!existing || (rDate && rDate > (existing.completion_date ?? ''))) {
      recordIndex[uid][tid] = {
        completion_date: rDate,
        expiry_date: row.expiry_date as string | null,
        provider: row.provider as string | null,
      }
    }
  }

  const data: Record<string, unknown>[] = []

  for (const u of users ?? []) {
    const uid = u.id as string
    const fullName = `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim()

    // One row per mandatory training type
    for (const tt of mandatoryTypes) {
      const rec = recordIndex[uid]?.[tt.id] ?? null
      let status: string

      if (!rec) {
        status = 'Not Completed'
      } else if (!rec.expiry_date) {
        status = 'Completed (No Expiry)'
      } else if (rec.expiry_date < today) {
        status = 'Expired'
      } else if (rec.expiry_date <= soonDateStr) {
        status = 'Expiring Soon'
      } else {
        status = 'Valid'
      }

      data.push({
        'Staff Member': fullName,
        'Email': u.email ?? '',
        'Training Type': tt.name,
        'Mandatory': 'Yes',
        'Completed Date': rec?.completion_date ?? '',
        'Expiry Date': rec?.expiry_date ?? '',
        'Status': status,
        'Provider': rec?.provider ?? '',
      })
    }

    // Additional rows for any optional training the user HAS completed
    const userRecords = recordIndex[uid] ?? {}
    const mandatoryIds = new Set(mandatoryTypes.map((t) => t.id))
    for (const [tid, rec] of Object.entries(userRecords)) {
      if (mandatoryIds.has(tid)) continue // already covered above
      const tt = (allTypes ?? []).find((t) => t.id === tid)
      if (!tt) continue

      let status: string
      if (!rec.expiry_date) {
        status = 'Completed (No Expiry)'
      } else if (rec.expiry_date < today) {
        status = 'Expired'
      } else if (rec.expiry_date <= soonDateStr) {
        status = 'Expiring Soon'
      } else {
        status = 'Valid'
      }

      data.push({
        'Staff Member': fullName,
        'Email': u.email ?? '',
        'Training Type': tt.name,
        'Mandatory': 'No',
        'Completed Date': rec.completion_date ?? '',
        'Expiry Date': rec.expiry_date ?? '',
        'Status': status,
        'Provider': rec.provider ?? '',
      })
    }
  }

  const buffer = buildWorkbook([{ name: 'Training Records', headers: HEADERS, data }])

  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="training-records.xlsx"',
    },
  })
}
