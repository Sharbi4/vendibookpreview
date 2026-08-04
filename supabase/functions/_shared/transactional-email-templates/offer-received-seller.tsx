import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { s, SITE_URL } from './_styles.ts'

import { BrandFooter, BrandHeader } from './_blocks.tsx'
interface Props { sellerName?: string; buyerName?: string; listingTitle?: string; offerAmount?: number; askingPrice?: number; message?: string; offerId?: string; expiresAt?: string; coverImageUrl?: string }

const E = ({ sellerName, buyerName, listingTitle, offerAmount, askingPrice, message, offerId, expiresAt, coverImageUrl }: Props) => (
  <Html lang="en" dir="ltr"><Head /><Preview>New offer received</Preview>
    <Body style={s.main}><Container style={s.container}>
      <BrandHeader hero="message" listingImageUrl={coverImageUrl} listingTitle={listingTitle} />
      <Section style={s.card}>
        <Text style={s.smallHeader}>NEW OFFER</Text>
        <Heading style={s.h1}>{sellerName ? `${sellerName}, ` : ''}{buyerName || 'a buyer'} made an offer.</Heading>
        <Text style={s.lede}>On {listingTitle ? `“${listingTitle}”` : 'your listing'}.</Text>
        {offerAmount ? <Section style={s.accentRow}><Text style={s.accentLabel}>OFFER</Text><Text style={s.accentValue}>${offerAmount.toLocaleString()}</Text></Section> : null}
        {askingPrice ? <Section style={s.accentRow}><Text style={s.accentLabel}>YOUR ASKING</Text><Text style={s.accentValuePlain}>${askingPrice.toLocaleString()}</Text></Section> : null}
        {message ? <><Text style={s.smallHeader}>MESSAGE</Text><Text style={s.text}>“{message}”</Text></> : null}
        {expiresAt ? <Text style={s.small}>Expires {expiresAt}.</Text> : null}
        <Section style={s.ctaWrap}><Button href={`${SITE_URL}/dashboard?offer=${offerId || ''}`} style={s.button}>Review offer</Button></Section>
      </Section>
    <BrandFooter /></Container></Body></Html>
)

export const template = {
  component: E,
  subject: (d: any) => d?.offerAmount ? `New offer: $${Number(d.offerAmount).toLocaleString()}` : 'New offer received',
  displayName: 'Offer received (seller)',
  previewData: { sellerName: 'Sam', buyerName: 'Pat', listingTitle: 'Used Food Truck — 2019', coverImageUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&q=80', offerAmount: 38000, askingPrice: 42000, offerId: 'demo', expiresAt: 'Apr 28' },
} satisfies TemplateEntry
