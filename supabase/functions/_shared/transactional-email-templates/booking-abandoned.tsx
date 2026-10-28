import * as React from 'npm:react@18.3.1'
import { Text } from 'npm:@react-email/components@0.0.22'
import { CtaButton, SecondaryButton, H1, Eyebrow, SupportRow, VendibookEmailLayout, t } from '../email-brand/components.tsx'
import type { TemplateEntry } from './registry.ts'
interface Props {
  shopperName?: string
  listingTitle?: string
  startDate?: string
  endDate?: string
  resumeUrl?: string
  variant?: '2h' | '24h'; coverImageUrl?: string }

const E = ({ shopperName, listingTitle, startDate, endDate, resumeUrl, variant = '2h', coverImageUrl }: Props) => {
  const isFollowup = variant === '24h'
  const headline = isFollowup
    ? `${shopperName ? shopperName + ', s' : 'S'}till thinking it over?`
    : `${shopperName ? shopperName + ', y' : 'Y'}ou left something behind`
  const lede = isFollowup
    ? `Thinking about ${listingTitle ? `"${listingTitle}"` : 'your selected listing'} for ${startDate || 'your dates'}${endDate ? ` – ${endDate}` : ''}? Return to your saved selection to check current availability and pricing.`
    : `You started a booking for ${listingTitle ? `"${listingTitle}"` : 'a listing'}${startDate ? ` on ${startDate}` : ''}${endDate ? ` – ${endDate}` : ''} but didn't finish. Return to your saved selection when you’re ready.`
  return (
    <VendibookEmailLayout preview="Return to your booking or talk with our sales team">
      <Eyebrow>Booking saved</Eyebrow>
      <H1>{headline}</H1>
      <Text style={t.text}>{lede}</Text>
      <CtaButton href={resumeUrl || 'https://vendibook.com/dashboard'}>Resume booking</CtaButton>
      <Text style={t.text}>
        Want help choosing the right truck or trailer, or have questions before booking?
        Our sales team can talk it through with you. Ask a representative to reach out
        personally, or arrange a free 30-minute Customer Success Meeting.
      </Text>
      <SecondaryButton href="https://vendibook.com/contact#callback">Request a personal callback</SecondaryButton>
      <SecondaryButton href="https://vendibook.com/contact#meeting">Schedule a 30-minute meeting</SecondaryButton>
      <SupportRow note="You can also reply to this email for help." />
    </VendibookEmailLayout>
  )
}

export const template = {
  component: E,
  subject: ({ variant }: Props) =>
    variant === '24h'
      ? "Your booking is still saved — pick up where you left off"
      : "You're one step away from booking",
  displayName: 'Booking abandoned recovery',
  previewData: {
    shopperName: 'Jordan',
    listingTitle: 'Downtown Ghost Kitchen', coverImageUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&q=80', startDate: 'Apr 28, 2026',
    endDate: 'May 1, 2026',
    resumeUrl: 'https://vendibook.com/listing/demo',
    variant: '2h',
  },
} satisfies TemplateEntry
