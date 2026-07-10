import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { s, SITE_URL, SUPPORT_PHONE } from './_styles.ts'
import { BrandHeader, TermsBlock, type TermsSnapshot } from './_blocks.tsx'

interface Props {
  buyerName?: string
  listingTitle?: string
  salePrice?: number
  sellerName?: string
  orderNumber?: string
  transactionId?: string
  termsSnapshot?: TermsSnapshot
  termsVersion?: string
}

const E = ({ buyerName, listingTitle, salePrice, sellerName, orderNumber, transactionId, termsSnapshot, termsVersion }: Props) => (
  <Html lang="en" dir="ltr"><Head /><Preview>Your Pay-in-Person request was sent</Preview>
    <Body style={s.main}><Container style={s.container}>
      <BrandHeader hero="celebrate" listingTitle={listingTitle} />
      <Section style={s.card}>
        <Text style={s.kicker}>REQUEST SUBMITTED</Text>
        <Heading style={s.h1}>{buyerName ? `${buyerName}, we've told the seller.` : "We've told the seller."}</Heading>
        <Text style={s.lede}>
          Your Pay-in-Person request for {listingTitle ? `"${listingTitle}"` : 'this listing'} has been sent to {sellerName || 'the seller'}. They will reach out to arrange payment and pickup.
        </Text>

        {salePrice ? (
          <Section style={s.accentRow}>
            <Text style={s.accentLabel}>AGREED PRICE</Text>
            <Text style={s.accentValue}>${salePrice.toLocaleString()}</Text>
          </Section>
        ) : null}
        {orderNumber ? <Section style={s.accentRow}><Text style={s.accentLabel}>ORDER</Text><Text style={s.accentValuePlain}>{orderNumber}</Text></Section> : null}

        <Text style={s.smallHeader}>WHAT HAPPENS NEXT</Text>
        <Text style={s.listItem}>1. The seller will contact you to coordinate the meetup, payment method, and handoff.</Text>
        <Text style={s.listItem}>2. Meet in person, inspect the item, and pay the seller directly (cash / cashier's check).</Text>
        <Text style={s.listItem}>3. The seller confirms the transaction in their dashboard.</Text>
        <Text style={s.listItem}>4. You come back here and tap <strong>Confirm Receipt</strong> to close the sale.</Text>

        <Section style={s.ctaWrap}>
          <Button href={`${SITE_URL}${transactionId ? `/order-tracking/${transactionId}` : '/dashboard?tab=purchases'}`} style={s.button}>Track order</Button>
        </Section>

        <Text style={s.footnote}>Meet in a public place, inspect the item before paying, and never wire money in advance. Questions? Call {SUPPORT_PHONE}.</Text>
      </Section>
    </Container></Body></Html>
)

export const template = {
  component: E,
  subject: 'Your Pay-in-Person request was sent',
  displayName: 'Cash purchase request (buyer)',
  previewData: { buyerName: 'Jeffrey', listingTitle: '2004 Workhorse Food Truck', salePrice: 34998, sellerName: 'Brittany', orderNumber: 'VB-7C95AC1C', transactionId: 'abc' },
} satisfies TemplateEntry
