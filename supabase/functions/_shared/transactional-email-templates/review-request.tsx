import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { s, SITE_URL } from './_styles.ts'

interface Props { shopperName?: string; listingTitle?: string; hostName?: string; bookingId?: string }

const E = ({ shopperName, listingTitle, hostName, bookingId }: Props) => (
  <Html lang="en" dir="ltr"><Head /><Preview>How was your experience?</Preview>
    <Body style={s.main}><Container style={s.container}>
      <Section style={s.brandBar}><Text style={s.brandMark}>VENDIBOOK</Text></Section>
      <Section style={s.card}>
        <Text style={s.smallHeader}>SHARE YOUR REVIEW</Text>
        <Heading style={s.h1}>{shopperName ? `${shopperName}, ` : ''}how did it go?</Heading>
        <Text style={s.lede}>Your honest review of {listingTitle ? `“${listingTitle}”` : 'your booking'}{hostName ? ` with ${hostName}` : ''} helps other vendors find the right space.</Text>
        <Section style={s.ctaWrap}><Button href={`${SITE_URL}/dashboard?review=${bookingId || ''}`} style={s.button}>Leave a review</Button></Section>
        <Text style={s.small}>Takes about 60 seconds.</Text>
      </Section>
    </Container></Body></Html>
)

export const template = {
  component: E,
  subject: (d: any) => `How was ${d?.listingTitle || 'your booking'}?`,
  displayName: 'Review request',
  previewData: { shopperName: 'Jordan', listingTitle: 'Demo Kitchen', hostName: 'Sam', bookingId: 'demo' },
} satisfies TemplateEntry
