'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

async function requireEditor() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: profile } = await supabase
    .from('users')
    .select('roles(name)')
    .eq('id', user.id)
    .single()

  const role = (profile?.roles as unknown as { name: string } | null)?.name
  if (role !== 'System Admin' && role !== 'H&S Manager') throw new Error('Insufficient permissions')

  return { userId: user.id, admin: createAdminClient() }
}

// ── Matrix cell ──────────────────────────────────────────────────────────────

export async function toggleCompetency(userId: string, skillId: string, currentValue: boolean) {
  const { userId: editorId, admin } = await requireEditor()

  await admin.from('skill_competencies').upsert({
    user_id: userId,
    skill_id: skillId,
    is_competent: !currentValue,
    updated_at: new Date().toISOString(),
    updated_by: editorId,
  }, { onConflict: 'user_id,skill_id' })

  revalidatePath('/skills-matrix')
  revalidatePath(`/profile/${userId}`)
}

// ── Matrix membership ────────────────────────────────────────────────────────

export async function addToMatrix(userId: string) {
  const { userId: editorId, admin } = await requireEditor()

  await admin.from('skill_matrix_members').upsert(
    { user_id: userId, added_by: editorId },
    { onConflict: 'user_id', ignoreDuplicates: true }
  )

  revalidatePath('/skills-matrix')
  revalidatePath(`/profile/${userId}`)
}

export async function removeFromMatrix(userId: string) {
  const { admin } = await requireEditor()

  await admin.from('skill_matrix_members').delete().eq('user_id', userId)

  revalidatePath('/skills-matrix')
  revalidatePath(`/profile/${userId}`)
}

// ── Skill definitions (settings) ─────────────────────────────────────────────

export async function addSkill(name: string, categoryId: string | null) {
  const { admin } = await requireEditor()

  const { data: maxRow } = await admin
    .from('skill_definitions')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  const nextOrder = ((maxRow?.sort_order as number) ?? 0) + 10

  const { error } = await admin.from('skill_definitions').insert({
    name: name.trim(),
    sort_order: nextOrder,
    category_id: categoryId || null,
  })
  if (error) throw new Error(error.message)

  revalidatePath('/settings/skills')
  revalidatePath('/skills-matrix')
}

export async function updateSkill(id: string, name: string, sortOrder: number, categoryId: string | null) {
  const { admin } = await requireEditor()

  const { error } = await admin
    .from('skill_definitions')
    .update({ name: name.trim(), sort_order: sortOrder, category_id: categoryId || null })
    .eq('id', id)
  if (error) throw new Error(error.message)

  revalidatePath('/settings/skills')
  revalidatePath('/skills-matrix')
}

export async function toggleSkillActive(id: string, current: boolean) {
  const { admin } = await requireEditor()

  await admin.from('skill_definitions').update({ is_active: !current }).eq('id', id)

  revalidatePath('/settings/skills')
  revalidatePath('/skills-matrix')
}

export async function deleteSkill(id: string) {
  const { admin } = await requireEditor()

  // Competencies cascade-delete due to FK ON DELETE CASCADE
  await admin.from('skill_definitions').delete().eq('id', id)

  revalidatePath('/settings/skills')
  revalidatePath('/skills-matrix')
}

// ── Skill categories (settings) ──────────────────────────────────────────────

export async function addCategory(name: string) {
  const { admin } = await requireEditor()

  const { data: maxRow } = await admin
    .from('skill_categories')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  const nextOrder = ((maxRow?.sort_order as number) ?? 0) + 10

  const { error } = await admin.from('skill_categories').insert({ name: name.trim(), sort_order: nextOrder })
  if (error) throw new Error(error.message)

  revalidatePath('/settings/skills')
  revalidatePath('/skills-matrix')
}

export async function updateCategory(id: string, name: string, sortOrder: number) {
  const { admin } = await requireEditor()

  const { error } = await admin
    .from('skill_categories')
    .update({ name: name.trim(), sort_order: sortOrder })
    .eq('id', id)
  if (error) throw new Error(error.message)

  revalidatePath('/settings/skills')
  revalidatePath('/skills-matrix')
}

export async function toggleCategoryActive(id: string, current: boolean) {
  const { admin } = await requireEditor()

  await admin.from('skill_categories').update({ is_active: !current }).eq('id', id)

  revalidatePath('/settings/skills')
  revalidatePath('/skills-matrix')
}

export async function deleteCategory(id: string) {
  const { admin } = await requireEditor()

  // skill_definitions.category_id SET NULL on delete (migration FK)
  await admin.from('skill_categories').delete().eq('id', id)

  revalidatePath('/settings/skills')
  revalidatePath('/skills-matrix')
}

// ── User category assignments ────────────────────────────────────────────────

export async function assignUserCategory(userId: string, categoryId: string) {
  const { userId: editorId, admin } = await requireEditor()

  await admin.from('skill_matrix_user_categories').upsert(
    { user_id: userId, category_id: categoryId, assigned_by: editorId },
    { onConflict: 'user_id,category_id', ignoreDuplicates: true }
  )

  revalidatePath(`/profile/${userId}`)
  revalidatePath('/skills-matrix')
}

export async function removeUserCategory(userId: string, categoryId: string) {
  const { admin } = await requireEditor()

  await admin
    .from('skill_matrix_user_categories')
    .delete()
    .eq('user_id', userId)
    .eq('category_id', categoryId)

  revalidatePath(`/profile/${userId}`)
  revalidatePath('/skills-matrix')
}
