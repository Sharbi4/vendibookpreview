import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { s, SITE_URL } from './_styles.ts'

import { BrandFooter, BrandHeader } from './_blocks.tsx'
interface Props {
  recipientName?: string
  listingTitle?: string
  refundAmount?: number
  reason?: string
  recipientType?: 'shopper' | 'host'
  initiatedBy?: 'shopper' | 'host' | 'admin'
  bookingId?: string; coverImageUrl?: string }

const E = ({ recipientName, listingTitle, refundAmount, reason, recipientType = 'shopper', initiatedBy, bookingId, coverImageUrl }: Props) => {
  const isShopper = recipientType === 'shopper'
  const amount = typeof refundAmount === 'number' ? `$${refundAmount.toFixed(2)}` : ''
  const initiator = initiatedBy === 'shopper' ? 'the guest' : initiatedBy === 'admin' ? 'our team' : 'you'
  return (
    <Html lang="en" dir="ltr"><Head /><Preview>{isShopper ? 'Your refund has been processed' : 'Booking cancelled and refunded'}</Preview>
      <Body style={s.main}><Container style={s.container}>
        <BrandHeader hero="payment" listingImageUrl={coverImageUrl} listingTitle={listingTitle} />
        <Section style={s.card}>
          <Text style={s.smallHeader}>{isShopper ? 'REFUND PROCESSED' : 'BOOKING CANCELLED'}</Text>
          <Heading style={s.h1}>{recipientName ? `${recipientName}, ` : ''}{isShopper ? 'your refund is on the way' : 'a booking was cancelled'}.</Heading>
          <Text style={s.lede}>
            {isShopper
              ? `We've refunded ${amount} for ${listingTitle ? `“${listingTitle}”` : 'your booking'}. Funds typically appear on your original payment method within 5–10 business days.`
              : `A booking for ${listingTitle ? `“${listingTitle}”` : 'your listing'} was cancelled by ${initiator}. A refund of ${amount} has been issued. The dates are now open for new bookings.`}
          </Text>
          {reason ? (
            <Section style={s.accentRow}>
              <Text style={s.accentLabel}>REASON</Text>
              <Text style={s.accentValuePlain}>{reason}</Text>
            </Section>
          ) : null}
          <Section style={s.ctaWrap}>
            <Button href={`${SITE_URL}/dashboard`} style={s.button}>View dashboard</Button>
          </Section>
          {bookingId ? <Text style={s.footnote}>Reference: {String(bookingId).slice(0, 8)}</Text> : null}
        </Section>
      <BrandFooter /></Container></Body></Html>
  )
}

export const template = {
  component: E,
  subject: (d: any) => d?.recipientType === 'host'
    ? `Booking cancelled & refunded${d?.listingTitle ? `: ${d.listingTitle}` : ''}`
    : `Refund processed${d?.listingTitle ? `: ${d.listingTitle}` : ''}`,
  displayName: 'Refund processed',
  previewData: { recipientName: 'Jordan', listingTitle: 'Demo Kitchen', coverImageUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&q=80', refundAmount: 240, recipientType: 'shopper', bookingId: 'demo1234' },
} satisfies TemplateEntry
