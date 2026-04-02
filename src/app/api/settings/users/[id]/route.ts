import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

function generatePassword(length = 12): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const lower = 'abcdefghjkmnpqrstuvwxyz'
  const digits = '23456789'
  const special = '!@#$%'
  const all = upper + lower + digits + special
  let password =
    upper[Math.floor(Math.random() * upper.length)] +
    lower[Math.floor(Math.random() * lower.length)] +
    digits[Math.floor(Math.random() * digits.length)] +
    special[Math.floor(Math.random() * special.length)]
  for (let i = 4; i < length; i++) {
    password += all[Math.floor(Math.random() * all.length)]
  }
  return password.split('').sort(() => Math.random() - 0.5).join('')
}

async function requireAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('users').select('roles(name)').eq('id', user.id).single()
  const role = (profile?.roles as unknown as { name: string } | null)?.name
  if (role !== 'System Admin') return null
  return user
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const adminUser = await requireAdmin(supabase)
  if (!adminUser) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const adminClient = createAdminClient()

  // Reset password
  if (body.action === 'reset_password') {
    const tempPassword = generatePassword(12)
    const { error: authErr } = await adminClient.auth.admin.updateUserById(id, { password: tempPassword })
    if (authErr) return NextResponse.json({ error: authErr.message }, { status: 500 })
    await adminClient.from('users').update({ must_change_password: true }).eq('id', id)
    return NextResponse.json({ tempPassword })
  }

  // Activate user
  if (body.action === 'activate') {
    await adminClient.from('users').update({ is_active: true, deactivated_at: null, deactivated_by: null }).eq('id', id)
    return NextResponse.json({ ok: true })
  }

  // Deactivate user
  if (body.action === 'deactivate') {
    await adminClient.from('users').update({
      is_active: false,
      deactivated_at: new Date().toISOString(),
      deactivated_by: adminUser.id,
    }).eq('id', id)
    return NextResponse.json({ ok: true })
  }

  // Update site
  if (body.action === 'update_site') {
    await adminClient.from('users').update({ site_id: body.site_id || null }).eq('id', id)
    return NextResponse.json({ ok: true })
  }

  // Update role
  if (body.action === 'update_role') {
    await adminClient.from('users').update({ role_id: body.role_id }).eq('id', id)
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
