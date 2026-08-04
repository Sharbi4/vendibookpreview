import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { s, SITE_URL } from './_styles.ts'

import { BrandFooter, BrandHeader } from './_blocks.tsx'
interface Props { buyerName?: string; sellerName?: string; listingTitle?: string; counterAmount?: number; originalOffer?: number; message?: string; offerId?: string; expiresAt?: string; coverImageUrl?: string }

const E = ({ buyerName, sellerName, listingTitle, counterAmount, originalOffer, message, offerId, expiresAt, coverImageUrl }: Props) => (
  <Html lang="en" dir="ltr"><Head /><Preview>Counter-offer received</Preview>
    <Body style={s.main}><Container style={s.container}>
      <BrandHeader hero="message" listingImageUrl={coverImageUrl} listingTitle={listingTitle} />
      <Section style={s.card}>
        <Text style={s.smallHeader}>COUNTER-OFFER</Text>
        <Heading style={s.h1}>{buyerName ? `${buyerName}, ` : ''}{sellerName || 'the seller'} sent a counter.</Heading>
        <Text style={s.lede}>On {listingTitle ? `“${listingTitle}”` : 'the listing'}.</Text>
        {originalOffer ? <Section style={s.accentRow}><Text style={s.accentLabel}>YOUR OFFER</Text><Text style={s.accentValuePlain}>${originalOffer.toLocaleString()}</Text></Section> : null}
        {counterAmount ? <Section style={s.accentRow}><Text style={s.accentLabel}>COUNTER</Text><Text style={s.accentValue}>${counterAmount.toLocaleString()}</Text></Section> : null}
        {message ? <><Text style={s.smallHeader}>MESSAGE</Text><Text style={s.text}>“{message}”</Text></> : null}
        {expiresAt ? <Text style={s.small}>Expires {expiresAt}.</Text> : null}
        <Section style={s.ctaWrap}><Button href={`${SITE_URL}/dashboard?offer=${offerId || ''}`} style={s.button}>Respond</Button></Section>
      </Section>
    <BrandFooter /></Container></Body></Html>
)

export const template = {
  component: E,
  subject: (d: any) => d?.counterAmount ? `Counter: $${Number(d.counterAmount).toLocaleString()}` : 'Counter-offer received',
  displayName: 'Counter-offer (buyer)',
  previewData: { buyerName: 'Pat', sellerName: 'Sam', listingTitle: 'Demo Truck', coverImageUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&q=80', counterAmount: 40000, originalOffer: 38000, offerId: 'demo', expiresAt: 'Apr 28' },
} satisfies TemplateEntry
