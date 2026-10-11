import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Hr, Html, Link, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { s, SITE_URL, SUPPORT_PHONE } from './_styles.ts'
import { BrandFooter, BrandHeader } from './_blocks.tsx'

interface Action { label: string; href: string; blurb?: string }

interface Props {
  firstName?: string
  planName?: string
  actions?: Action[]
}

const DEFAULT_ACTIONS: Action[] = [
  { label: 'Feature your first listing', href: `${SITE_URL}/dashboard/promote`, blurb: 'Pin to the top of relevant searches for 7 days.' },
  { label: 'Generate a stronger description with Listing Studio', href: `${SITE_URL}/dashboard/tools`, blurb: 'AI rewrites your listing for conversion.' },
  { label: 'Map your permits with PermitPath Plus', href: `${SITE_URL}/dashboard/permits`, blurb: 'City-by-city requirements in one view.' },
]

const Email = ({ firstName, planName = 'Vendibook Growth', actions = DEFAULT_ACTIONS }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Get the most out of {planName} — 3 quick wins</Preview>
    <Body style={s.main}>
      <Container style={s.container}>
        <BrandHeader hero="payment" />
        <Section style={s.card}>
          <Text style={s.kicker}>GETTING STARTED</Text>
          <Heading style={s.h1}>{firstName ? `${firstName}, get the most out of ${planName}.` : `Get the most out of ${planName}.`}</Heading>
          <Text style={s.lede}>
            You've had {planName} for 24 hours. Here are the three actions that pay back your subscription in the first week.
          </Text>

          {actions.slice(0, 3).map((a, i) => (
            <Section key={i} style={s.accentRow}>
              <Text style={s.accentLabel}>STEP {i + 1}</Text>
              <Text style={{ ...s.accentValuePlain, marginBottom: 6 }}>
                <Link href={a.href.startsWith('http') ? a.href : `${SITE_URL}${a.href}`} style={{ color: '#d93f16', textDecoration: 'underline' }}>{a.label}</Link>
              </Text>
              {a.blurb && <Text style={{ ...s.small, margin: 0 }}>{a.blurb}</Text>}
            </Section>
          ))}

          <Section style={s.ctaWrap}>
            <Button href={`${SITE_URL}/dashboard`} style={s.button}>Open dashboard</Button>
          </Section>

          <Hr style={s.hr} />
          <Text style={s.footnote}>Reply anytime — we read every message. Or call {SUPPORT_PHONE}.</Text>
        </Section>
      <BrandFooter /></Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (d: Record<string, any>) => `Get the most out of ${d?.planName ?? 'your plan'}`,
  displayName: 'Subscription — getting started (24h follow-up)',
  previewData: { firstName: 'Alex', planName: 'Vendibook Growth' },
} satisfies TemplateEntry
