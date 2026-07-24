import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { s, SITE_URL, SUPPORT_PHONE } from './_styles.ts'
import { BrandHeader } from './_blocks.tsx'

interface Props {
  firstName?: string
  planName?: string
  amount?: string
  interval?: string
  nextBillingDate?: string
  isRenewal?: boolean
}

const Email = ({ firstName, planName = 'Host Pro', amount = '$39.00', interval = 'month', nextBillingDate, isRenewal }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{isRenewal ? `${planName} renewed` : `${planName} is now active`}</Preview>
    <Body style={s.main}>
      <Container style={s.container}>
        <BrandHeader hero="payment" />
        <Section style={s.card}>
          <Text style={s.kicker}>{isRenewal ? 'SUBSCRIPTION RENEWED ✅' : 'SUBSCRIPTION ACTIVE ✅'}</Text>
          <Heading style={s.h1}>{firstName ? `You're in, ${firstName}.` : "You're in."}</Heading>
          <Text style={s.lede}>
            {isRenewal
              ? `Your ${planName} plan just renewed. Nothing to do — all your Pro perks stay on.`
              : `Your ${planName} plan is now active. All host tools are unlocked on your dashboard.`}
          </Text>
          <Section style={s.accentRow}>
            <Text style={s.accentLabel}>PLAN</Text>
            <Text style={s.accentValuePlain}>{planName}</Text>
          </Section>
          <Section style={s.accentRow}>
            <Text style={s.accentLabel}>BILLED</Text>
            <Text style={s.accentValue}>{amount} / {interval}</Text>
          </Section>
          {nextBillingDate && (
            <Section style={s.accentRow}>
              <Text style={s.accentLabel}>NEXT BILLING</Text>
              <Text style={s.accentValuePlain}>{nextBillingDate}</Text>
            </Section>
          )}
          <Section style={s.ctaWrap}>
            <Button href={`${SITE_URL}/dashboard`} style={s.button}>Open host dashboard</Button>
          </Section>
          <Hr style={s.hr} />
          <Text style={s.smallHeader}>WHAT'S UNLOCKED</Text>
          <Text style={s.listItem}>• Priority placement + featured boosts</Text>
          <Text style={s.listItem}>• Advanced analytics + booking insights</Text>
          <Text style={s.listItem}>• Priority support and dedicated concierge</Text>
        </Section>
        <Text style={s.footnote}>Manage your plan anytime at {SITE_URL}/account. Questions? Call {SUPPORT_PHONE}.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (d: Record<string, any>) => d?.isRenewal ? `${d?.planName ?? 'Your plan'} renewed` : `${d?.planName ?? 'Your plan'} is active`,
  displayName: 'Subscription activated / renewed',
  previewData: { firstName: 'Alex', planName: 'Host Pro', amount: '$39.00', interval: 'month', nextBillingDate: 'August 24, 2026' },
} satisfies TemplateEntry
