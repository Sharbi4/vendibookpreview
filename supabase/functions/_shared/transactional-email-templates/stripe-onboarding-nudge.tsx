import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { s, SITE_URL } from './_styles.ts'

import { BrandFooter, BrandHeader } from './_blocks.tsx'
interface Props { hostName?: string }

const E = ({ hostName }: Props) => (
  <Html lang="en" dir="ltr"><Head /><Preview>Connect Stripe to receive payouts</Preview>
    <Body style={s.main}><Container style={s.container}>
      <BrandHeader hero="booking" />
      <Section style={s.card}>
        <Text style={s.smallHeader}>ACTION REQUIRED</Text>
        <Heading style={s.h1}>{hostName ? `${hostName}, ` : ''}connect Stripe to get paid.</Heading>
        <Text style={s.lede}>You can't receive bookings until your Stripe account is connected. It takes ~3 minutes.</Text>
        <Section style={s.ctaWrap}><Button href={`${SITE_URL}/dashboard?stripe=onboard`} style={s.button}>Connect Stripe</Button></Section>
      </Section>
    <BrandFooter /></Container></Body></Html>
)

export const template = {
  component: E,
  subject: () => `Connect Stripe to start earning`,
  displayName: 'Stripe onboarding nudge',
  previewData: { hostName: 'Sam' },
} satisfies TemplateEntry
