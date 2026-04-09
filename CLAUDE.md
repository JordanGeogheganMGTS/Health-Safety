# MGTS Sentinel — Health & Safety App

## What This Is
An internal Health & Safety management platform for MGTS (a training provider). Built with Next.js, Supabase, and deployed on Vercel. Used by MGTS staff to manage documents, risk assessments, incidents, training records, corrective actions, and more.

## Tech Stack
- **Framework:** Next.js 14 App Router (TypeScript)
- **Database + Auth:** Supabase (Postgres + Auth + Storage)
- **Styling:** Tailwind CSS — orange (`orange-500`) is the primary accent colour
- **Deployment:** Vercel
- **PDF generation:** `@react-pdf/renderer` v4 (configured as `serverExternalPackages`)
- **Analytics:** Vercel Speed Insights

## Repository & Branch
- Repo: `JordanGeogheganMGTS/Health-Safety`
- Active development branch: `claude/health-safety-system-OOyee`
- Always push to both `main` and `claude/health-safety-system-OOyee`

## Project Structure
```
src/
  app/
    (app)/          ← all authenticated app routes (wrapped by AppShell)
      layout.tsx    ← fetches user profile, overdue CA count, pending acks count
      dashboard/
      documents/
      risk-assessments/
      method-statements/
      coshh/
      contractors/
      equipment/
      fire-safety/
      inspections/
      incidents/
      corrective-actions/
      training/
      ppe/
      dse/
      reports/
      skills-matrix/
      acknowledgements/   ← "My Reading" page
      profile/[id]/
      settings/
        general/
        sites/
        users/
        lookups/
        skills/           ← skill definitions for skills matrix
        emergency-lights/
        fire-alarm-systems/
        templates/
    (auth)/         ← login, change-password
    api/
      risk-assessments/[id]/pdf/   ← PDF download route
      method-statements/[id]/pdf/  ← PDF download route
  components/
    layout/
      AppShell.tsx        ← top-level shell, passes pendingAcknowledgements to Sidebar
      Sidebar.tsx         ← nav with role-based visibility + pending acks badge
      Header.tsx
    AcknowledgeButton.tsx
    AssignAcknowledgementButton.tsx
    ResetAcknowledgementButton.tsx
    MatrixMembershipButton.tsx
    ProfileSkillsSection.tsx
  lib/
    supabase/
      server.ts     ← createClient() — async, uses cookies
      client.ts     ← createClient() — browser client
      admin.ts      ← createAdminClient() — service role key, bypasses RLS
    permissions.ts  ← getAuthUser(), ResolvedUser, role permission matrix
    dates.ts        ← formatDate(), formatDateTime(), isOverdue(), isDueWithin()
  middleware.ts     ← auth guard + role-based route restrictions
```

## Roles & Permissions
Five roles (stored in `roles` table, referenced via `users.role_id`):

| Role | Access |
|------|--------|
| `System Admin` | Full access to everything including Settings |
| `H&S Manager` | Full CRUD on all H&S content, no Settings |
| `Site Manager` | View-only (site-scoped via RLS) |
| `Staff` | View own training/PPE/DSE/docs/matrix row only |
| `Read-Only` | View-only all modules |

Permission matrix is in `src/lib/permissions.ts`. Use `getAuthUser()` in server components, then `authUser.can('module', 'action')` to gate UI.

The `auth_role()` Postgres function (defined in migration 00017) returns the user's role name from the `roles` table — used in all RLS policies.

## Key Patterns

### Supabase clients
```typescript
// Server component / server action — respects RLS
const supabase = await createClient()

// Bypasses RLS — use for admin operations
const admin = createAdminClient()  // synchronous, no await
```

### Server actions
Define in a `actions.ts` file with `'use server'` at the top. Import directly into client components. Use `revalidatePath()` to bust cache.

### Permission gating in server components
```typescript
import { getAuthUser } from '@/lib/permissions'
const authUser = await getAuthUser()
const canEdit = authUser?.can('documents', 'edit') ?? false
```

### AppShell props
`AppShell` receives `user`, `sites`, `notificationCount` (overdue CAs), and `pendingAcknowledgements` (unread ack count). These are all fetched in `src/app/(app)/layout.tsx`.

