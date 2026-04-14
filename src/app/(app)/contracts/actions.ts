'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

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

// File is uploaded client-side (browser → Supabase storage directly).
// file_path and file_name arrive as plain strings in formData.
export async function createContract(formData: FormData) {
  const { userId, admin } = await requireEditor()

  const name = (formData.get('name') as string).trim()
  const supplier = (formData.get('supplier') as string)?.trim() || null
  const ownerId = (formData.get('owner_id') as string) || null
  const signedDate = (formData.get('signed_date') as string) || null
  const renewalDate = (formData.get('renewal_date') as string) || null
  const contractValue = (formData.get('contract_value') as string) || null
  const noticePeriodDays = parseInt((formData.get('notice_period_days') as string) || '90', 10)
  const notes = (formData.get('notes') as string)?.trim() || null
  const filePath = (formData.get('file_path') as string) || null
  const fileName = (formData.get('file_name') as string) || null

  const { data: contract, error } = await admin
    .from('contracts')
    .insert({
      name,
      supplier,
      owner_id: ownerId,
      signed_date: signedDate || null,
      renewal_date: renewalDate || null,
      contract_value: contractValue ? parseFloat(contractValue) : null,
      notice_period_days: isNaN(noticePeriodDays) ? 90 : noticePeriodDays,
      notes,
      file_path: filePath,
      file_name: fileName,
      created_by: userId,
      updated_by: userId,
    })
    .select('id')
    .single()

  if (error || !contract) throw new Error(error?.message ?? 'Failed to create contract')

  revalidatePath('/contracts')
  redirect(`/contracts/${contract.id}`)
}

export async function updateContract(id: string, formData: FormData) {
  const { userId, admin } = await requireEditor()

  const name = (formData.get('name') as string).trim()
  const supplier = (formData.get('supplier') as string)?.trim() || null
  const ownerId = (formData.get('owner_id') as string) || null
  const signedDate = (formData.get('signed_date') as string) || null
  const renewalDate = (formData.get('renewal_date') as string) || null
  const contractValue = (formData.get('contract_value') as string) || null
  const noticePeriodDays = parseInt((formData.get('notice_period_days') as string) || '90', 10)
  const notes = (formData.get('notes') as string)?.trim() || null

  // File handled client-side. new_file_path is set if a new file was uploaded.
  // remove_file is set if the user removed the existing file.
  // existing_file_path is the current value to preserve if no change.
  const newFilePath = (formData.get('new_file_path') as string) || null
  const newFileName = (formData.get('new_file_name') as string) || null
  const removeFile = formData.get('remove_file') === 'true'
  const existingFilePath = (formData.get('existing_file_path') as string) || null
  const existingFileName = (formData.get('existing_file_name') as string) || null

  // Delete old storage file when replacing or removing (admin client bypasses bucket policies)
  const pathToDelete = (newFilePath || removeFile) ? existingFilePath : null
  if (pathToDelete) {
    await admin.storage.from('health-safety-files').remove([pathToDelete])
  }

  const finalFilePath = removeFile ? null : (newFilePath ?? existingFilePath)
  const finalFileName = removeFile ? null : (newFileName ?? existingFileName)

  const { error } = await admin
    .from('contracts')
    .update({
      name,
      supplier,
      owner_id: ownerId,
      signed_date: signedDate || null,
      renewal_date: renewalDate || null,
      contract_value: contractValue ? parseFloat(contractValue) : null,
      notice_period_days: isNaN(noticePeriodDays) ? 90 : noticePeriodDays,
      notes,
      file_path: finalFilePath,
      file_name: finalFileName,
      updated_by: userId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) throw new Error(error.message)

  revalidatePath('/contracts')
  revalidatePath(`/contracts/${id}`)
  redirect(`/contracts/${id}`)
}

export async function deleteContract(id: string) {
  const { admin } = await requireEditor()

  const { data: contract } = await admin
    .from('contracts')
    .select('file_path')
    .eq('id', id)
    .single()

  if (contract?.file_path) {
    await admin.storage.from('health-safety-files').remove([contract.file_path as string])
  }

  await admin.from('contracts').delete().eq('id', id)

  revalidatePath('/contracts')
  redirect('/contracts')
}
