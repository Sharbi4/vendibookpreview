import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { s, SITE_URL, SUPPORT_PHONE } from './_styles.ts'
import { BrandFooter, BrandHeader } from './_blocks.tsx'

interface Props {
  firstName?: string
  fromPlan?: string
  toPlan?: string
  amount?: string
  interval?: string
  effectiveDate?: string
  direction?: 'upgrade' | 'downgrade' | 'change'
}

const Email = ({ firstName, fromPlan, toPlan = 'Host Pro', amount, interval = 'month', effectiveDate, direction = 'change' }: Props) => {
  const verb = direction === 'upgrade' ? 'upgraded' : direction === 'downgrade' ? 'changed' : 'updated'
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>Your plan was {verb}</Preview>
      <Body style={s.main}>
        <Container style={s.container}>
          <BrandHeader hero="payment" />
          <Section style={s.card}>
            <Text style={s.kicker}>PLAN {verb.toUpperCase()}</Text>
            <Heading style={s.h1}>{firstName ? `${firstName}, your plan was ${verb}.` : `Your plan was ${verb}.`}</Heading>
            <Text style={s.lede}>
              You're now on <strong style={{ color: '#fff' }}>{toPlan}</strong>
              {fromPlan ? <> (from {fromPlan})</> : null}
              {effectiveDate ? <>, effective {effectiveDate}.</> : '.'}
            </Text>
            {amount && (
              <Section style={s.accentRow}>
                <Text style={s.accentLabel}>NEW BILLING</Text>
                <Text style={s.accentValue}>{amount} / {interval}</Text>
              </Section>
            )}
            <Section style={s.ctaWrap}>
              <Button href={`${SITE_URL}/account`} style={s.button}>Manage subscription</Button>
            </Section>
            <Hr style={s.hr} />
            <Text style={s.small}>
              Any prorated differences appear on your next invoice. If this wasn't you, contact us right away.
            </Text>
          </Section>
          <Text style={s.footnote}>Questions? Call {SUPPORT_PHONE}.</Text>
        <BrandFooter /></Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: Email,
  subject: (d: Record<string, any>) => `Your plan is now ${d?.toPlan ?? 'updated'}`,
  displayName: 'Subscription updated',
  previewData: { firstName: 'Alex', fromPlan: 'Host Starter', toPlan: 'Host Pro', amount: '$39.00', interval: 'month', direction: 'upgrade', effectiveDate: 'today' },
} satisfies TemplateEntry
