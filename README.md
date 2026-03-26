# MGTS Health & Safety Management System

A comprehensive Health & Safety management platform for Midlands Group Training Services, built with Next.js 14, Supabase, and Tailwind CSS.

## Tech Stack

- **Framework**: Next.js 14 (App Router, TypeScript)
- **Database / Auth / Storage**: Supabase (PostgreSQL, Row-Level Security, Supabase Auth, Supabase Storage)
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui (Radix UI primitives)
- **Forms**: React Hook Form + Zod
- **Excel Export**: xlsx (SheetJS)
- **Date Utilities**: date-fns

## Modules

| Module | Description |
|---|---|
| Dashboard | Live stat tiles, upcoming requirements, overdue items, open corrective actions |
| Document Library | Upload and version-control H&S documents with review date tracking |
| Risk Assessments | Full hazard/control matrix with 5×5 risk scoring |
| Method Statements | Ordered task steps with hazards and controls per step |
| COSHH Assessments | Substance register with exposure routes, controls, and emergency procedures |
| Contractor Management | Approved contractor register with insurance expiry tracking |
| Equipment Register | Plant and machinery register with service record log |
| Fire Safety | Extinguisher register, alarm test log, fire drill records |
| Inspections & Audits | Template-driven checklists with auto-created corrective actions |
| Incident Log | Full incident reporting including RIDDOR tracking |
| Corrective Actions | Central action tracker — auto-created from inspections, incidents, DSE, fire alarm failures |
| Training Records | Per-user training log with certificate upload and expiry tracking |
| PPE Management | Per-user PPE issuance with size tracking and review date alerts |
| DSE Assessments | Full HSE DSE Workstation Checklist (26 questions, 7 sections) with CA auto-creation |
| Reports | Excel export for all modules including DSE compliance report |
| System Settings | Sites, users, roles, dropdown lookups, inspection templates, system thresholds |

## User Roles

| Role | Access |
|---|---|
| System Admin | Full unrestricted access including system configuration |
| H&S Manager | Full access to all H&S modules across both sites |
| Site Manager | Full access scoped to their assigned site only |
| TDA / Staff | Log incidents, view own records, conduct equipment checks |
| Read-Only | View-only access, can export reports |

Row-Level Security is enforced at the **database layer** via Supabase RLS policies — site scoping cannot be bypassed via the frontend.

## Prerequisites

