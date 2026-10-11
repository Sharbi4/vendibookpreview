// Generic catch-all notice template on the Vendibook master email design system.
// Used by many transactional callers (booking events, document status, dispute
// updates, notification fan-out) — it must render safely with any subset of props
// and must NOT assert payment/marketplace claims the caller didn't provide.
import * as React from 'npm:react@18.3.1'
import { Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import {
  BRAND_NAME,
  Callout,
  CtaButton,
  DetailTable,
  Eyebrow,
  H1,
  Lede,
  SecondaryButton,
  SupportRow,
  VendibookEmailLayout,
  t,
} from '../email-brand/components.tsx'

type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info'

interface DetailRowIn {
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
  details?: DetailRowIn[]
  alert?: { tone?: Tone; title?: string; body: string }
  ctaLabel?: string
  ctaUrl?: string
  secondaryCtaLabel?: string
  secondaryCtaUrl?: string
  footnote?: string
}

// Caller tones map onto the canonical Callout tones. Unknown/absent tone → info.
const TONE_MAP: Record<Tone, 'info' | 'success' | 'warning' | 'error'> = {
  neutral: 'info',
  info: 'info',
  success: 'success',
  warning: 'warning',
  danger: 'error',
}

const GenericNoticeEmail = ({
  preview,
  kicker,
  heading,
  greeting,
  paragraphs = [],
  details = [],
  alert,
  ctaLabel,
  ctaUrl,
  secondaryCtaLabel,
  secondaryCtaUrl,
  footnote,
}: GenericNoticeProps) => (
  <VendibookEmailLayout preview={preview || heading || `Update from ${BRAND_NAME}`}>
    {kicker ? <Eyebrow>{kicker}</Eyebrow> : null}
    {heading ? <H1>{heading}</H1> : null}
    {greeting ? <Lede>{greeting}</Lede> : null}

    {paragraphs.map((p, i) => (
      <Text key={i} style={t.text}>{p}</Text>
    ))}

    {alert ? (
      <Callout tone={TONE_MAP[alert.tone || 'info'] || 'info'} title={alert.title}>
        {alert.body}
      </Callout>
    ) : null}

    {details.length ? (
      <DetailTable
        rows={details.map((d) => ({ label: d.label, value: d.value, mono: d.mono }))}
      />
    ) : null}

    {ctaLabel && ctaUrl ? <CtaButton href={ctaUrl}>{ctaLabel}</CtaButton> : null}
    {secondaryCtaLabel && secondaryCtaUrl ? (
      <SecondaryButton href={secondaryCtaUrl}>{secondaryCtaLabel}</SecondaryButton>
    ) : null}

    {footnote ? <Text style={t.small}>{footnote}</Text> : <SupportRow />}
  </VendibookEmailLayout>
)

export const template = {
  component: GenericNoticeEmail,
  subject: (data: Record<string, any>) => data?.subject || data?.heading || `Update from ${BRAND_NAME}`,
  displayName: 'Generic notice',
  previewData: {
    subject: 'Booking confirmed — VB-7C1E9A2F',
    kicker: 'Booking confirmed',
    heading: 'Your booking is confirmed',
    greeting: 'Hi Sam,',
    paragraphs: [
      'Your payment went through and the host has been notified. Your dates are confirmed.',
    ],
    details: [
      { label: 'Booking', value: 'VB-7C1E9A2F', mono: true },
      { label: 'Listing', value: 'Sunset Food Truck — Downtown LA' },
      { label: 'Dates', value: 'Apr 21 → Apr 23, 2026' },
      { label: 'Total', value: '$842.00' },
    ],
    alert: {
      tone: 'success',
      title: 'No further action needed',
      body: 'A receipt has been emailed separately for your records.',
    },
    ctaLabel: 'View booking',
    ctaUrl: 'https://vendibook.com/dashboard',
  },
} satisfies TemplateEntry
