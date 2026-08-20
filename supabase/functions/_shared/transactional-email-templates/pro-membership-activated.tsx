import * as React from 'npm:react@18.3.1'
import { Link, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import {
  Bullets,
  CtaButton,
  DetailTable,
  Divider,
  Eyebrow,
  H1,
  Lede,
  SectionLabel,
  SupportRow,
  VendibookEmailLayout,
  SITE_URL,
  color,
  t,
} from '../email-brand/components.tsx'

interface Props {
  firstName?: string
  planName?: string
  /** Catalog price, already formatted (e.g. "$79.00"). */
  amount?: string
  /** Catalog cadence word (e.g. "month"). */
  interval?: string
  nextBillingDate?: string
  manageUrl?: string
}

const Email = ({
  firstName,
  planName = 'Vendibook Pro',
  amount = '$79.00',
  interval = 'month',
  nextBillingDate,
  manageUrl = `${SITE_URL}/account/subscription`,
}: Props) => (
  <VendibookEmailLayout preview={`${planName} is active — here's what's unlocked`}>
    <Eyebrow>Membership active</Eyebrow>
    <H1>{firstName ? `Welcome to ${planName}, ${firstName}.` : `Welcome to ${planName}.`}</H1>
    <Lede>
      Your membership is live. Every benefit below is switched on right now — nothing else to set up.
    </Lede>

    <DetailTable
      rows={[
        { label: 'Plan', value: planName },
        { label: 'Price', value: `${amount} / ${interval}`, emphasis: true },
        { label: 'Next billing date', value: nextBillingDate },
      ]}
    />

    <CtaButton href={`${SITE_URL}/dashboard`}>Open your dashboard</CtaButton>

    <Divider />

    <SectionLabel>What's included</SectionLabel>
    <Bullets
      items={[
        '10.9% seller/host fee instead of 12.9%',
        'Up to $500 saved per transaction',
        'One Featured Boost credit every billing period',
        'Full premium tools suite and advanced analytics',
      ]}
    />

    <Divider />

    <Text style={t.small}>
      <strong style={{ color: color.text }}>Cancel anytime.</strong> Your membership renews at{' '}
      {amount} / {interval} until you cancel, and cancelling stops future renewals only — benefits
      stay active through the period you&apos;ve paid for.{' '}
      <Link href={manageUrl} style={t.link}>Manage membership</Link>.
    </Text>

    <SupportRow />
  </VendibookEmailLayout>
)

export const template = {
  component: Email,
  subject: (d: Record<string, any>) => `Welcome to ${d?.planName ?? 'Vendibook Pro'} — you're all set`,
  displayName: 'Vendibook Pro — activated',
  previewData: {
    firstName: 'Alex',
    planName: 'Vendibook Pro',
    amount: '$79.00',
    interval: 'month',
    nextBillingDate: 'September 19, 2026',
  },
} satisfies TemplateEntry
