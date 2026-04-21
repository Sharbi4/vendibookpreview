import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { s, SITE_URL } from './_styles.ts'

interface Props { hostName?: string; listingTitle?: string; listingId?: string; category?: string; city?: string }

const E = ({ hostName, listingTitle, listingId, category, city }: Props) => (
  <Html lang="en" dir="ltr"><Head /><Preview>Your listing is live</Preview>
    <Body style={s.main}><Container style={s.container}>
      <Section style={s.brandBar}><Text style={s.brandMark}>VENDIBOOK</Text></Section>
      <Section style={s.card}>
        <Text style={s.smallHeader}>LISTING PUBLISHED</Text>
        <Heading style={s.h1}>{hostName ? `${hostName}, ` : ''}you're live.</Heading>
        <Text style={s.lede}>{listingTitle ? `“${listingTitle}”` : 'Your listing'} is now visible to thousands of vendors{city ? ` in ${city}` : ''}.</Text>
        {category ? <Section style={s.accentRow}><Text style={s.accentLabel}>CATEGORY</Text><Text style={s.accentValuePlain}>{category}</Text></Section> : null}
        <Section style={s.ctaWrap}><Button href={`${SITE_URL}/listing/${listingId || ''}`} style={s.button}>View live listing</Button></Section>
        <Text style={s.smallHeader}>BOOST IT</Text>
        <Text style={s.listItem}>• Share the link on social — first 48 hours matter most.</Text>
        <Text style={s.listItem}>• Add 5+ photos to triple your views.</Text>
        <Text style={s.listItem}>• Enable Instant Book to lift conversion ~30%.</Text>
      </Section>
    </Container></Body></Html>
)

export const template = {
  component: E,
  subject: (d: any) => d?.listingTitle ? `Live: ${d.listingTitle}` : 'Your listing is live',
  displayName: 'Listing published',
  previewData: { hostName: 'Sam', listingTitle: 'Downtown Food Truck', listingId: 'demo', category: 'Food Truck', city: 'Austin' },
} satisfies TemplateEntry
