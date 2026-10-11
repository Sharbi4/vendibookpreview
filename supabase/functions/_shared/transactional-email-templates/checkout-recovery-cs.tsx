import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { s, SITE_URL } from './_styles.ts'
import { BrandFooter, BrandHeader } from './_blocks.tsx'

interface Props {
  firstName?: string
  /** 'boost' = they have a published listing; 'publish' = they need to publish first. */
  variant?: 'boost' | 'publish'
  listingTitle?: string
  listingId?: string
  coverImageUrl?: string
}

const E = ({ firstName, variant = 'boost', listingTitle, listingId, coverImageUrl }: Props) => {
  const hi = firstName ? `Hi ${firstName},` : 'Hi there,'
  const isBoost = variant === 'boost'
  const ctaUrl = isBoost
    ? `${SITE_URL}/checkout/product/boost-featured-30${listingId ? `?listing_id=${listingId}` : ''}`
    : `${SITE_URL}/list`
  const listingRef = listingTitle ? `“${listingTitle}”` : 'your listing'

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{isBoost ? 'Checkout is fixed — your Featured Boost is ready' : 'Checkout is fixed — publish your listing'}</Preview>
      <Body style={s.main}>
        <Container style={s.container}>
          <BrandHeader hero="celebrate" listingImageUrl={coverImageUrl} listingTitle={listingTitle} />
          <Section style={s.card}>
            <Text style={s.smallHeader}>CUSTOMER SUCCESS</Text>
            <Heading style={s.h1}>
              {isBoost ? 'Checkout is working again' : 'Let’s get your listing live'}
            </Heading>
            <Text style={s.lede}>{hi}</Text>
            <Text style={s.body}>
              We found and fixed a technical issue in our PayPal checkout that could stop a payment from
              completing. If you tried to buy a Featured Boost recently and it didn’t go through, that was
              on us — not you. Nothing was charged for an attempt that failed.
            </Text>
            {isBoost ? (
              <>
                <Text style={s.body}>
                  Checkout is fully working now. If you’d still like extra exposure for {listingRef}, you can
                  add a 30-day Featured Boost in under a minute.
                </Text>
                <Section style={s.ctaWrap}>
                  <Button href={ctaUrl} style={s.button}>Boost my listing</Button>
                </Section>
              </>
            ) : (
              <>
                <Text style={s.body}>
                  It looks like you don’t have a published listing yet. Publishing is free — once your listing
                  is live, buyers and renters can find it, and boosts become available if you want extra reach.
                </Text>
                <Section style={s.ctaWrap}>
                  <Button href={ctaUrl} style={s.button}>Publish my listing</Button>
                </Section>
              </>
            )}
            <Text style={s.small}>
              If anything looks off, just reply to this email — a real person on our Customer Success team
              will help you finish up.
            </Text>
            <Text style={s.small}>— Vendibook Customer Success</Text>
          </Section>
          <BrandFooter />
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: E,
  subject: (data: Record<string, unknown>) =>
    data?.variant === 'publish'
      ? 'Checkout is fixed — let’s get your listing live'
      : 'We fixed checkout — your Featured Boost is ready',
  displayName: 'Checkout recovery (Customer Success)',
  previewData: {
    firstName: 'Sam',
    variant: 'boost',
    listingTitle: 'Downtown Food Trailer',
    listingId: 'demo',
  },
} satisfies TemplateEntry
