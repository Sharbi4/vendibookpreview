import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { s, SITE_NAME, SITE_URL, SUPPORT_PHONE } from './_styles.ts'

import { BrandFooter, BrandHeader } from './_blocks.tsx'
interface FeaturedReceiptProps {
  firstName?: string
  listingTitle?: string
  listingId?: string
  amount?: string
  expiresAt?: string
  receiptId?: string
  coverImageUrl?: string
  packageName?: string
  startsAt?: string
  orderDate?: string
  orderNumber?: string
  paypalTransactionId?: string
  paypalCaptureId?: string
  paymentMethod?: string
  orderUrl?: string
}

const FeaturedPaymentReceiptEmail = ({ firstName,
  listingTitle,
  listingId,
  amount = '$30.00',
  expiresAt,
  receiptId, coverImageUrl,
  packageName,
  startsAt,
  orderDate,
  orderNumber,
  paypalTransactionId,
  paypalCaptureId,
  paymentMethod,
  orderUrl }: FeaturedReceiptProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your boost is live — {listingTitle || 'your listing'} is now featured</Preview>
    <Body style={s.main}>
      <Container style={s.container}>
        <BrandHeader hero="payment" listingImageUrl={coverImageUrl} listingTitle={listingTitle} />
        <Section style={s.card}>
          <Text style={s.kicker}>BOOST ACTIVATED ⭐</Text>
          <Heading style={s.h1}>
            {firstName ? `You're featured, ${firstName}.` : "You're featured."}
          </Heading>
          <Text style={s.lede}>
            Your boost payment was successful and your listing is now pinned to the
            top of search results
            {startsAt && expiresAt
              ? ` from ${startsAt} through ${expiresAt}.`
              : expiresAt
                ? ` through ${expiresAt}.`
                : durationLabel
                  ? ` for the next ${durationLabel}.`
                  : '.'}
          </Text>


          <Section style={s.detailGrid}>
            <Text style={s.detailLabel}>LISTING</Text>
            <Text style={s.detailValue}>{listingTitle || 'Your listing'}</Text>
            {packageName && (
              <>
                <Hr style={s.hrThin} />
                <Text style={s.detailLabel}>PACKAGE</Text>
                <Text style={s.detailValue}>{packageName}</Text>
              </>
            )}
            <Hr style={s.hrThin} />
            <Text style={s.detailLabel}>TOTAL PAID</Text>
            <Text style={s.detailValueOrange}>{amount}</Text>
            {orderDate && (
              <>
                <Hr style={s.hrThin} />
                <Text style={s.detailLabel}>PAYMENT DATE</Text>
                <Text style={s.detailValue}>{orderDate}</Text>
              </>
            )}
            {paymentMethod && (
              <>
                <Hr style={s.hrThin} />
                <Text style={s.detailLabel}>PAYMENT METHOD</Text>
                <Text style={s.detailValue}>{paymentMethod}</Text>
              </>
            )}
            {startsAt && (
              <>
                <Hr style={s.hrThin} />
                <Text style={s.detailLabel}>FEATURED FROM</Text>
                <Text style={s.detailValue}>{startsAt}</Text>
              </>
            )}
            {expiresAt && (
              <>
                <Hr style={s.hrThin} />
                <Text style={s.detailLabel}>FEATURED UNTIL</Text>
                <Text style={s.detailValue}>{expiresAt}</Text>
              </>
            )}
            {orderNumber && (
              <>
                <Hr style={s.hrThin} />
                <Text style={s.detailLabel}>ORDER</Text>
                <Text style={s.detailMono}>{orderNumber}</Text>
              </>
            )}
            {paypalTransactionId && (
              <>
                <Hr style={s.hrThin} />
                <Text style={s.detailLabel}>PAYPAL ORDER ID</Text>
                <Text style={s.detailMono}>{paypalTransactionId}</Text>
              </>
            )}
            {paypalCaptureId && (
              <>
                <Hr style={s.hrThin} />
                <Text style={s.detailLabel}>PAYPAL TRANSACTION ID</Text>
                <Text style={s.detailMono}>{paypalCaptureId}</Text>
              </>
            )}
            {receiptId && (
              <>
                <Hr style={s.hrThin} />
                <Text style={s.detailLabel}>RECEIPT</Text>
                <Text style={s.detailMono}>{receiptId}</Text>
              </>
            )}
          </Section>

          {(orderUrl || listingId) && (
            <Section style={s.ctaWrap}>
              <Button href={orderUrl || `${SITE_URL}/listing/${listingId}`} style={s.button}>
                {orderUrl ? 'View your order & receipt' : 'View your live listing'}
              </Button>
            </Section>
          )}


          <Hr style={s.hr} />

          <Text style={s.smallHeader}>WHAT HAPPENS NEXT</Text>
          <Text style={s.listItem}>1. Your listing appears first in relevant searches.</Text>
          <Text style={s.listItem}>2. You'll get a featured badge across the marketplace.</Text>
          <Text style={s.listItem}>3. Boost ends automatically after 30 days — no auto-renewal.</Text>
        </Section>

        <Text style={s.footnote}>
          Questions? Reply to this email or call {SUPPORT_PHONE}.
        </Text>
      <BrandFooter /></Container>
    </Body>
  </Html>
)

export const template = {
  component: FeaturedPaymentReceiptEmail,
  subject: (data: Record<string, any>) =>
    `⭐ Boost activated for ${data?.listingTitle || 'your listing'}`,
  displayName: 'Featured boost receipt',
  previewData: {
    firstName: 'Alex',
    listingTitle: '2023 Food Trailer with Generator', coverImageUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&q=80', listingId: 'abc-123',
    amount: '$30.00',
    expiresAt: 'June 28, 2026',
    receiptId: 'pi_3TWF84A6Qt4pF0fM1RXYc3H2',
  },
} satisfies TemplateEntry
