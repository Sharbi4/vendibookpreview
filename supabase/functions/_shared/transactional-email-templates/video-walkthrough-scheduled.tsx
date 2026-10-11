import * as React from 'npm:react@18.3.1'
import { Img, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import {
  Bullets,
  CtaButton,
  CtaFallback,
  DetailTable,
  Eyebrow,
  H1,
  Lede,
  SITE_URL,
  SecondaryButton,
  Small,
  SupportRow,
  VendibookEmailLayout,
  color,
  t,
} from '../email-brand/components.tsx'

type Action = 'scheduled' | 'rescheduled' | 'cancelled'

interface Props {
  recipientName?: string
  /** 'buyer' sees seller-facing copy and vice versa. */
  role?: 'buyer' | 'seller'
  action?: Action
  otherPartyName?: string
  listingTitle?: string
  listingLocation?: string
  listingImageUrl?: string
  listingPath?: string
  /** Fully formatted, e.g. "Friday, September 18, 2026 at 9:00 AM". */
  whenLong?: string
  timezoneLabel?: string
  durationMinutes?: number
  /** Absolute or site-relative link to the live meeting room page. */
  joinPath?: string
  topics?: string[]
  buyerNote?: string
}

const abs = (path?: string) => {
  if (!path) return SITE_URL
  return path.startsWith('http') ? path : `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`
}

const E = ({
  recipientName,
  role = 'buyer',
  action = 'scheduled',
  otherPartyName,
  listingTitle,
  listingLocation,
  listingImageUrl,
  listingPath,
  whenLong,
  timezoneLabel,
  durationMinutes,
  joinPath,
  topics,
  buyerNote,
}: Props) => {
  const cancelled = action === 'cancelled'
  const other = otherPartyName || (role === 'buyer' ? 'the seller' : 'the buyer')
  const item = listingTitle || 'your Vendibook listing'
  const joinUrl = abs(joinPath)
  const heading = cancelled
    ? 'Your video walkthrough was cancelled'
    : action === 'rescheduled'
      ? 'Your video walkthrough moved to a new time'
      : role === 'buyer'
        ? 'Your private video walkthrough is booked'
        : 'A buyer booked a video walkthrough with you'

  return (
    <VendibookEmailLayout preview={`${heading} — ${item}${whenLong ? ` · ${whenLong}` : ''}`}>
      <Eyebrow>{cancelled ? 'Walkthrough cancelled' : 'Live video walkthrough'}</Eyebrow>
      <H1>{recipientName ? `${recipientName}, ${heading.toLowerCase()}` : heading}</H1>
      <Lede>
        {cancelled
          ? `This meeting for ${item} is no longer on the calendar. You can schedule a new time whenever it suits you both.`
          : `A private one-to-one video meeting with ${other}, held inside Vendibook — no app to install and no outside meeting link.`}
      </Lede>

      {listingImageUrl ? (
        <Section style={{ padding: '0 0 18px' }}>
          <Img
            src={listingImageUrl}
            alt={item}
            width="536"
            style={{ display: 'block', width: '100%', maxWidth: '536px', height: 'auto', borderRadius: '12px', border: `1px solid ${color.border}` }}
          />
        </Section>
      ) : null}

      <DetailTable
        title="Meeting details"
        rows={[
          { label: 'Listing', value: item, emphasis: true },
          { label: 'Location', value: listingLocation },
          { label: role === 'buyer' ? 'Seller' : 'Buyer', value: other },
          { label: 'Date and time', value: whenLong, emphasis: !cancelled },
          { label: 'Time zone', value: timezoneLabel },
          { label: 'Length', value: durationMinutes ? `${durationMinutes} minutes` : undefined },
        ]}
      />

      {!cancelled ? (
        <>
          <CtaButton href={joinUrl}>Open your meeting</CtaButton>
          <CtaFallback href={joinUrl} />
          <Text style={t.small}>
            The Join button becomes active 10 minutes before the start time. You will be asked to allow
            camera and microphone access, and to accept the walkthrough terms, right before you enter.
          </Text>
        </>
      ) : (
        <SecondaryButton href={abs(listingPath)}>View the listing</SecondaryButton>
      )}

      {!cancelled && topics && topics.length ? (
        <Section style={t.panel}>
          <Text style={t.sectionLabel}>What to cover</Text>
          <Bullets items={topics} />
        </Section>
      ) : null}

      {!cancelled && buyerNote ? (
        <Section style={t.panel}>
          <Text style={t.sectionLabel}>Note from the buyer</Text>
          <Text style={{ ...t.text, margin: 0, color: color.textSecondary }}>“{buyerNote}”</Text>
        </Section>
      ) : null}

      {!cancelled ? (
        <Small>
          Only you and {other} can enter the room. Walkthroughs may be monitored or recorded for safety and
          dispute resolution; you’ll accept the Walkthrough Terms of Use and Privacy Notice, and allow camera
          and microphone, right before you join. Need a different time? Open the meeting page to reschedule
          or cancel.
        </Small>
      ) : null}

      <SupportRow />
    </VendibookEmailLayout>
  )
}

export const template = {
  component: E,
  subject: (d: any) => {
    const item = d?.listingTitle || 'your Vendibook listing'
    if (d?.action === 'cancelled') return `Cancelled: video walkthrough for ${item}`
    if (d?.action === 'rescheduled') return `New time: video walkthrough for ${item}`
    return d?.whenLong
      ? `Your video walkthrough: ${item} — ${d.whenLong}`
      : `Your video walkthrough for ${item}`
  },
  displayName: 'Video walkthrough scheduled',
  previewData: {
    recipientName: 'Sam',
    role: 'buyer',
    action: 'scheduled',
    otherPartyName: 'Harbin Mobile Kitchens',
    listingTitle: 'Sandbox Review Unit - 18ft Kitchen Food Truck',
    listingLocation: 'Sioux Falls, SD',
    listingPath: '/listing/demo',
    whenLong: 'Friday, September 18, 2026 at 9:00 AM',
    timezoneLabel: 'America/Phoenix',
    durationMinutes: 20,
    joinPath: '/walkthrough/demo',
    topics: ['Kitchen equipment', 'Generator'],
    buyerNote: 'I’d like to see the fryer setup and the generator running.',
  },
} satisfies TemplateEntry
