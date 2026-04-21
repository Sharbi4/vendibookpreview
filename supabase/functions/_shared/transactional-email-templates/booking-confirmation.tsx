import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'VendiBook'
const SITE_URL = 'https://vendibook.com'

interface BookingProps {
  guestName?: string
  listingTitle?: string
  startDate?: string
  endDate?: string
  totalPrice?: string
  orderNumber?: string
  bookingId?: string
  cityState?: string
}

const BookingConfirmationEmail = ({
  guestName, listingTitle, startDate, endDate, totalPrice, orderNumber, bookingId, cityState,
}: BookingProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Booking confirmed — {listingTitle ?? 'your reservation'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={brandBar}>
          <Text style={brandMark}>VENDIBOOK</Text>
        </Section>

        <Section style={card}>
          <Text style={kicker}>BOOKING CONFIRMED</Text>
          <Heading style={h1}>
            {guestName ? `You're all set, ${guestName}.` : "You're all set."}
          </Heading>
          <Text style={lede}>
            Your authorization hold has been placed and the host has been notified.
            You'll receive a final receipt once your booking is captured.
          </Text>

          <Section style={detailGrid}>
            <Text style={detailLabel}>LISTING</Text>
            <Text style={detailValue}>{listingTitle ?? 'Your reservation'}</Text>
            {cityState && <Text style={detailSub}>{cityState}</Text>}

            <Hr style={hrThin} />

            <Text style={detailLabel}>DATES</Text>
            <Text style={detailValue}>
              {startDate ?? '—'} → {endDate ?? '—'}
            </Text>

            <Hr style={hrThin} />

            <Text style={detailLabel}>TOTAL</Text>
            <Text style={detailValueOrange}>{totalPrice ?? '—'}</Text>

            {orderNumber && (
              <>
                <Hr style={hrThin} />
                <Text style={detailLabel}>ORDER</Text>
                <Text style={detailMono}>{orderNumber}</Text>
              </>
            )}
          </Section>

          <Section style={ctaWrap}>
            <Button
              href={`${SITE_URL}/dashboard${bookingId ? `?booking=${bookingId}` : ''}`}
              style={button}
            >
              View booking details
            </Button>
          </Section>

          <Hr style={hr} />

          <Text style={smallHeader}>What happens next</Text>
          <Text style={listItem}>• Message the host directly from your dashboard.</Text>
          <Text style={listItem}>• Upload any required documents before your start date.</Text>
          <Text style={listItem}>• Precise address unlocks once your booking is fully confirmed.</Text>
        </Section>

        <Text style={footnote}>
          Need help? Call (725) 755-9598 — we're here every day.
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
    listingTitle: 'Sunset Food Truck — Downtown LA',
    startDate: 'May 4, 2026',
    endDate: 'May 6, 2026',
    totalPrice: '$842.00',
    orderNumber: 'VB-9F2A1C4D',
    cityState: 'Los Angeles, CA',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Helvetica Neue', Arial, sans-serif", margin: 0, padding: '32px 0' }
const container = { maxWidth: '560px', margin: '0 auto', padding: '0 20px' }
const brandBar = { padding: '0 0 20px' }
const brandMark = { fontSize: '12px', letterSpacing: '0.32em', color: '#0a0a0a', fontWeight: 700, margin: 0 }
const card = { backgroundColor: '#0a0a0a', color: '#fafafa', borderRadius: '16px', padding: '40px 36px', border: '1px solid #1a1a1a' }
const kicker = { fontSize: '10px', letterSpacing: '0.28em', color: '#FF5124', fontWeight: 700, margin: '0 0 14px' }
const h1 = { fontSize: '28px', lineHeight: 1.15, fontWeight: 600, color: '#ffffff', margin: '0 0 14px', letterSpacing: '-0.02em' }
const lede = { fontSize: '15px', lineHeight: 1.6, color: '#a3a3a3', margin: '0 0 28px' }
const detailGrid = { backgroundColor: '#141414', border: '1px solid #232323', borderRadius: '12px', padding: '20px 22px', margin: '0 0 28px' }
const detailLabel = { fontSize: '10px', letterSpacing: '0.2em', color: '#737373', fontWeight: 600, margin: '0 0 4px' }
const detailValue = { fontSize: '15px', color: '#fafafa', fontWeight: 500, margin: '0 0 0' }
const detailValueOrange = { fontSize: '20px', color: '#FF5124', fontWeight: 600, margin: '0 0 0', letterSpacing: '-0.01em' }
const detailSub = { fontSize: '13px', color: '#737373', margin: '4px 0 0' }
const detailMono = { fontSize: '13px', color: '#d4d4d4', margin: 0, fontFamily: 'monospace', letterSpacing: '0.05em' }
const hrThin = { borderColor: '#232323', margin: '14px 0' }
const ctaWrap = { margin: '8px 0 8px' }
const button = { backgroundColor: '#FF5124', color: '#0a0a0a', padding: '14px 28px', borderRadius: '10px', fontWeight: 600, fontSize: '15px', textDecoration: 'none', display: 'inline-block' }
const hr = { borderColor: '#1f1f1f', margin: '32px 0 24px' }
const smallHeader = { fontSize: '11px', letterSpacing: '0.2em', color: '#737373', fontWeight: 600, margin: '0 0 14px' }
const listItem = { fontSize: '14px', color: '#d4d4d4', margin: '0 0 8px', lineHeight: 1.55 }
const footnote = { fontSize: '12px', color: '#737373', textAlign: 'center' as const, margin: '24px 0 0' }
