import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { s, SITE_URL, SUPPORT_PHONE } from './_styles.ts'
import { BrandHeader } from './_blocks.tsx'

interface Props {
  firstName?: string
  planName?: string
  amount?: string
  nextRetryDate?: string
  updatePaymentUrl?: string
  attemptNumber?: number
}

const Email = ({ firstName, planName = 'Host Pro', amount, nextRetryDate, updatePaymentUrl, attemptNumber }: Props) => (
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
            {nextRetryDate ? <> before <strong style={{ color: '#fff' }}>{nextRetryDate}</strong> to keep Pro perks on.</> : ' to avoid losing Pro perks.'}
          </Text>
          {typeof attemptNumber === 'number' && attemptNumber > 1 && (
            <Section style={s.accentRow}>
              <Text style={s.accentLabel}>ATTEMPT</Text>
              <Text style={s.accentValuePlain}>#{attemptNumber} — we'll keep retrying automatically</Text>
            </Section>
          )}
          <Section style={s.ctaWrap}>
            <Button href={updatePaymentUrl || `${SITE_URL}/account`} style={s.button}>Update payment method</Button>
          </Section>
          <Hr style={s.hr} />
          <Text style={s.smallHeader}>COMMON CAUSES</Text>
          <Text style={s.listItem}>• Expired card or new card number</Text>
          <Text style={s.listItem}>• Insufficient funds at the moment of the charge</Text>
          <Text style={s.listItem}>• Bank flagged as unusual — approve the charge in your banking app</Text>
        </Section>
        <Text style={s.footnote}>Need help? Call {SUPPORT_PHONE} — Mon–Fri, 9am–5pm AZ.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (d: Record<string, any>) => `Action needed: ${d?.planName ?? 'Subscription'} payment failed`,
  displayName: 'Subscription payment failed',
  previewData: { firstName: 'Alex', planName: 'Host Pro', amount: '$39.00', nextRetryDate: 'in 3 days', attemptNumber: 2 },
} satisfies TemplateEntry
