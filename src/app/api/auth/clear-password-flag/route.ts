import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const userId = body?.userId as string | undefined

  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Verify the userId is a real auth user before updating
  const { data: { user }, error: authErr } = await admin.auth.admin.getUserById(userId)
  if (authErr || !user) {
    return NextResponse.json({ error: 'Invalid user' }, { status: 401 })
  }

  const { error: updateErr } = await admin
    .from('users')
    .update({ must_change_password: false })
    .eq('id', userId)

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
