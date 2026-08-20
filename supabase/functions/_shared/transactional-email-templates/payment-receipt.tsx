import * as React from 'npm:react@18.3.1'
import type { TemplateEntry } from './registry.ts'
import {
  AmountBlock,
  CtaButton,
  DetailTable,
  Eyebrow,
  H1,
  Lede,
  SupportRow,
  VendibookEmailLayout,
  BRAND_NAME,
  SITE_URL,
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
}

const PaymentReceiptEmail = ({
  customerName,
  orderNumber,
  amount,
  paymentMethod,
  paidAt,
  listingTitle,
  description,
}: ReceiptProps) => (
  <VendibookEmailLayout preview={`Receipt from ${BRAND_NAME} — ${amount ?? 'payment received'}`}>
    <Eyebrow>Payment receipt</Eyebrow>
    <H1>{customerName ? `Thanks, ${customerName}.` : 'Thanks for your payment.'}</H1>
    <Lede>This receipt confirms your payment to {BRAND_NAME}. Keep it for your records.</Lede>

    <AmountBlock label="Amount paid" amount={amount ?? '—'} />

    <DetailTable
      rows={[
        { label: 'Order', value: orderNumber, mono: true },
        { label: 'For', value: listingTitle },
        { label: 'Description', value: description },
        { label: 'Method', value: paymentMethod },
        { label: 'Paid', value: paidAt },
      ]}
    />

    <CtaButton href={`${SITE_URL}/dashboard`}>View in dashboard</CtaButton>

    <SupportRow note="Questions about this charge?" />
  </VendibookEmailLayout>
)

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
