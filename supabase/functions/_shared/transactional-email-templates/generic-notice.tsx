// Generic, premium Satin Lux notice template — used by transactional functions
// that need to send a one-off message (booking events, document status, dispute
// updates, notification fan-out, password resets) without crafting a bespoke template.
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { BrandFooter, BrandHeader } from './_blocks.tsx'

const SITE_NAME = 'Vendibook'
const SITE_URL = 'https://vendibook.com'

type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info'

interface DetailRow {
  label: string
  value: string
  mono?: boolean
}

interface GenericNoticeProps {
  preview?: string
  kicker?: string
  heading?: string
  greeting?: string
  paragraphs?: string[]
  details?: DetailRow[]
  alert?: { tone?: Tone; title?: string; body: string }
  ctaLabel?: string
  ctaUrl?: string
  secondaryCtaLabel?: string
  secondaryCtaUrl?: string
  footnote?: string
}

const TONE_STYLES: Record<Tone, { bg: string; border: string; text: string; accent: string }> = {
  neutral: { bg: '#0f0f0f', border: '#1f1f1f', text: '#d4d4d4', accent: '#737373' },
  success: { bg: '#0b1a12', border: '#15351f', text: '#bbf7d0', accent: '#10b981' },
  warning: { bg: '#1c160a', border: '#3a2c10', text: '#fde68a', accent: '#f59e0b' },
  danger:  { bg: '#1a0d0c', border: '#3a1818', text: '#fecaca', accent: '#ef4444' },
  info:    { bg: '#0d1419', border: '#162834', text: '#bfdbfe', accent: '#3b82f6' },
}

