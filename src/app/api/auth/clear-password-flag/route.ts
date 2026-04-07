import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const admin = createAdminClient()
  let userId: string | null = null

  // Primary: verify the Bearer token sent after updateUser() (new session token)
  const authHeader = request.headers.get('Authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    const { data: { user } } = await admin.auth.getUser(token)
    userId = user?.id ?? null
  }

  // Fallback: cookie-based session (works on subsequent requests once cookies settle)
  if (!userId) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    userId = user?.id ?? null
  }

  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await admin.from('users').update({ must_change_password: false }).eq('id', userId)

  return NextResponse.json({ ok: true })
}
