import * as React from 'npm:react@18.3.1'
import { Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import {
  BRAND_NAME,
  CtaButton,
  DetailTable,
  Divider,
  Eyebrow,
  H1,
  SupportRow,
  VendibookEmailLayout,
  t,
} from '../email-brand/components.tsx'

interface SupportReplyProps {
  firstName?: string
  subject?: string
  bodyParagraphs?: string[]
  signedBy?: string
  signedTitle?: string
  ticketNumber?: string
  ticketUrl?: string
}

const SupportReplyEmail = ({
  firstName,
  subject,
  bodyParagraphs = [],
  signedBy = 'The Vendibook Team',
  signedTitle = 'Customer Support',
  ticketNumber,
  ticketUrl,
}: SupportReplyProps) => (
  <VendibookEmailLayout preview={subject || `A note from ${BRAND_NAME} support`}>
    <Eyebrow>Customer support</Eyebrow>
    <H1>{firstName ? `Hi ${firstName},` : 'Hi there,'}</H1>

    {bodyParagraphs.map((p, i) => (
      <Text key={i} style={t.text}>{p}</Text>
    ))}

    {ticketNumber ? (
      <DetailTable rows={[{ label: 'Ticket', value: ticketNumber, mono: true }]} />
    ) : null}

    {ticketUrl ? <CtaButton href={ticketUrl}>View your ticket</CtaButton> : null}

    <Divider />

    <Text style={t.text}>
      If anything else comes up, just reply to this email — it reaches the same
      support inbox.
    </Text>

    <Text style={t.sectionLabel}>Warmly,</Text>
    <Text style={{ ...t.text, margin: '0 0 4px' }}>{signedBy}</Text>
    <Text style={t.small}>{signedTitle} · {BRAND_NAME}</Text>

    <SupportRow note="Still need a hand?" />
  </VendibookEmailLayout>
)

export const template = {
  component: SupportReplyEmail,
  subject: (data: Record<string, any>) =>
    data?.subject || `A note from ${BRAND_NAME} support`,
  displayName: 'Support reply',
  previewData: {
    firstName: 'Stephanie',
    subject: 'Your listing issue — resolved',
    bodyParagraphs: [
      'Thanks so much for reaching out, and I am sorry for the frustration.',
      'I have refunded the $30 charge back to your original payment method.',
    ],
    ticketNumber: 'VB-SUP-10428',
    signedBy: 'The Vendibook Team',
    signedTitle: 'Customer Support',
  },
} satisfies TemplateEntry
