import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Html, Link, Preview, Section, Text, Heading } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { s, SITE_URL, SUPPORT_PHONE } from './_styles.ts'

import { BrandFooter, BrandHeader } from './_blocks.tsx'
interface Props {
  name?: string
  transactionType?: 'purchase' | 'rental' | 'listing'
}

const HEADLINES: Record<string, string> = {
  purchase: 'Thanks for your purchase.',
  rental: 'Thanks for your booking.',
  listing: 'Thanks for listing.',
}

const E = ({ name, transactionType = 'purchase' }: Props) => (
  <Html lang="en" dir="ltr"><Head /><Preview>One quick thing worth knowing.</Preview>
    <Body style={s.main}><Container style={s.container}>
      <BrandHeader hero="celebrate" />
      <Section style={s.card}>
        <Heading style={s.h1}>{name ? `${name}, ` : ''}{HEADLINES[transactionType]}</Heading>
        <Text style={s.text}>
          We hope everything's gone smoothly. We'll keep this short — your transaction details are in your dashboard whenever you need them.
        </Text>

        <Text style={{ ...s.text, color: '#a3a3a3', fontSize: '14px', marginTop: '24px' }}>
          By the way — if you know others who'd benefit from Vendibook, our referral program lets you earn up to $500 per referral. No pressure, just worth knowing.{' '}
          <Link href={`${SITE_URL}/referral?source=email_post_transaction`} style={{ color: '#a3a3a3', textDecoration: 'underline' }}>
            Learn more
          </Link>
        </Text>
      </Section>
      <Text style={s.footnote}>Questions? Reply to this email or call {SUPPORT_PHONE}.</Text>
    <BrandFooter /></Container></Body></Html>
)

export const template = {
  component: E,
  subject: 'A quick note on your Vendibook transaction',
  displayName: 'Referral PS (24h after first transaction)',
  previewData: { name: 'Sam', transactionType: 'purchase' },
} satisfies TemplateEntry
