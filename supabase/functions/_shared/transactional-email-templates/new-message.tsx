import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { s, SITE_URL } from './_styles.ts'

import { BrandFooter, BrandHeader } from './_blocks.tsx'
interface Props { recipientName?: string; senderName?: string; messagePreview?: string; conversationId?: string; unreadCount?: number; linkPath?: string }

const E = ({ recipientName, senderName, messagePreview, conversationId, unreadCount, linkPath }: Props) => (
  <Html lang="en" dir="ltr"><Head /><Preview>{senderName || 'Someone'} sent you a message</Preview>
    <Body style={s.main}><Container style={s.container}>
      <BrandHeader hero="message" />
      <Section style={s.card}>
        <Text style={s.smallHeader}>{unreadCount && unreadCount > 1 ? `${unreadCount} NEW MESSAGES` : 'NEW MESSAGE'}</Text>
        <Heading style={s.h1}>{recipientName ? `${recipientName}, ` : ''}{senderName || 'someone'} reached out.</Heading>
        {messagePreview ? <Section style={s.accentRow}><Text style={s.accentLabel}>PREVIEW</Text><Text style={s.accentValuePlain}>“{messagePreview}”</Text></Section> : null}
        <Section style={s.ctaWrap}><Button href={`${SITE_URL}${linkPath && linkPath.startsWith('/') ? linkPath : `/messages/${conversationId || ''}`}`} style={s.button}>Reply</Button></Section>
        <Text style={s.small}>Hosts who reply within an hour book 3× more.</Text>
      </Section>
    <BrandFooter /></Container></Body></Html>
)

export const template = {
  component: E,
  subject: (d: any) => `New message from ${d?.senderName || 'a Vendibook user'}`,
  displayName: 'New message',
  previewData: { recipientName: 'Sam', senderName: 'Maria', messagePreview: 'Are weekends still open?', conversationId: 'demo', unreadCount: 1 },
} satisfies TemplateEntry
