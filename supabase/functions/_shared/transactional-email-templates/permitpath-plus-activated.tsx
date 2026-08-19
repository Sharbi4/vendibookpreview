import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Hr, Html, Link, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { SITE_URL, SUPPORT_PHONE } from './_styles.ts'
import { l } from './_stylesLight.ts'

interface Props {
  firstName?: string
  planName?: string
  /** Catalog price, already formatted (e.g. "$7.99"). */
  amount?: string
  interval?: string
  nextBillingDate?: string
  manageUrl?: string
}

const Email = ({
  firstName,
  planName = 'PermitPath Plus',
  amount = '$7.99',
  interval = 'month',
  nextBillingDate,
  manageUrl = `${SITE_URL}/tools/permitpath`,
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{`${planName} is active — your permit roadmaps are now saved`}</Preview>
    <Body style={l.main}>
      <Container style={l.container}>
        <Section style={l.headerWrap}>
          <Text style={l.wordmark}>
            <Link href={SITE_URL} style={l.wordmarkLink}>Vendibook</Link>
          </Text>
        </Section>

        <Section style={l.card}>
          <Text style={l.kicker}>Subscription active</Text>
          <Heading style={l.h1}>
            {firstName ? `You're all set, ${firstName}.` : `${planName} is active.`}
          </Heading>
          <Text style={l.lede}>
            You can now save permit roadmaps to your dashboard and keep them updated as you work
            through each requirement.
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
            <Button href={`${SITE_URL}/tools/permitpath`} style={l.button}>Open PermitPath</Button>
          </Section>

          <Hr style={l.hr} />
          <Text style={l.sectionLabel}>What&apos;s included</Text>
          <Text style={l.listItem}>• Save multiple permit roadmaps to your dashboard</Text>
          <Text style={l.listItem}>• Track every permit: not started, in progress, submitted, approved</Text>
          <Text style={l.listItem}>• Store permit numbers, notes and expiration dates</Text>
          <Text style={l.listItem}>• Upload and keep permit documents in one place</Text>
          <Text style={l.listItem}>• Refresh a saved roadmap against the latest requirements</Text>
          <Text style={l.listItem}>• Export a roadmap as a PDF</Text>

          <Hr style={l.hr} />
          <Text style={l.small}>
            <strong style={{ color: '#1c1917' }}>Cancel anytime.</strong> Your subscription renews at{' '}
            {amount} / {interval} until you cancel, and cancelling stops future renewals only —
            access continues through the period you&apos;ve paid for.{' '}
            <Link href={manageUrl} style={l.link}>Manage subscription</Link>.
          </Text>
        </Section>

        <Text style={l.footnote}>Questions? Reply to this email or call {SUPPORT_PHONE}.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (d: Record<string, any>) => `${d?.planName ?? 'PermitPath Plus'} is active`,
  displayName: 'PermitPath Plus — activated',
  previewData: {
    firstName: 'Alex',
    planName: 'PermitPath Plus',
    amount: '$7.99',
    interval: 'month',
    nextBillingDate: 'September 19, 2026',
  },
} satisfies TemplateEntry
