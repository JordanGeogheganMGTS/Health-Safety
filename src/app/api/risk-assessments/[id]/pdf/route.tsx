import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import path from 'path'
import React from 'react'
import {
  Document, Page, Text, View, StyleSheet, renderToBuffer, Font, Image,
} from '@react-pdf/renderer'

Font.registerHyphenationCallback((word) => [word])

const LOGO_PATH = path.join(process.cwd(), 'public', 'logo.png')

// ── Colour palette ────────────────────────────────────────────────────────────
const C = {
  orange: '#f97316',
  orangeLight: '#fff7ed',
  orangeBorder: '#fed7aa',
  slate900: '#0f172a',
  slate700: '#334155',
  slate500: '#64748b',
  slate300: '#cbd5e1',
  slate100: '#f1f5f9',
  slate50: '#f8fafc',
  white: '#ffffff',
  green: '#16a34a',
  amber: '#d97706',
  red: '#dc2626',
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 9, color: C.slate700, backgroundColor: C.white, paddingTop: 62, paddingBottom: 40 },
  // Header
  header: { position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: C.orange, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 12 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerLogo: { height: 26, backgroundColor: C.white, borderRadius: 3, padding: 3 },
  headerBrand: { color: C.white, fontSize: 14, fontFamily: 'Helvetica-Bold' },
  headerSub: { color: '#fff7ed', fontSize: 7 },
  headerDate: { color: '#fff7ed', fontSize: 7, textAlign: 'right' },
  // Title band
  titleBand: { backgroundColor: C.orangeLight, borderBottomWidth: 1, borderBottomColor: C.orangeBorder, paddingHorizontal: 24, paddingVertical: 10 },
  titleText: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: C.slate900 },
  // Body
  body: { paddingHorizontal: 24, paddingTop: 16 },
  // Info grid
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  infoCell: { width: '22%', backgroundColor: C.slate50, borderWidth: 1, borderColor: C.slate300, borderRadius: 4, padding: 7 },
  infoLabel: { fontSize: 6, fontFamily: 'Helvetica-Bold', color: C.slate500, textTransform: 'uppercase', marginBottom: 3 },
  infoValue: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: C.slate900 },
  // Section heading
  sectionHeading: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: C.slate900, marginBottom: 6, marginTop: 12, borderBottomWidth: 1, borderBottomColor: C.slate300, paddingBottom: 3 },
  // Hazard card
  hazardCard: { marginBottom: 10, borderWidth: 1, borderColor: C.slate300, borderRadius: 4, overflow: 'hidden' },
  hazardHeader: { backgroundColor: C.slate100, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6 },
  hazardNum: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: C.orange, marginRight: 8 },
  hazardTitle: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: C.slate900, flex: 1 },
  hazardBody: { padding: 10 },
  hazardRow: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  hazardCol: { flex: 1 },
  hazardFieldLabel: { fontSize: 6, fontFamily: 'Helvetica-Bold', color: C.slate500, textTransform: 'uppercase', marginBottom: 2 },
  hazardFieldValue: { fontSize: 8, color: C.slate700 },
  // Rating chips row
  ratingRow: { flexDirection: 'row', gap: 8, marginTop: 4, marginBottom: 4 },
  ratingChip: { width: 28, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  ratingChipText: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: C.white },
  ratingBlock: { alignItems: 'center', gap: 2 },
  ratingBlockLabel: { fontSize: 6, color: C.slate500, textTransform: 'uppercase' },
  // Additional controls highlight
  additionalBox: { backgroundColor: C.orangeLight, borderWidth: 1, borderColor: C.orangeBorder, borderRadius: 3, padding: 7, marginTop: 4 },
  additionalLabel: { fontSize: 6, fontFamily: 'Helvetica-Bold', color: C.orange, textTransform: 'uppercase', marginBottom: 2 },
  additionalText: { fontSize: 8, color: C.slate700 },
  // Footer
  footer: { position: 'absolute', bottom: 16, left: 24, right: 24, flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: C.slate300, paddingTop: 5 },
  footerText: { fontSize: 6, color: C.slate500 },
  pageNum: { fontSize: 6, color: C.slate500 },
})

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDate(d: string | null | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function ratingColor(r: number | null) {
  if (!r) return C.slate300
  if (r <= 4) return C.green
  if (r <= 9) return C.amber
  if (r <= 15) return '#f97316'
  return C.red
}

function ratingLabel(r: number | null) {
  if (!r) return '—'
  if (r <= 4) return 'Low'
  if (r <= 9) return 'Medium'
  if (r <= 15) return 'High'
  return 'Very High'
}

// ── PDF Document ──────────────────────────────────────────────────────────────
interface Hazard {
  id: string
  hazard_description: string
  who_is_affected: string | null
  existing_controls: string | null
  likelihood_before: number
  severity_before: number
  risk_rating_before: number | null
  additional_controls: string | null
  action_due_date: string | null
  likelihood_after: number | null
  severity_after: number | null
  risk_rating_after: number | null
  responsible_person_name: string | null
}

interface RaData {
  title: string
  site_name: string | null
  category_label: string | null
  assessor_name: string | null
  status: string
  assessment_date: string | null
  review_due_date: string | null
  overall_rating: string | null
  hazards: Hazard[]
}

function RaPdf({ ra, generatedAt }: { ra: RaData; generatedAt: string }) {
  const withRatings = ra.hazards.filter((h) => h.risk_rating_before != null)
  const withResidual = ra.hazards.filter((h) => h.risk_rating_after != null)
  const avgRR = withRatings.length
    ? Math.round((withRatings.reduce((s, h) => s + (h.risk_rating_before ?? 0), 0) / withRatings.length) * 10) / 10
    : null
  const avgRes = withResidual.length
    ? Math.round((withResidual.reduce((s, h) => s + (h.risk_rating_after ?? 0), 0) / withResidual.length) * 10) / 10
    : null

  const infoItems = [
    { label: 'Site', value: ra.site_name ?? '—' },
    { label: 'Category', value: ra.category_label ?? '—' },
    { label: 'Assessor', value: ra.assessor_name ?? '—' },
    { label: 'Status', value: ra.status },
    { label: 'Assessment Date', value: fmtDate(ra.assessment_date) },
    { label: 'Review Due', value: fmtDate(ra.review_due_date) },
    { label: 'Avg Risk Rating', value: avgRR ? `${avgRR} — ${ratingLabel(avgRR)}` : '—' },
    { label: 'Avg Residual Risk', value: avgRes ? `${avgRes} — ${ratingLabel(avgRes)}` : '—' },
  ]

  return (
    <Document>
      <Page size="A4" style={s.page} wrap>
        {/* Header */}
        <View style={s.header} fixed>
          <View style={s.headerLeft}>
            <Image src={LOGO_PATH} style={s.headerLogo} />
            <View>
              <Text style={s.headerBrand}>MGTS Sentinel</Text>
              <Text style={s.headerSub}>Health &amp; Safety Management</Text>
            </View>
          </View>
          <Text style={s.headerDate}>Risk Assessment{'\n'}{generatedAt}</Text>
        </View>

        {/* Title */}
        <View style={s.titleBand}>
          <Text style={s.titleText}>{ra.title}</Text>
        </View>

        <View style={s.body}>
          {/* Info grid */}
          <View style={s.infoGrid}>
            {infoItems.map((item) => (
              <View key={item.label} style={s.infoCell}>
                <Text style={s.infoLabel}>{item.label}</Text>
                <Text style={s.infoValue}>{item.value}</Text>
              </View>
            ))}
          </View>

          {/* Hazards */}
          <Text style={s.sectionHeading}>Hazards &amp; Controls ({ra.hazards.length})</Text>

          {ra.hazards.map((h, idx) => (
            <View key={h.id} style={s.hazardCard} wrap={false}>
              <View style={s.hazardHeader}>
                <Text style={s.hazardNum}>#{idx + 1}</Text>
                <Text style={s.hazardTitle}>{h.hazard_description}</Text>
              </View>
              <View style={s.hazardBody}>
                {/* Row 1: persons + existing controls */}
                <View style={s.hazardRow}>
                  <View style={s.hazardCol}>
                    <Text style={s.hazardFieldLabel}>Persons at Risk</Text>
                    <Text style={s.hazardFieldValue}>{h.who_is_affected ?? '—'}</Text>
                  </View>
                  <View style={[s.hazardCol, { flex: 2 }]}>
                    <Text style={s.hazardFieldLabel}>Existing Controls</Text>
                    <Text style={s.hazardFieldValue}>{h.existing_controls ?? '—'}</Text>
                  </View>
                </View>

                {/* Row 2: ratings */}
                <View style={s.ratingRow}>
                  {[
                    { label: 'Likelihood', value: h.likelihood_before },
                    { label: 'Severity', value: h.severity_before },
                    { label: 'Risk Rating', value: h.risk_rating_before, color: ratingColor(h.risk_rating_before) },
                    { label: 'Residual L', value: h.likelihood_after },
                    { label: 'Residual S', value: h.severity_after },
                    { label: 'Residual RR', value: h.risk_rating_after, color: ratingColor(h.risk_rating_after) },
                  ].map((r) => (
                    <View key={r.label} style={s.ratingBlock}>
                      <Text style={s.ratingBlockLabel}>{r.label}</Text>
                      <View style={[s.ratingChip, { backgroundColor: r.color ?? C.slate300 }]}>
                        <Text style={s.ratingChipText}>{r.value ?? '—'}</Text>
                      </View>
                    </View>
                  ))}
                  <View style={[s.ratingBlock, { flex: 1 }]}>
                    <Text style={s.hazardFieldLabel}>Action Owner</Text>
                    <Text style={s.hazardFieldValue}>{h.responsible_person_name ?? '—'}</Text>
                  </View>
                  <View style={[s.ratingBlock, { flex: 1 }]}>
                    <Text style={s.hazardFieldLabel}>Due Date</Text>
                    <Text style={s.hazardFieldValue}>{fmtDate(h.action_due_date)}</Text>
                  </View>
                </View>

                {/* Additional controls */}
                {h.additional_controls && (
                  <View style={s.additionalBox}>
                    <Text style={s.additionalLabel}>Additional Controls Required</Text>
                    <Text style={s.additionalText}>{h.additional_controls}</Text>
                  </View>
                )}
              </View>
            </View>
          ))}
        </View>

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>MGTS Sentinel — Confidential</Text>
          <Text style={s.pageNum} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}

// ── Route handler ─────────────────────────────────────────────────────────────
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const admin = createAdminClient()

  const [{ data: ra }, { data: hazards }] = await Promise.all([
    admin.from('risk_assessments').select(`
      title, status, assessment_date, review_due_date, overall_rating,
      sites(name),
      assessor:users!risk_assessments_assessed_by_fkey(first_name, last_name),
      category:lookup_values!risk_assessments_category_id_fkey(label)
    `).eq('id', params.id).single(),
    admin.from('ra_hazards').select(`
      id, hazard_description, who_is_affected, existing_controls,
      likelihood_before, severity_before, risk_rating_before,
      additional_controls, action_due_date,
      likelihood_after, severity_after, risk_rating_after,
      responsible_person, rp:users!ra_hazards_responsible_person_fkey(first_name, last_name)
    `).eq('risk_assessment_id', params.id).order('sort_order'),
  ])

  if (!ra) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const site = ra.sites as unknown as { name: string } | null
  const assessor = ra.assessor as unknown as { first_name: string; last_name: string } | null
  const category = ra.category as unknown as { label: string } | null

  const raData: RaData = {
    title: ra.title,
    site_name: site?.name ?? null,
    category_label: category?.label ?? null,
    assessor_name: assessor ? `${assessor.first_name} ${assessor.last_name}` : null,
    status: ra.status,
    assessment_date: ra.assessment_date,
    review_due_date: ra.review_due_date,
    overall_rating: ra.overall_rating,
    hazards: (hazards ?? []).map((h) => {
      const rp = h.rp as unknown as { first_name: string; last_name: string } | null
      return {
        id: h.id,
        hazard_description: h.hazard_description,
        who_is_affected: h.who_is_affected,
        existing_controls: h.existing_controls,
        likelihood_before: h.likelihood_before,
        severity_before: h.severity_before,
        risk_rating_before: h.risk_rating_before,
        additional_controls: h.additional_controls,
        action_due_date: h.action_due_date,
        likelihood_after: h.likelihood_after,
        severity_after: h.severity_after,
        risk_rating_after: h.risk_rating_after,
        responsible_person_name: rp ? `${rp.first_name} ${rp.last_name}` : null,
      }
    }),
  }

  const generatedAt = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

  const buffer = await renderToBuffer(<RaPdf ra={raData} generatedAt={generatedAt} />)
  const slug = ra.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase().slice(0, 60)

  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="risk-assessment-${slug}.pdf"`,
    },
  })
}
