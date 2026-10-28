import * as React from 'npm:react@18.3.1'
import { Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import {
  BRAND_NAME,
  CtaButton,
  Divider,
  Eyebrow,
  H1,
  SecondaryButton,
  SupportRow,
  VendibookEmailLayout,
  t,
} from '../email-brand/components.tsx'

interface FinancingFollowupProps {
  firstName?: string
  listingTitle?: string
  bookingUrl?: string
  callbackUrl?: string
  applyUrl?: string
}

const FinancingFollowupEmail = ({
  firstName,
  listingTitle,
  bookingUrl = 'https://vendibook.com/contact#meeting',
  callbackUrl = 'https://vendibook.com/contact#callback',
  applyUrl = 'https://equinox-funding.com/efapplication/',
}: FinancingFollowupProps) => (
  <VendibookEmailLayout preview={`Financing next steps and personal help from ${BRAND_NAME}`}>
    <Eyebrow>Equipment financing</Eyebrow>
    <H1>{firstName ? `Hi ${firstName},` : 'Hi there,'}</H1>

    <Text style={t.text}>
      Thanks for exploring financing{listingTitle ? ` for the ${listingTitle}` : ''} through
      {' '}{BRAND_NAME}. If you’d like to start or continue an application with our financing
      partner, Equinox Funding, visit: {applyUrl}. We can’t confirm whether you’ve completed their application.
    </Text>

    <Text style={t.text}>
      Have questions about financing, monthly payments, or whether this is the right truck or
      trailer for your business? Our sales team can help you compare options — no pressure, no
      obligation. Would you like a representative to reach out personally? Request a callback,
      or arrange a free 30-minute Customer Success Meeting at a time that works for you.
    </Text>

    <CtaButton href={callbackUrl}>Request a personal callback</CtaButton>
    <SecondaryButton href={bookingUrl}>Schedule a 30-minute meeting</SecondaryButton>

    <Text style={t.text}>
      Prefer to talk now? Call or text us at (866) 690-6227 — we're around Monday to Friday,
      9 AM to 5 PM Arizona time.
    </Text>

    <Divider />

    <Text style={t.text}>
      You can also just reply to this email — it reaches a real person on our team.
    </Text>

    <Text style={t.sectionLabel}>Warmly,</Text>
    <Text style={{ ...t.text, margin: '0 0 4px' }}>The {BRAND_NAME} Team</Text>
    <Text style={t.small}>Customer Success · {BRAND_NAME}</Text>

    <SupportRow note="Still need a hand?" />
  </VendibookEmailLayout>
)

export const template = {
  component: FinancingFollowupEmail,
  subject: (data: Record<string, any>) =>
    data?.listingTitle
      ? `Financing options for the ${data.listingTitle} — next steps`
      : 'Your Vendibook financing options — next steps',
  displayName: 'Financing follow-up',
  previewData: {
    firstName: 'Jennifer',
    listingTitle: 'Food Trailer for sale in Frostproof, FL',
    bookingUrl: 'https://vendibook.com/contact#meeting',
    applyUrl: 'https://equinox-funding.com/efapplication/',
  },
} satisfies TemplateEntry
