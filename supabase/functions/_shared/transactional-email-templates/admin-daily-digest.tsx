import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text, Hr } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { s, SITE_URL } from './_styles.ts'

interface Props {
  dateLabel?: string
  newSignups?: number
  newListings?: number
  newBookings?: number
  grossRevenue?: number
  openDisputes?: number
  pendingPayouts?: number
  aiInsight?: string
}

const Row = ({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) => (
  <Section style={s.accentRow}>
    <Text style={s.accentLabel}>{label}</Text>
    <Text style={accent ? s.accentValue : s.accentValuePlain}>{value}</Text>
  </Section>
)

const E = ({ dateLabel, newSignups, newListings, newBookings, grossRevenue, openDisputes, pendingPayouts, aiInsight }: Props) => (
  <Html lang="en" dir="ltr"><Head /><Preview>Vendibook ops digest</Preview>
    <Body style={s.main}><Container style={s.container}>
      <BrandHeader hero="insight" />
      <Section style={s.card}>
        <Text style={s.smallHeader}>{dateLabel || 'YESTERDAY'}</Text>
        <Heading style={s.h1}>Marketplace pulse.</Heading>
        {aiInsight ? <Text style={s.lede}>{aiInsight}</Text> : <Text style={s.lede}>Daily snapshot of platform-wide activity.</Text>}

        <Row label="NEW SIGNUPS" value={(newSignups ?? 0).toLocaleString()} />
        <Row label="NEW LISTINGS" value={(newListings ?? 0).toLocaleString()} />
        <Row label="NEW BOOKINGS" value={(newBookings ?? 0).toLocaleString()} />
        <Row label="GROSS REVENUE" value={`$${(grossRevenue ?? 0).toLocaleString()}`} accent />

        <Hr style={s.hr} />
        <Text style={s.smallHeader}>NEEDS ATTENTION</Text>
        <Row label="OPEN DISPUTES" value={(openDisputes ?? 0).toLocaleString()} />
        <Row label="PENDING PAYOUTS" value={(pendingPayouts ?? 0).toLocaleString()} />

        <Section style={s.ctaWrap}><Button href={`${SITE_URL}/admin`} style={s.button}>Open admin</Button></Section>
      </Section>
    </Container></Body></Html>
)

export const template = {
  component: E,
  subject: (d: any) => (typeof d?.aiSubject === "string" && d.aiSubject.trim() ? d.aiSubject : null) || `Ops · ${d?.newBookings ?? 0} bookings, $${(d?.grossRevenue ?? 0).toLocaleString()} GMV, ${d?.openDisputes ?? 0} disputes`,
  displayName: 'Admin daily ops digest',
  previewData: { dateLabel: 'YESTERDAY', newSignups: 24, newListings: 11, newBookings: 18, grossRevenue: 6420, openDisputes: 1, pendingPayouts: 4, aiInsight: 'Healthy day. Bookings up 14% WoW. One dispute aging > 48h needs review.' },
} satisfies TemplateEntry
