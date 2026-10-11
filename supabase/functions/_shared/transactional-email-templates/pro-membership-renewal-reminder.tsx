import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Hr, Html, Link, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { SITE_URL, SUPPORT_PHONE } from './_styles.ts'
import { l } from './_stylesLight.ts'
import { EmailHeader, SupportRow, TransactionalFooter } from '../email-brand/components.tsx'

interface Props {
  firstName?: string
  planName?: string
  amount?: string
  interval?: string
  renewalDate?: string
  daysUntil?: number | string
  paymentMethod?: string
  manageUrl?: string
}

const Email = ({
  firstName,
  planName = 'Vendibook Pro',
  amount = '$79.00',
  interval = 'month',
  renewalDate,
  daysUntil = 3,
  paymentMethod = 'PayPal',
  manageUrl = `${SITE_URL}/account/subscription`,
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{`${planName} renews${renewalDate ? ` on ${renewalDate}` : ' soon'} — ${amount}`}</Preview>
    <Body style={l.main}>
      <Container style={l.container}>
        <EmailHeader />

        <Section style={l.card}>
          <Text style={l.kicker}>Upcoming renewal</Text>
          <Heading style={l.h1}>
            {firstName
              ? `${firstName}, your ${planName} renews in ${daysUntil} days.`
              : `Your ${planName} renews in ${daysUntil} days.`}
          </Heading>
          <Text style={l.lede}>
            This is a heads-up, not a charge. Nothing is required from you — your membership
            continues automatically.
          </Text>

          <Section style={l.panel}>
            <Section style={l.row}>
              <Text style={l.label}>Plan</Text>
              <Text style={l.value}>{planName}</Text>
            </Section>
            <Section style={l.row}>
              <Text style={l.label}>Expected charge</Text>
              <Text style={l.valueAccent}>{amount} / {interval}</Text>
            </Section>
            {renewalDate ? (
              <Section style={l.row}>
                <Text style={l.label}>Renews on</Text>
                <Text style={l.value}>{renewalDate}</Text>
              </Section>
            ) : null}
            <Section style={l.row}>
              <Text style={l.label}>Billing method</Text>
              <Text style={l.value}>{paymentMethod}</Text>
            </Section>
          </Section>

          <Section style={l.ctaWrap}>
            <Button href={manageUrl} style={l.button}>Manage membership</Button>
          </Section>

          <Hr style={l.hr} />
          <Text style={l.small}>
            <strong style={{ color: '#1c1917' }}>Cancel anytime.</strong> If you cancel before the
            renewal date you won&apos;t be charged again, and your benefits stay active through the
            period you&apos;ve already paid for.
          </Text>
          <SupportRow />
        </Section>

        <TransactionalFooter />
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (d: Record<string, any>) =>
    `${d?.planName ?? 'Vendibook Pro'} renews${d?.renewalDate ? ` on ${d.renewalDate}` : ' soon'} — ${d?.amount ?? ''}`.trim(),
  displayName: 'Vendibook Pro — renewal reminder',
  previewData: {
    firstName: 'Alex',
    planName: 'Vendibook Pro',
    amount: '$79.00',
    interval: 'month',
    renewalDate: 'September 19, 2026',
    daysUntil: 3,
    paymentMethod: 'PayPal',
  },
} satisfies TemplateEntry
