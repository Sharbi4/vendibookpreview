import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Hr, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { s } from './_styles.ts'
import { BrandFooter } from './_blocks.tsx'

interface Theme { title: string; summary: string; suggested_fix?: string; severity?: 'high' | 'medium' | 'low'; count?: number }
interface Props {
  weekLabel?: string
  totalSubmissions?: number
  avgNps?: number | null
  promoters?: number
  detractors?: number
  themes?: Theme[]
  highlightQuotes?: string[]
  rawSummary?: string
}

const sevColor = (sev?: string) => sev === 'high' ? '#ef4444' : sev === 'medium' ? '#f59e0b' : '#10b981'

const E = ({ weekLabel, totalSubmissions = 0, avgNps, promoters = 0, detractors = 0, themes = [], highlightQuotes = [], rawSummary }: Props) => (
  <Html lang="en" dir="ltr"><Head /><Preview>Weekly feedback digest — {totalSubmissions} responses, avg NPS {avgNps ?? '—'}</Preview>
    <Body style={s.main}><Container style={s.container}>
      <BrandHeader hero="insight" />
      <Section style={s.card}>
        <Text style={s.kicker}>WEEKLY FEEDBACK DIGEST</Text>
        <Heading style={s.h1}>{weekLabel || 'This week in feedback'}</Heading>
        <Text style={s.lede}>AI-summarized themes from the last 7 days of submissions and email NPS clicks.</Text>

        <Section style={s.detailGrid}>
          <Text style={s.detailLabel}>RESPONSES</Text>
          <Text style={s.detailValueOrange}>{totalSubmissions}</Text>
          <Hr style={s.hrThin} />
          <Text style={s.detailLabel}>AVG NPS</Text>
          <Text style={s.detailValue}>{avgNps ?? '—'} ({promoters} promoters · {detractors} detractors)</Text>
        </Section>

        {themes.length > 0 && (
          <>
            <Text style={s.smallHeader}>TOP THEMES</Text>
            {themes.map((t, i) => (
              <Section key={i} style={{ ...s.accentRow, borderLeft: `3px solid ${sevColor(t.severity)}` }}>
                <Text style={{ ...s.accentLabel, color: sevColor(t.severity) }}>
                  {(t.severity || 'low').toUpperCase()}{t.count ? ` · ${t.count} mentions` : ''}
                </Text>
                <Text style={{ ...s.accentValuePlain, margin: '2px 0 6px' }}>{t.title}</Text>
                <Text style={{ ...s.text, margin: '0 0 6px' }}>{t.summary}</Text>
                {t.suggested_fix && <Text style={{ ...s.small, color: '#10b981', margin: 0 }}>→ {t.suggested_fix}</Text>}
              </Section>
            ))}
          </>
        )}

        {highlightQuotes.length > 0 && (
          <>
            <Hr style={s.hr} />
            <Text style={s.smallHeader}>VERBATIM HIGHLIGHTS</Text>
            {highlightQuotes.slice(0, 6).map((q, i) => (
              <Text key={i} style={{ ...s.text, fontStyle: 'italic', borderLeft: '2px solid #2a2a2a', paddingLeft: 12 }}>"{q}"</Text>
            ))}
          </>
        )}

        {rawSummary && (
          <>
            <Hr style={s.hr} />
            <Text style={s.smallHeader}>AI NOTES</Text>
            <Text style={s.text}>{rawSummary}</Text>
          </>
        )}
      </Section>
    <BrandFooter /></Container></Body></Html>
)

export const template = {
  component: E,
  subject: (d: any) => `Feedback digest — ${d?.totalSubmissions ?? 0} responses, NPS ${d?.avgNps ?? '—'}`,
  displayName: 'Feedback weekly digest',
  previewData: {
    weekLabel: 'Week of Nov 24', totalSubmissions: 14, avgNps: 8.1, promoters: 9, detractors: 2,
    themes: [
      { title: 'Publishing flow too long', summary: 'Multiple hosts mentioned the wizard has too many steps before they see a price preview.', suggested_fix: 'Show estimated earnings on step 2 instead of step 5.', severity: 'high', count: 4 },
      { title: 'Photo upload friction on iOS', summary: 'HEIC files occasionally fail silently.', suggested_fix: 'Add explicit HEIC→JPG client toast.', severity: 'medium', count: 2 },
    ],
    highlightQuotes: ['Love the concept, just needs faster publish', 'Booking widget is gorgeous'],
  },
} satisfies TemplateEntry
