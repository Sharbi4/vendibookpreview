import * as React from 'npm:react@18.3.1'
import { Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import {
  AmountBlock,
  BRAND_NAME,
  Callout,
  CtaButton,
  DetailTable,
  Eyebrow,
  H1,
  Lede,
  SITE_URL,
  SupportRow,
  VendibookEmailLayout,
  t,
} from '../email-brand/components.tsx'

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

const OrderReceiptEmail = ({
  orderNumber, buyerName, itemTitle, sellerName, transactionTypeLabel, orderDate,
  paypalTransactionId, paypalCaptureId, amountPaid, taxes, fees, refundAmount,
  fulfillmentLabel, fulfillmentNextStep, nextActionTitle, nextActionDescription,
  orderUrl,
}: OrderReceiptProps) => {
  const hasPayPal = Boolean(paypalTransactionId || paypalCaptureId)
  return (
    <VendibookEmailLayout
      preview={`Payment confirmed — order ${orderNumber ?? ''}${amountPaid ? ` · ${amountPaid}` : ''}`}
    >
      <Eyebrow>Payment confirmed</Eyebrow>
      <H1>{buyerName ? `Thanks, ${buyerName}.` : 'Thanks for your payment.'}</H1>
      <Lede>Your payment went through and your order is confirmed. Here is everything on file.</Lede>

      <AmountBlock label="Total paid" amount={amountPaid ?? '—'} />

      {nextActionTitle ? (
        <Callout tone="info" title={`Your next step: ${nextActionTitle}`}>
          {nextActionDescription}
        </Callout>
      ) : null}

      <DetailTable
        title="Order summary"
        rows={[
          { label: 'Order number', value: orderNumber, mono: true },
          { label: 'Order date', value: orderDate },
          { label: 'Type', value: transactionTypeLabel },
          { label: 'Item', value: itemTitle },
          { label: 'Seller / host', value: sellerName },
          { label: 'Fulfillment', value: fulfillmentLabel },
          { label: 'Next step', value: fulfillmentNextStep },
          { label: 'Taxes', value: taxes },
          { label: 'Fees', value: fees },
          { label: 'Refunded', value: refundAmount },
          { label: 'PayPal transaction ID', value: paypalTransactionId, mono: true },
          { label: 'PayPal capture ID', value: paypalCaptureId, mono: true },
        ]}
      />

      {orderUrl ? (
        <CtaButton href={orderUrl.startsWith('http') ? orderUrl : `${SITE_URL}${orderUrl}`}>
          View order details
        </CtaButton>
      ) : null}

      <Text style={t.legal}>
        {hasPayPal ? 'Your payment was processed securely through PayPal. ' : ''}
        Fulfillment and seller payment are handled according to the applicable {BRAND_NAME}{' '}
        transaction terms.
      </Text>

      <SupportRow />
    </VendibookEmailLayout>
  )
}

export const template = {
  component: OrderReceiptEmail,
  subject: (d: Record<string, unknown>) =>
    `Payment confirmed — Vendibook order ${(d?.orderNumber as string) ?? ''}`.trim(),
  displayName: 'Order receipt',
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
