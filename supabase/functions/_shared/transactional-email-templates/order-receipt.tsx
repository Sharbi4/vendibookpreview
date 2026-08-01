import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { BrandHeader } from './_blocks.tsx'

const SITE_NAME = 'Vendibook'
const SITE_URL = 'https://vendibook.com'
const SUPPORT_EMAIL = 'support@vendibook.com'
const SUPPORT_PHONE = '(725) 755-9598'

interface OrderReceiptProps {
  orderNumber?: string
  buyerName?: string
  itemTitle?: string
  sellerName?: string
  transactionTypeLabel?: string
  orderDate?: string
  paypalTransactionId?: string
  paypalCaptureId?: string
  amountPaid?: string
  taxes?: string
  fees?: string
  refundAmount?: string
  fulfillmentLabel?: string
  fulfillmentNextStep?: string
  nextActionTitle?: string
  nextActionDescription?: string
  orderUrl?: string
  coverImageUrl?: string
}

const Row = ({ label, value }: { label: string; value?: string }) =>
  value
    ? (
      <>
        <Text style={detailLabel}>{label}</Text>
        <Text style={detailValue}>{value}</Text>
        <Hr style={hrThin} />
      </>
    )
    : null

const OrderReceiptEmail = ({
  orderNumber, buyerName, itemTitle, sellerName, transactionTypeLabel, orderDate,
  paypalTransactionId, paypalCaptureId, amountPaid, taxes, fees, refundAmount,
  fulfillmentLabel, fulfillmentNextStep, nextActionTitle, nextActionDescription,
  orderUrl, coverImageUrl,
}: OrderReceiptProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Payment confirmed — order {orderNumber ?? ''} {amountPaid ? `· ${amountPaid}` : ''}</Preview>
    <Body style={main}>
      <Container style={container}>
        <BrandHeader hero="payment" listingImageUrl={coverImageUrl} listingTitle={itemTitle} />

        <Section style={card}>
          <Text style={kicker}>PAYMENT CONFIRMED</Text>
          <Heading style={h1}>
            {buyerName ? `Thanks, ${buyerName}.` : 'Thanks for your payment.'}
          </Heading>
          <Text style={lede}>
            Your payment went through and your order is confirmed. Here is everything on file.
          </Text>

          <Section style={amountBlock}>
            <Text style={amountLabel}>TOTAL PAID</Text>
            <Text style={amountValue}>{amountPaid ?? '—'}</Text>
          </Section>

          {nextActionTitle && (
            <Section style={nextBlock}>
              <Text style={nextTitle}>Your next step: {nextActionTitle}</Text>
              {nextActionDescription && <Text style={nextBody}>{nextActionDescription}</Text>}
            </Section>
          )}

          <Section style={detailGrid}>
            <Row label="ORDER NUMBER" value={orderNumber} />
            <Row label="ORDER DATE" value={orderDate} />
            <Row label="TYPE" value={transactionTypeLabel} />
            <Row label="ITEM" value={itemTitle} />
            <Row label="SELLER / HOST" value={sellerName} />
            <Row label="FULFILLMENT" value={fulfillmentLabel} />
            <Row label="NEXT STEP" value={fulfillmentNextStep} />
            <Row label="TAXES" value={taxes} />
            <Row label="FEES" value={fees} />
            <Row label="REFUNDED" value={refundAmount} />
            <Row label="PAYPAL TRANSACTION ID" value={paypalTransactionId} />
            <Row label="PAYPAL CAPTURE ID" value={paypalCaptureId} />
          </Section>

          {orderUrl && (
            <Section style={{ textAlign: 'center', margin: '28px 0 8px' }}>
              <Button href={orderUrl.startsWith('http') ? orderUrl : `${SITE_URL}${orderUrl}`} style={button}>
                View order details
              </Button>
            </Section>
          )}

          <Text style={disclosure}>
            Your payment was processed securely through PayPal. Fulfillment and seller payment are
            managed according to the applicable {SITE_NAME} transaction terms.
          </Text>

          <Text style={support}>
            Questions? Email {SUPPORT_EMAIL} or call {SUPPORT_PHONE}, Mon–Fri 9am–5pm AZ.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: OrderReceiptEmail,
  subject: (d: Record<string, unknown>) =>
    `Payment confirmed — Vendibook order ${(d?.orderNumber as string) ?? ''}`.trim(),
  displayName: 'Order receipt (PayPal)',
  previewData: {
    orderNumber: 'VB-8F21A0C4',
    buyerName: 'Jordan',
    itemTitle: '2019 Custom Food Truck',
    sellerName: 'Sierra Mobile Kitchens',
    transactionTypeLabel: 'Equipment sale',
    orderDate: 'August 1, 2026',
    paypalTransactionId: '5TY05013RG002845M',
    paypalCaptureId: '3C679366HH908993F',
    amountPaid: '$42,500.00',
    taxes: '$0.00',
    fees: '$0.00',
    fulfillmentLabel: 'Equipment pickup',
    fulfillmentNextStep: 'Schedule your pickup with the seller',
    nextActionTitle: 'Schedule your pickup',
    nextActionDescription: 'Coordinate a pickup date and time with the seller.',
    orderUrl: '/orders/00000000-0000-0000-0000-000000000000',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "-apple-system, 'Segoe UI', Helvetica, Arial, sans-serif" }
const container = { maxWidth: '600px', margin: '0 auto', padding: '0 0 32px' }
const card = { padding: '28px 28px 8px' }
const kicker = { fontSize: '11px', letterSpacing: '1.4px', color: '#FF5124', fontWeight: 700, margin: '0 0 6px' }
const h1 = { fontSize: '24px', lineHeight: '1.25', color: '#0f0f12', margin: '0 0 8px', fontWeight: 700 }
const lede = { fontSize: '15px', lineHeight: '1.6', color: '#4a4a55', margin: '0 0 20px' }
const amountBlock = { backgroundColor: '#0f0f12', borderRadius: '14px', padding: '20px 24px', margin: '0 0 20px' }
const amountLabel = { fontSize: '10px', letterSpacing: '1.4px', color: '#9a9aa6', margin: '0 0 4px', fontWeight: 700 }
const amountValue = { fontSize: '30px', color: '#ffffff', margin: 0, fontWeight: 700 }
const nextBlock = { border: '1px solid #ffd9cd', backgroundColor: '#fff6f2', borderRadius: '12px', padding: '14px 16px', margin: '0 0 20px' }
const nextTitle = { fontSize: '14px', fontWeight: 700, color: '#0f0f12', margin: '0 0 4px' }
const nextBody = { fontSize: '13px', lineHeight: '1.55', color: '#5a5a66', margin: 0 }
const detailGrid = { margin: '4px 0 0' }
const detailLabel = { fontSize: '10px', letterSpacing: '1.2px', color: '#9a9aa6', margin: '10px 0 2px', fontWeight: 700 }
const detailValue = { fontSize: '14px', color: '#1a1a20', margin: 0, wordBreak: 'break-word' as const }
const hrThin = { borderColor: '#eeeef2', margin: '10px 0 0' }
const button = { backgroundColor: '#FF5124', color: '#ffffff', borderRadius: '10px', padding: '13px 26px', fontSize: '15px', fontWeight: 700, textDecoration: 'none', display: 'inline-block' }
const disclosure = { fontSize: '12px', lineHeight: '1.6', color: '#7a7a86', margin: '20px 0 8px' }
const support = { fontSize: '12px', lineHeight: '1.6', color: '#9a9aa6', margin: '0 0 4px' }
