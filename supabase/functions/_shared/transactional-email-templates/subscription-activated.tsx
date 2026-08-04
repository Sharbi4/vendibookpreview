import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Hr, Html, Link, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { s, SITE_URL, SUPPORT_PHONE } from './_styles.ts'
import { BrandFooter, BrandHeader } from './_blocks.tsx'

interface BenefitLink { label: string; href: string }

interface Props {
  firstName?: string
  planName?: string
  amount?: string
  interval?: string
  chargedOn?: string
  nextBillingDate?: string
  last4?: string
  invoiceUrl?: string
  isRenewal?: boolean
  benefits?: BenefitLink[]
  manageUrl?: string
}

const DEFAULT_BENEFITS: BenefitLink[] = [
  { label: 'Feature your listings — Promote & Upgrades', href: `${SITE_URL}/dashboard/promote` },
  { label: 'Open your Premium Tools', href: `${SITE_URL}/dashboard/tools` },
  { label: 'Review analytics and insights', href: `${SITE_URL}/dashboard/insights` },
]

const Email = ({
  firstName,
  planName = 'Vendibook Growth',
  amount = '$39.00',
  interval = 'month',
  chargedOn,
  nextBillingDate,
  last4,
  invoiceUrl,
  isRenewal,
  benefits = DEFAULT_BENEFITS,
  manageUrl = `${SITE_URL}/account/subscription`,
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{isRenewal ? `${planName} renewed — receipt inside` : `Welcome to ${planName} — you're all set`}</Preview>
    <Body style={s.main}>
      <Container style={s.container}>
        <BrandHeader hero="payment" />
        <Section style={s.card}>
          <Text style={s.kicker}>{isRenewal ? 'MEMBERSHIP RENEWED ✅' : 'MEMBERSHIP ACTIVE ✅'}</Text>
          <Heading style={s.h1}>
            {isRenewal
              ? (firstName ? `${planName} renewed, ${firstName}.` : `${planName} renewed.`)
              : (firstName ? `Welcome to ${planName}, ${firstName}.` : `Welcome to ${planName}.`)}
          </Heading>
          <Text style={s.lede}>
            {isRenewal
              ? `Your plan just renewed for another ${interval}. Everything stays on — no action needed.`
              : `You're all set. Every tool below is unlocked right now on your dashboard.`}
          </Text>

          {/* RECEIPT BLOCK */}
          <Section style={s.detailGrid}>
            <Text style={s.smallHeader}>RECEIPT</Text>
            <Section style={s.accentRow}>
              <Text style={s.accentLabel}>PLAN</Text>
              <Text style={s.accentValuePlain}>{planName}</Text>
            </Section>
            <Section style={s.accentRow}>
              <Text style={s.accentLabel}>AMOUNT CHARGED</Text>
              <Text style={s.accentValue}>{amount} / {interval}</Text>
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
            {nextBillingDate && (
              <Section style={s.accentRow}>
                <Text style={s.accentLabel}>NEXT RENEWAL</Text>
                <Text style={s.accentValuePlain}>{nextBillingDate}</Text>
              </Section>
            )}
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
          <Text style={s.smallHeader}>WHAT'S INCLUDED</Text>
          {benefits.map((b, i) => (
            <Text key={i} style={s.listItem}>
              • <Link href={b.href.startsWith('http') ? b.href : `${SITE_URL}${b.href}`} style={{ color: '#fafafa', textDecoration: 'underline' }}>{b.label}</Link>
            </Text>
          ))}

          <Hr style={s.hr} />
          <Text style={s.small}>
            <strong style={{ color: '#fff' }}>Cancel anytime online</strong> — your plan auto-renews at {amount}/{interval} until you cancel.{' '}
            <Link href={manageUrl} style={{ color: '#FF5124' }}>Manage your membership</Link>.
          </Text>
        </Section>
        <Text style={s.footnote}>Questions? Reply to this email or call {SUPPORT_PHONE}.</Text>
      <BrandFooter /></Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (d: Record<string, any>) => d?.isRenewal
    ? `${d?.planName ?? 'Your plan'} renewed — receipt`
    : `Welcome to ${d?.planName ?? 'Vendibook'} — you're all set`,
  displayName: 'Subscription activated / renewed',
  previewData: {
    firstName: 'Alex',
    planName: 'Vendibook Growth',
    amount: '$39.00',
    interval: 'month',
    chargedOn: 'August 24, 2026',
    nextBillingDate: 'September 24, 2026',
    last4: '4242',
    invoiceUrl: 'https://invoice.stripe.com/i/example',
    isRenewal: false,
    benefits: [
      { label: 'Feature your first listing', href: '/dashboard/promote' },
      { label: 'Open Premium Tools', href: '/dashboard/tools' },
      { label: 'See booking analytics', href: '/dashboard/insights' },
    ],
  },
} satisfies TemplateEntry
