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

// ── Colours ───────────────────────────────────────────────────────────────────
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
  red50: '#fef2f2',
  red200: '#fecaca',
  red700: '#b91c1c',
  amber50: '#fffbeb',
  amber200: '#fde68a',
  amber700: '#b45309',
  green50: '#f0fdf4',
  green200: '#bbf7d0',
  green700: '#15803d',
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 9, color: C.slate700, backgroundColor: C.white, paddingTop: 62, paddingBottom: 40 },
  header: { position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: C.orange, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 12 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerLogo: { height: 26, backgroundColor: C.white, borderRadius: 3, padding: 3 },
  headerBrand: { color: C.white, fontSize: 14, fontFamily: 'Helvetica-Bold' },
  headerSub: { color: '#fff7ed', fontSize: 7 },
  headerDate: { color: '#fff7ed', fontSize: 7, textAlign: 'right' },
  titleBand: { backgroundColor: C.orangeLight, borderBottomWidth: 1, borderBottomColor: C.orangeBorder, paddingHorizontal: 24, paddingVertical: 10 },
  titleText: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: C.slate900 },
  body: { paddingHorizontal: 24, paddingTop: 16 },
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  infoCell: { width: '22%', backgroundColor: C.slate50, borderWidth: 1, borderColor: C.slate300, borderRadius: 4, padding: 7 },
  infoLabel: { fontSize: 6, fontFamily: 'Helvetica-Bold', color: C.slate500, textTransform: 'uppercase', marginBottom: 3 },
  infoValue: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: C.slate900 },
  sectionHeading: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: C.slate900, marginBottom: 6, marginTop: 12, borderBottomWidth: 1, borderBottomColor: C.slate300, paddingBottom: 3 },
  textBlock: { backgroundColor: C.slate50, borderWidth: 1, borderColor: C.slate300, borderRadius: 4, padding: 10, marginBottom: 10 },
  textBlockContent: { fontSize: 9, color: C.slate700, lineHeight: 1.5 },
  // Side-by-side detail panels
  detailRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  detailPanel: { flex: 1, borderRadius: 4, borderWidth: 1, padding: 10 },
  detailPanelLabel: { fontSize: 7, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', marginBottom: 4 },
  detailPanelText: { fontSize: 9, lineHeight: 1.5 },
  // Emergency panel (red)
  emergencyPanel: { borderColor: C.red200, backgroundColor: C.red50 },
  emergencyLabel: { color: C.red700 },
  emergencyText: { color: C.red700 },
  // PPE panel (green)
  ppePanel: { borderColor: C.green200, backgroundColor: C.green50 },
  ppeLabel: { color: C.green700 },
  ppeText: { color: C.green700 },
  // Equipment panel (amber)
  equipPanel: { borderColor: C.amber200, backgroundColor: C.amber50 },
  equipLabel: { color: C.amber700 },
  equipText: { color: C.amber700 },
  // Steps
  stepCard: { marginBottom: 8, borderWidth: 1, borderColor: C.slate300, borderRadius: 4, overflow: 'hidden' },
  stepHeader: { backgroundColor: C.slate100, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6 },
  stepNum: { width: 18, height: 18, borderRadius: 9, backgroundColor: C.orange, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  stepNumText: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: C.white },
  stepTitle: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: C.slate900 },
  stepBody: { padding: 10 },
  stepDesc: { fontSize: 9, color: C.slate700, marginBottom: 6, lineHeight: 1.5 },
  stepSubRow: { flexDirection: 'row', gap: 8 },
  stepSubPanel: { flex: 1, borderRadius: 3, borderWidth: 1, padding: 7 },
  stepSubLabel: { fontSize: 6, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', marginBottom: 3 },
  stepSubText: { fontSize: 8, lineHeight: 1.4 },
  hazardSubPanel: { borderColor: C.amber200, backgroundColor: C.amber50 },
  hazardSubLabel: { color: C.amber700 },
  hazardSubText: { color: C.amber700 },
  controlSubPanel: { borderColor: C.green200, backgroundColor: C.green50 },
  controlSubLabel: { color: C.green700 },
  controlSubText: { color: C.green700 },
  // Footer
  footer: { position: 'absolute', bottom: 16, left: 24, right: 24, flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: C.slate300, paddingTop: 5 },
  footerText: { fontSize: 6, color: C.slate500 },
  pageNum: { fontSize: 6, color: C.slate500 },
})

