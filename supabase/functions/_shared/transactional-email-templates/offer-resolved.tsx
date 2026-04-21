import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { s, SITE_URL } from './_styles.ts'

interface Props { recipientName?: string; listingTitle?: string; finalAmount?: number; accepted?: boolean; offerId?: string }

const E = ({ recipientName, listingTitle, finalAmount, accepted, offerId }: Props) => (
  <Html lang="en" dir="ltr"><Head /><Preview>Offer {accepted ? 'accepted' : 'declined'}</Preview>
    <Body style={s.main}><Container style={s.container}>
      <Section style={s.brandBar}><Text style={s.brandMark}>VENDIBOOK</Text></Section>
      <Section style={s.card}>
        <Text style={s.smallHeader}>OFFER {accepted ? 'ACCEPTED' : 'DECLINED'}</Text>
        <Heading style={s.h1}>{recipientName ? `${recipientName}, ` : ''}{accepted ? 'your offer was accepted.' : 'your offer was declined.'}</Heading>
        <Text style={s.lede}>{accepted ? `Time to close on ${listingTitle ? `“${listingTitle}”` : 'the listing'}. Complete checkout to lock it in.` : `${listingTitle ? `“${listingTitle}”` : 'The listing'} didn't move forward — try a higher offer or browse similar.`}</Text>
        {accepted && finalAmount ? <Section style={s.accentRow}><Text style={s.accentLabel}>FINAL PRICE</Text><Text style={s.accentValue}>${finalAmount.toLocaleString()}</Text></Section> : null}
        <Section style={s.ctaWrap}><Button href={`${SITE_URL}/dashboard?offer=${offerId || ''}`} style={s.button}>{accepted ? 'Complete checkout' : 'Browse similar'}</Button></Section>
      </Section>
    </Container></Body></Html>
)

export const template = {
  component: E,
  subject: (d: any) => d?.accepted ? `Accepted${d?.finalAmount ? ` at $${Number(d.finalAmount).toLocaleString()}` : ''}` : 'Offer declined',
  displayName: 'Offer accepted/declined',
  previewData: { recipientName: 'Pat', listingTitle: 'Demo Truck', finalAmount: 40000, accepted: true, offerId: 'demo' },
} satisfies TemplateEntry
