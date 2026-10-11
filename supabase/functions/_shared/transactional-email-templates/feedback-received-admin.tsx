import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { s } from './_styles.ts'
import { BrandFooter, BrandHeader } from './_blocks.tsx'

interface Props {
  fromEmail?: string
  fromName?: string
  rating?: number
  nps?: number | null
  message?: string
  contextType?: string
  contextLabel?: string
  businessType?: string
  canShare?: boolean
}

const E = ({ fromEmail, fromName, rating, nps, message, contextType, contextLabel, businessType, canShare }: Props) => (
  <Html lang="en" dir="ltr"><Head /><Preview>New feedback submitted on Vendibook</Preview>
    <Body style={s.main}><Container style={s.container}>
      <BrandHeader hero="message" />
      <Section style={s.card}>
        <Text style={s.smallHeader}>NEW FEEDBACK</Text>
        <Heading style={s.h1}>{rating ? `${rating}★` : 'Feedback'} {nps != null ? `· NPS ${nps}` : ''}</Heading>
        <Text style={s.lede}><strong>From:</strong> {fromName || '—'} ({fromEmail || '—'})</Text>
        <Text style={s.lede}><strong>Context:</strong> {contextType || 'general'} · {contextLabel || '—'}</Text>
        <Text style={s.lede}><strong>Business type:</strong> {businessType || 'Not provided'}</Text>
        <Text style={s.lede}><strong>OK to share:</strong> {canShare ? 'Yes' : 'No'}</Text>
        <Text style={s.lede}><strong>Message:</strong></Text>
        <Text style={s.small}>{message || '(no written feedback)'}</Text>
      </Section>
    <BrandFooter /></Container></Body></Html>
)

export const template = {
  component: E,
  subject: (d: any) => `New Vendibook feedback${d?.rating ? ` · ${d.rating}★` : ''}${d?.fromEmail ? ` · ${d.fromEmail}` : ''}`,
  displayName: 'Admin: feedback received',
  previewData: { fromEmail: 'jane@truck.co', fromName: 'Jane', rating: 5, nps: 9, message: 'Great!', contextType: 'listing_publish', contextLabel: 'Demo Kitchen', businessType: 'Food truck owner', canShare: true },
} satisfies TemplateEntry
