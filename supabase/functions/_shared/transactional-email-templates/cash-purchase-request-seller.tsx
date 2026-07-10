import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { s, SITE_URL, SUPPORT_PHONE } from './_styles.ts'
import { BrandHeader, TermsBlock, type TermsSnapshot } from './_blocks.tsx'

interface Props {
  sellerName?: string
  listingTitle?: string
  salePrice?: number
  buyerName?: string
  buyerEmail?: string
  buyerPhone?: string
  orderNumber?: string
  transactionId?: string
  fulfillmentType?: string
  termsSnapshot?: TermsSnapshot
  termsVersion?: string
}

const E = ({ sellerName, listingTitle, salePrice, buyerName, buyerEmail, buyerPhone, orderNumber, transactionId, fulfillmentType, termsSnapshot, termsVersion }: Props) => (
  <Html lang="en" dir="ltr"><Head /><Preview>New Pay-in-Person purchase request 💵</Preview>
    <Body style={s.main}><Container style={s.container}>
      <BrandHeader hero="celebrate" listingTitle={listingTitle} />
      <Section style={s.card}>
        <Text style={s.kicker}>PAY IN PERSON — ACTION NEEDED</Text>
        <Heading style={s.h1}>{sellerName ? `${sellerName}, you have a buyer.` : 'You have a buyer.'}</Heading>
        <Text style={s.lede}>
          {buyerName || 'A buyer'} wants to purchase {listingTitle ? `"${listingTitle}"` : 'your listing'} in person. Vendibook takes <span style={s.good}>$0 fees</span> on Pay-in-Person sales — the full amount goes directly to you.
        </Text>

        {salePrice ? (
          <Section style={s.accentRow}>
            <Text style={s.accentLabel}>AGREED PRICE (PAID TO YOU DIRECTLY)</Text>
            <Text style={s.accentValue}>${salePrice.toLocaleString()}</Text>
          </Section>
        ) : null}
        {orderNumber ? <Section style={s.accentRow}><Text style={s.accentLabel}>ORDER</Text><Text style={s.accentValuePlain}>{orderNumber}</Text></Section> : null}

        <Text style={s.smallHeader}>BUYER CONTACT</Text>
        <Section style={s.detailGrid}>
          <Text style={s.detailLabel}>NAME</Text>
          <Text style={s.detailValue}>{buyerName || '—'}</Text>
          <Text style={{ ...s.detailLabel, marginTop: '12px' }}>EMAIL</Text>
          <Text style={s.detailValue}>{buyerEmail || '—'}</Text>
          {buyerPhone ? (
            <>
              <Text style={{ ...s.detailLabel, marginTop: '12px' }}>PHONE</Text>
              <Text style={s.detailValue}>{buyerPhone}</Text>
            </>
          ) : null}
          {fulfillmentType ? (
            <>
              <Text style={{ ...s.detailLabel, marginTop: '12px' }}>FULFILLMENT</Text>
              <Text style={s.detailValue}>{fulfillmentType.replace(/_/g, ' ')}</Text>
            </>
          ) : null}
        </Section>

        <Text style={s.smallHeader}>YOUR NEXT STEPS</Text>
        <Text style={s.listItem}>1. Contact the buyer to arrange meetup, payment method (cash / cashier's check), and handoff.</Text>
        <Text style={s.listItem}>2. Meet the buyer, collect the full ${salePrice ? salePrice.toLocaleString() : 'agreed amount'}, and hand over the item.</Text>
        <Text style={s.listItem}>3. Open your dashboard and tap <strong>Confirm Transaction</strong> to advance the order.</Text>
        <Text style={s.listItem}>4. The buyer will then confirm receipt to close the sale.</Text>

        <Section style={s.ctaWrap}>
          <Button href={`${SITE_URL}${transactionId ? `/order-tracking/${transactionId}` : '/dashboard?tab=sales'}`} style={s.button}>Open order</Button>
        </Section>

        <Text style={s.footnote}>Safety tip: meet in a public place, inspect payment before handoff, and never ship before receiving payment in full. Need help? Call {SUPPORT_PHONE}.</Text>
      </Section>
    </Container></Body></Html>
)

export const template = {
  component: E,
  subject: (d: any) => d?.salePrice ? `💵 New buyer for $${Number(d.salePrice).toLocaleString()} — Pay in Person` : '💵 New Pay-in-Person purchase request',
  displayName: 'Cash purchase request (seller)',
  previewData: {
    sellerName: 'Brittany',
    listingTitle: '2004 Workhorse Food Truck',
    salePrice: 34998,
    buyerName: 'Jeffrey Brooks',
    buyerEmail: 'jeffrey@example.com',
    buyerPhone: '(555) 123-4567',
    orderNumber: 'VB-7C95AC1C',
    transactionId: '7c95ac1c-5163-45cd-a48f-b6ec50747cda',
    fulfillmentType: 'pickup',
  },
} satisfies TemplateEntry
