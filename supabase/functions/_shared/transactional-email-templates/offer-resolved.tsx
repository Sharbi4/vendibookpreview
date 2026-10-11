import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { s, SITE_URL } from './_styles.ts'

import { BrandFooter, BrandHeader } from './_blocks.tsx'
interface Props { recipientName?: string; listingTitle?: string; finalAmount?: number; accepted?: boolean; offerId?: string; coverImageUrl?: string }

const E = ({ recipientName, listingTitle, finalAmount, accepted, offerId, coverImageUrl }: Props) => (
  <Html lang="en" dir="ltr"><Head /><Preview>Offer {accepted ? 'accepted' : 'declined'}</Preview>
    <Body style={s.main}><Container style={s.container}>
      <BrandHeader hero="message" listingImageUrl={coverImageUrl} listingTitle={listingTitle} />
      <Section style={s.card}>
        <Text style={s.smallHeader}>OFFER {accepted ? 'ACCEPTED' : 'DECLINED'}</Text>
        <Heading style={s.h1}>{recipientName ? `${recipientName}, ` : ''}{accepted ? 'your offer was accepted.' : 'your offer was declined.'}</Heading>
        <Text style={s.lede}>{accepted ? `Time to close on ${listingTitle ? `“${listingTitle}”` : 'the listing'}. Complete checkout to lock it in.` : `${listingTitle ? `“${listingTitle}”` : 'The listing'} didn't move forward — try a higher offer or browse similar.`}</Text>
        {accepted && finalAmount ? <Section style={s.accentRow}><Text style={s.accentLabel}>FINAL PRICE</Text><Text style={s.accentValue}>${finalAmount.toLocaleString()}</Text></Section> : null}
        <Section style={s.ctaWrap}><Button href={`${SITE_URL}/dashboard?offer=${offerId || ''}`} style={s.button}>{accepted ? 'Complete checkout' : 'Browse similar'}</Button></Section>
      </Section>
    <BrandFooter /></Container></Body></Html>
)

export const template = {
  component: E,
  subject: (d: any) => d?.accepted ? `Accepted${d?.finalAmount ? ` at $${Number(d.finalAmount).toLocaleString()}` : ''}` : 'Offer declined',
  displayName: 'Offer accepted/declined',
  previewData: { recipientName: 'Pat', listingTitle: 'Demo Truck', coverImageUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&q=80', finalAmount: 40000, accepted: true, offerId: 'demo' },
} satisfies TemplateEntry
