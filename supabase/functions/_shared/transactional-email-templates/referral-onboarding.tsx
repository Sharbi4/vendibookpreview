import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text, Hr } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { s, SITE_URL, SITE_NAME, SUPPORT_PHONE } from './_styles.ts'

import { BrandFooter, BrandHeader } from './_blocks.tsx'
interface Props {
  name?: string
}

const PROGRAMS = [
  { label: 'Refer a seller', detail: 'Their listing goes live and earns its first transaction.', reward: '$150' },
  { label: 'Refer a buyer', detail: 'They complete their first purchase on Vendibook.', reward: '$500' },
  { label: 'Refer a renter', detail: 'They complete their first booking.', reward: '$50' },
]

const E = ({ name }: Props) => (
  <Html lang="en" dir="ltr"><Head /><Preview>No listings needed.</Preview>
    <Body style={s.main}><Container style={s.container}>
      <BrandHeader hero="celebrate" />
      <Section style={s.card}>
        <Text style={s.kicker}>REFER &amp; EARN</Text>
        <Heading style={s.h1}>{name ? `${name}, ` : ''}a quick way to earn on {SITE_NAME}.</Heading>
        <Text style={s.lede}>
          You've been on Vendibook for a few days now. Wanted to make sure you knew about one thing — our referral program. No listings of your own required.
        </Text>

        {PROGRAMS.map((p) => (
          <Section key={p.label} style={s.accentRow}>
            <Text style={s.accentLabel}>{p.label.toUpperCase()}</Text>
            <Text style={s.accentValuePlain}>{p.detail}</Text>
            <Text style={{ ...s.accentValue, marginTop: '6px' }}>{p.reward}</Text>
          </Section>
        ))}

        <Section style={s.ctaWrap}>
          <Button href={`${SITE_URL}/referral/dashboard?source=email_onboarding`} style={s.button}>Get my referral link</Button>
        </Section>

        <Hr style={s.hr} />
        <Text style={s.small}>You'll only hear about this once. We won't keep reminding you.</Text>
      </Section>
      <Text style={s.footnote}>Questions? Reply to this email or call {SUPPORT_PHONE}.</Text>
    <BrandFooter /></Container></Body></Html>
)

export const template = {
  component: E,
  subject: 'A quick way to earn on Vendibook',
  displayName: 'Referral onboarding (day 5)',
  previewData: { name: 'Sam' },
} satisfies TemplateEntry
