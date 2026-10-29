import * as React from 'npm:react@18.3.1'
import { Body, Container, Heading, Hr, Html, Link, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import { BrandHead, EmailButton } from '../email-brand/components.tsx'
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
  { label: 'Explore BuyerMatch AI', href: `${SITE_URL}/dashboard/buyermatch`, blurb: 'Submit an eligible sale or rental listing for a reviewed matching search.' },
  { label: 'Use your Featured Boost credit', href: `${SITE_URL}/dashboard/listings`, blurb: 'Choose an eligible active listing for your included billing-period credit.' },
  { label: 'Explore PricePilot', href: `${SITE_URL}/tools/pricepilot`, blurb: 'Get comparable-backed pricing insights for your equipment.' },
  { label: 'Explore PermitPath Plus', href: `${SITE_URL}/tools/permitpath`, blurb: 'Save permit roadmaps, track progress and organize documents.' },
]

const Email = ({ firstName, planName = 'Vendibook Pro', actions = DEFAULT_ACTIONS }: Props) => (
  <Html lang="en" dir="ltr">
    <BrandHead />
    <Preview>Get the most out of {planName} — explore your included tools</Preview>
    <Body style={s.main}>
      <Container style={s.container}>
        <BrandHeader hero="payment" />
        <Section style={s.card}>
          <Text style={s.kicker}>GETTING STARTED</Text>
          <Heading style={s.h1}>{firstName ? `${firstName}, get the most out of ${planName}.` : `Get the most out of ${planName}.`}</Heading>
          <Text style={s.lede}>
            Your membership brings your next steps together. Explore these tools from your dashboard whenever you're ready.
          </Text>

          {actions.slice(0, 4).map((a, i) => (
            <Section key={i} style={s.accentRow}>
              <Text style={s.accentLabel}>STEP {i + 1}</Text>
              <Text style={{ ...s.accentValuePlain, marginBottom: 6 }}>
                <Link href={a.href.startsWith('http') ? a.href : `${SITE_URL}${a.href}`} style={{ color: '#d93f16', textDecoration: 'underline' }}>{a.label}</Link>
              </Text>
              {a.blurb && <Text style={{ ...s.small, margin: 0 }}>{a.blurb}</Text>}
            </Section>
          ))}

          <Section style={s.ctaWrap}>
            <EmailButton href={`${SITE_URL}/dashboard`} style={s.button}>Open dashboard</EmailButton>
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
  previewData: { firstName: 'Alex', planName: 'Vendibook Pro' },
} satisfies TemplateEntry
