'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function clearPasswordFlag(): Promise<{ ok: boolean; error?: string }> {
  // Get the current user from the server-side session
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { ok: false, error: 'Not authenticated' }
  }

  // Use the admin client to bypass RLS and update the flag
  const admin = createAdminClient()
  const { error } = await admin
    .from('users')
    .update({
      must_change_password: false,
      password_changed_at: new Date().toISOString(),
    })
    .eq('id', user.id)

  if (error) {
    return { ok: false, error: error.message }
  }

  return { ok: true }
}
