import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Hr, Html, Link, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { SITE_URL, SUPPORT_PHONE } from './_styles.ts'
import { l } from './_stylesLight.ts'

interface Props {
  firstName?: string
  planName?: string
  /** Date benefits remain active through (current_period_end). */
  accessThrough?: string
  manageUrl?: string
}

const Email = ({
  firstName,
  planName = 'Vendibook Pro',
  accessThrough,
  manageUrl = `${SITE_URL}/account/subscription`,
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{`${planName} cancellation confirmed`}</Preview>
    <Body style={l.main}>
      <Container style={l.container}>
        <Section style={l.headerWrap}>
          <Text style={l.wordmark}>
            <Link href={SITE_URL} style={l.wordmarkLink}>Vendibook</Link>
          </Text>
        </Section>

        <Section style={l.card}>
          <Text style={l.kicker}>Cancellation confirmed</Text>
          <Heading style={l.h1}>
            {firstName ? `${firstName}, your ${planName} won't renew.` : `Your ${planName} won't renew.`}
          </Heading>
          <Text style={l.lede}>
            We&apos;ve stopped all future renewals — you won&apos;t be charged again. Your benefits
            stay switched on until the end of the period you already paid for.
          </Text>

          <Section style={l.panel}>
            <Section style={l.row}>
              <Text style={l.label}>Plan</Text>
              <Text style={l.value}>{planName}</Text>
            </Section>
            <Section style={l.row}>
              <Text style={l.label}>Future renewals</Text>
              <Text style={l.value}>Stopped</Text>
            </Section>
            {accessThrough ? (
              <Section style={l.row}>
                <Text style={l.label}>Benefits active through</Text>
                <Text style={l.valueAccent}>{accessThrough}</Text>
              </Section>
            ) : null}
          </Section>

          <Section style={l.ctaWrap}>
            <Button href={manageUrl} style={l.button}>Manage membership</Button>
          </Section>

          <Hr style={l.hr} />
          <Text style={l.small}>
            Until that date you keep the 10.9% seller/host fee, your Featured Boost credit and the
            premium tools. After that your account simply returns to Free — your listings, messages
            and history stay exactly where they are, and you can rejoin anytime.
          </Text>
        </Section>

        <Text style={l.footnote}>Changed your mind? Reply to this email or call {SUPPORT_PHONE}.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (d: Record<string, any>) =>
    `Your ${d?.planName ?? 'Vendibook Pro'} membership is set to end`,
  displayName: 'Vendibook Pro — cancellation confirmed',
  previewData: { firstName: 'Alex', planName: 'Vendibook Pro', accessThrough: 'October 19, 2026' },
} satisfies TemplateEntry
