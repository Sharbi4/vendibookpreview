import * as React from 'npm:react@18.3.1'
import { Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import {
  CtaButton,
  DetailTable,
  Divider,
  H1,
  StatusChip,
  SupportRow,
  VendibookEmailLayout,
  BRAND_NAME,
  SITE_URL,
  color,
  t,
} from '../email-brand/components.tsx'

interface ReceiptProps {
  customerName?: string
  orderNumber?: string
  amount?: string
  paymentMethod?: string
  paidAt?: string
  listingTitle?: string
  description?: string
  coverImageUrl?: string
  /** Optional deep link to the order, when the caller has an order id. */
  orderId?: string
}

const PaymentReceiptEmail = ({
  customerName,
  orderNumber,
  amount,
  paymentMethod,
  paidAt,
  listingTitle,
  description,
  orderId,
}: ReceiptProps) => {
  const ctaHref = orderId ? `${SITE_URL}/orders/${orderId}` : `${SITE_URL}/dashboard`

  return (
    <VendibookEmailLayout
      preview={`Receipt from ${BRAND_NAME}${amount ? ` — ${amount}` : ''}`}
      logoWidth={132}
    >
      <StatusChip label="Payment receipt" tone="success" />
      <H1>{customerName ? `Payment received, ${customerName}.` : 'Payment received.'}</H1>

      {/* Amount — prominent, but a typographic figure rather than a giant card. */}
      <Section style={{ margin: '2px 0 20px' }}>
        <Text style={{ ...t.sectionLabel, margin: '0 0 2px' }}>Amount paid</Text>
        <Text
          className="vb-ink"
          style={{
            fontSize: '34px',
            lineHeight: 1.1,
            fontWeight: 700,
            color: color.text,
            letterSpacing: '-0.02em',
            margin: 0,
          }}
        >
          {amount ?? '—'}
        </Text>
        {paidAt ? (
          <Text style={{ ...t.small, margin: '6px 0 0' }}>Paid {paidAt}</Text>
        ) : null}
      </Section>

      <DetailTable
        title="Receipt summary"
        rows={[
          { label: 'Item', value: listingTitle },
          { label: 'Description', value: description },
          { label: 'Order', value: orderNumber, mono: true },
          { label: 'Payment method', value: paymentMethod },
          { label: 'Status', value: 'Paid' },
        ]}
      />

      <CtaButton href={ctaHref}>{orderId ? 'View your order' : 'View in dashboard'}</CtaButton>

      <Divider />

      <Text style={{ ...t.small, margin: 0 }}>
        Keep this email for your records — it is your official receipt from {BRAND_NAME}.
      </Text>

      <SupportRow note="Questions about this charge?" />
    </VendibookEmailLayout>
  )
}

export const template = {
  component: PaymentReceiptEmail,
  subject: (data: Record<string, any>) =>
    data?.amount ? `Receipt: ${data.amount} — ${BRAND_NAME}` : `Your ${BRAND_NAME} receipt`,
  displayName: 'Payment receipt',
  previewData: {
    customerName: 'Sam',
    orderNumber: 'VB-7C1E9A2F',
    amount: '$842.00',
    paymentMethod: 'PayPal',
    paidAt: 'April 21, 2026',
    listingTitle: 'Sunset Food Truck — Downtown LA',
    description: '2-day rental + service fee',
  },
} satisfies TemplateEntry
