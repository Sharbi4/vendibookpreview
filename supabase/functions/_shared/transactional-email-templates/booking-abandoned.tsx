import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { s, SITE_URL } from './_styles.ts'

import { BrandFooter, BrandHeader } from './_blocks.tsx'
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
    ? `${listingTitle ? `"${listingTitle}"` : 'Your selected listing'} is still available for ${startDate || 'your dates'}${endDate ? ` – ${endDate}` : ''}. Dates fill up fast — pick up where you left off in one tap.`
    : `You started a booking for ${listingTitle ? `"${listingTitle}"` : 'a listing'}${startDate ? ` on ${startDate}` : ''}${endDate ? ` – ${endDate}` : ''} but didn't finish. Your selection is saved — finish in 60 seconds.`
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{isFollowup ? 'Your booking is still saved' : 'Finish your booking in 60 seconds'}</Preview>
      <Body style={s.main}>
        <Container style={s.container}>
          <BrandHeader hero="booking" listingImageUrl={coverImageUrl} listingTitle={listingTitle} />
          <Section style={s.card}>
            <Text style={s.smallHeader}>{isFollowup ? 'STILL AVAILABLE' : 'BOOKING SAVED'}</Text>
            <Heading style={s.h1}>{headline}</Heading>
            <Text style={s.lede}>{lede}</Text>
            <Section style={s.ctaWrap}>
              <Button href={resumeUrl || `${SITE_URL}/dashboard`} style={s.button}>
                Resume booking
              </Button>
            </Section>
            <Text style={s.footnote}>
              No payment is taken until you confirm. Need help? Reply to this email.
            </Text>
          </Section>
        <BrandFooter /></Container>
      </Body>
    </Html>
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
