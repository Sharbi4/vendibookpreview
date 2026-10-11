import * as React from 'npm:react@18.3.1'
import { Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import {
  CtaButton,
  DetailTable,
  Divider,
  Eyebrow,
  H1,
  Lede,
  SITE_URL,
  SupportRow,
  VendibookEmailLayout,
  t,
} from '../email-brand/components.tsx'

interface Props {
  firstName?: string
  planName?: string
  amount?: string
  interval?: string
  paidOn?: string
  nextBillingDate?: string
  manageUrl?: string
}

const Email = ({
  firstName,
  planName = 'Vendibook Pro',
  amount,
  interval = 'month',
  paidOn,
  nextBillingDate,
  manageUrl = `${SITE_URL}/account/subscription`,
}: Props) => (
  <VendibookEmailLayout preview={`${planName} payment received${amount ? ` — ${amount}` : ''}`}>
    <Eyebrow>Payment received</Eyebrow>
    <H1>{firstName ? `Thanks, ${firstName} — ${planName} renewed` : `${planName} renewed`}</H1>
    <Lede>
      Your membership payment went through. Nothing changes and nothing is required from you.
    </Lede>

    <DetailTable
      rows={[
        { label: 'Plan', value: planName },
        { label: 'Amount charged', value: amount ? `${amount} / ${interval}` : undefined, emphasis: true },
        { label: 'Paid on', value: paidOn },
        { label: 'Next billing date', value: nextBillingDate },
        { label: 'Paid with', value: 'PayPal' },
      ]}
    />

    <CtaButton href={manageUrl}>View membership</CtaButton>

    <Divider />

    <Text style={t.small}>
      Your Pro benefits continue for this billing period: the 10.9% seller/host fee instead of
      the 12.9% standard rate (up to $500 saved per eligible completed transaction) and one
      Featured Boost credit per paid billing period, which doesn't roll over. Cancel anytime —
      cancelling stops future renewals only, and benefits stay active through the period you've
      paid for.
    </Text>

    <SupportRow />
  </VendibookEmailLayout>
)

export const template = {
  component: Email,
  subject: (d: Record<string, any>) =>
    `${d?.planName ?? 'Vendibook Pro'} renewed — ${d?.amount ?? ''} receipt`.trim(),
  displayName: 'Vendibook Pro — renewal receipt',
  previewData: {
    firstName: 'Alex',
    planName: 'Vendibook Pro',
    amount: '$79.00',
    interval: 'month',
    paidOn: 'September 19, 2026',
    nextBillingDate: 'October 19, 2026',
  },
} satisfies TemplateEntry