- Node.js 18+
- [Supabase CLI](https://supabase.com/docs/guides/cli)
- A Supabase project (free tier works for development)

## Local Development Setup

### 1. Clone and install dependencies

```bash
git clone <repo-url>
cd health-safety
npm install
```

### 2. Set up Supabase locally

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Start local Supabase stack (requires Docker)
supabase start
```

This starts a local PostgreSQL database, Auth server, and Storage server.

### 3. Configure environment variables

Copy the example env file and fill in the values:

```bash
cp .env.local.example .env.local
```

For **local development**, get the values from:

```bash
supabase status
```

This outputs your local `API URL`, `anon key`, and `service_role key`.

```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key from supabase status>
SUPABASE_SERVICE_ROLE_KEY=<service_role key from supabase status>
```

### 4. Run database migrations

```bash
supabase db push
```

This applies all 18 migration files in `supabase/migrations/` in order, including the full seed data (roles, sites, lookups, PPE items, DSE questions, system settings).

### 5. Create the first System Admin user

After migrations run, create your admin account via the Supabase local dashboard at `http://127.0.0.1:54323`:

1. Go to **Authentication → Users → Add user**
2. Enter your email and a temporary password
3. Copy the user's UUID
4. Go to **Table Editor → users**
5. Insert a row:
   - `id`: the UUID from step 3
   - `email`: your email
   - `first_name` / `last_name`: your name
   - `role_id`: the UUID of the 'System Admin' role (check the `roles` table)
   - `is_active`: `true`

### 6. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Log in with the credentials you set in step 5.

## Production Deployment

### Supabase (hosted)

1. Create a project at [supabase.com](https://supabase.com)
2. Get your project URL and keys from **Project Settings → API**
3. Apply migrations: `supabase db push --db-url <your-db-connection-string>`
4. Set up Storage buckets: create a bucket named `attachments` with RLS enabled

### Next.js (Vercel recommended)

1. Push to GitHub
2. Import the repository in [Vercel](https://vercel.com)
3. Set environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Deploy

### Storage Buckets

Create the following bucket in your Supabase project:

| Bucket | Access | Purpose |
|---|---|---|
| `attachments` | Private (signed URLs) | Documents, certificates, SDS files, training certificates |

## Database Schema Overview

The schema uses 30+ tables across three dependency layers:

**Foundation**: `sites`, `lookup_categories`, `lookup_values`, `system_settings`, `roles`

**Users & Auth**: `users`, `user_permission_overrides`, `audit_log`

**Operational**: `documents`, `risk_assessments`, `ra_hazards`, `method_statements`, `method_statement_steps`, `coshh_assessments`, `contractors`, `contractor_documents`, `equipment`, `equipment_service_records`, `fire_extinguishers`, `fire_extinguisher_inspections`, `fire_alarm_systems`, `fire_alarm_tests`, `fire_drills`, `inspection_templates`, `inspection_template_items`, `inspections`, `inspection_findings`, `incidents`, `corrective_actions`, `training_types`, `training_records`

**People**: `ppe_items`, `user_ppe_records`, `dse_assessments`, `dse_assessment_responses`, `dse_question_templates`

All tables use UUID primary keys. No cascading deletes. All timestamps stored in UTC. All file references stored as relative Supabase Storage object keys (never absolute URLs).

## Row-Level Security

All 35 tables have RLS enabled. Policies use dynamic helper functions — no hardcoded UUIDs:

- `auth_role()` — returns the current user's role name
- `auth_site_id()` — returns the current user's assigned site UUID

Site Managers can only see records for their assigned site. This is enforced at the database layer and cannot be bypassed via the application layer.

## Configurable System Settings

All thresholds are stored in the `system_settings` table and editable by System Admin without code changes:

| Key | Default | Description |
|---|---|---|
| `upcoming_days_warning` | 30 | Days ahead shown in Upcoming Requirements panel |
| `document_review_alert_days` | 60 | Days before document review to flag on dashboard |
| `dse_review_interval_months` | 12 | Months between DSE assessment reviews |
| `fire_drill_interval_months` | 6 | Expected frequency of fire drills |
| `contractor_insurance_warning_days` | 30 | Days before insurance expiry to warn |
| `training_expiry_warning_days` | 60 | Days before training expiry to warn |

## Project Structure

```
src/
├── app/
│   ├── (auth)/           # Login, reset password (no sidebar)
│   ├── (app)/            # All authenticated module pages
│   │   ├── dashboard/
│   │   ├── documents/
│   │   ├── risk-assessments/
│   │   ├── method-statements/
│   │   ├── coshh/
│   │   ├── contractors/
│   │   ├── equipment/
│   │   ├── fire-safety/
│   │   ├── inspections/
│   │   ├── incidents/
│   │   ├── corrective-actions/
│   │   ├── training/
│   │   ├── ppe/
│   │   ├── dse/
│   │   ├── reports/
│   │   └── settings/
│   └── api/
│       ├── dse/           # DSE assessment submission
│       ├── ppe/           # PPE issuance
│       └── reports/       # Excel export endpoints
├── components/
│   └── layout/            # AppShell, Sidebar, Header
└── lib/
    ├── supabase/          # client, server, admin helpers
    ├── permissions.ts     # Role-based permission matrix
    ├── lookups.ts         # Database-driven dropdown helper
    ├── settings.ts        # System settings reader
    ├── storage.ts         # Supabase Storage upload/URL helpers
    ├── dates.ts           # UTC-safe date utilities
    └── export.ts          # Excel workbook builder
```

## Document Change Log Reference

This implementation is based on **Version 3** of the MGTS H&S Management System Design Document (March 2026), prepared by Jordan, Quality & Compliance Manager. Version 3 supersedes all previous versions and incorporates PPE Management and DSE Assessment modules added in v3.
