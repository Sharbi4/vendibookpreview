import * as React from 'npm:react@18.3.1'
import type { TemplateEntry } from './registry.ts'
import {
  Callout,
  DetailTable,
  Eyebrow,
  H1,
  Lede,
  P,
  SecondaryButton,
  SupportRow,
  VendibookEmailLayout,
} from '../email-brand/components.tsx'

// Concierge reply to a "Tell Vendibook" buyer/renter request with matching
// live listings. Sent by send-request-matches (admin-triggered).
export interface RequestMatchListing {
  title: string
  url: string
  location?: string
  rates: { label: string; value: string }[]
  note?: string
}

interface Props {
  recipientName?: string
  requestLabel?: string
  intro?: string
  listings?: RequestMatchListing[]
  closing?: string
}

const E = ({ recipientName, requestLabel, intro, listings = [], closing }: Props) => (
  <VendibookEmailLayout preview={`${listings.length} option${listings.length === 1 ? '' : 's'} for your ${requestLabel || 'request'}`}>
    <Eyebrow>Your Vendibook request</Eyebrow>
    <H1>{recipientName ? `Hi ${recipientName}, here's what's available` : "Here's what's available"}</H1>
    {intro ? <Lede>{intro}</Lede> : null}

    {listings.map((l) => (
      <React.Fragment key={l.url}>
        <DetailTable
          title={l.title}
          rows={[
            { label: 'Location', value: l.location },
            ...l.rates.map((r) => ({ label: r.label, value: r.value })),
            { label: 'Note', value: l.note },
          ]}
        />
        <SecondaryButton href={l.url}>View this listing</SecondaryButton>
      </React.Fragment>
    ))}

    {closing ? <P>{closing}</P> : null}

    <Callout tone="warning" title="Stay safe">
      Pay only through Vendibook checkout (Square or PayPal). Never wire money, pay with gift cards, or share verification codes, even if someone asks you to.
    </Callout>

    <SupportRow />
  </VendibookEmailLayout>
)

export const template = {
  component: E,
  subject: (d: Props) => `${d?.listings?.length ?? 0} option${d?.listings?.length === 1 ? '' : 's'} for your ${d?.requestLabel || 'request'}`,
  displayName: 'Request matches',
  previewData: {
    recipientName: 'Sam',
    requestLabel: 'food trailer rental in Atlanta',
    intro: 'Thanks for telling us what you need. These trailers in the Atlanta area are available now.',
    listings: [
      {
        title: '2026 Fully Loaded Food Trailer',
        url: 'https://vendibook.com/listing/demo',
        location: 'Lilburn, GA',
        rates: [{ label: 'Daily', value: '$350' }, { label: 'Weekly', value: '$1,200' }, { label: 'Monthly', value: '$5,000' }],
        note: 'Instant Book available',
      },
    ],
    closing: 'Reply with your dates and how you plan to use it, and we will confirm availability with the owner.',
  },
} satisfies TemplateEntry
