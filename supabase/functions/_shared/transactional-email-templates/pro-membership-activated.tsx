import * as React from 'npm:react@18.3.1'
import { Link, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import {
  ActionRow,
  CtaButton,
  DetailTable,
  Divider,
  H1,
  H2,
  Lede,
  StatusChip,
  SupportRow,
  VendibookEmailLayout,
  SITE_URL,
  color,
  t,
} from '../email-brand/components.tsx'

interface Props {
  firstName?: string
  planName?: string
  /** Catalog price, already formatted (e.g. "$79.00"). */
  amount?: string
  /** Catalog cadence word (e.g. "month"). */
  interval?: string
  nextBillingDate?: string
  manageUrl?: string
}

const Benefit = ({ title, detail }: { title: string; detail: string }) => (
  <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} style={{ borderCollapse: 'collapse' as const, width: '100%' }}>
    <tbody>
      <tr>
        <td style={{ padding: '9px 0', borderTop: `1px solid ${color.border}` }}>
          <Text className="vb-ink" style={{ margin: 0, fontSize: '15px', lineHeight: 1.4, fontWeight: 700, color: color.text, fontFamily: t.text.fontFamily }}>
            {title}
          </Text>
          <Text className="vb-ink-2" style={{ margin: '2px 0 0', fontSize: '13px', lineHeight: 1.55, color: color.textSecondary, fontFamily: t.text.fontFamily }}>
            {detail}
          </Text>
        </td>
      </tr>
    </tbody>
  </table>
)

const Email = ({
  firstName,
  planName = 'Vendibook Pro',
  amount = '$79.00',
  interval = 'month',
  nextBillingDate,
  manageUrl = `${SITE_URL}/account/subscription`,
}: Props) => (
  <VendibookEmailLayout preview={`${planName} is active — here's what's unlocked`} logoWidth={132}>
    <StatusChip label="Pro active" tone="brand" />
    <H1>{firstName ? `${planName} is unlocked, ${firstName}.` : `${planName} is unlocked.`}</H1>
    <Lede>Every benefit below is switched on right now — nothing else to set up.</Lede>

    <DetailTable
      rows={[
        { label: 'Plan', value: planName },
        { label: 'Price', value: `${amount} / ${interval}`, emphasis: true },
        { label: 'Next billing date', value: nextBillingDate },
      ]}
    />

    <CtaButton href={`${SITE_URL}/dashboard`}>Open your dashboard</CtaButton>

    <Divider />

    <H2>Your Pro toolkit</H2>
    <Benefit
      title="10.9% seller & host fee"
      detail="Down from 12.9% on eligible transactions — up to $500 saved per completed transaction."
    />
    <Benefit
      title="One Featured Boost every paid billing period"
      detail="Use it on any active listing. Credits don't roll over."
    />
    <Benefit
      title="Priority search placement"
      detail="Your listings surface higher across search and browse."
    />
    <Benefit
      title="Premium seller tools and advanced analytics"
      detail="AI listing assistance plus deeper performance reporting."
    />
    <Benefit
      title="PermitPath Plus included"
      detail="Save, track and manage your permit checklists across locations."
    />

    <Divider />

    <H2>Start using Pro</H2>
    <ActionRow href={`${SITE_URL}/host/listings`} title="Apply your Featured Boost" description="Pick the listing you want in front of more buyers." />
    <ActionRow href={`${SITE_URL}/tools/permitpath`} title="Open PermitPath Plus" description="Build and track your permit checklist." />
    <ActionRow href={`${SITE_URL}/host/analytics`} title="See your analytics" description="Views, enquiries and conversion by listing." />

    <Section style={{ margin: '18px 0 0' }}>
      <Text style={t.small}>
        Cancel anytime — cancelling stops future renewals only, and your benefits stay active
        through the period you&apos;ve paid for.{' '}
        <Link href={manageUrl} style={t.link}>Manage membership</Link>.
      </Text>
    </Section>

    <SupportRow />
  </VendibookEmailLayout>
)

export const template = {
  component: Email,
  subject: (d: Record<string, any>) => `Welcome to ${d?.planName ?? 'Vendibook Pro'} — you're all set`,
  displayName: 'Vendibook Pro — activated',
  previewData: {
    firstName: 'Alex',
    planName: 'Vendibook Pro',
    amount: '$79.00',
    interval: 'month',
    nextBillingDate: 'September 19, 2026',
  },
} satisfies TemplateEntry
