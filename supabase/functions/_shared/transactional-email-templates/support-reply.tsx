import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { s, SITE_NAME, SUPPORT_PHONE } from './_styles.ts'

import { BrandFooter, BrandHeader } from './_blocks.tsx'
interface SupportReplyProps {
  firstName?: string
  subject?: string
  bodyParagraphs?: string[]
  signedBy?: string
  signedTitle?: string
}

const SupportReplyEmail = ({
  firstName,
  subject,
  bodyParagraphs = [],
  signedBy = 'The Vendibook Team',
  signedTitle = 'Customer Support',
}: SupportReplyProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{subject || `A note from ${SITE_NAME} support`}</Preview>
    <Body style={s.main}>
      <Container style={s.container}>
        <BrandHeader hero="message" />
        <Section style={s.card}>
          <Text style={s.kicker}>CUSTOMER SUPPORT</Text>
          <Heading style={s.h1}>
            {firstName ? `Hi ${firstName},` : 'Hi there,'}
          </Heading>

          {bodyParagraphs.map((p, i) => (
            <Text key={i} style={s.text}>{p}</Text>
          ))}

          <Hr style={s.hr} />

          <Text style={s.text}>
            If anything else comes up, just reply to this email or call us at{' '}
            <span style={s.good}>{SUPPORT_PHONE}</span>. We're here to help.
          </Text>

          <Text style={s.smallHeader}>WARMLY,</Text>
          <Text style={{ ...s.text, margin: 0 }}>{signedBy}</Text>
          <Text style={s.small}>{signedTitle} · {SITE_NAME}</Text>
        </Section>

        <Text style={s.footnote}>
          You're receiving this because you contacted {SITE_NAME} support.
        </Text>
      <BrandFooter /></Container>
    </Body>
  </Html>
)

export const template = {
  component: SupportReplyEmail,
  subject: (data: Record<string, any>) =>
    data?.subject || `A note from ${SITE_NAME} support`,
  displayName: 'Support reply',
  previewData: {
    firstName: 'Stephanie',
    subject: 'Your listing issue — resolved',
    bodyParagraphs: [
      'Thanks so much for reaching out, and I am sorry for the frustration.',
      'I have refunded the $30 charge back to your card.',
    ],
    signedBy: 'The Vendibook Team',
    signedTitle: 'Customer Support',
  },
} satisfies TemplateEntry
