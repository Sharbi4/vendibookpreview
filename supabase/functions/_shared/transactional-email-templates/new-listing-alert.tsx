import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Img, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { s, SITE_URL } from './_styles.ts'

import { BrandFooter, BrandHeader } from './_blocks.tsx'
interface Props {
  name?: string
  listingTitle?: string
  listingId?: string
  categoryLabel?: string
  modeLabel?: string
  priceLabel?: string
  city?: string
  state?: string
  distanceMiles?: number
  coverImageUrl?: string
}

const E = ({ name, listingTitle, listingId, categoryLabel, modeLabel, priceLabel, city, state, distanceMiles, coverImageUrl }: Props) => {
  const where = [city, state].filter(Boolean).join(', ')
  const distance = typeof distanceMiles === 'number' ? `${Math.round(distanceMiles)} mi away` : null
  return (
    <Html lang="en" dir="ltr"><Head /><Preview>{listingTitle ? `${listingTitle} just listed near you` : 'A new listing just went live near you'}</Preview>
      <Body style={s.main}><Container style={s.container}>
        <BrandHeader hero="celebrate" listingImageUrl={coverImageUrl} listingTitle={listingTitle} />
        <Section style={s.card}>
          <Text style={s.smallHeader}>NEW MATCH NEAR YOU</Text>
          <Heading style={s.h1}>{name ? `${name}, a new listing just dropped.` : 'A new listing just dropped near you.'}</Heading>
          <Text style={s.lede}>
            {listingTitle ? `"${listingTitle}"` : 'A listing you might love'} just went live{where ? ` in ${where}` : ''}
            {distance ? ` — ${distance}` : ''}.
          </Text>

          {coverImageUrl ? (
            <Section style={{ margin: '20px 0' }}>
              <Img src={coverImageUrl} alt={listingTitle || 'Listing'} width="520" style={{ borderRadius: 12, maxWidth: '100%' }} />
            </Section>
          ) : null}

          {categoryLabel || modeLabel || priceLabel ? (
            <Section style={s.accentRow}>
              {categoryLabel ? <><Text style={s.accentLabel}>CATEGORY</Text><Text style={s.accentValuePlain}>{categoryLabel}{modeLabel ? ` · ${modeLabel}` : ''}</Text></> : null}
              {priceLabel ? <Text style={s.accentValuePlain}>{priceLabel}</Text> : null}
            </Section>
          ) : null}

          <Section style={s.ctaWrap}>
            <Button href={`${SITE_URL}/listing/${listingId || ''}`} style={s.button}>View listing</Button>
          </Section>

          <Text style={s.smallHeader}>WHY YOU'RE GETTING THIS</Text>
          <Text style={s.listItem}>You asked Vendibook to alert you when matching listings became available in your area. New listings move fast — reach out to the host today.</Text>
        </Section>
      <BrandFooter /></Container></Body>
    </Html>
  )
}

export const template = {
  component: E,
  subject: (d: any) => d?.listingTitle ? `New near you: ${d.listingTitle}` : 'A new listing just went live near you',
  displayName: 'New listing alert',
  previewData: {
    name: 'Sam',
    listingTitle: 'Downtown Food Truck', coverImageUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&q=80', listingId: 'demo',
    categoryLabel: 'Food Truck',
    modeLabel: 'For Rent',
    priceLabel: '$250/day',
    city: 'Austin',
    state: 'TX',
    distanceMiles: 12,
  },
} satisfies TemplateEntry
