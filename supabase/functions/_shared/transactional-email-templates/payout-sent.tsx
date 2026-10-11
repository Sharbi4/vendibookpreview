import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { s, SITE_URL } from './_styles.ts'

import { BrandFooter, BrandHeader } from './_blocks.tsx'
interface Props { recipientName?: string; amount?: number; transferId?: string; arrivesBy?: string }

const E = ({ recipientName, amount, transferId, arrivesBy }: Props) => (
  <Html lang="en" dir="ltr"><Head /><Preview>Payout sent to your bank</Preview>
    <Body style={s.main}><Container style={s.container}>
      <BrandHeader hero="payment" />
      <Section style={s.card}>
        <Text style={s.smallHeader}>PAYOUT SENT</Text>
        <Heading style={s.h1}>{recipientName ? `${recipientName}, ` : ''}your payout is on the way.</Heading>
        {amount ? <Section style={s.accentRow}><Text style={s.accentLabel}>AMOUNT</Text><Text style={s.accentValue}>${amount.toLocaleString()}</Text></Section> : null}
        {arrivesBy ? <Section style={s.accentRow}><Text style={s.accentLabel}>ARRIVES BY</Text><Text style={s.accentValuePlain}>{arrivesBy}</Text></Section> : null}
        {transferId ? <Text style={s.small}>Reference: {transferId}</Text> : null}
        <Section style={s.ctaWrap}><Button href={`${SITE_URL}/dashboard`} style={s.button}>View earnings</Button></Section>
      </Section>
    <BrandFooter /></Container></Body></Html>
)

export const template = {
  component: E,
  subject: (d: any) => d?.amount ? `Payout sent: $${Number(d.amount).toLocaleString()}` : 'Your payout is on the way',
  displayName: 'Payout sent',
  previewData: { recipientName: 'Sam', amount: 1240, transferId: 'tr_demo', arrivesBy: 'Apr 24' },
} satisfies TemplateEntry
