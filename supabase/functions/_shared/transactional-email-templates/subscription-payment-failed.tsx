import * as React from 'npm:react@18.3.1'
import { Link, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import {
  Bullets,
  Callout,
  CtaButton,
  Divider,
  Eyebrow,
  H1,
  Lede,
  SectionLabel,
  SupportRow,
  VendibookEmailLayout,
  SITE_URL,
  t,
} from '../email-brand/components.tsx'

interface Props {
  firstName?: string
  planName?: string
  amount?: string
  nextRetryDate?: string
  updatePaymentUrl?: string
  accessPausesOn?: string
  attemptNumber?: number
}

const Email = ({
  firstName,
  planName = 'Vendibook',
  amount,
  nextRetryDate,
  updatePaymentUrl,
  accessPausesOn,
  attemptNumber,
}: Props) => (
  <VendibookEmailLayout preview={`Payment failed for your ${planName} plan — action needed`}>
    <Eyebrow>Payment issue</Eyebrow>
    <H1>
      {firstName
        ? `${firstName}, your ${planName} payment didn't go through.`
        : `Your ${planName} payment didn't go through.`}
    </H1>
    <Lede>
      {amount
        ? `We couldn't charge ${amount} for your subscription.`
        : "We couldn't process your subscription payment."}{' '}
      {nextRetryDate
        ? `Update your payment method to keep your perks on — the next retry is ${nextRetryDate}.`
        : 'Update your payment method to avoid losing your perks.'}

    </Lede>

    <Callout tone="warning" title="Action needed">
      {typeof attemptNumber === 'number' && attemptNumber > 1
        ? `This was attempt #${attemptNumber} — we'll keep retrying automatically.`
        : "We'll retry automatically, but updating your payment method now is the fastest fix."}
      {accessPausesOn ? ` Access pauses on ${accessPausesOn}.` : ''}
    </Callout>

    <CtaButton href={updatePaymentUrl || `${SITE_URL}/account/subscription`}>
      Update payment method
    </CtaButton>

    <Text style={t.small}>
      You can review or change your plan any time in your{' '}
      <Link href={`${SITE_URL}/account/subscription`} style={t.link}>subscription settings</Link>.
    </Text>

    <Divider />

    <SectionLabel>What happens next</SectionLabel>
    <Bullets
      items={[
        'We retry your payment method automatically over the next few days.',
        `If every retry fails, your plan pauses${accessPausesOn ? ` on ${accessPausesOn}` : ''} — listings stay live, Pro perks turn off.`,
        'Update your payment method any time to restore access instantly.',
      ]}
    />

    <Divider />

    <SectionLabel>Common causes</SectionLabel>
    <Bullets
      items={[
        'Expired card or a new card number.',
        'Insufficient funds at the moment of the charge.',
        'Bank flagged the charge as unusual — approve it in your banking app.',
      ]}
    />

    <SupportRow />
  </VendibookEmailLayout>
)

export const template = {
  component: Email,
  subject: (d: Record<string, any>) => `Action needed: ${d?.planName ?? 'Subscription'} payment failed`,
  displayName: 'Subscription payment failed',
  previewData: {
    firstName: 'Alex',
    planName: 'Vendibook Pro',
    amount: '$79.00',
    nextRetryDate: 'in 3 days',
    attemptNumber: 2,
  },
} satisfies TemplateEntry
