import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Hr, Html, Link, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { SITE_URL, SUPPORT_PHONE } from './_styles.ts'
import { l } from './_stylesLight.ts'

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
  planName = 'PermitPath Plus',
  amount = '$7.99',
  interval = 'month',
  paidOn,
  nextBillingDate,
  manageUrl = `${SITE_URL}/tools/permitpath`,
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{`${planName} payment received — ${amount}`}</Preview>
    <Body style={l.main}>
      <Container style={l.container}>
        <Section style={l.headerWrap}>
          <Text style={l.wordmark}>
            <Link href={SITE_URL} style={l.wordmarkLink}>Vendibook</Link>
          </Text>
        </Section>

        <Section style={l.card}>
          <Text style={l.kicker}>Payment received</Text>
          <Heading style={l.h1}>
            {firstName ? `Thanks, ${firstName} — ${planName} renewed.` : `${planName} renewed.`}
          </Heading>
          <Text style={l.lede}>
            Your payment went through. Your saved roadmaps, documents and tracking stay right where
            they are.
          </Text>

          <Section style={l.panel}>
            <Section style={l.row}>
              <Text style={l.label}>Plan</Text>
              <Text style={l.value}>{planName}</Text>
            </Section>
            <Section style={l.row}>
              <Text style={l.label}>Amount charged</Text>
              <Text style={l.valueAccent}>{amount} / {interval}</Text>
            </Section>
            {paidOn ? (
              <Section style={l.row}>
                <Text style={l.label}>Paid on</Text>
                <Text style={l.value}>{paidOn}</Text>
              </Section>
            ) : null}
            {nextBillingDate ? (
              <Section style={l.row}>
                <Text style={l.label}>Next billing date</Text>
                <Text style={l.value}>{nextBillingDate}</Text>
              </Section>
            ) : null}
            <Section style={l.row}>
              <Text style={l.label}>Paid with</Text>
              <Text style={l.value}>PayPal</Text>
            </Section>
          </Section>

          <Section style={l.ctaWrap}>
            <Button href={manageUrl} style={l.button}>View subscription</Button>
          </Section>

          <Hr style={l.hr} />
          <Text style={l.small}>
            <strong style={{ color: '#1c1917' }}>Cancel anytime.</strong> Cancelling stops future
            renewals only — access continues through the period you&apos;ve paid for.
          </Text>
        </Section>

        <Text style={l.footnote}>Questions? Reply to this email or call {SUPPORT_PHONE}.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (d: Record<string, any>) =>
    `${d?.planName ?? 'PermitPath Plus'} renewed — ${d?.amount ?? ''} receipt`.trim(),
  displayName: 'PermitPath Plus — renewal receipt',
  previewData: {
    firstName: 'Alex',
    planName: 'PermitPath Plus',
    amount: '$7.99',
    interval: 'month',
    paidOn: 'September 19, 2026',
    nextBillingDate: 'October 19, 2026',
  },
} satisfies TemplateEntry
