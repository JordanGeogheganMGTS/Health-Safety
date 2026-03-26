import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

interface IssuePpeBody {
  userId: string
  ppeItemId: string
  sizeValue?: string | null
  dateIssued: string
  condition: string
  signatureObtained: boolean
  notes?: string | null
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: IssuePpeBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { userId, ppeItemId, sizeValue, dateIssued, condition, signatureObtained, notes } = body

  if (!userId || !ppeItemId || !dateIssued || !condition) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Get ppe_item to calculate next_review_date
  const { data: ppeItem } = await supabase
    .from('ppe_items')
    .select('recommended_replacement_months')
    .eq('id', ppeItemId)
    .single()

  let nextReviewDate: string | null = null
  if (ppeItem?.recommended_replacement_months && dateIssued) {
    const d = new Date(dateIssued)
    d.setMonth(d.getMonth() + ppeItem.recommended_replacement_months)
    nextReviewDate = d.toISOString().split('T')[0]
  }

  const { data: record, error } = await supabase
    .from('user_ppe_records')
    .insert({
      user_id: userId,
      ppe_item_id: ppeItemId,
      size_value: sizeValue || null,
      date_issued: dateIssued,
      issued_by_id: user.id,
      condition,
      next_review_date: nextReviewDate,
      signature_obtained: signatureObtained,
      notes: notes || null,
    })
    .select('id')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ id: record.id })
}
