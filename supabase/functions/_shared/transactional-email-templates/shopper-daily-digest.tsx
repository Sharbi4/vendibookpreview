import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text, Hr, Img } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { s, SITE_URL } from './_styles.ts'

import { BrandHeader } from './_blocks.tsx'
interface Listing { id: string; title: string; city?: string; state?: string; price?: number; priceLabel?: string; coverImageUrl?: string }
interface Props {
  shopperName?: string
  area?: string
  listings?: Listing[]
  aiInsight?: string
  tip?: string
}

const E = ({ shopperName, area, listings, aiInsight, tip }: Props) => (
  <Html lang="en" dir="ltr"><Head /><Preview>New listings near you on Vendibook</Preview>
    <Body style={s.main}><Container style={s.container}>
      <BrandHeader hero="insight" />
      <Section style={s.card}>
        <Text style={s.smallHeader}>NEW TODAY{area ? ` · ${area.toUpperCase()}` : ''}</Text>
        <Heading style={s.h1}>{shopperName ? `${shopperName}, ` : ''}fresh finds for you.</Heading>
        {aiInsight ? <Text style={s.lede}>{aiInsight}</Text> : <Text style={s.lede}>Hand-picked listings that just hit the marketplace near you.</Text>}

        {(listings || []).map((l) => (
          <Section key={l.id} style={s.accentRow}>
            {l.coverImageUrl ? <Img src={l.coverImageUrl} alt={l.title} width="100%" style={{ borderRadius: 8, marginBottom: 10, maxHeight: 180, objectFit: 'cover' }} /> : null}
            <Text style={s.accentLabel}>{[l.city, l.state].filter(Boolean).join(', ').toUpperCase() || 'NEW LISTING'}</Text>
            <Text style={{ ...s.accentValuePlain, marginBottom: 4 }}>{l.title}</Text>
            {l.priceLabel ? <Text style={{ ...s.small, margin: 0 }}>{l.priceLabel}</Text> : null}
            <Section style={{ marginTop: 10 }}><Button href={`${SITE_URL}/listing/${l.id}`} style={s.buttonGhost}>View</Button></Section>
          </Section>
        ))}

        {tip ? (<>
          <Hr style={s.hr} />
          <Text style={s.smallHeader}>BOOKING TIP</Text>
          <Text style={s.text}>{tip}</Text>
        </>) : null}

        <Section style={s.ctaWrap}><Button href={`${SITE_URL}/search`} style={s.button}>Browse marketplace</Button></Section>
      </Section>
    </Container></Body></Html>
)

export const template = {
  component: E,
  subject: (d: any) => (typeof d?.aiSubject === "string" && d.aiSubject.trim() ? d.aiSubject : null) || `${(d?.listings?.length ?? 0)} new listings${d?.area ? ` near ${d.area}` : ''}`,
  displayName: 'Shopper daily digest',
  previewData: { shopperName: 'Alex', area: 'Brooklyn, NY', aiInsight: '3 new food trucks just listed within 5 miles of your saved area.', tip: 'Send a quick message to hosts — fast replies book first.', listings: [{ id: 'a', title: 'Vintage Airstream Food Truck', city: 'Brooklyn', state: 'NY', priceLabel: '$240/day' }, { id: 'b', title: 'Williamsburg Pop-up Kitchen', city: 'Brooklyn', state: 'NY', priceLabel: '$180/day' }] },
} satisfies TemplateEntry
