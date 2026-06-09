import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { s, SITE_URL, SUPPORT_PHONE } from './_styles.ts'

import { BrandHeader } from './_blocks.tsx'
interface Props { hostName?: string; shopperName?: string; listingTitle?: string; startDate?: string; endDate?: string; totalPrice?: number; bookingId?: string; message?: string }

const E = ({ hostName, shopperName, listingTitle, startDate, endDate, totalPrice, bookingId, message }: Props) => (
  <Html lang="en" dir="ltr"><Head /><Preview>New booking request from {shopperName || 'a guest'}</Preview>
    <Body style={s.main}><Container style={s.container}>
      <BrandHeader />
      <Section style={s.card}>
        <Text style={s.smallHeader}>NEW BOOKING REQUEST</Text>
        <Heading style={s.h1}>{shopperName || 'A guest'} wants to book {listingTitle ? `“${listingTitle}”` : 'your listing'}.</Heading>
        <Text style={s.lede}>Respond within 24 hours to keep your fast-responder status and lift conversion.</Text>
        <Section style={s.accentRow}><Text style={s.accentLabel}>DATES</Text><Text style={s.accentValuePlain}>{startDate}{endDate && startDate !== endDate ? ` → ${endDate}` : ''}</Text></Section>
        {totalPrice ? <Section style={s.accentRow}><Text style={s.accentLabel}>PAYOUT (EST.)</Text><Text style={s.accentValue}>${totalPrice.toLocaleString()}</Text></Section> : null}
        {message ? <><Text style={s.smallHeader}>MESSAGE</Text><Text style={s.text}>“{message}”</Text></> : null}
        <Section style={s.ctaWrap}><Button href={`${SITE_URL}/dashboard?booking=${bookingId || ''}`} style={s.button}>Review & respond</Button></Section>
      </Section>
      <Text style={s.footnote}>Need help? {SUPPORT_PHONE}</Text>
    </Container></Body></Html>
)

export const template = {
  component: E,
  subject: (d: any) => `New booking request${d?.listingTitle ? ` — ${d.listingTitle}` : ''}`,
  displayName: 'Booking request (host)',
  previewData: { hostName: 'Sam', shopperName: 'Maria', listingTitle: 'Downtown Food Truck', startDate: 'Apr 28, 2026', endDate: 'Apr 30, 2026', totalPrice: 540, bookingId: 'demo', message: 'Looking forward to it!' },
} satisfies TemplateEntry
