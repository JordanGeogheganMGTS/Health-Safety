import { createClient } from '@/lib/supabase/client'

const BUCKET = 'health-safety-files'

export async function uploadFile(
  folder: string,
  file: File
): Promise<{ key: string; error: string | null }> {
  const supabase = createClient()
  const ext = file.name.split('.').pop()
  const key = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const { error } = await supabase.storage.from(BUCKET).upload(key, file, {
    cacheControl: '3600',
    upsert: false,
  })

  if (error) return { key: '', error: error.message }
  return { key, error: null }
}

export function getFileUrl(key: string): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  return `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${key}`
}

export async function deleteFile(key: string): Promise<void> {
  const supabase = createClient()
  await supabase.storage.from(BUCKET).remove([key])
}
