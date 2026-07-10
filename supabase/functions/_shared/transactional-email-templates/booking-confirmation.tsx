import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { s, SITE_URL, SUPPORT_PHONE } from './_styles.ts'
import {BrandHeader, BlogHighlights, ToolsBlock} from './_blocks.tsx'

interface TermsLine { label: string; amountCents: number; kind: string; hint?: string }
interface TermsSnapshot {
  termsVersion?: string
  pricing?: { lines?: TermsLine[] }
  policies?: { cancellation?: string; acknowledgements?: string[] }
}

interface BookingProps {
  guestName?: string
  listingTitle?: string
  startDate?: string
  endDate?: string
  totalPrice?: string
  orderNumber?: string
  bookingId?: string
  cityState?: string; coverImageUrl?: string
  termsSnapshot?: TermsSnapshot
  termsVersion?: string
}

const money = (c: number) => `$${(Number(c || 0) / 100).toFixed(2)}`

const TermsBlock = ({ snap, version }: { snap?: TermsSnapshot; version?: string }) => {
  const lines = snap?.pricing?.lines ?? []
  const acks = snap?.policies?.acknowledgements ?? []
  const cancellation = snap?.policies?.cancellation
  const v = version || snap?.termsVersion || 'v1'
  if (!lines.length && !cancellation) return null
  return (
    <Section style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, margin: '16px 0', background: '#ffffff' }}>
      <Text style={{ fontWeight: 600, color: '#111827', margin: '0 0 8px' }}>What you agreed to</Text>
      {lines.map((l, i) => (
        <Text key={i} style={{ margin: '4px 0', color: l.kind === 'total' ? '#111827' : '#374151', fontWeight: l.kind === 'total' ? 600 : 400, fontSize: 14 }}>
          {l.label}: {money(l.amountCents)}
        </Text>
      ))}
      {cancellation && (
        <>
          <Text style={{ fontWeight: 600, color: '#111827', margin: '12px 0 4px', fontSize: 13 }}>Cancellation policy</Text>
          <Text style={{ color: '#374151', fontSize: 13, margin: 0 }}>{cancellation}</Text>
        </>
      )}
      {acks.length > 0 && acks.map((a, i) => (
        <Text key={`ack-${i}`} style={{ color: '#374151', fontSize: 13, margin: '4px 0 0' }}>• {a}</Text>
      ))}
      <Text style={{ color: '#6b7280', fontSize: 12, margin: '12px 0 0' }}>Terms version {v}</Text>
    </Section>
  )
}

const BookingConfirmationEmail = ({ guestName, listingTitle, startDate, endDate, totalPrice, orderNumber, bookingId, cityState, coverImageUrl, termsSnapshot, termsVersion }: BookingProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Booking confirmed — {listingTitle ?? 'your reservation'}</Preview>
    <Body style={s.main}>
      <Container style={s.container}>
        <BrandHeader hero="booking" listingImageUrl={coverImageUrl} listingTitle={listingTitle} />

        <Section style={s.card}>
          <Text style={s.kicker}>BOOKING CONFIRMED</Text>
          <Heading style={s.h1}>
            {guestName ? `You're all set, ${guestName}.` : "You're all set."}
          </Heading>
          <Text style={s.lede}>
            Your authorization hold has been placed and the host has been notified.
            You'll receive a final receipt once your booking is captured.
          </Text>

          <Section style={s.detailGrid}>
            <Text style={s.detailLabel}>LISTING</Text>
            <Text style={s.detailValue}>{listingTitle ?? 'Your reservation'}</Text>
            {cityState && <Text style={s.detailSub}>{cityState}</Text>}

            <Hr style={s.hrThin} />

            <Text style={s.detailLabel}>DATES</Text>
            <Text style={s.detailValue}>{startDate ?? '—'} → {endDate ?? '—'}</Text>

            <Hr style={s.hrThin} />

            <Text style={s.detailLabel}>TOTAL</Text>
            <Text style={s.detailValueOrange}>{totalPrice ?? '—'}</Text>

            {orderNumber && (
              <>
                <Hr style={s.hrThin} />
                <Text style={s.detailLabel}>ORDER</Text>
                <Text style={s.detailMono}>{orderNumber}</Text>
              </>
            )}
          </Section>

          <Section style={s.ctaWrap}>
            <Button
              href={`${SITE_URL}/dashboard${bookingId ? `?booking=${bookingId}` : ''}`}
              style={s.button}
            >
              View booking details
            </Button>
          </Section>

          <Hr style={s.hr} />

          <Text style={s.smallHeader}>WHAT HAPPENS NEXT</Text>
          <Text style={s.listItem}>• Message the host directly from your dashboard.</Text>
          <Text style={s.listItem}>• Upload any required documents before your start date.</Text>
          <Text style={s.listItem}>• Precise address unlocks once your booking is fully confirmed.</Text>

          <ToolsBlock role="guest" />
          <BlogHighlights role="guest" />
        </Section>

        <Text style={s.footnote}>
          Need help? Call {SUPPORT_PHONE} — we're here every day.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: BookingConfirmationEmail,
  subject: (data: Record<string, any>) =>
    data?.listingTitle ? `Booking confirmed: ${data.listingTitle}` : 'Your booking is confirmed',
  displayName: 'Booking confirmation',
  previewData: {
    guestName: 'Jordan',
    listingTitle: 'Sunset Food Truck — Downtown LA', coverImageUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&q=80', startDate: 'May 4, 2026',
    endDate: 'May 6, 2026',
    totalPrice: '$842.00',
    orderNumber: 'VB-9F2A1C4D',
    cityState: 'Los Angeles, CA',
  },
} satisfies TemplateEntry
