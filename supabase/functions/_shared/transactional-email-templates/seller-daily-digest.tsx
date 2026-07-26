import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text, Hr } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { s, SITE_URL } from './_styles.ts'

import { BrandHeader } from './_blocks.tsx'
interface OfferRow { id: string; listingTitle?: string; offerAmount?: number; status?: string }
interface Props {
  sellerName?: string
  dateLabel?: string
  openOffers?: OfferRow[]
  salesYesterday?: number
  revenueYesterday?: number
  aiInsight?: string
  tip?: string
}

const E = ({ sellerName, dateLabel, openOffers, salesYesterday, revenueYesterday, aiInsight, tip }: Props) => (
  <Html lang="en" dir="ltr"><Head /><Preview>Open offers and market pulse</Preview>
    <Body style={s.main}><Container style={s.container}>
      <BrandHeader hero="insight" />
      <Section style={s.card}>
        <Text style={s.smallHeader}>{dateLabel || 'TODAY'}</Text>
        <Heading style={s.h1}>{sellerName ? `${sellerName}, ` : ''}your sales pulse.</Heading>
        {aiInsight ? <Text style={s.lede}>{aiInsight}</Text> : <Text style={s.lede}>Open offers, recent sales, and one move to make today.</Text>}

        <Section style={s.accentRow}><Text style={s.accentLabel}>SALES YESTERDAY</Text><Text style={s.accentValuePlain}>{salesYesterday ?? 0}</Text></Section>
        <Section style={s.accentRow}><Text style={s.accentLabel}>REVENUE YESTERDAY</Text><Text style={s.accentValue}>${(revenueYesterday ?? 0).toLocaleString()}</Text></Section>

        {(openOffers || []).length > 0 ? (<>
          <Hr style={s.hr} />
          <Text style={s.smallHeader}>OPEN OFFERS — RESPOND TODAY</Text>
          {(openOffers || []).map((o) => (
            <Section key={o.id} style={s.accentRow}>
              <Text style={s.accentLabel}>OFFER · {(o.status || 'pending').toUpperCase()}</Text>
              <Text style={{ ...s.accentValuePlain, marginBottom: 4 }}>{o.listingTitle || 'Listing'}</Text>
              <Text style={{ ...s.small, margin: 0 }}>${(o.offerAmount ?? 0).toLocaleString()}</Text>
            </Section>
          ))}
        </>) : null}

        {tip ? (<>
          <Hr style={s.hr} />
          <Text style={s.smallHeader}>MARKET TIP</Text>
          <Text style={s.text}>{tip}</Text>
        </>) : null}

        <Section style={s.ctaWrap}><Button href={`${SITE_URL}/dashboard`} style={s.button}>Open dashboard</Button></Section>
      </Section>
    </Container></Body></Html>
)

export const template = {
  component: E,
  subject: (d: any) => (typeof d?.aiSubject === "string" && d.aiSubject.trim() ? d.aiSubject : null) || `${(d?.openOffers?.length ?? 0)} open offers · $${(d?.revenueYesterday ?? 0).toLocaleString()} yesterday`,
  displayName: 'Seller daily digest',
  previewData: { sellerName: 'Jordan', dateLabel: 'TODAY', salesYesterday: 2, revenueYesterday: 540, aiInsight: '2 offers expire in under 24h. Counter or accept now to keep momentum.', tip: 'Counter at 92% of list — converts ~3x more than holding firm.', openOffers: [{ id: 'a', listingTitle: 'Pro Camera Kit', offerAmount: 720, status: 'pending' }] },
} satisfies TemplateEntry
