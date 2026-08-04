import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { s, SITE_NAME, SITE_URL, SUPPORT_PHONE } from './_styles.ts'
import { BrandFooter, BrandHeader } from './_blocks.tsx'

interface ComplimentaryFeaturedBoostProps {
  firstName?: string
  listingTitle?: string
  listingId?: string
  listingImageUrl?: string
  expiresAtFormatted?: string
  durationDays?: number
}

const ComplimentaryFeaturedBoostEmail = ({
  firstName,
  listingTitle,
  listingId,
  listingImageUrl,
  expiresAtFormatted,
  durationDays = 30,
}: ComplimentaryFeaturedBoostProps) => {
  const listingHref = listingId ? `${SITE_URL}/listing/${listingId}` : SITE_URL
  const greeting = firstName ? `Hi ${firstName},` : 'Hi there,'

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>
        {`We've featured ${listingTitle || 'your listing'} on ${SITE_NAME} — on us, for ${durationDays} days.`}
      </Preview>
      <Body style={s.main}>
        <Container style={s.container}>
          <BrandHeader
            listingImageUrl={listingImageUrl}
            listingTitle={listingTitle}
            listingHref={listingHref}
          />
          <Section style={s.card}>
            <Text style={s.kicker}>COMPLIMENTARY FEATURED BOOST</Text>
            <Heading style={s.h1}>
              {`You're featured for the next ${durationDays} days — on us.`}
            </Heading>
            <Text style={s.lede}>{greeting}</Text>
            <Text style={s.text}>
              As a thank-you for being part of {SITE_NAME}, our team has placed
              {' '}
              <strong style={{ color: '#ffffff' }}>{listingTitle || 'your listing'}</strong>
              {' '}
              into our Featured rotation at no cost to you. Featured listings get
              premium placement across the homepage, search results, and category
              rows — driving meaningfully more views, saves, and booking requests.
            </Text>

            <Section style={s.accentRow}>
              <Text style={s.accentLabel}>FEATURED UNTIL</Text>
              <Text style={s.accentValue}>
                {expiresAtFormatted || `${durationDays} days from today`}
              </Text>
            </Section>

            <Section style={s.ctaWrap}>
              <Button href={listingHref} style={s.button}>
                View your featured listing
              </Button>
            </Section>

            <Hr style={s.hr} />

            <Text style={s.smallHeader}>WHAT YOU SHOULD DO NEXT</Text>
            <Text style={s.listItem}>
              1. Make sure your photos, pricing, and availability are up to date —
              you'll get more inbound interest over the next month.
            </Text>
            <Text style={s.listItem}>
              2. Respond quickly to new requests and messages. Faster replies
              convert significantly better.
            </Text>
            <Text style={s.listItem}>
              3. When your boost ends, you can keep the placement going by
              renewing Featured from your dashboard — entirely optional.
            </Text>

            <Hr style={s.hr} />

            <Text style={s.text}>
              No action is required from you. This is on the house.
            </Text>

            <Text style={s.text}>
              Thank you for trusting {SITE_NAME} with your business.
            </Text>

            <Text style={{ ...s.text, margin: '24px 0 4px' }}>Warmly,</Text>
            <Text style={{ ...s.text, margin: 0, color: '#ffffff', fontWeight: 600 }}>
              Brad Pitman
            </Text>
            <Text style={{ ...s.small, margin: '2px 0 0' }}>
              Customer Success Team · {SITE_NAME}
            </Text>
          </Section>

          <Text style={s.footnote}>
            Questions? Reply to this email or call {SUPPORT_PHONE}.
          </Text>
        <BrandFooter /></Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: ComplimentaryFeaturedBoostEmail,
  subject: (data: Record<string, any>) =>
    `A complimentary 30-day Featured boost on ${SITE_NAME}${
      data?.listingTitle ? ` for ${data.listingTitle}` : ''
    }`,
  displayName: 'Complimentary Featured Boost',
  previewData: {
    firstName: 'Alex',
    listingTitle: 'Your Listing',
    listingId: 'preview',
    expiresAtFormatted: 'July 11, 2026',
    durationDays: 30,
  },
} satisfies TemplateEntry
