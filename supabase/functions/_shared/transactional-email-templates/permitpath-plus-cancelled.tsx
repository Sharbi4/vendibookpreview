import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Hr, Html, Link, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { SITE_URL, SUPPORT_PHONE } from './_styles.ts'
import { l } from './_stylesLight.ts'
import { EmailHeader, SupportRow, TransactionalFooter } from '../email-brand/components.tsx'

interface Props {
  firstName?: string
  planName?: string
  /** Date access remains active through (current_period_end). */
  accessThrough?: string
  manageUrl?: string
}

const Email = ({
  firstName,
  planName = 'PermitPath Plus',
  accessThrough,
  manageUrl = `${SITE_URL}/tools/permitpath`,
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{`${planName} cancellation confirmed`}</Preview>
    <Body style={l.main}>
      <Container style={l.container}>
        <EmailHeader />

        <Section style={l.card}>
          <Text style={l.kicker}>Cancellation confirmed</Text>
          <Heading style={l.h1}>
            {firstName ? `${firstName}, your ${planName} won't renew.` : `Your ${planName} won't renew.`}
          </Heading>
          <Text style={l.lede}>
            We&apos;ve stopped all future renewals — you won&apos;t be charged again. Your saved
            roadmaps and tracking stay available until the end of the period you already paid for.
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
                <Text style={l.label}>Access through</Text>
                <Text style={l.valueAccent}>{accessThrough}</Text>
              </Section>
            ) : null}
          </Section>

          <Section style={l.ctaWrap}>
            <Button href={manageUrl} style={l.button}>Manage subscription</Button>
          </Section>

          <Hr style={l.hr} />
          <Text style={l.small}>
            After that date PermitPath returns to the free Basic plan — unlimited permit searches and
            the full on-screen roadmap. Your saved data isn&apos;t deleted, and resubscribing brings
            saving and tracking straight back.
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
    `Your ${d?.planName ?? 'PermitPath Plus'} subscription is set to end`,
  displayName: 'PermitPath Plus — cancellation confirmed',
  previewData: { firstName: 'Alex', planName: 'PermitPath Plus', accessThrough: 'October 19, 2026' },
} satisfies TemplateEntry
