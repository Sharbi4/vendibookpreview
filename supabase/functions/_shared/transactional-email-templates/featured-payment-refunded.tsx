import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { s, SITE_URL, SUPPORT_PHONE } from './_styles.ts'

import { BrandFooter, BrandHeader } from './_blocks.tsx'
interface FeaturedRefundedProps {
  firstName?: string
  listingTitle?: string
  listingId?: string
  amount?: string
  refundedAt?: string
  receiptId?: string
  reason?: string; coverImageUrl?: string }

const FeaturedPaymentRefundedEmail = ({ firstName,
  listingTitle,
  listingId,
  amount = '$30.00',
  refundedAt,
  receiptId,
  reason, coverImageUrl }: FeaturedRefundedProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your boost refund for {listingTitle || 'your listing'} has been processed</Preview>
    <Body style={s.main}>
      <Container style={s.container}>
        <BrandHeader hero="payment" listingImageUrl={coverImageUrl} listingTitle={listingTitle} />
        <Section style={s.card}>
          <Text style={s.kicker}>BOOST REFUNDED</Text>
          <Heading style={s.h1}>
            {firstName ? `Refund issued, ${firstName}.` : 'Your boost refund is on its way.'}
          </Heading>
          <Text style={s.lede}>
            We've refunded your Featured Boost payment. The featured status on
            your listing has been removed. Funds typically land back on your
            original payment method within 5–10 business days.
          </Text>

          <Section style={s.detailGrid}>
            <Text style={s.detailLabel}>LISTING</Text>
            <Text style={s.detailValue}>{listingTitle || 'Your listing'}</Text>
            <Hr style={s.hrThin} />
            <Text style={s.detailLabel}>REFUND AMOUNT</Text>
            <Text style={s.detailValueOrange}>{amount}</Text>
            {refundedAt && (
              <>
                <Hr style={s.hrThin} />
                <Text style={s.detailLabel}>REFUNDED</Text>
                <Text style={s.detailValue}>{refundedAt}</Text>
              </>
            )}
            {reason && (
              <>
                <Hr style={s.hrThin} />
                <Text style={s.detailLabel}>REASON</Text>
                <Text style={s.detailValue}>{reason}</Text>
              </>
            )}
            {receiptId && (
              <>
                <Hr style={s.hrThin} />
                <Text style={s.detailLabel}>ORIGINAL PAYMENT</Text>
                <Text style={s.detailMono}>{receiptId}</Text>
              </>
            )}
          </Section>

          {listingId && (
            <Section style={s.ctaWrap}>
              <Button href={`${SITE_URL}/transactions?tab=charges`} style={s.button}>
                View account charges
              </Button>
            </Section>
          )}
        </Section>

        <Text style={s.footnote}>
          Questions? Reply to this email or call {SUPPORT_PHONE}.
        </Text>
      <BrandFooter /></Container>
    </Body>
  </Html>
)

export const template = {
  component: FeaturedPaymentRefundedEmail,
  subject: (data: Record<string, any>) =>
    `Refund processed for ${data?.listingTitle || 'your boost'}`,
  displayName: 'Featured boost refunded',
  previewData: {
    firstName: 'Alex',
    listingTitle: '2023 Food Trailer with Generator', coverImageUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&q=80', listingId: 'abc-123',
    amount: '$30.00',
    refundedAt: 'June 2, 2026',
    receiptId: 'pi_3TWF84A6Qt4pF0fM1RXYc3H2',
    reason: 'Requested by customer',
  },
} satisfies TemplateEntry
