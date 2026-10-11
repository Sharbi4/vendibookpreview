import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { s, SITE_URL } from './_styles.ts'
import { BrandFooter, BrandHeader, ToolsBlock } from './_blocks.tsx'

interface Props {
  sellerName?: string
  listingTitle?: string
  salePrice?: number
  buyerName?: string
  orderNumber?: string
  transactionId?: string
  fulfillmentType?: string
  coverImageUrl?: string
}

const nextStep = (fulfillment?: string) => {
  const f = String(fulfillment ?? '').toLowerCase()
  if (f.includes('pickup') || f.includes('on_site')) {
    return 'Message the buyer with a pickup window, then mark the item ready for pickup on the order page.'
  }
  if (f) {
    return 'Coordinate delivery details with the buyer, then mark the item as on its way from the order page.'
  }
  return 'Open the order page to confirm the handoff method with the buyer and record the next milestone.'
}

const E = ({ sellerName, listingTitle, salePrice, buyerName, orderNumber, transactionId, fulfillmentType, coverImageUrl }: Props) => (
  <Html lang="en" dir="ltr"><Head /><Preview>Payment received — time to arrange the handoff</Preview>
    <Body style={s.main}><Container style={s.container}>
      <BrandHeader hero="celebrate" listingImageUrl={coverImageUrl} listingTitle={listingTitle} />
      <Section style={s.card}>
        <Text style={s.smallHeader}>PAYMENT CONFIRMED</Text>
        <Heading style={s.h1}>{sellerName ? `${sellerName}, ` : ''}your item sold.</Heading>
        <Text style={s.lede}>
          {listingTitle ? `“${listingTitle}”` : 'Your listing'} was purchased by {buyerName || 'a buyer'} and the payment has been received.
        </Text>
        {salePrice ? <Section style={s.accentRow}><Text style={s.accentLabel}>SALE PRICE</Text><Text style={s.accentValue}>${salePrice.toLocaleString()}</Text></Section> : null}
        {orderNumber ? <Section style={s.accentRow}><Text style={s.accentLabel}>ORDER</Text><Text style={s.accentValuePlain}>{orderNumber}</Text></Section> : null}
        <Text style={s.text}>{nextStep(fulfillmentType)}</Text>
        <Text style={s.text}>
          Vendibook reviews and issues the seller payout after the required handoff or delivery confirmation steps are complete.
        </Text>
        <Section style={s.ctaWrap}>
          <Button href={transactionId ? `${SITE_URL}/transaction/${transactionId}` : `${SITE_URL}/dashboard`} style={s.button}>
            Open the order
          </Button>
        </Section>
        <ToolsBlock role="seller" />
      </Section>
    <BrandFooter /></Container></Body></Html>
)

export const template = {
  component: E,
  subject: (d: any) => d?.salePrice ? `Sold: $${Number(d.salePrice).toLocaleString()} — arrange the handoff` : 'Your item sold — arrange the handoff',
  displayName: 'Sale paid (seller)',
  previewData: {
    sellerName: 'Sam',
    listingTitle: 'Demo Truck',
    salePrice: 40000,
    buyerName: 'Pat',
    orderNumber: 'VB-12345678',
    transactionId: '00000000-0000-0000-0000-000000000000',
    fulfillmentType: 'pickup',
  },
} satisfies TemplateEntry
