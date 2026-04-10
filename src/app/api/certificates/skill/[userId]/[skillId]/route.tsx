import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import React from 'react'
import { renderToBuffer } from '@react-pdf/renderer'
import { SkillCertificatePdf } from '../../SkillCertificatePdf'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string; skillId: string }> }
) {
  const { userId, skillId } = await params

  // Auth check
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Users can view their own certificates; admins/managers/read-only/site manager can view any
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

  const admin = createAdminClient()

  // Fetch competency + sign-off metadata — only serve if competent and not revoked
  const { data: comp } = await admin
    .from('skill_competencies')
    .select('is_competent, revocation_reason, certificate_signed_by, certificate_signed_at, id')
    .eq('user_id', userId)
    .eq('skill_id', skillId)
    .maybeSingle()

  if (!comp || !comp.is_competent || comp.revocation_reason || !comp.certificate_signed_at) {
    return NextResponse.json({ error: 'Certificate not available' }, { status: 404 })
  }

  // Fetch user name, skill name, and signer name in parallel
  const [userRes, skillRes, signerRes] = await Promise.all([
    admin.from('users').select('first_name, last_name').eq('id', userId).single(),
    admin.from('skill_definitions').select('name').eq('id', skillId).single(),
    admin.from('users').select('first_name, last_name').eq('id', comp.certificate_signed_by as string).single(),
  ])

  if (!userRes.data || !skillRes.data) {
    return NextResponse.json({ error: 'Data not found' }, { status: 404 })
  }

  const userName = `${userRes.data.first_name} ${userRes.data.last_name}`
  const skillName = skillRes.data.name as string
  const signedOffBy = signerRes.data
    ? `${signerRes.data.first_name} ${signerRes.data.last_name}`
    : 'MGTS'

  const signedOffAt = new Date(comp.certificate_signed_at as string).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })

  // Short cert ref: last 8 chars of competency row id
  const certRef = `SKL-${(comp.id as string).slice(-8).toUpperCase()}`

  const buffer = await renderToBuffer(
    <SkillCertificatePdf
      skillName={skillName}
      userName={userName}
      signedOffBy={signedOffBy}
      signedOffAt={signedOffAt}
      certRef={certRef}
    />
  )

  const safeSkill = skillName.replace(/[^a-z0-9]+/gi, '-').toLowerCase().slice(0, 40)
  const safeName = userName.replace(/[^a-z0-9]+/gi, '-').toLowerCase().slice(0, 40)

  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="skill-certificate-${safeSkill}-${safeName}.pdf"`,
    },
  })
}
