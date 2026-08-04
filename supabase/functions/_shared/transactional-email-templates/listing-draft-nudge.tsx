import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { s, SITE_URL } from './_styles.ts'

import { BrandFooter, BrandHeader } from './_blocks.tsx'
interface Props { hostName?: string; listingTitle?: string; listingId?: string; coverImageUrl?: string }

const E = ({ hostName, listingTitle, listingId, coverImageUrl }: Props) => (
  <Html lang="en" dir="ltr"><Head /><Preview>Finish your listing — it's almost ready</Preview>
    <Body style={s.main}><Container style={s.container}>
      <BrandHeader hero="celebrate" listingImageUrl={coverImageUrl} listingTitle={listingTitle} />
      <Section style={s.card}>
        <Text style={s.smallHeader}>DRAFT WAITING</Text>
        <Heading style={s.h1}>{hostName ? `${hostName}, ` : ''}you're 2 minutes from earning.</Heading>
        <Text style={s.lede}>{listingTitle ? `“${listingTitle}”` : 'Your listing'} is saved as a draft. Publish it now to start receiving inquiries.</Text>
        <Section style={s.ctaWrap}><Button href={listingId ? `${SITE_URL}/create-listing/${listingId}` : `${SITE_URL}/list`} style={s.button}>Finish & publish</Button></Section>
        <Text style={s.small}>Hosts who publish within 24 hours get 4× more bookings in the first month.</Text>
      </Section>
    <BrandFooter /></Container></Body></Html>
)

export const template = {
  component: E,
  subject: () => `Finish your listing — 2 minutes left`,
  displayName: 'Draft nudge',
  previewData: { hostName: 'Sam', listingTitle: 'Downtown Food Truck', coverImageUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&q=80', listingId: 'demo' },
} satisfies TemplateEntry
