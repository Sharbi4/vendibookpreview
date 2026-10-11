import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { s } from './_styles.ts'

import { BrandFooter, BrandHeader } from './_blocks.tsx'
interface Props { recipientName?: string; listingTitle?: string; cancelledBy?: 'host' | 'guest' | string; reason?: string; coverImageUrl?: string }

const E = ({ recipientName, listingTitle, cancelledBy, reason, coverImageUrl }: Props) => (
  <Html lang="en" dir="ltr"><Head /><Preview>Booking cancelled</Preview>
    <Body style={s.main}><Container style={s.container}>
      <BrandHeader hero="booking" listingImageUrl={coverImageUrl} listingTitle={listingTitle} />
      <Section style={s.card}>
        <Text style={s.smallHeader}>BOOKING CANCELLED</Text>
        <Heading style={s.h1}>{recipientName ? `${recipientName}, ` : ''}this booking has been cancelled.</Heading>
        <Text style={s.lede}>{cancelledBy === 'host' ? 'The host' : cancelledBy === 'guest' ? 'The guest' : 'The booking'}{listingTitle ? ` for “${listingTitle}”` : ''} was cancelled. If a payment was held, it will be released within 5–10 business days.</Text>
        {reason ? <Section style={s.accentRow}><Text style={s.accentLabel}>REASON</Text><Text style={s.accentValuePlain}>{reason}</Text></Section> : null}
      </Section>
    <BrandFooter /></Container></Body></Html>
)

export const template = {
  component: E,
  subject: (d: any) => `Cancelled: ${d?.listingTitle || 'your booking'}`,
  displayName: 'Booking cancelled',
  previewData: { recipientName: 'Sam', listingTitle: 'Demo Lot', coverImageUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&q=80', cancelledBy: 'guest', reason: 'Schedule conflict' },
} satisfies TemplateEntry
