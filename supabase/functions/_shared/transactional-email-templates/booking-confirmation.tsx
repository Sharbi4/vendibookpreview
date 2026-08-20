import * as React from 'npm:react@18.3.1'
import { Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import {
  Bullets,
  CtaButton,
  DetailTable,
  Divider,
  Eyebrow,
  H1,
  Lede,
  SectionLabel,
  SupportRow,
  VendibookEmailLayout,
  SITE_URL,
  color,
  t,
} from '../email-brand/components.tsx'

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
  cityState?: string
  coverImageUrl?: string
  /** booking_requests.status at send time — 'approved' | 'confirmed' vs 'pending'. */
  bookingStatus?: string
  isInstantBook?: boolean
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
    <Section style={t.panel}>
      <SectionLabel>What you agreed to</SectionLabel>
      {lines.map((l, i) => (
        <Text
          key={i}
          style={{
            margin: '4px 0',
            fontSize: '14px',
            color: l.kind === 'total' ? color.text : color.textSecondary,
            fontWeight: l.kind === 'total' ? 700 : 400,
          }}
        >
          {l.label}: {money(l.amountCents)}
        </Text>
      ))}
      {cancellation ? (
        <>
          <Text style={{ fontWeight: 700, color: color.text, margin: '12px 0 4px', fontSize: '13px' }}>
            Cancellation policy
          </Text>
          <Text style={{ color: color.textSecondary, fontSize: '13px', margin: 0, lineHeight: 1.6 }}>
            {cancellation}
          </Text>
        </>
      ) : null}
      {acks.map((a, i) => (
        <Text key={`ack-${i}`} style={{ color: color.textSecondary, fontSize: '13px', margin: '4px 0 0' }}>
          • {a}
        </Text>
      ))}
      <Text style={{ color: color.textMuted, fontSize: '12px', margin: '12px 0 0' }}>Terms version {v}</Text>
    </Section>
  )
}

const BookingConfirmationEmail = ({
  guestName,
  listingTitle,
  startDate,
  endDate,
  totalPrice,
  orderNumber,
  bookingId,
  cityState,
  termsSnapshot,
  termsVersion,
}: BookingProps) => (
  <VendibookEmailLayout preview={`Booking confirmed — ${listingTitle ?? 'your reservation'}`}>
    <Eyebrow>Booking confirmed</Eyebrow>
    <H1>{guestName ? `You're all set, ${guestName}.` : "You're all set."}</H1>
    <Lede>
      Your authorization hold has been placed and the host has been notified. You'll receive a
      final receipt once your booking is captured.
    </Lede>

    <DetailTable
      rows={[
        { label: 'Listing', value: listingTitle ?? 'Your reservation' },
        { label: 'Location', value: cityState },
        { label: 'Dates', value: startDate || endDate ? `${startDate ?? '—'} → ${endDate ?? '—'}` : undefined },
        { label: 'Order', value: orderNumber, mono: true },
        { label: 'Total', value: totalPrice, emphasis: true },
      ]}
    />

    <CtaButton href={`${SITE_URL}/dashboard${bookingId ? `?booking=${bookingId}` : ''}`}>
      View booking details
    </CtaButton>

    <Divider />

    <SectionLabel>What happens next</SectionLabel>
    <Bullets
      items={[
        'Message the host directly from your dashboard.',
        'Upload any required documents before your start date.',
        'The precise address unlocks once your booking is fully confirmed.',
      ]}
    />

    <TermsBlock snap={termsSnapshot} version={termsVersion} />

    <SupportRow />
  </VendibookEmailLayout>
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
