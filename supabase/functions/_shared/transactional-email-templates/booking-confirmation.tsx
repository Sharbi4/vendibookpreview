import * as React from 'npm:react@18.3.1'
import { Img, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import {
  Bullets,
  CtaButton,
  DetailTable,
  Divider,
  H1,
  H2,
  Lede,
  SectionLabel,
  StatusChip,
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
  /** Deposit collected separately by the host — never part of the amount charged today. */
  securityDeposit?: string
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
    <Section style={t.panel} className="vb-panel">
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

const APPROVED_STATUSES = new Set(['approved', 'confirmed', 'active', 'completed'])

const BookingConfirmationEmail = ({
  guestName,
  listingTitle,
  startDate,
  endDate,
  totalPrice,
  orderNumber,
  bookingId,
  cityState,
  coverImageUrl,
  bookingStatus,
  securityDeposit,
  termsSnapshot,
  termsVersion,
}: BookingProps) => {
  // Payment is CAPTURED before this email is sent (deliverOrderReceipt only
  // runs on payment_status === 'completed'). The only variable is whether the
  // host has approved the dates yet.
  const approved = APPROVED_STATUSES.has(String(bookingStatus ?? '').toLowerCase())
  const dates = startDate || endDate ? `${startDate ?? '—'} → ${endDate ?? '—'}` : undefined

  return (
    <VendibookEmailLayout
      logoWidth={132}
      preview={
        approved
          ? `Booking confirmed — ${listingTitle ?? 'your reservation'}`
          : `Payment received — awaiting host approval for ${listingTitle ?? 'your reservation'}`
      }
    >
      <StatusChip
        label={approved ? 'Booking confirmed' : 'Awaiting host approval'}
        tone={approved ? 'success' : 'warning'}
      />
      <H1>
        {approved
          ? guestName ? `You're booked, ${guestName}.` : "You're booked."
          : guestName ? `Thanks, ${guestName} — payment received.` : 'Payment received.'}
      </H1>
      <Lede>
        {approved
          ? 'Your payment is processed and your dates are locked in with the host. This email is your booking record.'
          : 'Your payment is processed and your request is with the host for approval. If the host declines or the request expires, your payment is refunded in full.'}
      </Lede>

      {coverImageUrl ? (
        <Section style={{ margin: '0 0 16px' }}>
          <Img
            src={coverImageUrl}
            alt={listingTitle ?? 'Your reservation'}
            width="544"
            style={{
              display: 'block',
              width: '100%',
              maxWidth: '544px',
              maxHeight: '220px',
              objectFit: 'cover' as const,
              height: 'auto',
              borderRadius: '12px',
              border: `1px solid ${color.border}`,
            }}
          />
        </Section>
      ) : null}

      <DetailTable
        title="Your booking"
        rows={[
          { label: 'Listing', value: listingTitle ?? 'Your reservation' },
          { label: 'Dates', value: dates },
          { label: 'Location', value: cityState },
          { label: 'Order', value: orderNumber, mono: true },
          { label: 'Status', value: approved ? 'Confirmed' : 'Awaiting host approval' },
          { label: 'Paid today', value: totalPrice, emphasis: true },
        ]}
      />

      {securityDeposit ? (
        <Text style={{ ...t.small, margin: '-8px 0 20px' }}>
          A security deposit of {securityDeposit} is handled directly with the host and is{' '}
          <strong>not included</strong> in the amount charged today.
        </Text>
      ) : null}

      <CtaButton href={`${SITE_URL}/dashboard${bookingId ? `?booking=${bookingId}` : ''}`}>
        View your booking
      </CtaButton>

      <Divider />

      <H2>What happens next</H2>
      <Bullets
        items={
          approved
            ? [
                'Message the host from your dashboard to arrange arrival details.',
                'Upload any documents the host requires before your start date.',
                'The precise address is unlocked now that your booking is confirmed.',
              ]
            : [
                'The host reviews your request and either approves or declines it.',
                'You get an email the moment the host responds.',
                'If the request is declined or expires, your payment is refunded in full.',
                'The precise address unlocks once the host approves.',
              ]
        }
      />

      <TermsBlock snap={termsSnapshot} version={termsVersion} />

      <SupportRow />
    </VendibookEmailLayout>
  )
}

export const template = {
  component: BookingConfirmationEmail,
  subject: (data: Record<string, any>) => {
    const approved = APPROVED_STATUSES.has(String(data?.bookingStatus ?? '').toLowerCase())
    const title = data?.listingTitle
    if (approved) return title ? `Booking confirmed: ${title}` : 'Your booking is confirmed'
    return title ? `Payment received — awaiting host approval: ${title}` : 'Payment received — awaiting host approval'
  },
  displayName: 'Booking confirmation',
  previewData: {
    guestName: 'Jordan',
    listingTitle: 'Sunset Food Truck — Downtown LA',
    startDate: 'May 4, 2026',
    endDate: 'May 6, 2026',
    totalPrice: '$842.00',
    orderNumber: 'VB-9F2A1C4D',
    cityState: 'Los Angeles, CA',
    bookingStatus: 'approved',
    coverImageUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&q=80',
  },
} satisfies TemplateEntry
