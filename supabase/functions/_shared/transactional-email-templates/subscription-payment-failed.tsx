import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Hr, Html, Link, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { s, SITE_URL, SUPPORT_PHONE } from './_styles.ts'
import { BrandFooter, BrandHeader } from './_blocks.tsx'

interface Props {
  firstName?: string
  planName?: string
  amount?: string
  nextRetryDate?: string
  updatePaymentUrl?: string
  portalUrl?: string
  accessPausesOn?: string
  attemptNumber?: number
}

const Email = ({ firstName, planName = 'Vendibook Growth', amount, nextRetryDate, updatePaymentUrl, portalUrl, accessPausesOn, attemptNumber }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Payment failed for your {planName} plan — action needed</Preview>
    <Body style={s.main}>
      <Container style={s.container}>
        <BrandHeader hero="payment" />
        <Section style={s.card}>
          <Text style={s.kicker}>PAYMENT ISSUE ⚠️</Text>
          <Heading style={s.h1}>
            {firstName ? `${firstName}, your ${planName} payment didn't go through.` : `Your ${planName} payment didn't go through.`}
          </Heading>
          <Text style={s.lede}>
            {amount ? `We couldn't charge ${amount} for your subscription.` : `We couldn't process your subscription payment.`} Update your card
            {nextRetryDate ? <> before <strong style={{ color: '#fff' }}>{nextRetryDate}</strong> to keep your perks on.</> : ' to avoid losing your perks.'}
          </Text>
          {typeof attemptNumber === 'number' && attemptNumber > 1 && (
            <Section style={s.accentRow}>
              <Text style={s.accentLabel}>ATTEMPT</Text>
              <Text style={s.accentValuePlain}>#{attemptNumber} — we'll keep retrying automatically</Text>
            </Section>
          )}
          {accessPausesOn && (
            <Section style={s.accentRow}>
              <Text style={s.accentLabel}>ACCESS PAUSES</Text>
              <Text style={s.accentValue}>{accessPausesOn}</Text>
            </Section>
          )}
          <Section style={s.ctaWrap}>
            <Button href={updatePaymentUrl || portalUrl || `${SITE_URL}/account/subscription`} style={s.button}>Update payment method</Button>
          </Section>
          {portalUrl && updatePaymentUrl && (
            <Text style={{ ...s.small, margin: '10px 0 0' }}>
              Or manage everything in the <Link href={portalUrl} style={{ color: '#FF5124' }}>Stripe billing portal →</Link>
            </Text>
          )}
          <Hr style={s.hr} />
          <Text style={s.smallHeader}>WHAT HAPPENS NEXT</Text>
          <Text style={s.listItem}>• We retry your card automatically over the next few days</Text>
          <Text style={s.listItem}>• If every retry fails, your plan pauses{accessPausesOn ? ` on ${accessPausesOn}` : ''} — listings stay live, Pro perks turn off</Text>
          <Text style={s.listItem}>• Update your card any time to restore access instantly</Text>
          <Hr style={s.hr} />
          <Text style={s.smallHeader}>COMMON CAUSES</Text>
          <Text style={s.listItem}>• Expired card or new card number</Text>
          <Text style={s.listItem}>• Insufficient funds at the moment of the charge</Text>
          <Text style={s.listItem}>• Bank flagged as unusual — approve the charge in your banking app</Text>
        </Section>
        <Text style={s.footnote}>Need help? Call {SUPPORT_PHONE} — Mon–Fri, 9am–5pm AZ.</Text>
      <BrandFooter /></Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (d: Record<string, any>) => `Action needed: ${d?.planName ?? 'Subscription'} payment failed`,
  displayName: 'Subscription payment failed',
  previewData: { firstName: 'Alex', planName: 'Host Pro', amount: '$39.00', nextRetryDate: 'in 3 days', attemptNumber: 2 },
} satisfies TemplateEntry
