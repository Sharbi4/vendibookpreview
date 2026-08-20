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
  accessEndsAt?: string
  immediate?: boolean
  reactivateUrl?: string
}

const Email = ({ firstName, planName = 'Vendibook Pro', accessEndsAt, immediate, reactivateUrl }: Props) => (
  <VendibookEmailLayout
    preview={immediate ? `Your ${planName} plan ended` : `Your ${planName} plan is scheduled to end`}
  >
    <Eyebrow>{immediate ? 'Plan ended' : 'Cancellation scheduled'}</Eyebrow>
    <H1>
      {firstName ? `${firstName}, ` : ''}
      {immediate ? `your ${planName} plan has ended` : `your ${planName} plan will end soon`}
    </H1>
    <Lede>
      {immediate
        ? 'Membership features are now off. Your listings, messages and history are safe — reactivate anytime to switch everything back on.'
        : accessEndsAt
          ? `You'll keep full membership access until ${accessEndsAt}. After that your account returns to the free tier.`
          : "You'll keep full membership access through the end of the current billing period."}
    </Lede>

    <DetailTable
      rows={[
        { label: 'Plan', value: planName },
        { label: 'Future renewals', value: 'Stopped' },
        { label: 'Access until', value: !immediate ? accessEndsAt : undefined, emphasis: true },
      ]}
    />

    <CtaButton href={reactivateUrl || `${SITE_URL}/account/subscription`}>
      {immediate ? 'Reactivate membership' : 'Change my mind'}
    </CtaButton>

    <Divider />

    <Text style={t.small}>
      The free tier keeps your listings live. You'd move from the 10.9% Pro seller/host fee back
      to the standard 12.9% rate, and Featured Boost credits stop accruing.
    </Text>

    <SupportRow note="Anything we could have done better? Reply and tell us." />
  </VendibookEmailLayout>
)

export const template = {
  component: Email,
  subject: (d: Record<string, any>) => d?.immediate
    ? `Your ${d?.planName ?? 'subscription'} has ended`
    : `Your ${d?.planName ?? 'subscription'} will end soon`,
  displayName: 'Subscription cancelled',
  previewData: { firstName: 'Alex', planName: 'Vendibook Pro', accessEndsAt: 'August 24, 2026', immediate: false },
} satisfies TemplateEntry
