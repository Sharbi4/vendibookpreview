import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { s, SITE_URL } from './_styles.ts'
import { BrandHeader } from './_blocks.tsx'

interface Props {
  sellerName?: string
  listingTitle?: string
  salePrice?: number
  buyerName?: string
  orderNumber?: string
  transactionId?: string
  bothConfirmed?: boolean
}

const E = ({ sellerName, listingTitle, salePrice, buyerName, orderNumber, transactionId, bothConfirmed }: Props) => (
  <Html lang="en" dir="ltr"><Head /><Preview>{bothConfirmed ? 'Sale complete 🎉' : 'Buyer confirmed receipt'}</Preview>
    <Body style={s.main}><Container style={s.container}>
      <BrandHeader hero="celebrate" listingTitle={listingTitle} />
      <Section style={s.card}>
        <Text style={s.kicker}>{bothConfirmed ? 'SALE CLOSED' : 'BUYER CONFIRMED'}</Text>
        <Heading style={s.h1}>{sellerName ? `${sellerName}, ` : ''}{bothConfirmed ? 'your sale is complete.' : 'the buyer confirmed receipt.'}</Heading>
        <Text style={s.lede}>
          {buyerName || 'The buyer'} confirmed receipt of {listingTitle ? `"${listingTitle}"` : 'your item'}. {bothConfirmed ? 'Both sides are done — the sale is officially closed.' : 'The order is now on its way to closing.'} As always on Pay-in-Person, <span style={s.good}>Vendibook took $0</span> — you kept the full amount.
        </Text>

        {salePrice ? (
          <Section style={s.accentRow}>
            <Text style={s.accentLabel}>YOU RECEIVED</Text>
            <Text style={s.accentValue}>${salePrice.toLocaleString()}</Text>
          </Section>
        ) : null}
        {orderNumber ? <Section style={s.accentRow}><Text style={s.accentLabel}>ORDER</Text><Text style={s.accentValuePlain}>{orderNumber}</Text></Section> : null}

        <Text style={s.smallHeader}>WHAT'S NEXT</Text>
        <Text style={s.listItem}>• Leave a review for the buyer — it helps future sellers trust them.</Text>
        <Text style={s.listItem}>• Ready to sell another? List a new truck, trailer, or piece of equipment for free.</Text>

        <Section style={s.ctaWrap}>
          <Button href={`${SITE_URL}${transactionId ? `/order-tracking/${transactionId}` : '/dashboard?tab=sales'}`} style={s.button}>View order</Button>
        </Section>
      </Section>
    </Container></Body></Html>
)

export const template = {
  component: E,
  subject: (d: any) => d?.bothConfirmed ? '🎉 Sale complete — Pay in Person closed' : 'Buyer confirmed receipt',
  displayName: 'Cash: buyer confirmed (seller)',
  previewData: { sellerName: 'Brittany', listingTitle: '2004 Workhorse Food Truck', salePrice: 34998, buyerName: 'Jeffrey', orderNumber: 'VB-7C95AC1C', transactionId: 'abc', bothConfirmed: true },
} satisfies TemplateEntry
