import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { s, SITE_URL } from './_styles.ts'
import { BrandFooter, BrandHeader } from './_blocks.tsx'

type Outcome = 'approved' | 'pending' | 'declined'

interface Props {
  sellerName?: string
  listingTitle?: string
  orderNumber?: string
  orderId?: string
  amount?: string
  outcome?: Outcome
  buyerName?: string
}

const COPY: Record<Outcome, { label: string; heading: string; lede: string; detail: string }> = {
  approved: {
    label: 'PAYMENT APPROVED',
    heading: 'A payment was approved on your listing.',
    lede: 'PayPal approved the payment and is holding the funds. Nothing is charged until the transaction is confirmed.',
    detail: 'No action is needed yet — we will let you know as soon as the payment is charged.',
  },
  pending: {
    label: 'PAYMENT PENDING',
    heading: 'A payment on your listing is pending.',
    lede: 'PayPal is still reviewing this payment. It has not cleared yet.',
    detail: 'Please wait for confirmation before releasing the item or booking. We will email you when the status changes.',
  },
  declined: {
    label: 'PAYMENT DECLINED',
    heading: 'A payment on your listing was declined.',
    lede: 'PayPal did not approve this payment, so nothing was charged.',
    detail: 'The buyer can try again with another payment method. Do not release the item or confirm the booking.',
  },
}

const E = ({ sellerName, listingTitle, orderNumber, orderId, amount, outcome, buyerName }: Props) => {
  const copy = COPY[(outcome as Outcome) in COPY ? (outcome as Outcome) : 'pending']
  return (
    <Html lang="en" dir="ltr"><Head /><Preview>{copy.heading}</Preview>
      <Body style={s.main}><Container style={s.container}>
        <BrandHeader />
        <Section style={s.card}>
          <Text style={s.smallHeader}>{copy.label}</Text>
          <Heading style={s.h1}>{sellerName ? `${sellerName}, ` : ''}{copy.heading.charAt(0).toLowerCase() + copy.heading.slice(1)}</Heading>
          <Text style={s.lede}>
            {listingTitle ? `“${listingTitle}”` : 'Your listing'}
            {buyerName ? ` — ${buyerName}` : ''}. {copy.lede}
          </Text>
          {amount ? <Section style={s.accentRow}><Text style={s.accentLabel}>AMOUNT</Text><Text style={s.accentValue}>{amount}</Text></Section> : null}
          {orderNumber ? <Section style={s.accentRow}><Text style={s.accentLabel}>ORDER</Text><Text style={s.accentValuePlain}>{orderNumber}</Text></Section> : null}
          <Text style={s.text}>{copy.detail}</Text>
          <Section style={s.ctaWrap}>
            <Button href={orderId ? `${SITE_URL}/orders/${orderId}` : `${SITE_URL}/dashboard/activity`} style={s.button}>
              View the order
            </Button>
          </Section>
        </Section>
      <BrandFooter /></Container></Body></Html>
  )
}

export const template = {
  component: E,
  subject: (d: any) =>
    d?.outcome === 'approved'
      ? 'Payment approved on your listing'
      : d?.outcome === 'declined'
        ? 'Payment declined on your listing'
        : 'Payment pending on your listing',
  displayName: 'Seller payment status',
  previewData: {
    sellerName: 'Sam',
    listingTitle: 'Demo Truck',
    orderNumber: 'VB-SALE-12345678',
    orderId: '00000000-0000-0000-0000-000000000000',
    amount: '$40,000.00',
    outcome: 'approved',
    buyerName: 'Pat',
  },
} satisfies TemplateEntry
