import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { s, SITE_URL } from './_styles.ts'

import { BrandFooter, BrandHeader } from './_blocks.tsx'
interface Props { recipientName?: string; documentName?: string; approved?: boolean; reason?: string; bookingId?: string }

const E = ({ recipientName, documentName, approved, reason, bookingId }: Props) => (
  <Html lang="en" dir="ltr"><Head /><Preview>Document {approved ? 'approved' : 'needs attention'}</Preview>
    <Body style={s.main}><Container style={s.container}>
      <BrandHeader hero="document" />
      <Section style={s.card}>
        <Text style={s.smallHeader}>DOCUMENT {approved ? 'APPROVED' : 'REJECTED'}</Text>
        <Heading style={s.h1}>{recipientName ? `${recipientName}, ` : ''}{approved ? 'your document is approved.' : 'we need a new upload.'}</Heading>
        <Text style={s.lede}>{documentName ? `“${documentName}”` : 'Your document'} {approved ? 'has been verified — you\'re cleared to proceed.' : 'didn\'t pass review. Please upload a clearer version.'}</Text>
        {!approved && reason ? <Section style={s.accentRow}><Text style={s.accentLabel}>REASON</Text><Text style={s.accentValuePlain}>{reason}</Text></Section> : null}
        <Section style={s.ctaWrap}><Button href={`${SITE_URL}/dashboard?booking=${bookingId || ''}`} style={s.button}>{approved ? 'View booking' : 'Upload new document'}</Button></Section>
      </Section>
    <BrandFooter /></Container></Body></Html>
)

export const template = {
  component: E,
  subject: (d: any) => d?.approved ? `Approved: ${d?.documentName || 'Document'}` : `Action needed: ${d?.documentName || 'Document'}`,
  displayName: 'Document status',
  previewData: { recipientName: 'Pat', documentName: 'Insurance Certificate', approved: false, reason: 'Image is blurry', bookingId: 'demo' },
} satisfies TemplateEntry
