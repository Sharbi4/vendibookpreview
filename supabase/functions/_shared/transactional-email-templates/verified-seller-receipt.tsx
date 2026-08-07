import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { s, SITE_URL, SUPPORT_PHONE } from './_styles.ts'

import { BrandFooter, BrandHeader } from './_blocks.tsx'

interface VerifiedSellerReceiptProps {
  firstName?: string
  amount?: string
  orderDate?: string
  paypalTransactionId?: string
  paypalCaptureId?: string
  verifiedAt?: string
}

const VerifiedSellerReceiptEmail = ({
  firstName,
  amount = '$19.99',
  orderDate,
  paypalTransactionId,
  paypalCaptureId,
  verifiedAt,
}: VerifiedSellerReceiptProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your Identity Verified badge is active</Preview>
    <Body style={s.main}>
      <Container style={s.container}>
        <BrandHeader hero="payment" />
        <Section style={s.card}>
          <Text style={s.kicker}>IDENTITY VERIFIED</Text>
          <Heading style={s.h1}>
            {firstName ? `You're verified, ${firstName}.` : "You're verified."}
          </Heading>
          <Text style={s.lede}>
            Your identity check succeeded and your Identity Verified badge is now
            live on your seller profile and every one of your active listings —
            current and future. This is a one-time purchase; there is nothing to renew.
          </Text>

          <Section style={s.detailGrid}>
            <Text style={s.detailLabel}>SERVICE</Text>
            <Text style={s.detailValue}>Verified Seller identity check</Text>
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
            <Hr style={s.hrThin} />
            <Text style={s.detailLabel}>PAYMENT METHOD</Text>
            <Text style={s.detailValue}>PayPal</Text>
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
            {verifiedAt && (
              <>
                <Hr style={s.hrThin} />
                <Text style={s.detailLabel}>VERIFIED ON</Text>
                <Text style={s.detailValue}>{verifiedAt}</Text>
              </>
            )}
          </Section>

          <Section style={s.ctaWrap}>
            <Button href={`${SITE_URL}/dashboard`} style={s.button}>
              View your badge
            </Button>
          </Section>

          <Hr style={s.hr} />

          <Text style={s.smallHeader}>WHAT THE BADGE MEANS</Text>
          <Text style={s.listItem}>
            Identity verification confirms the seller's identity. It does not verify
            ownership, title, liens, listing accuracy, equipment condition, licensing,
            permits, financing eligibility, or transaction safety.
          </Text>
          <Text style={s.listItem}>
            Vendibook may revoke a badge for fraud, account compromise, or policy
            violations. Revocation does not itself determine refund eligibility.
          </Text>
        </Section>

        <Text style={s.footnote}>
          Questions? Reply to this email or call {SUPPORT_PHONE}.
        </Text>
        <BrandFooter />
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: VerifiedSellerReceiptEmail,
  subject: () => 'Your Identity Verified badge is active',
  displayName: 'Verified Seller receipt',
  previewData: {
    firstName: 'Alex',
    amount: '$19.99',
    orderDate: 'March 4, 2026',
    paypalTransactionId: '8AB12345CD678901E',
    paypalCaptureId: '3XY98765ZW432109Q',
    verifiedAt: 'March 4, 2026',
  },
} satisfies TemplateEntry
