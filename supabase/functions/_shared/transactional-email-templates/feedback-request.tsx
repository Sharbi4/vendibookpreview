import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Hr, Link, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { s, SITE_URL } from './_styles.ts'

import { BrandFooter, BrandHeader } from './_blocks.tsx'
interface Props {
  recipientName?: string
  contextLabel?: string
  contextType?: string // 'booking' | 'sale' | 'message_thread' | 'listing_publish' | 'broadcast' | 'general'
  feedbackToken?: string
  aiIntro?: string
}

// Public NPS click endpoint — records the score, then redirects to /feedback for an optional comment.
const NPS_ENDPOINT = 'https://nbrehbwfsmedbelzntqs.supabase.co/functions/v1/feedback-nps-click'

const npsCellBase = {
  display: 'inline-block',
  width: '34px',
  height: '34px',
  lineHeight: '34px',
  textAlign: 'center' as const,
  fontSize: '13px',
  fontWeight: 600,
  color: '#fafafa',
  backgroundColor: '#141414',
  border: '1px solid #232323',
  borderRadius: '8px',
  textDecoration: 'none',
  margin: '0 3px 6px 0',
}

const E = ({ recipientName, contextLabel, contextType, feedbackToken, aiIntro }: Props) => {
  const url = `${SITE_URL}/feedback?token=${feedbackToken || ''}`
  const isPublish = contextType === 'listing_publish'
  const isBroadcast = contextType === 'broadcast'

  return (
    <Html lang="en" dir="ltr"><Head /><Preview>One tap, 0–10. How likely are you to recommend Vendibook?</Preview>
      <Body style={s.main}><Container style={s.container}>
        <BrandHeader hero="message" />
        <Section style={s.card}>
          <Text style={s.smallHeader}>
            {isBroadcast ? 'A QUICK ASK FROM THE FOUNDERS' : isPublish ? 'A QUICK NOTE FROM THE FOUNDERS' : "WE'D LOVE YOUR FEEDBACK"}
          </Text>
          <Heading style={s.h1}>
            {recipientName ? `${recipientName}, one tap — how are we doing?` : 'One tap — how are we doing?'}
          </Heading>

          {isBroadcast && (
            <Text style={s.lede}>
              Vendibook is built by working food-truck and small-business owners. We're a tiny startup and your
              honest read shapes what we ship next. <strong>One tap below</strong> is enough — a comment is a bonus.
            </Text>
          )}
          {isPublish && !isBroadcast && (
            <Text style={s.lede}>
              You just published a listing — thank you. 30 seconds of honest feedback on
              {' '}{contextLabel || 'publishing your listing'} would mean the world.
            </Text>
          )}
          {!isPublish && !isBroadcast && (
            <Text style={s.lede}>
              {aiIntro || `Quick gut check on ${contextLabel || 'your recent experience'}.`}
            </Text>
          )}

          <Text style={{ ...s.smallHeader, margin: '8px 0 10px' }}>HOW LIKELY ARE YOU TO RECOMMEND US? (0–10)</Text>
          <Section style={{ margin: '0 0 8px' }}>
            {Array.from({ length: 11 }, (_, i) => i).map((n) => {
              const tone =
                n >= 9 ? { backgroundColor: '#0f2e22', borderColor: '#1f5a44', color: '#10b981' } :
                n >= 7 ? { backgroundColor: '#1a1407', borderColor: '#3a2a10', color: '#f59e0b' } :
                { backgroundColor: '#1f0c0c', borderColor: '#4a1818', color: '#ef4444' }
              return (
                <Link key={n} href={`${NPS_ENDPOINT}?token=${feedbackToken || ''}&score=${n}`} style={{ ...npsCellBase, ...tone }}>
                  {n}
                </Link>
              )
            })}
          </Section>
          <Text style={{ ...s.small, margin: '0 0 24px' }}>
            <span>0 = Not at all likely &nbsp;·&nbsp; 10 = Extremely likely</span>
          </Text>

          <Section style={s.ctaWrap}>
            <Button href={url} style={s.button}>Add a comment (optional)</Button>
          </Section>
          <Text style={s.small}>Tap a number above to send instantly — the button is only if you want to say more.</Text>

          <Hr style={{ borderColor: '#1f1f1f', margin: '24px 0 12px' }} />
          <Text style={s.footnote}>
            — The Vendibook founders. Replies aren't monitored — please use the buttons above.
          </Text>
        </Section>
      <BrandFooter /></Container></Body></Html>
  )
}

export const template = {
  component: E,
  subject: (d: any) => {
    if (d?.contextType === 'broadcast') {
      return d?.recipientName ? `${d.recipientName}, one tap — how are we doing?` : 'One tap — how are we doing?'
    }
    if (d?.contextType === 'listing_publish') {
      return d?.recipientName ? `${d.recipientName}, a note from the Vendibook founders` : 'A quick note from the Vendibook founders'
    }
    return d?.recipientName ? `${d.recipientName}, quick feedback?` : 'How did we do?'
  },
  displayName: 'Feedback request',
  previewData: { recipientName: 'Jordan', contextType: 'broadcast', feedbackToken: 'demo-token' },
} satisfies TemplateEntry
