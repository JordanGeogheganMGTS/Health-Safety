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
  red: '#dc2626',
  redLight: '#fef2f2',
  redBorder: '#fecaca',
  amber: '#d97706',
  amberLight: '#fffbeb',
  amberBorder: '#fde68a',
}

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
  titleSub: { fontSize: 8, color: C.slate500, marginTop: 2 },
  body: { paddingHorizontal: 24, paddingTop: 16 },
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  infoCell: { width: '22%', backgroundColor: C.slate50, borderWidth: 1, borderColor: C.slate300, borderRadius: 4, padding: 7 },
  infoLabel: { fontSize: 6, fontFamily: 'Helvetica-Bold', color: C.slate500, textTransform: 'uppercase', marginBottom: 3 },
  infoValue: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: C.slate900 },
  sectionHeading: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: C.slate900, marginBottom: 6, marginTop: 12, borderBottomWidth: 1, borderBottomColor: C.slate300, paddingBottom: 3 },
  sectionBox: { borderWidth: 1, borderColor: C.slate300, borderRadius: 4, padding: 10, marginBottom: 10 },
  fieldLabel: { fontSize: 6, fontFamily: 'Helvetica-Bold', color: C.slate500, textTransform: 'uppercase', marginBottom: 2 },
  fieldValue: { fontSize: 8, color: C.slate700, marginBottom: 6 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 4 },
  tag: { backgroundColor: C.amberLight, borderWidth: 1, borderColor: C.amberBorder, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 },
  tagText: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: C.amber },
  twoCol: { flexDirection: 'row', gap: 10 },
  col: { flex: 1 },
  emergencyBox: { borderWidth: 1, borderColor: C.redBorder, borderRadius: 4, padding: 10, marginBottom: 10, backgroundColor: C.redLight },
  emergencyHeading: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: C.red, marginBottom: 6, borderBottomWidth: 1, borderBottomColor: C.redBorder, paddingBottom: 3 },
  emergencyLabel: { fontSize: 6, fontFamily: 'Helvetica-Bold', color: C.red, textTransform: 'uppercase', marginBottom: 2 },
  footer: { position: 'absolute', bottom: 16, left: 24, right: 24, flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: C.slate300, paddingTop: 5 },
  footerText: { fontSize: 6, color: C.slate500 },
  pageNum: { fontSize: 6, color: C.slate500 },
})

