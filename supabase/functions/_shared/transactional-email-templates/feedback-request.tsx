import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { s, SITE_URL } from './_styles.ts'

interface Props {
  recipientName?: string
  contextLabel?: string // e.g. "your booking at Demo Kitchen" or "your purchase of Food Truck X"
  contextType?: string // 'booking' | 'sale' | 'message_thread' | 'general'
  feedbackToken?: string
  aiIntro?: string // optional AI-generated opening line
}

const E = ({ recipientName, contextLabel, feedbackToken, aiIntro }: Props) => {
  const url = `${SITE_URL}/feedback?token=${feedbackToken || ''}`
  return (
    <Html lang="en" dir="ltr"><Head /><Preview>How did we do? 30 seconds, big impact.</Preview>
      <Body style={s.main}><Container style={s.container}>
        <Section style={s.brandBar}><Text style={s.brandMark}>VENDIBOOK</Text></Section>
        <Section style={s.card}>
          <Text style={s.smallHeader}>WE'D LOVE YOUR FEEDBACK</Text>
          <Heading style={s.h1}>{recipientName ? `${recipientName}, how did it go?` : 'How did it go?'}</Heading>
          <Text style={s.lede}>
            {aiIntro || `Quick gut check on ${contextLabel || 'your recent experience'} — your honest take helps us improve every corner of Vendibook.`}
          </Text>
          <Section style={s.ctaWrap}>
            <Button href={url} style={s.button}>Share feedback (30 sec)</Button>
          </Section>
          <Text style={s.small}>Rate, drop a note, done. We read every response.</Text>
          <Text style={s.footnote}>Replies to this email aren't monitored — please use the link above.</Text>
        </Section>
      </Container></Body></Html>
  )
}

export const template = {
  component: E,
  subject: (d: any) => d?.recipientName ? `${d.recipientName}, quick feedback?` : 'How did we do?',
  displayName: 'Feedback request',
  previewData: { recipientName: 'Jordan', contextLabel: 'your booking at Demo Kitchen', contextType: 'booking', feedbackToken: 'demo-token' },
} satisfies TemplateEntry