const GenericNoticeEmail = ({
  preview, kicker, heading, greeting, paragraphs = [], details = [], alert,
  ctaLabel, ctaUrl, secondaryCtaLabel, secondaryCtaUrl, footnote,
}: GenericNoticeProps) => {
  const alertStyles = alert ? TONE_STYLES[alert.tone || 'info'] : null
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{preview || heading || `Update from ${SITE_NAME}`}</Preview>
      <Body style={main}>
        <Container style={container}>
          <BrandHeader hero="document" />

          <Section style={card}>
            {kicker && <Text style={kickerStyle}>{kicker.toUpperCase()}</Text>}
            {heading && <Heading style={h1}>{heading}</Heading>}
            {greeting && <Text style={lede}>{greeting}</Text>}

            {paragraphs.map((p, i) => (
              <Text key={i} style={paragraph}>{p}</Text>
            ))}

            {alert && alertStyles && (
              <Section style={{
                backgroundColor: alertStyles.bg,
                border: `1px solid ${alertStyles.border}`,
                borderLeft: `3px solid ${alertStyles.accent}`,
                borderRadius: '10px',
                padding: '16px 18px',
                margin: '20px 0',
              }}>
                {alert.title && (
                  <Text style={{
                    fontSize: '11px', letterSpacing: '0.2em', fontWeight: 700,
                    color: alertStyles.accent, margin: '0 0 6px',
                  }}>
                    {alert.title.toUpperCase()}
                  </Text>
                )}
                <Text style={{ fontSize: '14px', lineHeight: 1.55, color: alertStyles.text, margin: 0 }}>
                  {alert.body}
                </Text>
              </Section>
            )}

            {details.length > 0 && (
              <Section style={detailGrid}>
                {details.map((d, i) => (
                  <React.Fragment key={i}>
                    <Text style={detailLabel}>{d.label.toUpperCase()}</Text>
                    <Text style={d.mono ? detailMono : detailValue}>{d.value}</Text>
                    {i < details.length - 1 && <Hr style={hrThin} />}
                  </React.Fragment>
                ))}
              </Section>
            )}

            {(ctaLabel && ctaUrl) && (
              <Section style={ctaWrap}>
                <Button href={ctaUrl} style={button}>{ctaLabel}</Button>
              </Section>
            )}

            {(secondaryCtaLabel && secondaryCtaUrl) && (
              <Section style={{ margin: '12px 0 0' }}>
                <Button href={secondaryCtaUrl} style={secondaryButton}>{secondaryCtaLabel}</Button>
              </Section>
            )}
          </Section>

          <Text style={footnoteStyle}>
            {footnote || 'Questions? Call (725) 755-9598 or reply to this email.'}
          </Text>
          <Text style={brandFoot}>
            <a href={SITE_URL} style={brandFootLink}>{SITE_NAME}</a> · Marketplace for food trucks, trailers & vendor spaces
          </Text>
        <BrandFooter /></Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: GenericNoticeEmail,
  subject: (data: Record<string, any>) => data?.subject || data?.heading || `Update from ${SITE_NAME}`,
  displayName: 'Generic notice (Satin Lux)',
  previewData: {
    subject: 'Booking confirmed — VB-7C1E9A2F',
    kicker: 'Booking confirmed',
    heading: 'Payment received — your booking is locked in.',
    greeting: 'Hi Sam,',
    paragraphs: [
      'We just received payment for your booking. The host has been notified and your dates are now confirmed.',
    ],
    details: [
      { label: 'Booking', value: 'VB-7C1E9A2F', mono: true },
      { label: 'Listing', value: 'Sunset Food Truck — Downtown LA' },
      { label: 'Dates', value: 'Apr 21 → Apr 23, 2026' },
      { label: 'Total', value: '$842.00' },
    ],
    alert: { tone: 'success', title: 'No further action needed', body: 'A receipt has been emailed separately for your records.' },
    ctaLabel: 'View booking',
    ctaUrl: 'https://vendibook.com/dashboard',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Helvetica Neue', Arial, sans-serif", margin: 0, padding: '32px 0' }
const container = { maxWidth: '560px', margin: '0 auto', padding: '0 20px' }
const brandBar = { padding: '0 0 20px' }
const brandMark = { fontSize: '12px', letterSpacing: '0.32em', color: '#0a0a0a', fontWeight: 700, margin: 0 }
const card = { backgroundColor: '#0a0a0a', color: '#fafafa', borderRadius: '16px', padding: '40px 36px', border: '1px solid #1a1a1a' }
const kickerStyle = { fontSize: '10px', letterSpacing: '0.28em', color: '#FF5124', fontWeight: 700, margin: '0 0 14px' }
const h1 = { fontSize: '26px', lineHeight: 1.18, fontWeight: 600, color: '#ffffff', margin: '0 0 14px', letterSpacing: '-0.02em' }
const lede = { fontSize: '15px', lineHeight: 1.6, color: '#a3a3a3', margin: '0 0 16px' }
const paragraph = { fontSize: '15px', lineHeight: 1.65, color: '#d4d4d4', margin: '0 0 14px' }
const detailGrid = { backgroundColor: '#0f0f0f', border: '1px solid #1f1f1f', borderRadius: '12px', padding: '18px 22px', margin: '20px 0' }
const detailLabel = { fontSize: '10px', letterSpacing: '0.2em', color: '#737373', fontWeight: 600, margin: '0 0 4px' }
const detailValue = { fontSize: '14px', color: '#fafafa', margin: 0 }
const detailMono = { fontSize: '13px', color: '#d4d4d4', margin: 0, fontFamily: 'monospace', letterSpacing: '0.05em' }
const hrThin = { borderColor: '#1f1f1f', margin: '12px 0' }
const ctaWrap = { margin: '24px 0 0' }
const button = { backgroundColor: '#FF5124', color: '#0a0a0a', padding: '14px 28px', borderRadius: '10px', fontWeight: 600, fontSize: '15px', textDecoration: 'none', display: 'inline-block' }
const secondaryButton = { backgroundColor: 'transparent', color: '#fafafa', padding: '12px 24px', borderRadius: '10px', fontWeight: 500, fontSize: '14px', textDecoration: 'none', display: 'inline-block', border: '1px solid #2a2a2a' }
const footnoteStyle = { fontSize: '12px', color: '#737373', textAlign: 'center' as const, margin: '24px 0 6px' }
const brandFoot = { fontSize: '11px', color: '#525252', textAlign: 'center' as const, margin: 0 }
const brandFootLink = { color: '#737373', textDecoration: 'none', fontWeight: 600 }
