import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string; skillId: string }> }
) {
  const { userId, skillId } = await params

  // Auth check
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Users can view their own certificates; admins/managers can view any
  const { data: profile } = await supabase
    .from('users')
    .select('roles(name)')
    .eq('id', user.id)
    .single()
  const role = (profile?.roles as unknown as { name: string } | null)?.name ?? ''
  const canView =
    user.id === userId ||
    role === 'System Admin' ||
    role === 'H&S Manager' ||
    role === 'Read-Only' ||
    role === 'Site Manager'

  if (!canView) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Fetch certificate path — only serve if competent and not revoked
  const admin = createAdminClient()
  const { data: comp } = await admin
    .from('skill_competencies')
    .select('certificate_path, is_competent, revocation_reason')
    .eq('user_id', userId)
    .eq('skill_id', skillId)
    .maybeSingle()

  if (!comp || !comp.certificate_path || !comp.is_competent || comp.revocation_reason) {
    return NextResponse.json({ error: 'Certificate not available' }, { status: 404 })
  }

  // Generate a 1-hour signed URL and redirect to it
  const { data: signed } = await admin.storage
    .from('health-safety-files')
    .createSignedUrl(comp.certificate_path as string, 60 * 60)

  if (!signed?.signedUrl) {
    return NextResponse.json({ error: 'Could not generate URL' }, { status: 500 })
  }

  return NextResponse.redirect(signed.signedUrl)
}
