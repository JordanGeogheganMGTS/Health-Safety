import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

function generatePassword(length = 16): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
  let password = ''
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { email, first_name, last_name, role_id, site_id } = body

  if (!email || !first_name || !last_name || !role_id) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const adminClient = createAdminClient()

  // Create auth user with auto-generated password; Supabase sends invite email
  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email,
    email_confirm: true,
    password: generatePassword(16),
  })

  if (authError || !authData.user) {
    return NextResponse.json({ error: authError?.message ?? 'Failed to create auth user' }, { status: 500 })
  }

  // Insert users profile row
  const { error: profileError } = await supabase.from('users').insert({
    id: authData.user.id,
    email,
    first_name,
    last_name,
    role_id,
    site_id: site_id || null,
    is_active: true,
  })

  if (profileError) {
    // Rollback auth user
    await adminClient.auth.admin.deleteUser(authData.user.id)
    return NextResponse.json({ error: profileError.message }, { status: 500 })
  }

  return NextResponse.json({ id: authData.user.id })
}
