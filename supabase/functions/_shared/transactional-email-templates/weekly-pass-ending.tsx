import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { s, SITE_URL, SUPPORT_PHONE } from './_styles.ts'
import { BrandHeader } from './_blocks.tsx'

interface Props {
  firstName?: string
  daysLeft?: number
  endsAt?: string
  monthlyPrice?: string
  plansUrl?: string
}

const Email = ({
  firstName,
  daysLeft = 2,
  endsAt,
  monthlyPrice = '$89/mo',
  plansUrl = '/pricing',
}: Props) => {
  const primary = `${SITE_URL}${plansUrl}`
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>Your Pro Pass ends in {daysLeft} days</Preview>
      <Body style={s.main}>
        <Container style={s.container}>
          <BrandHeader hero="payment" />
          <Section style={s.card}>
            <Text style={s.kicker}>PRO ACCESS EXPIRING</Text>
            <Heading style={s.h1}>
              {firstName ? `${firstName}, your Pro Pass ends in ${daysLeft} days.` : `Your Pro Pass ends in ${daysLeft} days.`}
            </Heading>
            <Text style={s.lede}>
              Keep featured placement, lower fees, and advanced analytics without a break — upgrade to monthly Pro for {monthlyPrice} before your pass ends{endsAt ? ` on ${endsAt}` : ''}.
            </Text>
            <Section style={s.ctaWrap}>
              <Button href={primary} style={s.button}>
                Keep Pro for {monthlyPrice}
              </Button>
            </Section>
            <Hr style={s.hr} />
            <Text style={s.footnote}>
              No action needed if you'd rather stop — your pass expires automatically. Questions? Call {SUPPORT_PHONE} or reply to this email.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: Email,
  subject: (d: Record<string, any>) =>
    `Your Pro Pass ends in ${d?.daysLeft ?? 2} day${(d?.daysLeft ?? 2) === 1 ? '' : 's'}`,
  displayName: 'Weekly Pro Pass ending nudge',
  previewData: { firstName: 'Alex', daysLeft: 2, endsAt: 'Aug 1, 2026', monthlyPrice: '$89/mo' },
} satisfies TemplateEntry
