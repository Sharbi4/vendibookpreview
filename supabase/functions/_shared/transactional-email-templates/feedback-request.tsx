import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Hr, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { s, SITE_URL } from './_styles.ts'

interface Props {
  recipientName?: string
  contextLabel?: string
  contextType?: string // 'booking' | 'sale' | 'message_thread' | 'listing_publish' | 'general'
  feedbackToken?: string
  aiIntro?: string
}

const E = ({ recipientName, contextLabel, contextType, feedbackToken, aiIntro }: Props) => {
  const url = `${SITE_URL}/feedback?token=${feedbackToken || ''}`
  const isPublish = contextType === 'listing_publish'
  return (
    <Html lang="en" dir="ltr"><Head /><Preview>From one small business owner to another — how did we do?</Preview>
      <Body style={s.main}><Container style={s.container}>
        <Section style={s.brandBar}><Text style={s.brandMark}>VENDIBOOK</Text></Section>
        <Section style={s.card}>
          <Text style={s.smallHeader}>{isPublish ? 'A QUICK NOTE FROM THE FOUNDERS' : "WE'D LOVE YOUR FEEDBACK"}</Text>
          <Heading style={s.h1}>
            {recipientName ? `${recipientName}, how did it go?` : 'How did it go?'}
          </Heading>

          {isPublish && (
            <>
              <Text style={s.lede}>
                Quick context: Vendibook is a tech startup built by working food-truck and small-business owners.
                We kept losing deals to clunky booking tools, hidden fees, and dead-end DMs — so we built the
                marketplace we wished existed. Every host that publishes (you!) makes this thing real.
              </Text>
              <Text style={s.lede}>
                30 seconds of honest feedback on {contextLabel || 'publishing your listing'} would mean the world.
                We also want to know a bit about <strong>you</strong> — are you a food-truck owner, kitchen operator,
                event host, or running another kind of business? Can we share your story with the community?
              </Text>
            </>
          )}

          {!isPublish && (
            <Text style={s.lede}>
              {aiIntro || `Quick gut check on ${contextLabel || 'your recent experience'} — your honest take helps us improve every corner of Vendibook.`}
            </Text>
          )}

          <Section style={s.ctaWrap}>
            <Button href={url} style={s.button}>
              {isPublish ? 'Share feedback & tell us about you' : 'Share feedback (30 sec)'}
            </Button>
          </Section>
          <Text style={s.small}>Rate, tell us about your business, done. We read every response personally.</Text>
          <Hr style={{ borderColor: '#e5e5e5', margin: '24px 0 12px' }} />
          <Text style={s.footnote}>
            — The Vendibook founders. Replies to this email aren't monitored — please use the link above.
          </Text>
        </Section>
      </Container></Body></Html>
  )
}

export const template = {
  component: E,
  subject: (d: any) => {
    if (d?.contextType === 'listing_publish') {
      return d?.recipientName
        ? `${d.recipientName}, a note from the Vendibook founders`
        : 'A quick note from the Vendibook founders'
    }
    return d?.recipientName ? `${d.recipientName}, quick feedback?` : 'How did we do?'
  },
  displayName: 'Feedback request',
  previewData: { recipientName: 'Jordan', contextLabel: 'publishing "Demo Kitchen"', contextType: 'listing_publish', feedbackToken: 'demo-token' },
} satisfies TemplateEntry
