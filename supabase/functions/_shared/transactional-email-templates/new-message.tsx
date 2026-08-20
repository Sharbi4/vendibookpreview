import * as React from 'npm:react@18.3.1'
import { Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import {
  CtaButton,
  Eyebrow,
  H1,
  Lede,
  SITE_URL,
  SupportRow,
  VendibookEmailLayout,
  color,
  t,
} from '../email-brand/components.tsx'

interface Props {
  recipientName?: string
  senderName?: string
  messagePreview?: string
  conversationId?: string
  unreadCount?: number
  linkPath?: string
}

const E = ({ recipientName, senderName, messagePreview, conversationId, unreadCount, linkPath }: Props) => {
  const path = linkPath && linkPath.startsWith('/') ? linkPath : `/messages/${conversationId || ''}`
  const sender = senderName || 'A Vendibook member'
  return (
    <VendibookEmailLayout preview={`${sender} sent you a message on Vendibook`}>
      <Eyebrow>{unreadCount && unreadCount > 1 ? `${unreadCount} new messages` : 'New message'}</Eyebrow>
      <H1>{recipientName ? `${recipientName}, ${sender} messaged you` : `${sender} messaged you`}</H1>
      <Lede>Reply from your Vendibook inbox to keep the conversation in one place.</Lede>

      {messagePreview ? (
        <Section style={t.panel}>
          <Text style={t.sectionLabel}>Preview</Text>
          <Text style={{ ...t.text, margin: 0, color: color.textSecondary }}>“{messagePreview}”</Text>
        </Section>
      ) : null}

      <CtaButton href={`${SITE_URL}${path}`}>Read and reply</CtaButton>

      <Text style={t.small}>
        For your safety, keep messages and payments on Vendibook.
      </Text>

      <SupportRow />
    </VendibookEmailLayout>
  )
}

export const template = {
  component: E,
  subject: (d: any) => `New message from ${d?.senderName || 'a Vendibook user'}`,
  displayName: 'New message',
  previewData: {
    recipientName: 'Sam',
    senderName: 'Maria',
    messagePreview: 'Are weekends still open?',
    conversationId: 'demo',
    unreadCount: 1,
  },
} satisfies TemplateEntry