### PDF routes
API routes at `src/app/api/[module]/[id]/pdf/route.tsx` using `@react-pdf/renderer`. Return `new Response(new Uint8Array(buffer), { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="..."' } })`. Use fixed+absolute header pattern with `paddingTop` on the page to prevent page 2+ overlap.

## Database Tables (key ones)

### Core
- `roles` — System Admin, H&S Manager, Site Manager, Staff, Read-Only
- `users` — extends Supabase Auth; has `role_id`, `site_id`, `is_active`, `dse_not_applicable`, `must_change_password`
- `sites` — one record has `is_all_sites = true` (the "All Sites" admin site)
- `lookup_categories` / `lookup_values` — generic dropdown data (category types, priorities, etc.)

### H&S Content
- `documents` — file attachments via Supabase Storage bucket `health-safety-files`
- `risk_assessments` + `ra_hazards` — hazards have `responsible_person` UUID, `additional_controls` with due dates
- `method_statements` + `method_statement_steps` — linked to RA via `risk_assessment_id`
- `coshh_assessments` — chemical risk assessments
- `contractors` + `contractor_documents`
- `equipment`
- `fire_safety_checks` + `fire_alarm_systems` + `fire_alarm_tests` + `emergency_light_fittings` + `emergency_light_tests`
- `inspections` + `inspection_templates` + `inspection_template_items` + `inspection_responses`
- `incidents`
- `corrective_actions` — statuses: Open, In Progress, Overdue, Completed, Verified, Cancelled, Closed. Auto-set to Overdue in `layout.tsx` fire-and-forget. Source can be `ra_hazards` (linked from RA page).
- `training_types` + `training_records`
- `ppe_items` + `user_ppe_records`
- `dse_assessments` + `dse_assessment_responses`

### Document Acknowledgements (migration 00034)
- `document_acknowledgements` — polymorphic: `item_type` (document/risk_assessment/method_statement/coshh) + `item_id` UUID + `item_title` (denormalised). Has `acknowledged_at` timestamp. Reset by System Admin with reason. Assigned by admin via `AssignAcknowledgementButton`.

### Skills Matrix (migration 00035)
- `skill_definitions` — column headers, `sort_order`, `is_active`
- `skill_matrix_members` — which users are on the matrix (`user_id` unique)
- `skill_competencies` — `user_id` + `skill_id` + `is_competent` bool. Updated via optimistic UI in `SkillsMatrixGrid` and `ProfileSkillsSection`. Has edit-mode toggle to prevent accidental clicks.

## UI Conventions
- **Cards:** `rounded-xl border border-slate-200 bg-white shadow-sm`
- **Primary button:** `bg-orange-500 hover:bg-orange-600 text-white rounded-lg`
- **Secondary button:** `border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 rounded-lg shadow-sm`
- **Badges:** `inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium`
- **Page header pattern:** `flex items-start justify-between mb-6` with h1 + action buttons in `flex items-center gap-2 shrink-0 flex-wrap justify-end`
- **Tables:** `rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden` with `bg-slate-50` thead
- **No max-width on view pages** — they use full available width. Form/new pages use `max-w-4xl`.
- **Dates:** always use `formatDate()` / `formatDateTime()` from `@/lib/dates`

## Middleware (`src/middleware.ts`)
- Unauthenticated → redirect `/login`
- `must_change_password` → redirect `/change-password`
- `Staff` role → only allowed routes listed in `STAFF_ALLOWED` array (documents, risk-assessments, method-statements, coshh, equipment, training, ppe, dse, profile, change-password, acknowledgements)
- `Read-Only`, `Site Manager`, `Staff` → blocked from `/new` and `/edit` routes
- Non-System-Admin → blocked from `/settings`

## Settings Area (`/settings` — System Admin only)
- General Settings — thresholds
- Site Management
- User Management — create/edit users, assign roles
- Lookup Management — generic dropdown values
- Skills Matrix — manage `skill_definitions`
- Emergency Lights
- Fire Alarm Systems
- Inspection Templates

## Migration Naming
Files are `supabase/migrations/000XX_description.sql`. Next migration number is **00037**.

## Git Workflow
```bash
git add <files>
git commit -m "description\n\nhttps://claude.ai/code/session_..."
git push origin main:claude/health-safety-system-OOyee
git push origin main
```
If push is rejected (non-fast-forward), use `git push origin main:claude/health-safety-system-OOyee` explicitly.
