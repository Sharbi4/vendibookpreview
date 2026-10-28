import * as React from 'npm:react@18.3.1'
import { Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import {
  BRAND_NAME,
  CtaButton,
  Divider,
  Eyebrow,
  H1,
  SupportRow,
  VendibookEmailLayout,
  t,
} from '../email-brand/components.tsx'

interface FinancingFollowupProps {
  firstName?: string
  listingTitle?: string
  bookingUrl?: string
  applyUrl?: string
}

const FinancingFollowupEmail = ({
  firstName,
  listingTitle,
  bookingUrl = 'https://vendibook.com/contact',
  applyUrl = 'https://equinox-funding.com/efapplication/',
}: FinancingFollowupProps) => (
  <VendibookEmailLayout preview={`Next steps for your ${BRAND_NAME} financing application`}>
    <Eyebrow>Equipment financing</Eyebrow>
    <H1>{firstName ? `Hi ${firstName},` : 'Hi there,'}</H1>

    <Text style={t.text}>
      Thanks for starting a financing application{listingTitle ? ` for the ${listingTitle}` : ''} through
      {' '}{BRAND_NAME}. Your application is with our financing partner, Equinox Funding — if you
      didn't get a chance to finish it, you can pick up right where you left off here: {applyUrl}
    </Text>

    <Text style={t.text}>
      Have questions about financing, monthly payments, or whether this is the right truck or
      trailer for your business? Our team is happy to talk it through with you — no pressure, no
      obligation. Grab a free 30-minute call with us:
    </Text>

    <CtaButton href={bookingUrl}>Book a free 30-minute call</CtaButton>

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
      ? `Your financing application for the ${data.listingTitle} — next steps`
      : 'Your Vendibook financing application — next steps',
  displayName: 'Financing follow-up',
  previewData: {
    firstName: 'Jennifer',
    listingTitle: 'Food Trailer for sale in Frostproof, FL',
    bookingUrl: 'https://vendibook.com/contact',
    applyUrl: 'https://equinox-funding.com/efapplication/',
  },
} satisfies TemplateEntry
