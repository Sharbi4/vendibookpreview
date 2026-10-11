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
  /** Date benefits remain active through under current lifecycle rules. */
  accessThrough?: string
  manageUrl?: string
}

const Email = ({
  firstName,
  planName = 'Vendibook Pro',
  amount,
  accessThrough,
  manageUrl = `${SITE_URL}/account/subscription`,
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{`We couldn't process your ${planName} payment`}</Preview>
    <Body style={l.main}>
      <Container style={l.container}>
        <EmailHeader />

        <Section style={l.card}>
          <Text style={l.kicker}>Action needed</Text>
          <Heading style={l.h1}>
            {firstName ? `${firstName}, your payment didn't go through.` : `Your payment didn't go through.`}
          </Heading>
          <Text style={l.lede}>
            PayPal couldn&apos;t collect your latest {planName} payment{amount ? ` of ${amount}` : ''}.
            Updating your funding source in PayPal is usually all it takes.
          </Text>

          <Section style={l.panel}>
            <Section style={l.row}>
              <Text style={l.label}>Plan</Text>
              <Text style={l.value}>{planName}</Text>
            </Section>
            {amount ? (
              <Section style={l.row}>
                <Text style={l.label}>Amount due</Text>
                <Text style={l.valueAccent}>{amount}</Text>
              </Section>
            ) : null}
            {accessThrough ? (
              <Section style={l.row}>
                <Text style={l.label}>Benefits active through</Text>
                <Text style={l.value}>{accessThrough}</Text>
              </Section>
            ) : null}
          </Section>

          <Section style={l.ctaWrap}>
            <Button href={manageUrl} style={l.button}>Update payment method</Button>
          </Section>

          <Hr style={l.hr} />
          <Text style={l.small}>
            Your membership hasn&apos;t been cancelled. PayPal will retry automatically, and your Pro
            benefits stay active while the retries run. We&apos;ll email you as soon as a payment
            succeeds.
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
    `Action needed: ${d?.planName ?? 'Vendibook Pro'} payment didn't go through`,
  displayName: 'Vendibook Pro — payment failed',
  previewData: { firstName: 'Alex', planName: 'Vendibook Pro', amount: '$79.00', accessThrough: 'October 19, 2026' },
} satisfies TemplateEntry
