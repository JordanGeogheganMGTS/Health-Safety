import React from 'react'
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'
import path from 'path'

const LOGO_PATH = path.join(process.cwd(), 'public', 'logo.png')

const C = {
  orange: '#EA580C',
  black: '#0f172a',
  slate900: '#0f172a',
  slate700: '#334155',
  slate500: '#64748b',
  slate300: '#cbd5e1',
  slate200: '#e2e8f0',
  slate100: '#f1f5f9',
  white: '#ffffff',
  orangeLight: '#fff7ed',
  orangeBorder: '#fed7aa',
}

const s = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    backgroundColor: C.white,
    paddingTop: 0,
    paddingBottom: 0,
  },
  topBar: {
    height: 10,
    backgroundColor: C.orange,
  },
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 48,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: C.slate200,
  },
  logo: { height: 38 },
  headerRight: { alignItems: 'flex-end' },
  headerTitle: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: C.black },
  headerSub: { fontSize: 7, color: C.slate500, marginTop: 2 },
  // Main centered content
  main: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 60,
    paddingTop: 36,
    paddingBottom: 24,
  },
  // "Certificate of Achievement" small label
  certLabel: {
    fontSize: 8,
    color: C.slate500,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: 8,
  },
  // Large title
  certTitle: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: C.black,
    textAlign: 'center',
    marginBottom: 4,
  },
  // Orange decorative rule
  orangeRule: {
    width: 56,
    height: 3,
    backgroundColor: C.orange,
    borderRadius: 2,
    marginTop: 20,
    marginBottom: 24,
  },
  // "MGTS hereby certifies..." paragraph
  certifyText: {
    fontSize: 10,
    color: C.slate700,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 1.6,
  },
  // Skill section
  skillLabel: {
    fontSize: 8,
    color: C.slate500,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: 6,
  },
  skillName: {
    fontSize: 24,
    fontFamily: 'Helvetica-Bold',
    color: C.orange,
    textAlign: 'center',
    marginBottom: 28,
  },
  // Awarded to section
  awardedLabel: {
    fontSize: 8,
    color: C.slate500,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: 8,
  },
  nameUnderline: {
    borderBottomWidth: 2,
    borderBottomColor: C.orange,
    paddingBottom: 8,
    marginBottom: 32,
    minWidth: 300,
    alignItems: 'center',
  },
  userName: {
    fontSize: 28,
    fontFamily: 'Helvetica-Bold',
    color: C.black,
    textAlign: 'center',
  },
  // Details row
  detailsRow: {
    flexDirection: 'row',
    gap: 40,
    borderTopWidth: 1,
    borderTopColor: C.slate200,
    paddingTop: 16,
    marginBottom: 32,
  },
  detailBox: { alignItems: 'center', minWidth: 110 },
  detailLabel: {
    fontSize: 7,
    color: C.slate500,
    textTransform: 'uppercase',
    marginBottom: 5,
    textAlign: 'center',
  },
  detailValue: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: C.black,
    textAlign: 'center',
  },
  // Motto
  mottoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mottoOrange: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: C.orange,
  },
  mottoBlack: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: C.black,
  },
  // Footer
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 48,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: C.slate200,
  },
  footerText: { fontSize: 7, color: C.slate500 },
  bottomBar: {
    height: 10,
    backgroundColor: C.orange,
  },
})

interface Props {
  skillName: string
  userName: string
  signedOffBy: string
  signedOffAt: string
  certRef: string
}

export function SkillCertificatePdf({ skillName, userName, signedOffBy, signedOffAt, certRef }: Props) {
  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.topBar} />

        {/* Header */}
        <View style={s.header}>
          <Image src={LOGO_PATH} style={s.logo} />
          <View style={s.headerRight}>
            <Text style={s.headerTitle}>MGTS Sentinel</Text>
            <Text style={s.headerSub}>Health &amp; Safety Management System</Text>
          </View>
        </View>

        {/* Main content */}
        <View style={s.main}>
          <Text style={s.certLabel}>Certificate of Achievement</Text>
          <Text style={s.certTitle}>Certificate of Sign Off</Text>
          <View style={s.orangeRule} />

          <Text style={s.certifyText}>
            MGTS hereby certifies that the following individual has been assessed{'\n'}
            and officially signed off as competent to perform:
          </Text>

          <Text style={s.skillLabel}>Skill</Text>
          <Text style={s.skillName}>{skillName}</Text>

          <Text style={s.awardedLabel}>Awarded to</Text>
          <View style={s.nameUnderline}>
            <Text style={s.userName}>{userName}</Text>
          </View>

          {/* Sign-off details */}
          <View style={s.detailsRow}>
            <View style={s.detailBox}>
              <Text style={s.detailLabel}>Date of Sign-Off</Text>
              <Text style={s.detailValue}>{signedOffAt}</Text>
            </View>
            <View style={s.detailBox}>
              <Text style={s.detailLabel}>Signed Off By</Text>
              <Text style={s.detailValue}>{signedOffBy}</Text>
            </View>
            <View style={s.detailBox}>
              <Text style={s.detailLabel}>Certificate Ref.</Text>
              <Text style={s.detailValue}>{certRef}</Text>
            </View>
          </View>

          {/* MGTS Motto */}
          <View style={s.mottoRow}>
            <Text style={s.mottoOrange}>Unlocking </Text>
            <Text style={s.mottoBlack}>Potential, </Text>
            <Text style={s.mottoOrange}>Delivering </Text>
            <Text style={s.mottoBlack}>Performance</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={s.footer}>
          <Text style={s.footerText}>MGTS · Management &amp; Training Solutions</Text>
          <Text style={s.footerText}>Certificate Ref: {certRef}</Text>
          <Text style={s.footerText}>Generated: {signedOffAt}</Text>
        </View>

        <View style={s.bottomBar} />
      </Page>
    </Document>
  )
}
