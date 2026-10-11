import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { s, SITE_URL, SUPPORT_PHONE } from './_styles.ts'

import { BrandFooter, BrandHeader } from './_blocks.tsx'
interface FeaturedExpiredProps {
  firstName?: string
  listingTitle?: string
  listingId?: string
  expiredAt?: string; coverImageUrl?: string }

const FeaturedBoostExpiredEmail = ({ firstName,
  listingTitle,
  listingId,
  expiredAt, coverImageUrl }: FeaturedExpiredProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your boost for {listingTitle || 'your listing'} has ended</Preview>
    <Body style={s.main}>
      <Container style={s.container}>
        <BrandHeader hero="payment" listingImageUrl={coverImageUrl} listingTitle={listingTitle} />
        <Section style={s.card}>
          <Text style={s.kicker}>BOOST ENDED</Text>
          <Heading style={s.h1}>
            {firstName ? `Your 30 days are up, ${firstName}.` : 'Your boost has ended.'}
          </Heading>
          <Text style={s.lede}>
            The Featured Boost on your listing has reached the end of its
            30-day run. Your listing remains live — it just no longer pins
            to the top of search results. Want another month at the top?
          </Text>

          <Section style={s.detailGrid}>
            <Text style={s.detailLabel}>LISTING</Text>
            <Text style={s.detailValue}>{listingTitle || 'Your listing'}</Text>
            {expiredAt && (
              <>
                <Hr style={s.hrThin} />
                <Text style={s.detailLabel}>EXPIRED</Text>
                <Text style={s.detailValue}>{expiredAt}</Text>
              </>
            )}
          </Section>

          {listingId && (
            <Section style={s.ctaWrap}>
              <Button href={`${SITE_URL}/listing/${listingId}`} style={s.button}>
                Re-boost this listing
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
  component: FeaturedBoostExpiredEmail,
  subject: (data: Record<string, any>) =>
    `Your boost on "${data?.listingTitle || 'your listing'}" has ended`,
  displayName: 'Featured boost expired',
  previewData: {
    firstName: 'Alex',
    listingTitle: '2023 Food Trailer with Generator', coverImageUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&q=80', listingId: 'abc-123',
    expiredAt: 'July 2, 2026',
  },
} satisfies TemplateEntry
