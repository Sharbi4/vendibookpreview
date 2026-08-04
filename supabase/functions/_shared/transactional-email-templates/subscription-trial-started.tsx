import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Hr, Html, Link, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { s, SITE_URL, SUPPORT_PHONE } from './_styles.ts'
import { BrandFooter, BrandHeader } from './_blocks.tsx'

interface Props {
  firstName?: string
  planName?: string
  trialEndsAt?: string
  priceAfter?: string
  interval?: string
  manageUrl?: string
}

const Email = ({
  firstName,
  planName = 'Vendibook Growth',
  trialEndsAt,
  priceAfter = '$39.00',
  interval = 'month',
  manageUrl = `${SITE_URL}/account/subscription`,
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your {planName} trial is on — full access unlocked</Preview>
    <Body style={s.main}>
      <Container style={s.container}>
        <BrandHeader hero="payment" />
        <Section style={s.card}>
          <Text style={s.kicker}>FREE TRIAL STARTED ✨</Text>
          <Heading style={s.h1}>{firstName ? `${firstName}, your ${planName} trial is on.` : `Your ${planName} trial is on.`}</Heading>
          <Text style={s.lede}>
            Every {planName} feature is unlocked right now — feature listings, run AI tools, and see full analytics.
          </Text>

          <Section style={s.accentRow}>
            <Text style={s.accentLabel}>TRIAL ENDS</Text>
            <Text style={s.accentValuePlain}>{trialEndsAt ?? 'End of trial period'}</Text>
          </Section>
          <Section style={s.accentRow}>
            <Text style={s.accentLabel}>THEN BILLED</Text>
            <Text style={s.accentValue}>{priceAfter} / {interval}</Text>
          </Section>

          <Section style={s.ctaWrap}>
            <Button href={`${SITE_URL}/dashboard`} style={s.button}>Start using {planName}</Button>
          </Section>

          <Hr style={s.hr} />
          <Text style={s.small}>
            <strong style={{ color: '#fff' }}>Cancel anytime before {trialEndsAt ?? 'the trial ends'}</strong> and you won't be charged.
            After that, {planName} auto-renews at {priceAfter}/{interval} until you cancel.{' '}
            <Link href={manageUrl} style={{ color: '#FF5124' }}>Manage or cancel</Link>.
          </Text>
        </Section>
        <Text style={s.footnote}>Questions? Reply to this email or call {SUPPORT_PHONE}.</Text>
      <BrandFooter /></Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (d: Record<string, any>) => `Your ${d?.planName ?? 'Vendibook'} free trial is on`,
  displayName: 'Subscription — trial started',
  previewData: { firstName: 'Alex', planName: 'Vendibook Growth', trialEndsAt: 'August 31, 2026', priceAfter: '$39.00', interval: 'month' },
} satisfies TemplateEntry
