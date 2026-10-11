import * as React from 'npm:react@18.3.1'
import { Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import {
  AmountBlock,
  Callout,
  CtaButton,
  CtaFallback,
  DetailTable,
  Eyebrow,
  H1,
  Lede,
  SupportRow,
  VendibookEmailLayout,
  t,
} from '../email-brand/components.tsx'

interface FreightQuoteProps {
  customerName?: string
  quoteNumber?: string
  pickupLocation?: string
  deliveryLocation?: string
  equipmentType?: string
  equipmentSummary?: string
  pickupWindow?: string
  guaranteedDelivery?: string
  insuranceCoverage?: string
  transitTime?: string
  amount?: string
  notes?: string
  payUrl?: string
}

const FreightQuoteEmail = ({
  customerName, quoteNumber, pickupLocation, deliveryLocation, equipmentType,
  equipmentSummary, pickupWindow, guaranteedDelivery, insuranceCoverage,
  transitTime, amount, notes, payUrl,
}: FreightQuoteProps) => (
  <VendibookEmailLayout
    preview={`Your Vendibook freight quote${amount ? ` — ${amount}` : ''}${
      deliveryLocation ? ` to ${deliveryLocation}` : ''
    }`}
  >
    <Eyebrow>Freight quote</Eyebrow>
    <H1>{customerName ? `Here's your quote, ${customerName}.` : "Here's your freight quote."}</H1>
    <Lede>
      {pickupLocation && deliveryLocation
        ? `Door-to-door transport from ${pickupLocation} to ${deliveryLocation}, fully insured and dispatched by Vendibook Freight.`
        : 'Door-to-door transport, fully insured and dispatched by Vendibook Freight.'}
    </Lede>

    <AmountBlock label="All-in quoted price" amount={amount ?? '—'} />

    {guaranteedDelivery ? (
      <Callout tone="info" title={`Guaranteed arrival by ${guaranteedDelivery}`}>
        {insuranceCoverage
          ? `${insuranceCoverage} of cargo insurance is included at no extra cost.`
          : 'Cargo insurance is included at no extra cost.'}
      </Callout>
    ) : null}

    <DetailTable
      title="Shipment details"
      rows={[
        { label: 'Quote number', value: quoteNumber, mono: true },
        { label: 'Pickup', value: pickupLocation },
        { label: 'Delivery', value: deliveryLocation },
        { label: 'Equipment', value: equipmentType },
        { label: 'Specs', value: equipmentSummary },
        { label: 'Pickup window', value: pickupWindow },
        { label: 'Guaranteed arrival', value: guaranteedDelivery },
        { label: 'Transit time', value: transitTime },
        { label: 'Cargo insurance', value: insuranceCoverage },
        { label: 'Notes', value: notes },
      ]}
    />

    {payUrl ? (
      <>
        <CtaButton href={payUrl}>Pay securely with PayPal</CtaButton>
        <CtaFallback href={payUrl} />
        <Text style={t.legal}>
          Payment is processed by PayPal. You can pay with a PayPal balance, bank account, or
          debit/credit card — no PayPal account required. Your shipment is dispatched and the
          pickup is scheduled as soon as payment clears.
        </Text>
      </>
    ) : null}

    <SupportRow note="Questions about this quote? Reply to this email and we'll take care of it." />
  </VendibookEmailLayout>
)

export const template = {
  component: FreightQuoteEmail,
  subject: (d: Record<string, unknown>) => {
    const from = (d?.pickupLocation as string) ?? ''
    const to = (d?.deliveryLocation as string) ?? ''
    return from && to
      ? `Your Vendibook freight quote: ${from} → ${to}`
      : 'Your Vendibook freight quote'
  },
  displayName: 'Freight quote + payment link',
  previewData: {
    customerName: 'Alisa',
    quoteNumber: 'VB-FRT-AF7F38E9',
    pickupLocation: 'Damascus, Oregon',
    deliveryLocation: 'Covington, Kentucky',
    equipmentType: 'Food Truck',
    equipmentSummary: '2019 · 22 ft L × 8 ft W × 12 ft H · 9,800 lbs · runs and drives',
    pickupWindow: 'September 17, 2026',
    guaranteedDelivery: 'September 30, 2026',
    insuranceCoverage: '$100,000',
    transitTime: '5–8 days in transit',
    amount: '$10,900.00',
    notes: 'Kona Ice truck — enclosed door-to-door transport.',
    payUrl: 'https://www.paypal.com/invoice/p/#EXAMPLE',
  },
} satisfies TemplateEntry
