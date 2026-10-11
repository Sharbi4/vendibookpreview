import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { s, SITE_URL } from './_styles.ts'
import { BlogHighlights, BrandFooter, BrandHeader, ToolsBlock } from './_blocks.tsx'

interface Props { sellerName?: string; listingTitle?: string; salePrice?: number; buyerName?: string; orderNumber?: string; coverImageUrl?: string }

const E = ({ sellerName, listingTitle, salePrice, buyerName, orderNumber, coverImageUrl }: Props) => (
  <Html lang="en" dir="ltr"><Head /><Preview>Sale completed 🎉</Preview>
    <Body style={s.main}><Container style={s.container}>
      <BrandHeader hero="celebrate" listingImageUrl={coverImageUrl} listingTitle={listingTitle} />
      <Section style={s.card}>
        <Text style={s.smallHeader}>SALE COMPLETED</Text>
        <Heading style={s.h1}>{sellerName ? `${sellerName}, ` : ''}your sale closed.</Heading>
        <Text style={s.lede}>{listingTitle ? `“${listingTitle}”` : 'Your listing'} sold to {buyerName || 'the buyer'}.</Text>
        {salePrice ? <Section style={s.accentRow}><Text style={s.accentLabel}>SALE PRICE</Text><Text style={s.accentValue}>${salePrice.toLocaleString()}</Text></Section> : null}
        {orderNumber ? <Section style={s.accentRow}><Text style={s.accentLabel}>ORDER</Text><Text style={s.accentValuePlain}>{orderNumber}</Text></Section> : null}
        <Text style={s.text}>Your payout is released once delivery is confirmed — typically within 24 hours, and always within 24–48 hours. It's sent by PayPal, ACH, or Venmo depending on the payout account on file.</Text>
        <Section style={s.ctaWrap}><Button href={`${SITE_URL}/dashboard`} style={s.button}>View transaction</Button></Section>
        <ToolsBlock role="seller" />
        <BlogHighlights role="seller" />
      </Section>
    <BrandFooter /></Container></Body></Html>
)

export const template = {
  component: E,
  subject: (d: any) => d?.salePrice ? `Sold: $${Number(d.salePrice).toLocaleString()}` : 'Your sale completed',
  displayName: 'Sale completed (seller)',
  previewData: { sellerName: 'Sam', listingTitle: 'Demo Truck', coverImageUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&q=80', salePrice: 40000, buyerName: 'Pat', orderNumber: 'VB-12345678' },
} satisfies TemplateEntry
