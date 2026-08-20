import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { s, SITE_URL } from './_styles.ts'
import { BrandFooter } from './_blocks.tsx'

interface FeaturedAdminAlertProps {
  hostName?: string
  hostEmail?: string
  listingTitle?: string
  listingId?: string
  amount?: string
  receiptId?: string; coverImageUrl?: string }

const FeaturedPaymentAdminAlert = ({ hostName,
  hostEmail,
  listingTitle,
  listingId,
  amount = '$30.00',
  receiptId, coverImageUrl }: FeaturedAdminAlertProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>New boost payment — {amount} from {hostName || 'a host'}</Preview>
    <Body style={s.main}>
      <Container style={s.container}>
        <BrandHeader hero="payment" listingImageUrl={coverImageUrl} listingTitle={listingTitle} />
        <Section style={s.card}>
          <Text style={s.kicker}>NEW BOOST PAYMENT 💰</Text>
          <Heading style={s.h1}>{amount} boost paid</Heading>
          <Text style={s.lede}>
            A host just paid for a featured listing. The listing has been
            automatically published and pinned for 30 days.
          </Text>

          <Section style={s.detailGrid}>
            <Text style={s.detailLabel}>HOST</Text>
            <Text style={s.detailValue}>{hostName || 'Unknown'}</Text>
            <Text style={s.detailSub}>{hostEmail || '—'}</Text>
            <Hr style={s.hrThin} />
            <Text style={s.detailLabel}>LISTING</Text>
            <Text style={s.detailValue}>{listingTitle || '—'}</Text>
            <Hr style={s.hrThin} />
            <Text style={s.detailLabel}>AMOUNT</Text>
            <Text style={s.detailValueOrange}>{amount}</Text>
            {receiptId && (
              <>
                <Hr style={s.hrThin} />
                <Text style={s.detailLabel}>PAYMENT REFERENCE</Text>
                <Text style={s.detailMono}>{receiptId}</Text>
              </>
            )}
          </Section>

          {listingId && (
            <Section style={s.ctaWrap}>
              <Button href={`${SITE_URL}/listing/${listingId}`} style={s.button}>
                Open listing
              </Button>
            </Section>
          )}
        </Section>

        <Text style={s.footnote}>Internal alert · Vendibook</Text>
      <BrandFooter /></Container>
    </Body>
  </Html>
)

export const template = {
  component: FeaturedPaymentAdminAlert,
  subject: (data: Record<string, any>) =>
    `💰 Boost paid — ${data?.amount || '$30.00'} from ${data?.hostName || 'a host'}`,
  displayName: 'Admin: boost payment alert',
  previewData: {
    hostName: 'Stephanie Lentz',
    hostEmail: 'smlentz@hotmail.com',
    listingTitle: '2023 Food Trailer with Generator', coverImageUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&q=80', listingId: 'abc-123',
    amount: '$30.00',
    receiptId: 'pi_3TWF84A6Qt4pF0fM1RXYc3H2',
  },
} satisfies TemplateEntry
