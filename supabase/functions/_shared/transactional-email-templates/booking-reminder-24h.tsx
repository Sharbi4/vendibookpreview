import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { s, SITE_URL } from './_styles.ts'

import { BrandHeader } from './_blocks.tsx'
interface Props { shopperName?: string; listingTitle?: string; startDate?: string; address?: string; bookingId?: string; accessInstructions?: string }

const E = ({ shopperName, listingTitle, startDate, address, bookingId, accessInstructions }: Props) => (
  <Html lang="en" dir="ltr"><Head /><Preview>Reminder: your booking starts tomorrow</Preview>
    <Body style={s.main}><Container style={s.container}>
      <BrandHeader hero="booking" />
      <Section style={s.card}>
        <Text style={s.smallHeader}>STARTS IN 24 HOURS</Text>
        <Heading style={s.h1}>{shopperName ? `${shopperName}, ` : ''}you're up tomorrow.</Heading>
        <Text style={s.lede}>{listingTitle ? `“${listingTitle}”` : 'Your booking'} kicks off {startDate}. Here's everything you need.</Text>
        {address ? <Section style={s.accentRow}><Text style={s.accentLabel}>LOCATION</Text><Text style={s.accentValuePlain}>{address}</Text></Section> : null}
        {accessInstructions ? <Section style={s.accentRow}><Text style={s.accentLabel}>ACCESS</Text><Text style={s.accentValuePlain}>{accessInstructions}</Text></Section> : null}
        <Section style={s.ctaWrap}><Button href={`${SITE_URL}/dashboard?booking=${bookingId || ''}`} style={s.button}>Open booking</Button></Section>
      </Section>
    </Container></Body></Html>
)

export const template = {
  component: E,
  subject: () => `Reminder: your booking starts tomorrow`,
  displayName: 'Booking reminder (24h)',
  previewData: { shopperName: 'Jordan', listingTitle: 'Demo Kitchen', startDate: 'tomorrow at 9am', address: '123 Main St', bookingId: 'demo', accessInstructions: 'Use the side gate' },
} satisfies TemplateEntry
