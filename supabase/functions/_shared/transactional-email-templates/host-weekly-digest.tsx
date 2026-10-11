import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text, Hr } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { s, SITE_URL } from './_styles.ts'

import { BrandFooter, BrandHeader } from './_blocks.tsx'
interface Props {
  hostName?: string
  weekLabel?: string
  views?: number
  inquiries?: number
  bookings?: number
  earnings?: number
  topListingTitle?: string
  topListingId?: string
  aiInsight?: string
  tip?: string
  referralProgram?: 'purchase' | 'supply' | 'rental' | null
}

const REFERRAL_COPY: Record<string, string> = {
  purchase: 'Know a buyer? You could earn $500 when they complete their first purchase.',
  supply: 'Know a seller? You could earn $150 when their first transaction clears.',
  rental: 'Know a renter? You could earn $50 when they complete their first booking.',
}

const E = ({ hostName, weekLabel, views, inquiries, bookings, earnings, topListingTitle, topListingId, aiInsight, tip, referralProgram }: Props) => (
  <Html lang="en" dir="ltr"><Head /><Preview>Your weekly Vendibook digest</Preview>
    <Body style={s.main}><Container style={s.container}>
      <BrandHeader hero="insight" />
      <Section style={s.card}>
        <Text style={s.smallHeader}>{weekLabel || 'THIS WEEK'}</Text>
        <Heading style={s.h1}>{hostName ? `${hostName}, ` : ''}here's your week.</Heading>
        {aiInsight ? <Text style={s.lede}>{aiInsight}</Text> : <Text style={s.lede}>A snapshot of your listings, earnings, and what to focus on next.</Text>}

        <Section style={s.accentRow}><Text style={s.accentLabel}>VIEWS</Text><Text style={s.accentValuePlain}>{(views ?? 0).toLocaleString()}</Text></Section>
        <Section style={s.accentRow}><Text style={s.accentLabel}>INQUIRIES</Text><Text style={s.accentValuePlain}>{(inquiries ?? 0).toLocaleString()}</Text></Section>
        <Section style={s.accentRow}><Text style={s.accentLabel}>BOOKINGS</Text><Text style={s.accentValuePlain}>{(bookings ?? 0).toLocaleString()}</Text></Section>
        <Section style={s.accentRow}><Text style={s.accentLabel}>EARNINGS</Text><Text style={s.accentValue}>${(earnings ?? 0).toLocaleString()}</Text></Section>

        {topListingTitle ? (
          <>
            <Hr style={s.hr} />
            <Text style={s.smallHeader}>TOP PERFORMER</Text>
            <Text style={s.text}>“{topListingTitle}” led your portfolio this week.</Text>
            {topListingId ? <Section style={s.ctaWrap}><Button href={`${SITE_URL}/listing/${topListingId}`} style={s.buttonGhost}>View listing</Button></Section> : null}
          </>
        ) : null}

        {tip ? (
          <>
            <Hr style={s.hr} />
            <Text style={s.smallHeader}>TIP OF THE WEEK</Text>
            <Text style={s.text}>{tip}</Text>
          </>
        ) : null}

        {referralProgram ? (
          <>
            <Hr style={s.hr} />
            <Text style={s.smallHeader}>REFER &amp; EARN</Text>
            <Text style={s.text}>{REFERRAL_COPY[referralProgram]}</Text>
            <Text style={s.text}>
              <a href={`${SITE_URL}/referral/dashboard?source=email_weekly`} style={{ color: '#FF5124', textDecoration: 'underline' }}>See your referral dashboard →</a>
            </Text>
          </>
        ) : null}

        <Section style={s.ctaWrap}><Button href={`${SITE_URL}/dashboard`} style={s.button}>Open dashboard</Button></Section>
      </Section>
    <BrandFooter /></Container></Body></Html>
)

export const template = {
  component: E,
  subject: (d: any) => (typeof d?.aiSubject === "string" && d.aiSubject.trim() ? d.aiSubject : null) || `Your Vendibook week — ${d?.bookings ?? 0} bookings, $${(d?.earnings ?? 0).toLocaleString()}`,
  displayName: 'Host weekly digest',
  previewData: { hostName: 'Sam', weekLabel: 'WEEK OF APR 14', views: 412, inquiries: 18, bookings: 3, earnings: 1240, topListingTitle: 'Downtown Food Truck', topListingId: 'demo', aiInsight: 'Strong week — inquiries up 22%. Two listings under-priced for weekends.', tip: 'Add 3 more photos to your top listing — listings with 8+ photos book 60% more.' },
} satisfies TemplateEntry
