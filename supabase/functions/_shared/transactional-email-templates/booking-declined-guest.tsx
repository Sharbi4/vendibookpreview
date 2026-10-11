import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { s, SITE_URL } from './_styles.ts'

import { BrandFooter, BrandHeader } from './_blocks.tsx'
interface Props { shopperName?: string; listingTitle?: string; reason?: string; coverImageUrl?: string }

const E = ({ shopperName, listingTitle, reason, coverImageUrl }: Props) => (
  <Html lang="en" dir="ltr"><Head /><Preview>Update on your booking request</Preview>
    <Body style={s.main}><Container style={s.container}>
      <BrandHeader hero="booking" listingImageUrl={coverImageUrl} listingTitle={listingTitle} />
      <Section style={s.card}>
        <Text style={s.smallHeader}>BOOKING UPDATE</Text>
        <Heading style={s.h1}>{shopperName ? `${shopperName}, ` : ''}your request wasn't accepted.</Heading>
        <Text style={s.lede}>The host couldn't accommodate {listingTitle ? `“${listingTitle}”` : 'your booking'} this time. Don't worry — there are dozens of similar listings nearby.</Text>
        {reason ? <Section style={s.accentRow}><Text style={s.accentLabel}>HOST NOTE</Text><Text style={s.accentValuePlain}>{reason}</Text></Section> : null}
        <Section style={s.ctaWrap}><Button href={`${SITE_URL}/search`} style={s.button}>Browse alternatives</Button></Section>
      </Section>
    <BrandFooter /></Container></Body></Html>
)

export const template = {
  component: E,
  subject: () => `Your booking request was declined`,
  displayName: 'Booking declined (guest)',
  previewData: { shopperName: 'Jordan', listingTitle: 'Demo Truck', coverImageUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&q=80', reason: 'Already booked for those dates.' },
} satisfies TemplateEntry
