import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { BrandFooter, BrandHeader } from './_blocks.tsx'

const SITE_NAME = 'Vendibook'
const SITE_URL = 'https://vendibook.com'

interface ReceiptProps {
  customerName?: string
  orderNumber?: string
  amount?: string
  paymentMethod?: string
  paidAt?: string
  listingTitle?: string
  description?: string; coverImageUrl?: string }

const PaymentReceiptEmail = ({ customerName, orderNumber, amount, paymentMethod, paidAt, listingTitle, description, coverImageUrl }: ReceiptProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Receipt from {SITE_NAME} — {amount ?? 'payment received'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <BrandHeader hero="payment" listingImageUrl={coverImageUrl} listingTitle={listingTitle} />

        <Section style={card}>
          <Text style={kicker}>PAYMENT RECEIPT</Text>
          <Heading style={h1}>
            {customerName ? `Thanks, ${customerName}.` : 'Thanks for your payment.'}
          </Heading>
          <Text style={lede}>
            This receipt confirms your payment to {SITE_NAME}. Keep it for your records.
          </Text>

          <Section style={amountBlock}>
            <Text style={amountLabel}>AMOUNT PAID</Text>
            <Text style={amountValue}>{amount ?? '—'}</Text>
          </Section>

          <Section style={detailGrid}>
            {orderNumber && (
              <>
                <Text style={detailLabel}>ORDER</Text>
                <Text style={detailMono}>{orderNumber}</Text>
                <Hr style={hrThin} />
              </>
            )}
            {listingTitle && (
              <>
                <Text style={detailLabel}>FOR</Text>
                <Text style={detailValue}>{listingTitle}</Text>
                <Hr style={hrThin} />
              </>
            )}
            {description && (
              <>
                <Text style={detailLabel}>DESCRIPTION</Text>
                <Text style={detailValue}>{description}</Text>
                <Hr style={hrThin} />
              </>
            )}
            {paymentMethod && (
              <>
                <Text style={detailLabel}>METHOD</Text>
                <Text style={detailValue}>{paymentMethod}</Text>
                <Hr style={hrThin} />
              </>
            )}
            {paidAt && (
              <>
                <Text style={detailLabel}>PAID</Text>
                <Text style={detailValue}>{paidAt}</Text>
              </>
            )}
          </Section>

          <Section style={ctaWrap}>
            <Button href={`${SITE_URL}/dashboard`} style={button}>
              View in dashboard
            </Button>
          </Section>
        </Section>

        <Text style={footnote}>
          Questions about this charge? Call (725) 755-9598 or reply to this email.
        </Text>
      <BrandFooter /></Container>
    </Body>
  </Html>
)

export const template = {
  component: PaymentReceiptEmail,
  subject: (data: Record<string, any>) =>
    data?.amount ? `Receipt: ${data.amount} — ${SITE_NAME}` : `Your ${SITE_NAME} receipt`,
  displayName: 'Payment receipt',
  previewData: {
    customerName: 'Sam',
    orderNumber: 'VB-7C1E9A2F',
    amount: '$842.00',
    paymentMethod: 'Visa •••• 4242',
    paidAt: 'April 21, 2026',
    listingTitle: 'Sunset Food Truck — Downtown LA', coverImageUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&q=80', description: '2-day rental + service fee',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Helvetica Neue', Arial, sans-serif", margin: 0, padding: '32px 0' }
const container = { maxWidth: '560px', margin: '0 auto', padding: '0 20px' }
const brandBar = { padding: '0 0 20px' }
const brandMark = { fontSize: '12px', letterSpacing: '0.32em', color: '#0a0a0a', fontWeight: 700, margin: 0 }
const card = { backgroundColor: '#0a0a0a', color: '#fafafa', borderRadius: '16px', padding: '40px 36px', border: '1px solid #1a1a1a' }
const kicker = { fontSize: '10px', letterSpacing: '0.28em', color: '#FF5124', fontWeight: 700, margin: '0 0 14px' }
const h1 = { fontSize: '28px', lineHeight: 1.15, fontWeight: 600, color: '#ffffff', margin: '0 0 14px', letterSpacing: '-0.02em' }
const lede = { fontSize: '15px', lineHeight: 1.6, color: '#a3a3a3', margin: '0 0 28px' }
const amountBlock = { backgroundColor: '#141414', border: '1px solid #232323', borderRadius: '12px', padding: '24px', margin: '0 0 20px', textAlign: 'center' as const }
const amountLabel = { fontSize: '10px', letterSpacing: '0.28em', color: '#737373', fontWeight: 600, margin: '0 0 8px' }
const amountValue = { fontSize: '36px', color: '#ffffff', fontWeight: 600, margin: 0, letterSpacing: '-0.02em' }
const detailGrid = { backgroundColor: '#0f0f0f', border: '1px solid #1f1f1f', borderRadius: '12px', padding: '18px 22px', margin: '0 0 28px' }
const detailLabel = { fontSize: '10px', letterSpacing: '0.2em', color: '#737373', fontWeight: 600, margin: '0 0 4px' }
const detailValue = { fontSize: '14px', color: '#fafafa', margin: 0 }
const detailMono = { fontSize: '13px', color: '#d4d4d4', margin: 0, fontFamily: 'monospace', letterSpacing: '0.05em' }
const hrThin = { borderColor: '#1f1f1f', margin: '12px 0' }
const ctaWrap = { margin: '8px 0 0' }
const button = { backgroundColor: '#FF5124', color: '#0a0a0a', padding: '14px 28px', borderRadius: '10px', fontWeight: 600, fontSize: '15px', textDecoration: 'none', display: 'inline-block' }
const footnote = { fontSize: '12px', color: '#737373', textAlign: 'center' as const, margin: '24px 0 0' }
