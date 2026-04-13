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

export type ContractStatus = 'Active' | 'Expiring Soon' | 'Expired'

export function computeContractStatus(
  renewalDate: string | null,
  noticePeriodDays: number
): ContractStatus {
  if (!renewalDate) return 'Active'

  const today = new Date().toISOString().split('T')[0]
  if (renewalDate < today) return 'Expired'

  // Notice cutoff = renewal_date minus notice_period_days
  const d = new Date(renewalDate + 'T12:00:00')
  d.setDate(d.getDate() - noticePeriodDays)
  const noticeCutoff = d.toISOString().split('T')[0]

  if (noticeCutoff <= today) return 'Expiring Soon'
  return 'Active'
}

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
  const file = formData.get('file') as File | null

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
      created_by: userId,
      updated_by: userId,
    })
    .select('id')
    .single()

  if (error || !contract) throw new Error(error?.message ?? 'Failed to create contract')

  if (file && file.size > 0) {
    const filePath = `contracts/${contract.id}/${file.name}`
    const buffer = await file.arrayBuffer()
    await admin.storage.from('health-safety-files').upload(filePath, buffer, {
      contentType: file.type,
      upsert: true,
    })
    await admin.from('contracts').update({ file_path: filePath, file_name: file.name }).eq('id', contract.id)
  }

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
  const file = formData.get('file') as File | null
  const removeFile = formData.get('remove_file') === 'true'

  const { data: existing } = await admin.from('contracts').select('file_path').eq('id', id).single()
  const existingPath = existing?.file_path as string | null

  let newFilePath: string | null = existingPath
  let newFileName: string | null = (existing as unknown as { file_name: string | null } | null)?.file_name ?? null

  if (file && file.size > 0) {
    // Delete old file and upload new one
    if (existingPath) {
      await admin.storage.from('health-safety-files').remove([existingPath])
    }
    newFilePath = `contracts/${id}/${file.name}`
    newFileName = file.name
    const buffer = await file.arrayBuffer()
    await admin.storage.from('health-safety-files').upload(newFilePath, buffer, {
      contentType: file.type,
      upsert: true,
    })
  } else if (removeFile && existingPath) {
    await admin.storage.from('health-safety-files').remove([existingPath])
    newFilePath = null
    newFileName = null
  }

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
      file_path: newFilePath,
      file_name: newFileName,
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
