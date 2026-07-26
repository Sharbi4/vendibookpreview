import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text, Hr } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { s, SITE_URL } from './_styles.ts'

import { BrandHeader } from './_blocks.tsx'
interface Props {
  hostName?: string
  dateLabel?: string
  views?: number
  inquiries?: number
  bookings?: number
  earnings?: number
  topListingTitle?: string
  topListingId?: string
  aiInsight?: string
  tip?: string
}

const E = ({ hostName, dateLabel, views, inquiries, bookings, earnings, topListingTitle, topListingId, aiInsight, tip }: Props) => (
  <Html lang="en" dir="ltr"><Head /><Preview>Your Vendibook day in numbers</Preview>
    <Body style={s.main}><Container style={s.container}>
      <BrandHeader hero="insight" />
      <Section style={s.card}>
        <Text style={s.smallHeader}>{dateLabel || 'YESTERDAY'}</Text>
        <Heading style={s.h1}>{hostName ? `${hostName}, ` : ''}your day in numbers.</Heading>
        {aiInsight ? <Text style={s.lede}>{aiInsight}</Text> : <Text style={s.lede}>A snapshot of how your listings performed yesterday.</Text>}

        <Section style={s.accentRow}><Text style={s.accentLabel}>VIEWS</Text><Text style={s.accentValuePlain}>{(views ?? 0).toLocaleString()}</Text></Section>
        <Section style={s.accentRow}><Text style={s.accentLabel}>INQUIRIES</Text><Text style={s.accentValuePlain}>{(inquiries ?? 0).toLocaleString()}</Text></Section>
        <Section style={s.accentRow}><Text style={s.accentLabel}>BOOKINGS</Text><Text style={s.accentValuePlain}>{(bookings ?? 0).toLocaleString()}</Text></Section>
        <Section style={s.accentRow}><Text style={s.accentLabel}>EARNINGS</Text><Text style={s.accentValue}>${(earnings ?? 0).toLocaleString()}</Text></Section>

        {topListingTitle ? (<>
          <Hr style={s.hr} />
          <Text style={s.smallHeader}>YESTERDAY'S TOP LISTING</Text>
          <Text style={s.text}>"{topListingTitle}" got the most attention.</Text>
          {topListingId ? <Section style={s.ctaWrap}><Button href={`${SITE_URL}/listing/${topListingId}`} style={s.buttonGhost}>View listing</Button></Section> : null}
        </>) : null}

        {tip ? (<>
          <Hr style={s.hr} />
          <Text style={s.smallHeader}>TIP OF THE DAY</Text>
          <Text style={s.text}>{tip}</Text>
        </>) : null}

        <Section style={s.ctaWrap}><Button href={`${SITE_URL}/dashboard`} style={s.button}>Open dashboard</Button></Section>
      </Section>
    </Container></Body></Html>
)

export const template = {
  component: E,
  subject: (d: any) => (typeof d?.aiSubject === "string" && d.aiSubject.trim() ? d.aiSubject : null) || `Your Vendibook day — ${d?.bookings ?? 0} bookings, $${(d?.earnings ?? 0).toLocaleString()}`,
  displayName: 'Host daily digest',
  previewData: { hostName: 'Sam', dateLabel: 'YESTERDAY', views: 84, inquiries: 4, bookings: 1, earnings: 320, topListingTitle: 'Downtown Food Truck', topListingId: 'demo', aiInsight: 'Strong inquiry day — 4 leads on one listing. Reply within an hour to convert.', tip: 'Reply to inquiries within an hour to triple your booking rate.' },
} satisfies TemplateEntry
