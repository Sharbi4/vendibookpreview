import * as React from 'npm:react@18.3.1'
import { Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import {
  CtaButton,
  Eyebrow,
  H1,
  Lede,
  SITE_URL,
  SupportRow,
  VendibookEmailLayout,
  color,
  t,
} from '../email-brand/components.tsx'

// Reminder to a seller whose buyer message is still unanswered. Sent by
// send-unanswered-message-reminders at 24h and 72h ("final").
interface Props {
  recipientName?: string
  listingTitle?: string
  messagePreview?: string
  conversationId?: string
  waitingLabel?: string
  final?: boolean
}

const E = ({ recipientName, listingTitle, messagePreview, conversationId, waitingLabel, final }: Props) => {
  const listing = listingTitle || 'your listing'
  return (
    <VendibookEmailLayout preview={`A buyer is waiting for your reply about ${listing}`}>
      <Eyebrow>{final ? 'Last reminder' : 'Buyer waiting'}</Eyebrow>
      <H1>{recipientName ? `${recipientName}, a buyer is waiting on you` : 'A buyer is waiting on you'}</H1>
      <Lede>
        {`They asked about ${listing}${waitingLabel ? ` ${waitingLabel} ago` : ''} and haven't heard back yet. `}
        {final
          ? "Buyers usually move on to another listing if they don't get an answer."
          : 'Sellers who reply within a day are far more likely to make the sale.'}
      </Lede>

      {messagePreview ? (
        <Section style={t.panel}>
          <Text style={t.sectionLabel}>Their question</Text>
          <Text style={{ ...t.text, margin: 0, color: color.textSecondary }}>“{messagePreview}”</Text>
        </Section>
      ) : null}

      <CtaButton href={`${SITE_URL}/messages/${conversationId || ''}`}>Reply to the buyer</CtaButton>

      <Text style={t.small}>
        For your safety, keep messages and payments on Vendibook. Take payment only through Vendibook checkout, and never accept wire transfers or gift cards or share verification codes.
      </Text>

      <SupportRow />
    </VendibookEmailLayout>
  )
}

export const template = {
  component: E,
  subject: (d: Props) => d?.final
    ? `Last reminder: a buyer is waiting on ${d?.listingTitle || 'your listing'}`
    : `A buyer is waiting for your reply about ${d?.listingTitle || 'your listing'}`,
  displayName: 'Message reply reminder',
  previewData: {
    recipientName: 'Sam',
    listingTitle: '2026 Fully Loaded Food Trailer',
    messagePreview: 'Do you set up on location?',
    conversationId: 'demo',
    waitingLabel: '2 days',
    final: false,
  },
} satisfies TemplateEntry
