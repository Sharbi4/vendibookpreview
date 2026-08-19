import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Hr, Html, Link, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { SITE_URL, SUPPORT_PHONE } from './_styles.ts'
import { l } from './_stylesLight.ts'

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
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{`${planName} is active — here's what's unlocked`}</Preview>
    <Body style={l.main}>
      <Container style={l.container}>
        <Section style={l.headerWrap}>
          <Text style={l.wordmark}>
            <Link href={SITE_URL} style={l.wordmarkLink}>Vendibook</Link>
          </Text>
        </Section>

        <Section style={l.card}>
          <Text style={l.kicker}>Membership active</Text>
          <Heading style={l.h1}>
            {firstName ? `Welcome to ${planName}, ${firstName}.` : `Welcome to ${planName}.`}
          </Heading>
          <Text style={l.lede}>
            Your membership is live. Every benefit below is switched on right now — nothing else to
            set up.
          </Text>

          <Section style={l.panel}>
            <Section style={l.row}>
              <Text style={l.label}>Plan</Text>
              <Text style={l.value}>{planName}</Text>
            </Section>
            <Section style={l.row}>
              <Text style={l.label}>Price</Text>
              <Text style={l.valueAccent}>{amount} / {interval}</Text>
            </Section>
            {nextBillingDate ? (
              <Section style={l.row}>
                <Text style={l.label}>Next billing date</Text>
                <Text style={l.value}>{nextBillingDate}</Text>
              </Section>
            ) : null}
          </Section>

          <Section style={l.ctaWrap}>
            <Button href={`${SITE_URL}/dashboard`} style={l.button}>Open your dashboard</Button>
          </Section>

          <Hr style={l.hr} />
          <Text style={l.sectionLabel}>What&apos;s included</Text>
          <Text style={l.listItem}>• 10.9% seller/host fee instead of 12.9%</Text>
          <Text style={l.listItem}>• Up to $500 saved per transaction</Text>
          <Text style={l.listItem}>• One Featured Boost credit every billing period</Text>
          <Text style={l.listItem}>• Full premium tools suite and advanced analytics</Text>

          <Hr style={l.hr} />
          <Text style={l.small}>
            <strong style={{ color: '#1c1917' }}>Cancel anytime.</strong> Your membership renews at{' '}
            {amount} / {interval} until you cancel, and cancelling stops future renewals only —
            benefits stay active through the period you&apos;ve paid for.{' '}
            <Link href={manageUrl} style={l.link}>Manage membership</Link>.
          </Text>
        </Section>

        <Text style={l.footnote}>Questions? Reply to this email or call {SUPPORT_PHONE}.</Text>
      </Container>
    </Body>
  </Html>
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
