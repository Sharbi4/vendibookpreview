import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text, Hr } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { s, SITE_URL } from './_styles.ts'

import { BrandFooter, BrandHeader } from './_blocks.tsx'
interface Props { shopperName?: string; listingTitle?: string; startDate?: string; endDate?: string; totalPrice?: number; bookingId?: string; address?: string; coverImageUrl?: string }

const E = ({ shopperName, listingTitle, startDate, endDate, totalPrice, bookingId, address, coverImageUrl }: Props) => (
  <Html lang="en" dir="ltr"><Head /><Preview>Your booking is approved 🎉</Preview>
    <Body style={s.main}><Container style={s.container}>
      <BrandHeader hero="booking" listingImageUrl={coverImageUrl} listingTitle={listingTitle} />
      <Section style={s.card}>
        <Text style={s.smallHeader}>BOOKING APPROVED</Text>
        <Heading style={s.h1}>{shopperName ? `You're set, ${shopperName}.` : "You're all set."}</Heading>
        <Text style={s.lede}>The host approved your booking{listingTitle ? ` for “${listingTitle}”` : ''}. Save the dates.</Text>
        <Section style={s.accentRow}><Text style={s.accentLabel}>WHEN</Text><Text style={s.accentValuePlain}>{startDate}{endDate && startDate !== endDate ? ` → ${endDate}` : ''}</Text></Section>
        {address ? <Section style={s.accentRow}><Text style={s.accentLabel}>WHERE</Text><Text style={s.accentValuePlain}>{address}</Text></Section> : null}
        {totalPrice ? <Section style={s.accentRow}><Text style={s.accentLabel}>TOTAL</Text><Text style={s.accentValue}>${totalPrice.toLocaleString()}</Text></Section> : null}
        <Section style={s.ctaWrap}><Button href={`${SITE_URL}/dashboard?booking=${bookingId || ''}`} style={s.button}>View booking</Button></Section>
        <Hr style={s.hr} />
        <Text style={s.smallHeader}>BEFORE YOU GO</Text>
        <Text style={s.listItem}>• Upload any required documents.</Text>
        <Text style={s.listItem}>• Message your host with arrival details.</Text>
        <Text style={s.listItem}>• Add the dates to your calendar.</Text>
      </Section>
    <BrandFooter /></Container></Body></Html>
)

export const template = {
  component: E,
  subject: (d: any) => `Approved: ${d?.listingTitle || 'Your booking'}`,
  displayName: 'Booking approved (guest)',
  previewData: { shopperName: 'Jordan', listingTitle: 'Vendor Lot — Brooklyn', coverImageUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&q=80', startDate: 'May 2, 2026', endDate: 'May 4, 2026', totalPrice: 320, bookingId: 'demo', address: 'Brooklyn, NY' },
} satisfies TemplateEntry
