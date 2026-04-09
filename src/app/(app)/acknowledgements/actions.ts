'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function acknowledgeItem(acknowledgementId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const admin = createAdminClient()
  const { error } = await admin
    .from('document_acknowledgements')
    .update({ acknowledged_at: new Date().toISOString() })
    .eq('id', acknowledgementId)
    .eq('user_id', user.id)           // safety: can only acknowledge own items
    .is('acknowledged_at', null)       // safety: can't re-acknowledge

  if (error) throw new Error(error.message)
  revalidatePath('/acknowledgements')
}

export async function resetAcknowledgement(acknowledgementId: string, reason: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Verify caller is System Admin
  const { data: profile } = await supabase
    .from('users')
    .select('roles(name)')
    .eq('id', user.id)
    .single()
  const role = (profile?.roles as unknown as { name: string } | null)?.name
  if (role !== 'System Admin') throw new Error('Only System Admins can reset acknowledgements')

  const admin = createAdminClient()
  const { error } = await admin
    .from('document_acknowledgements')
    .update({
      acknowledged_at: null,
      reset_by: user.id,
      reset_at: new Date().toISOString(),
      reset_reason: reason,
    })
    .eq('id', acknowledgementId)

  if (error) throw new Error(error.message)
  revalidatePath('/acknowledgements')
  revalidatePath('/profile/[id]', 'page')
}

export async function assignAcknowledgements(
  itemType: string,
  itemId: string,
  itemTitle: string,
  userIds: string[],
  notes: string | null,
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const admin = createAdminClient()
  const rows = userIds.map((uid) => ({
    user_id: uid,
    item_type: itemType,
    item_id: itemId,
    item_title: itemTitle,
    assigned_by: user.id,
    notes: notes || null,
  }))

  // upsert — ignore already-assigned (do nothing on conflict)
  const { error } = await admin
    .from('document_acknowledgements')
    .upsert(rows, { onConflict: 'user_id,item_type,item_id', ignoreDuplicates: true })

  if (error) throw new Error(error.message)
}
