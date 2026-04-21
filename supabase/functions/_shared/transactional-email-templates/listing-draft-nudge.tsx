import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { s, SITE_URL } from './_styles.ts'

interface Props { hostName?: string; listingTitle?: string; listingId?: string }

const E = ({ hostName, listingTitle, listingId }: Props) => (
  <Html lang="en" dir="ltr"><Head /><Preview>Finish your listing — it's almost ready</Preview>
    <Body style={s.main}><Container style={s.container}>
      <Section style={s.brandBar}><Text style={s.brandMark}>VENDIBOOK</Text></Section>
      <Section style={s.card}>
        <Text style={s.smallHeader}>DRAFT WAITING</Text>
        <Heading style={s.h1}>{hostName ? `${hostName}, ` : ''}you're 2 minutes from earning.</Heading>
        <Text style={s.lede}>{listingTitle ? `“${listingTitle}”` : 'Your listing'} is saved as a draft. Publish it now to start receiving inquiries.</Text>
        <Section style={s.ctaWrap}><Button href={`${SITE_URL}/list/${listingId || ''}`} style={s.button}>Finish & publish</Button></Section>
        <Text style={s.small}>Hosts who publish within 24 hours get 4× more bookings in the first month.</Text>
      </Section>
    </Container></Body></Html>
)

export const template = {
  component: E,
  subject: () => `Finish your listing — 2 minutes left`,
  displayName: 'Draft nudge',
  previewData: { hostName: 'Sam', listingTitle: 'Downtown Food Truck', listingId: 'demo' },
} satisfies TemplateEntry
