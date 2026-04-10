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

// ── Sign-off (DB only — PDF generated on-demand by the API route) ─────────────

export async function signOffSkill(userId: string, skillId: string) {
  const { userId: editorId, admin } = await requireEditor()

  const now = new Date()

  // Fetch user + skill for training record metadata
  const [userRes, skillRes] = await Promise.all([
    admin.from('users').select('first_name, last_name, site_id').eq('id', userId).single(),
    admin.from('skill_definitions').select('name').eq('id', skillId).single(),
  ])

  const user = userRes.data
  const skill = skillRes.data
  if (!user || !skill) throw new Error('Data not found')

  // Resolve site_id (required on training_records)
  let siteId = user.site_id as string | null
  if (!siteId) {
    const { data: allSite } = await admin.from('sites').select('id').eq('is_all_sites', true).limit(1).maybeSingle()
    siteId = (allSite?.id as string | null) ?? null
  }
  if (!siteId) {
    const { data: anySite } = await admin.from('sites').select('id').limit(1).maybeSingle()
    siteId = (anySite?.id as string | null) ?? null
  }
  if (!siteId) throw new Error('No site found for training record')

  // Find or create "Skills Sign-Off" training type
  let { data: trainingType } = await admin
    .from('training_types')
    .select('id')
    .eq('name', 'Skills Sign-Off')
    .limit(1)
    .maybeSingle()

  if (!trainingType) {
    const { data: newType } = await admin
      .from('training_types')
      .insert({
        name: 'Skills Sign-Off',
        description: 'Auto-generated record for MGTS Skills Matrix sign-off certificates',
        provider: 'MGTS',
        is_mandatory: false,
        is_active: true,
      })
      .select('id')
      .single()
    trainingType = newType
  }

  // Upsert competency and get row for training_record_id cleanup
  await admin.from('skill_competencies').upsert(
    { user_id: userId, skill_id: skillId, is_competent: true, updated_at: now.toISOString(), updated_by: editorId },
    { onConflict: 'user_id,skill_id' }
  )
  const { data: compRow } = await admin
    .from('skill_competencies')
    .select('id, training_record_id')
    .eq('user_id', userId)
    .eq('skill_id', skillId)
    .single()

  // Delete previous training record if exists
  if (compRow?.training_record_id) {
    await admin.from('training_records').delete().eq('id', compRow.training_record_id)
  }

  // Create training record — no file path; certificate is generated on-demand via API route
  const { data: trainingRecord } = await admin
    .from('training_records')
    .insert({
      user_id: userId,
      site_id: siteId,
      training_type_id: trainingType!.id,
      completion_date: now.toISOString().split('T')[0],
      provider: 'MGTS',
      result: 'Pass',
      notes: `Skills Matrix sign-off for: ${skill.name}`,
      recorded_by: editorId,
    })
    .select('id')
    .single()

  // Update competency row with sign-off metadata, clearing any revocation
  await admin
    .from('skill_competencies')
    .update({
      is_competent: true,
      certificate_path: null,
      certificate_signed_by: editorId,
      certificate_signed_at: now.toISOString(),
      training_record_id: trainingRecord?.id ?? null,
      revoked_at: null,
      revoked_by: null,
      revocation_reason: null,
      updated_at: now.toISOString(),
      updated_by: editorId,
    })
    .eq('user_id', userId)
    .eq('skill_id', skillId)

  revalidatePath('/skills-matrix')
  revalidatePath(`/profile/${userId}`)
  revalidatePath('/training')
}

// ── Revoke certificate ────────────────────────────────────────────────────────

export async function revokeSkill(userId: string, skillId: string, reason: string) {
  const { userId: editorId, admin } = await requireEditor()

  const { data: comp } = await admin
    .from('skill_competencies')
    .select('certificate_path, training_record_id')
    .eq('user_id', userId)
    .eq('skill_id', skillId)
    .maybeSingle()

  // Delete training record
  if (comp?.training_record_id) {
    await admin.from('training_records').delete().eq('id', comp.training_record_id)
  }

  // Delete certificate from storage if it was ever stored
  if (comp?.certificate_path) {
    await admin.storage.from('health-safety-files').remove([comp.certificate_path as string])
  }

  // Update competency: mark not competent, store revocation info, clear cert fields
  await admin
    .from('skill_competencies')
    .update({
      is_competent: false,
      certificate_path: null,
      certificate_signed_by: null,
      certificate_signed_at: null,
      training_record_id: null,
      revoked_at: new Date().toISOString(),
      revoked_by: editorId,
      revocation_reason: reason.trim(),
      updated_at: new Date().toISOString(),
      updated_by: editorId,
    })
    .eq('user_id', userId)
    .eq('skill_id', skillId)

  revalidatePath('/skills-matrix')
  revalidatePath(`/profile/${userId}`)
  revalidatePath('/training')
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
