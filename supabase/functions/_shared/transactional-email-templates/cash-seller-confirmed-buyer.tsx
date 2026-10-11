import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { s, SITE_URL, SUPPORT_PHONE } from './_styles.ts'
import { BrandFooter, BrandHeader } from './_blocks.tsx'

interface Props {
  buyerName?: string
  listingTitle?: string
  salePrice?: number
  sellerName?: string
  orderNumber?: string
  transactionId?: string
}

const E = ({ buyerName, listingTitle, salePrice, sellerName, orderNumber, transactionId }: Props) => (
  <Html lang="en" dir="ltr"><Head /><Preview>Seller confirmed — your turn to confirm receipt</Preview>
    <Body style={s.main}><Container style={s.container}>
      <BrandHeader hero="celebrate" listingTitle={listingTitle} />
      <Section style={s.card}>
        <Text style={s.kicker}>SELLER CONFIRMED — ACTION NEEDED</Text>
        <Heading style={s.h1}>{buyerName ? `${buyerName}, ` : ''}the seller confirmed the handoff.</Heading>
        <Text style={s.lede}>
          {sellerName || 'The seller'} marked the sale of {listingTitle ? `"${listingTitle}"` : 'your item'} as complete on their side. Once you've received the item and paid, confirm receipt to close the transaction.
        </Text>

        {salePrice ? (
          <Section style={s.accentRow}>
            <Text style={s.accentLabel}>AGREED PRICE</Text>
            <Text style={s.accentValue}>${salePrice.toLocaleString()}</Text>
          </Section>
        ) : null}
        {orderNumber ? <Section style={s.accentRow}><Text style={s.accentLabel}>ORDER</Text><Text style={s.accentValuePlain}>{orderNumber}</Text></Section> : null}

        <Text style={s.smallHeader}>YOUR NEXT STEP</Text>
        <Text style={s.text}>
          Open your order and tap <strong>Confirm Receipt</strong>. That's it — no fees, no waiting on funds, no paperwork.
        </Text>

        <Section style={s.ctaWrap}>
          <Button href={`${SITE_URL}${transactionId ? `/order-tracking/${transactionId}` : '/dashboard?tab=purchases'}`} style={s.button}>Confirm receipt</Button>
        </Section>

        <Text style={s.footnote}>Something wrong with the handoff? Do not confirm yet. Call {SUPPORT_PHONE} and we'll help mediate.</Text>
      </Section>
    <BrandFooter /></Container></Body></Html>
)

export const template = {
  component: E,
  subject: 'Seller confirmed — please confirm receipt',
  displayName: 'Cash: seller confirmed (buyer)',
  previewData: { buyerName: 'Jeffrey', listingTitle: '2004 Workhorse Food Truck', salePrice: 34998, sellerName: 'Brittany', orderNumber: 'VB-7C95AC1C', transactionId: 'abc' },
} satisfies TemplateEntry