function fmtDate(d: string | null | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

interface Step {
  step_number: number
  description: string
  hazards: string | null
  control_measures: string | null
}

interface MsData {
  title: string
  site_name: string | null
  status: string
  author_name: string | null
  category: string | null
  review_due_date: string | null
  description: string | null
  ppe_required: string | null
  plant_equipment: string | null
  emergency_procedures: string | null
  related_ra_title: string | null
  steps: Step[]
}

function MsPdf({ ms, generatedAt }: { ms: MsData; generatedAt: string }) {
  const infoItems = [
    { label: 'Site', value: ms.site_name ?? '—' },
    { label: 'Status', value: ms.status },
    { label: 'Author', value: ms.author_name ?? '—' },
    { label: 'Category', value: ms.category ?? '—' },
    { label: 'Review Due', value: fmtDate(ms.review_due_date) },
    { label: 'Related Risk Assessment', value: ms.related_ra_title ?? '—' },
  ]

  const hasDetails = ms.ppe_required || ms.plant_equipment || ms.emergency_procedures

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
          <Text style={s.headerDate}>Method Statement{'\n'}{generatedAt}</Text>
        </View>

        {/* Title */}
        <View style={s.titleBand}>
          <Text style={s.titleText}>{ms.title}</Text>
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

          {/* Task description */}
          {ms.description && (
            <>
              <Text style={s.sectionHeading}>Task Description</Text>
              <View style={s.textBlock}>
                <Text style={s.textBlockContent}>{ms.description}</Text>
              </View>
            </>
          )}

          {/* PPE / Equipment / Emergency */}
          {hasDetails && (
            <>
              <Text style={s.sectionHeading}>Safety Information</Text>
              <View style={s.detailRow}>
                {ms.ppe_required && (
                  <View style={[s.detailPanel, s.ppePanel]}>
                    <Text style={[s.detailPanelLabel, s.ppeLabel]}>PPE Required</Text>
                    <Text style={[s.detailPanelText, s.ppeText]}>{ms.ppe_required}</Text>
                  </View>
                )}
                {ms.plant_equipment && (
                  <View style={[s.detailPanel, s.equipPanel]}>
                    <Text style={[s.detailPanelLabel, s.equipLabel]}>Plant &amp; Equipment</Text>
                    <Text style={[s.detailPanelText, s.equipText]}>{ms.plant_equipment}</Text>
                  </View>
                )}
              </View>
              {ms.emergency_procedures && (
                <View style={[s.detailPanel, s.emergencyPanel, { marginBottom: 10 }]}>
                  <Text style={[s.detailPanelLabel, s.emergencyLabel]}>Emergency Procedures</Text>
                  <Text style={[s.detailPanelText, s.emergencyText]}>{ms.emergency_procedures}</Text>
                </View>
              )}
            </>
          )}

          {/* Steps */}
          {ms.steps.length > 0 && (
            <>
              <Text style={s.sectionHeading}>Method Sequence ({ms.steps.length} step{ms.steps.length !== 1 ? 's' : ''})</Text>
              {ms.steps.map((step) => (
                <View key={step.step_number} style={s.stepCard} wrap={false}>
                  <View style={s.stepHeader}>
                    <View style={s.stepNum}>
                      <Text style={s.stepNumText}>{step.step_number}</Text>
                    </View>
                    <Text style={s.stepTitle}>Step {step.step_number}</Text>
                  </View>
                  <View style={s.stepBody}>
                    <Text style={s.stepDesc}>{step.description}</Text>
                    {(step.hazards || step.control_measures) && (
                      <View style={s.stepSubRow}>
                        {step.hazards && (
                          <View style={[s.stepSubPanel, s.hazardSubPanel]}>
                            <Text style={[s.stepSubLabel, s.hazardSubLabel]}>Hazards</Text>
                            <Text style={[s.stepSubText, s.hazardSubText]}>{step.hazards}</Text>
                          </View>
                        )}
                        {step.control_measures && (
                          <View style={[s.stepSubPanel, s.controlSubPanel]}>
                            <Text style={[s.stepSubLabel, s.controlSubLabel]}>Controls</Text>
                            <Text style={[s.stepSubText, s.controlSubText]}>{step.control_measures}</Text>
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                </View>
              ))}
            </>
          )}
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

  const [{ data: ms }, { data: steps }] = await Promise.all([
    admin.from('method_statements').select(`
      title, status, description, category, ppe_required, plant_equipment, emergency_procedures, review_due_date, risk_assessment_id,
      sites(name),
      author:users!method_statements_authored_by_fkey(first_name, last_name),
      related_ra:risk_assessments!method_statements_risk_assessment_id_fkey(title)
    `).eq('id', params.id).single(),
    admin.from('method_statement_steps').select('step_number, description, hazards, control_measures')
      .eq('method_statement_id', params.id).order('step_number'),
  ])

  if (!ms) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const site = ms.sites as unknown as { name: string } | null
  const author = ms.author as unknown as { first_name: string; last_name: string } | null
  const relatedRA = ms.related_ra as unknown as { title: string } | null

  const msData: MsData = {
    title: ms.title,
    site_name: site?.name ?? null,
    status: ms.status,
    author_name: author ? `${author.first_name} ${author.last_name}` : null,
    category: ms.category,
    review_due_date: ms.review_due_date,
    description: ms.description,
    ppe_required: ms.ppe_required,
    plant_equipment: ms.plant_equipment,
    emergency_procedures: ms.emergency_procedures,
    related_ra_title: relatedRA?.title ?? null,
    steps: (steps ?? []) as Step[],
  }

  const generatedAt = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

  const buffer = await renderToBuffer(<MsPdf ms={msData} generatedAt={generatedAt} />)
  const slug = ms.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase().slice(0, 60)

  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="method-statement-${slug}.pdf"`,
    },
  })
}
