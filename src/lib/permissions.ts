import { createClient } from '@/lib/supabase/server'

export type RoleName = 'System Admin' | 'H&S Manager' | 'Site Manager' | 'Staff' | 'Read-Only'
export type AccessLevel = 'full' | 'site' | 'limited' | 'view' | 'none'

export interface ResolvedUser {
  id: string
  email: string
  firstName: string
  lastName: string
  role: RoleName
  siteId: string | null
  isActive: boolean
  dseNotApplicable: boolean
  overrides: Array<{ moduleKey: string; accessLevel: string }>
  can: (module: string, action: 'view' | 'create' | 'edit' | 'delete' | 'approve' | 'manage') => boolean
}

// Permission matrix per role per module action
const PERMISSIONS: Record<RoleName, Record<string, string[]>> = {
  'System Admin': {
    '*': ['view', 'create', 'edit', 'delete', 'approve', 'manage'],
  },
  'H&S Manager': {
    documents: ['view', 'create', 'edit', 'delete', 'approve'],
    risk_assessments: ['view', 'create', 'edit', 'delete', 'approve'],
    method_statements: ['view', 'create', 'edit', 'approve'],
    coshh_assessments: ['view', 'create', 'edit', 'approve'],
    contractors: ['view', 'create', 'edit', 'approve'],
    contractor_documents: ['view', 'create'],
    equipment: ['view', 'create', 'edit'],
    fire_safety: ['view', 'create', 'edit'],
    inspections: ['view', 'create', 'edit', 'approve'],
    inspection_templates: ['view', 'create', 'edit'],
    incidents: ['view', 'create', 'edit'],
    corrective_actions: ['view', 'create', 'edit'],
    training: ['view', 'create', 'edit'],
    ppe: ['view', 'create', 'edit'],
    dse: ['view', 'create', 'edit'],
    reports: ['view'],
    audit_log: ['view'],
    dashboard: ['view'],
  },
  'Site Manager': {
    // Read-only access to all sections (site-scoped via RLS)
    documents: ['view'],
    risk_assessments: ['view'],
    method_statements: ['view'],
    coshh_assessments: ['view'],
    contractors: ['view'],
    contractor_documents: ['view'],
    equipment: ['view'],
    fire_safety: ['view'],
    inspections: ['view'],
    incidents: ['view'],
    corrective_actions: ['view'],
    training: ['view'],
    ppe: ['view'],
    dse: ['view'],
    reports: ['view'],
    dashboard: ['view'],
  },
  'Staff': {
    // Read-only access to limited sections; own training/ppe/dse only (enforced in queries)
    documents: ['view'],
    risk_assessments: ['view'],
    method_statements: ['view'],
    coshh_assessments: ['view'],
    equipment: ['view'],
    training: ['view'],
    ppe: ['view'],
    dse: ['view'],
  },
  'Read-Only': {
    documents: ['view'],
    risk_assessments: ['view'],
    method_statements: ['view'],
    coshh_assessments: ['view'],
    contractors: ['view'],
    equipment: ['view'],
    fire_safety: ['view'],
    inspections: ['view'],
    incidents: ['view'],
    corrective_actions: ['view'],
    training: ['view'],
    ppe: ['view'],
    dse: ['view'],
    reports: ['view'],
    dashboard: ['view'],
  },
}

function resolvePermission(
  role: RoleName,
  overrides: Array<{ moduleKey: string; accessLevel: string }>,
  module: string,
  action: string
): boolean {
  // System Admin has all
  if (role === 'System Admin') return true

  // Check override first
  const override = overrides.find((o) => o.moduleKey === module)
  if (override) {
    if (override.accessLevel === 'full') return true
    if (override.accessLevel === 'limited' && ['view', 'create'].includes(action)) return true
    if (override.accessLevel === 'view' && action === 'view') return true
  }

  // Check role matrix
  const rolePerms = PERMISSIONS[role]
  const modulePerms = rolePerms[module] ?? rolePerms['*'] ?? []
  return modulePerms.includes(action)
}

export async function getAuthUser(): Promise<ResolvedUser | null> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from('users')
    .select('*, roles(name)')
    .eq('id', user.id)
    .single()

  if (!profile || !profile.is_active) return null

  const { data: overrides } = await supabase
    .from('user_permission_overrides')
    .select('module_key, access_level')
    .eq('user_id', user.id)
    .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())

  const role = (profile.roles as unknown as { name: string }).name as RoleName
  const resolvedOverrides = (overrides ?? []).map((o) => ({
    moduleKey: o.module_key as string,
    accessLevel: o.access_level as string,
  }))

  return {
    id: user.id,
    email: profile.email,
    firstName: profile.first_name,
    lastName: profile.last_name,
    role,
    siteId: profile.site_id,
    isActive: profile.is_active,
    dseNotApplicable: profile.dse_not_applicable,
    overrides: resolvedOverrides,
    can(module, action) {
      return resolvePermission(role, resolvedOverrides, module, action)
    },
  }
}