function fmtDate(d: string | null | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

interface CoshhData {
  product_name: string
  supplier: string | null
  product_reference: string | null
  cas_number: string | null
  location_of_use: string | null
  quantity_used: string | null
  frequency_of_use: string | null
  description_of_use: string | null
  site_name: string | null
  status: string
  version: string | null
  assessment_date: string | null
  review_due_date: string | null
  assessor_name: string | null
  approver_name: string | null
  approved_at: string | null
  // hazards
  is_flammable: boolean
  is_oxidising: boolean
  is_toxic: boolean
  is_corrosive: boolean
  is_irritant: boolean
  is_harmful: boolean
  is_carcinogenic: boolean
  is_sensitiser: boolean
  other_hazards: string | null
  // exposure
  exposure_inhalation: boolean
  exposure_skin: boolean
  exposure_ingestion: boolean
  exposure_eyes: boolean
  // controls
  engineering_controls: string | null
  ppe_required: string | null
  storage_requirements: string | null
  disposal_method: string | null
  // emergency
  first_aid_measures: string | null
  spillage_procedure: string | null
}

function CoshhPdf({ ca, generatedAt }: { ca: CoshhData; generatedAt: string }) {
  const hazardTags = [
    ca.is_flammable && 'Flammable',
    ca.is_oxidising && 'Oxidising',
    ca.is_toxic && 'Toxic',
    ca.is_corrosive && 'Corrosive',
    ca.is_irritant && 'Irritant',
    ca.is_harmful && 'Harmful',
    ca.is_carcinogenic && 'Carcinogenic',
    ca.is_sensitiser && 'Sensitiser',
  ].filter(Boolean) as string[]

  const exposureTags = [
    ca.exposure_inhalation && 'Inhalation',
    ca.exposure_skin && 'Skin Contact',
    ca.exposure_ingestion && 'Ingestion',
    ca.exposure_eyes && 'Eyes',
  ].filter(Boolean) as string[]

  const infoItems = [
    { label: 'Site', value: ca.site_name ?? '—' },
    { label: 'Supplier', value: ca.supplier ?? '—' },
    { label: 'Product Ref', value: ca.product_reference ?? '—' },
    { label: 'CAS Number', value: ca.cas_number ?? '—' },
    { label: 'Status', value: ca.status },
    { label: 'Version', value: ca.version ? `v${ca.version}` : '—' },
    { label: 'Assessment Date', value: fmtDate(ca.assessment_date) },
    { label: 'Review Due', value: fmtDate(ca.review_due_date) },
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
          <Text style={s.headerDate}>COSHH Assessment{'\n'}{generatedAt}</Text>
        </View>

        {/* Title */}
        <View style={s.titleBand}>
          <Text style={s.titleText}>{ca.product_name}</Text>
          <Text style={s.titleSub}>Control of Substances Hazardous to Health</Text>
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

          {/* Product use */}
          {(ca.location_of_use || ca.quantity_used || ca.frequency_of_use || ca.description_of_use) && (
            <>
              <Text style={s.sectionHeading}>Product Use</Text>
              <View style={s.sectionBox}>
                <View style={s.twoCol}>
                  {ca.location_of_use && (
                    <View style={s.col}>
                      <Text style={s.fieldLabel}>Location of Use</Text>
                      <Text style={s.fieldValue}>{ca.location_of_use}</Text>
                    </View>
                  )}
                  {ca.quantity_used && (
                    <View style={s.col}>
                      <Text style={s.fieldLabel}>Quantity Used</Text>
                      <Text style={s.fieldValue}>{ca.quantity_used}</Text>
                    </View>
                  )}
                  {ca.frequency_of_use && (
                    <View style={s.col}>
                      <Text style={s.fieldLabel}>Frequency of Use</Text>
                      <Text style={s.fieldValue}>{ca.frequency_of_use}</Text>
                    </View>
                  )}
                </View>
                {ca.description_of_use && (
                  <>
                    <Text style={s.fieldLabel}>Description of Use</Text>
                    <Text style={[s.fieldValue, { marginBottom: 0 }]}>{ca.description_of_use}</Text>
                  </>
                )}
              </View>
            </>
          )}

          {/* Hazard Information */}
          <Text style={s.sectionHeading}>Hazard Information</Text>
          <View style={s.sectionBox}>
            <Text style={s.fieldLabel}>Hazard Classifications</Text>
            {hazardTags.length > 0 ? (
              <View style={s.tagsRow}>
                {hazardTags.map((t) => (
                  <View key={t} style={s.tag}>
                    <Text style={s.tagText}>{t}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={[s.fieldValue, { marginBottom: 6 }]}>None specified</Text>
            )}
            <Text style={[s.fieldLabel, { marginTop: 6 }]}>Exposure Routes</Text>
            {exposureTags.length > 0 ? (
              <View style={s.tagsRow}>
                {exposureTags.map((t) => (
                  <View key={t} style={s.tag}>
                    <Text style={s.tagText}>{t}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={[s.fieldValue, { marginBottom: 0 }]}>None specified</Text>
            )}
            {ca.other_hazards && (
              <>
                <Text style={[s.fieldLabel, { marginTop: 6 }]}>Other Hazards</Text>
                <Text style={[s.fieldValue, { marginBottom: 0 }]}>{ca.other_hazards}</Text>
              </>
            )}
          </View>

          {/* Controls */}
          {(ca.engineering_controls || ca.ppe_required || ca.storage_requirements || ca.disposal_method) && (
            <>
              <Text style={s.sectionHeading}>Controls</Text>
              <View style={s.sectionBox}>
                {ca.engineering_controls && (
                  <>
                    <Text style={s.fieldLabel}>Engineering Controls</Text>
                    <Text style={s.fieldValue}>{ca.engineering_controls}</Text>
                  </>
                )}
                {ca.ppe_required && (
                  <>
                    <Text style={s.fieldLabel}>PPE Required</Text>
                    <Text style={s.fieldValue}>{ca.ppe_required}</Text>
                  </>
                )}
                <View style={s.twoCol}>
                  {ca.storage_requirements && (
                    <View style={s.col}>
                      <Text style={s.fieldLabel}>Storage Requirements</Text>
                      <Text style={[s.fieldValue, { marginBottom: 0 }]}>{ca.storage_requirements}</Text>
                    </View>
                  )}
                  {ca.disposal_method && (
                    <View style={s.col}>
                      <Text style={s.fieldLabel}>Disposal Method</Text>
                      <Text style={[s.fieldValue, { marginBottom: 0 }]}>{ca.disposal_method}</Text>
                    </View>
                  )}
                </View>
              </View>
            </>
          )}

          {/* Emergency Information */}
          {(ca.first_aid_measures || ca.spillage_procedure) && (
            <View style={s.emergencyBox}>
              <Text style={s.emergencyHeading}>Emergency Information</Text>
              {ca.first_aid_measures && (
                <>
                  <Text style={s.emergencyLabel}>First Aid Measures</Text>
                  <Text style={s.fieldValue}>{ca.first_aid_measures}</Text>
                </>
              )}
              {ca.spillage_procedure && (
                <>
                  <Text style={s.emergencyLabel}>Spillage Procedure</Text>
                  <Text style={[s.fieldValue, { marginBottom: 0 }]}>{ca.spillage_procedure}</Text>
                </>
              )}
            </View>
          )}

          {/* Assessment Details */}
          <Text style={s.sectionHeading}>Assessment Details</Text>
          <View style={s.sectionBox}>
            <View style={s.twoCol}>
              <View style={s.col}>
                <Text style={s.fieldLabel}>Assessed By</Text>
                <Text style={s.fieldValue}>{ca.assessor_name ?? '—'}</Text>
              </View>
              <View style={s.col}>
                <Text style={s.fieldLabel}>Approved By</Text>
                <Text style={s.fieldValue}>{ca.approver_name ?? '—'}</Text>
              </View>
              <View style={s.col}>
                <Text style={s.fieldLabel}>Approval Date</Text>
                <Text style={[s.fieldValue, { marginBottom: 0 }]}>{fmtDate(ca.approved_at)}</Text>
              </View>
            </View>
          </View>
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

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const admin = createAdminClient()

  const { data: ca } = await admin
    .from('coshh_assessments')
    .select(`
      product_name, supplier, product_reference, cas_number,
      location_of_use, quantity_used, frequency_of_use, description_of_use,
      status, version, assessment_date, review_due_date, approved_at,
      is_flammable, is_oxidising, is_toxic, is_corrosive, is_irritant,
      is_harmful, is_carcinogenic, is_sensitiser, other_hazards,
      exposure_inhalation, exposure_skin, exposure_ingestion, exposure_eyes,
      engineering_controls, ppe_required, storage_requirements, disposal_method,
      first_aid_measures, spillage_procedure,
      sites(name),
      assessor:users!coshh_assessments_assessed_by_fkey(first_name, last_name),
      approver:users!coshh_assessments_approved_by_fkey(first_name, last_name)
    `)
    .eq('id', params.id)
    .single()

  if (!ca) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const site = ca.sites as unknown as { name: string } | null
  const assessor = ca.assessor as unknown as { first_name: string; last_name: string } | null
  const approver = ca.approver as unknown as { first_name: string; last_name: string } | null

  const caData: CoshhData = {
    product_name: ca.product_name,
    supplier: ca.supplier,
    product_reference: ca.product_reference,
    cas_number: ca.cas_number,
    location_of_use: ca.location_of_use,
    quantity_used: ca.quantity_used,
    frequency_of_use: ca.frequency_of_use,
    description_of_use: ca.description_of_use,
    site_name: site?.name ?? null,
    status: ca.status,
    version: ca.version,
    assessment_date: ca.assessment_date,
    review_due_date: ca.review_due_date,
    assessor_name: assessor ? `${assessor.first_name} ${assessor.last_name}` : null,
    approver_name: approver ? `${approver.first_name} ${approver.last_name}` : null,
    approved_at: ca.approved_at,
    is_flammable: ca.is_flammable,
    is_oxidising: ca.is_oxidising,
    is_toxic: ca.is_toxic,
    is_corrosive: ca.is_corrosive,
    is_irritant: ca.is_irritant,
    is_harmful: ca.is_harmful,
    is_carcinogenic: ca.is_carcinogenic,
    is_sensitiser: ca.is_sensitiser,
    other_hazards: ca.other_hazards,
    exposure_inhalation: ca.exposure_inhalation,
    exposure_skin: ca.exposure_skin,
    exposure_ingestion: ca.exposure_ingestion,
    exposure_eyes: ca.exposure_eyes,
    engineering_controls: ca.engineering_controls,
    ppe_required: ca.ppe_required,
    storage_requirements: ca.storage_requirements,
    disposal_method: ca.disposal_method,
    first_aid_measures: ca.first_aid_measures,
    spillage_procedure: ca.spillage_procedure,
  }

  const generatedAt = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

  const buffer = await renderToBuffer(<CoshhPdf ca={caData} generatedAt={generatedAt} />)
  const slug = ca.product_name.replace(/[^a-z0-9]+/gi, '-').toLowerCase().slice(0, 60)

  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="coshh-assessment-${slug}.pdf"`,
    },
  })
}
