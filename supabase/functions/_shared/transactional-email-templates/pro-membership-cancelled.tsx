import * as React from 'npm:react@18.3.1'
import { Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import {
  CtaButton,
  DetailTable,
  Divider,
  Eyebrow,
  H1,
  Lede,
  SITE_URL,
  SupportRow,
  VendibookEmailLayout,
  t,
} from '../email-brand/components.tsx'

interface Props {
  firstName?: string
  planName?: string
  /** Date benefits remain active through (current_period_end). */
  accessThrough?: string
  manageUrl?: string
}

const Email = ({
  firstName,
  planName = 'Vendibook Pro',
  accessThrough,
  manageUrl = `${SITE_URL}/account/subscription`,
}: Props) => (
  <VendibookEmailLayout preview={`${planName} cancellation confirmed`}>
    <Eyebrow>Cancellation confirmed</Eyebrow>
    <H1>
      {firstName ? `${firstName}, your ${planName} won't renew` : `Your ${planName} won't renew`}
    </H1>
    <Lede>
      We've stopped all future renewals — you won't be charged again. Your benefits stay
      switched on until the end of the period you already paid for.
    </Lede>

    <DetailTable
      rows={[
        { label: 'Plan', value: planName },
        { label: 'Future renewals', value: 'Stopped' },
        { label: 'Benefits active through', value: accessThrough, emphasis: true },
      ]}
    />

    <CtaButton href={manageUrl}>Manage membership</CtaButton>

    <Divider />

    <Text style={t.small}>
      Until that date you keep the 10.9% seller/host fee (versus the 12.9% standard rate) and
      your Featured Boost credit for the paid billing period. After that your account simply
      returns to Free — your listings, messages and history stay exactly where they are, and you
      can rejoin anytime.
    </Text>

    <SupportRow note="Changed your mind?" />
  </VendibookEmailLayout>
)

export const template = {
  component: Email,
  subject: (d: Record<string, any>) =>
    `Your ${d?.planName ?? 'Vendibook Pro'} membership is set to end`,
  displayName: 'Vendibook Pro — cancellation confirmed',
  previewData: { firstName: 'Alex', planName: 'Vendibook Pro', accessThrough: 'October 19, 2026' },
} satisfies TemplateEntry
