import * as React from 'npm:react@18.3.1'
import { Body, Container, Heading, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import { BrandHead, EmailButton } from '../email-brand/components.tsx'
import type { TemplateEntry } from './registry.ts'
import { s, SITE_URL } from './_styles.ts'

import { BrandFooter, BrandHeader } from './_blocks.tsx'
interface Props { recipientName?: string; listingTitle?: string; finalAmount?: number; accepted?: boolean; offerId?: string; coverImageUrl?: string; listingId?: string; recipientIsBuyer?: boolean }

const E = ({ recipientName, listingTitle, finalAmount, accepted, offerId, coverImageUrl, listingId, recipientIsBuyer }: Props) => (
  <Html lang="en" dir="ltr"><BrandHead /><Preview>Offer {accepted ? 'accepted' : 'declined'}</Preview>
    <Body style={s.main}><Container style={s.container}>
      <BrandHeader hero="message" listingImageUrl={coverImageUrl} listingTitle={listingTitle} />
      <Section style={s.card}>
        <Text style={s.smallHeader}>OFFER {accepted ? 'ACCEPTED' : 'DECLINED'}</Text>
        <Heading style={s.h1}>{recipientName ? `${recipientName}, ` : ''}{accepted ? 'your offer was accepted.' : 'your offer was declined.'}</Heading>
        <Text style={s.lede}>{accepted ? `The equipment price is agreed for ${listingTitle ? `“${listingTitle}”` : 'the listing'}. Nothing has been charged. The buyer provides purchase and fulfillment details, then the seller reviews the request before an itemized invoice is issued.` : `${listingTitle ? `“${listingTitle}”` : 'The listing'} didn't move forward — try a higher offer or browse similar.`}</Text>
        {accepted && finalAmount ? <Section style={s.accentRow}><Text style={s.accentLabel}>AGREED EQUIPMENT PRICE</Text><Text style={s.accentValue}>${finalAmount.toLocaleString()}</Text></Section> : null}
        <Section style={s.ctaWrap}><EmailButton href={accepted && recipientIsBuyer && listingId ? `${SITE_URL}/purchase-request/${encodeURIComponent(listingId)}?offer=${encodeURIComponent(offerId || '')}` : `${SITE_URL}/dashboard/offers?offer=${encodeURIComponent(offerId || '')}`} style={s.button}>{accepted && recipientIsBuyer ? 'Continue purchase request' : 'View offer'}</EmailButton></Section>
      </Section>
    <BrandFooter /></Container></Body></Html>
)

export const template = {
  component: E,
  subject: (d: any) => d?.accepted ? `Accepted${d?.finalAmount ? ` at $${Number(d.finalAmount).toLocaleString()}` : ''}` : 'Offer declined',
  displayName: 'Offer accepted/declined',
  previewData: { recipientName: 'Pat', listingTitle: 'Demo Truck', coverImageUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&q=80', finalAmount: 40000, accepted: true, offerId: 'demo' },
} satisfies TemplateEntry
