import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Hr, Html, Link, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { s, SITE_URL, SUPPORT_PHONE } from './_styles.ts'
import { BrandFooter, BrandHeader } from './_blocks.tsx'

interface Props {
  firstName?: string
  amount?: string
  chargedOn?: string
  expiresOn?: string
  invoiceUrl?: string
  last4?: string
}

const Email = ({ firstName, amount = '$29.00', chargedOn, expiresOn, invoiceUrl, last4 }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Pro Weekly Pass active — full access for 7 days</Preview>
    <Body style={s.main}>
      <Container style={s.container}>
        <BrandHeader hero="payment" />
        <Section style={s.card}>
          <Text style={s.kicker}>PRO WEEKLY PASS ACTIVE ✅</Text>
          <Heading style={s.h1}>{firstName ? `You're in for the week, ${firstName}.` : `You're in for the week.`}</Heading>
          <Text style={s.lede}>
            All Pro tools are unlocked for the next 7 days — no auto-renewal, no surprise charges.
          </Text>

          <Section style={s.detailGrid}>
            <Text style={s.smallHeader}>RECEIPT</Text>
            <Section style={s.accentRow}>
              <Text style={s.accentLabel}>PRODUCT</Text>
              <Text style={s.accentValuePlain}>Pro Weekly Pass — 7 days</Text>
            </Section>
            <Section style={s.accentRow}>
              <Text style={s.accentLabel}>AMOUNT CHARGED</Text>
              <Text style={s.accentValue}>{amount}</Text>
            </Section>
            {chargedOn && (
              <Section style={s.accentRow}>
                <Text style={s.accentLabel}>DATE</Text>
                <Text style={s.accentValuePlain}>{chargedOn}</Text>
              </Section>
            )}
            {last4 && (
              <Section style={s.accentRow}>
                <Text style={s.accentLabel}>PAID WITH</Text>
                <Text style={s.accentValuePlain}>Card ending •••• {last4}</Text>
              </Section>
            )}
            <Section style={s.accentRow}>
              <Text style={s.accentLabel}>EXPIRES</Text>
              <Text style={s.accentValue}>{expiresOn ?? '7 days from purchase'}</Text>
            </Section>
            {invoiceUrl && (
              <Text style={{ ...s.small, margin: '10px 0 0' }}>
                <Link href={invoiceUrl} style={{ color: '#FF5124' }}>View invoice / receipt →</Link>
              </Text>
            )}
          </Section>

          <Section style={s.ctaWrap}>
            <Button href={`${SITE_URL}/dashboard`} style={s.button}>Open your dashboard</Button>
          </Section>

          <Hr style={s.hr} />
          <Text style={s.smallHeader}>WHAT'S UNLOCKED FOR 7 DAYS</Text>
          <Text style={s.listItem}>• <Link href={`${SITE_URL}/dashboard/promote`} style={{ color: '#d93f16' }}>Featured placement on every listing</Link></Text>
          <Text style={s.listItem}>• <Link href={`${SITE_URL}/dashboard/tools`} style={{ color: '#d93f16' }}>Full Premium Tools bundle</Link></Text>
          <Text style={s.listItem}>• <Link href={`${SITE_URL}/dashboard/insights`} style={{ color: '#d93f16' }}>Advanced analytics + insights</Link></Text>

          <Hr style={s.hr} />
          <Text style={s.small}>
            Want to keep the perks after 7 days? <Link href={`${SITE_URL}/pricing`} style={{ color: '#FF5124' }}>Upgrade to a monthly plan</Link> — we'll credit any unused days.
          </Text>
        </Section>
        <Text style={s.footnote}>Questions? Reply to this email or call {SUPPORT_PHONE}.</Text>
      <BrandFooter /></Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: () => `Pro Weekly Pass active — 7 days of full access`,
  displayName: 'Weekly pass — purchase receipt',
  previewData: { firstName: 'Alex', amount: '$29.00', chargedOn: 'August 24, 2026', expiresOn: 'August 31, 2026', last4: '4242' },
} satisfies TemplateEntry
