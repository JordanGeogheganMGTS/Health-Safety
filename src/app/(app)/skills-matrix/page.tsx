import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { SkillsMatrixGrid } from './SkillsMatrixGrid'

export default async function SkillsMatrixPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('id, roles(name)')
    .eq('id', user.id)
    .single()

  const role = (profile?.roles as unknown as { name: string } | null)?.name ?? ''

  // Only System Admin, H&S Manager, and Read-Only see the full matrix
  // Site Manager and TDA/Staff see their own row on their profile page
  if (role !== 'System Admin' && role !== 'H&S Manager' && role !== 'Read-Only') {
    redirect(`/profile/${user.id}`)
  }

  const canEdit = role === 'System Admin' || role === 'H&S Manager'

  const admin = createAdminClient()

  const [skillsRes, membersRes] = await Promise.all([
    admin
      .from('skill_definitions')
      .select('id, name, sort_order')
      .eq('is_active', true)
      .order('sort_order'),
    admin
      .from('skill_matrix_members')
      .select(`
        user_id,
        user:users!skill_matrix_members_user_id_fkey(
          id, first_name, last_name,
          site:sites!users_site_id_fkey(name)
        )
      `)
      .order('added_at'),
  ])

  const skills = (skillsRes.data ?? []).map((s) => ({
    id: s.id as string,
    name: s.name as string,
  }))

  const members = (membersRes.data ?? []).map((m) => {
    const u = m.user as unknown as {
      id: string
      first_name: string
      last_name: string
      site: { name: string } | null
    }
    return {
      userId: u.id,
      firstName: u.first_name,
      lastName: u.last_name,
      siteName: u.site?.name ?? null,
    }
  }).sort((a, b) => a.lastName.localeCompare(b.lastName))

  // Fetch all competencies for these members
  const memberIds = members.map((m) => m.userId)
  let competencies: Record<string, boolean> = {}

  if (memberIds.length > 0) {
    const { data: compRows } = await admin
      .from('skill_competencies')
      .select('user_id, skill_id, is_competent')
      .in('user_id', memberIds)

    for (const row of compRows ?? []) {
      competencies[`${row.user_id}_${row.skill_id}`] = row.is_competent as boolean
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Skills Matrix</h1>
        <p className="text-sm text-slate-500 mt-1">
          Competency overview for delivery staff
          {!canEdit && <span className="ml-1 text-slate-400">&middot; Read-only view</span>}
        </p>
      </div>

      <SkillsMatrixGrid
        skills={skills}
        members={members}
        competencies={competencies}
        canEdit={canEdit}
      />
    </div>
  )
}
