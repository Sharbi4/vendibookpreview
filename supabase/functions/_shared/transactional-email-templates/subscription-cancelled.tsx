import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { s, SITE_URL, SUPPORT_PHONE } from './_styles.ts'
import { BrandFooter, BrandHeader } from './_blocks.tsx'

interface Props {
  firstName?: string
  planName?: string
  accessEndsAt?: string
  immediate?: boolean
  reactivateUrl?: string
}

const Email = ({ firstName, planName = 'Host Pro', accessEndsAt, immediate, reactivateUrl }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{immediate ? `Your ${planName} plan ended` : `Your ${planName} plan is scheduled to end`}</Preview>
    <Body style={s.main}>
      <Container style={s.container}>
        <BrandHeader hero="payment" />
        <Section style={s.card}>
          <Text style={s.kicker}>{immediate ? 'PLAN ENDED' : 'CANCELLATION SCHEDULED'}</Text>
          <Heading style={s.h1}>
            {firstName ? `${firstName}, ` : ''}
            {immediate ? `your ${planName} plan has ended.` : `your ${planName} plan will end soon.`}
          </Heading>
          <Text style={s.lede}>
            {immediate
              ? `Pro features are now off. Your listings and history are safe — reactivate anytime to turn everything back on.`
              : accessEndsAt
                ? `You'll keep full Pro access until ${accessEndsAt}. After that, your account switches back to the free tier.`
                : `You'll keep full Pro access through the end of the current billing period.`}
          </Text>
          {accessEndsAt && !immediate && (
            <Section style={s.accentRow}>
              <Text style={s.accentLabel}>ACCESS UNTIL</Text>
              <Text style={s.accentValuePlain}>{accessEndsAt}</Text>
            </Section>
          )}
          <Section style={s.ctaWrap}>
            <Button href={reactivateUrl || `${SITE_URL}/host/plans`} style={s.button}>
              {immediate ? 'Reactivate plan' : 'Change my mind'}
            </Button>
          </Section>
          <Hr style={s.hr} />
          <Text style={s.small}>
            Free tier keeps your listings live — you just lose Pro placement, advanced analytics, and priority support.
          </Text>
        </Section>
        <Text style={s.footnote}>Anything we could've done better? Reply and let us know. Or call {SUPPORT_PHONE}.</Text>
      <BrandFooter /></Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (d: Record<string, any>) => d?.immediate
    ? `Your ${d?.planName ?? 'subscription'} has ended`
    : `Your ${d?.planName ?? 'subscription'} will end soon`,
  displayName: 'Subscription cancelled',
  previewData: { firstName: 'Alex', planName: 'Host Pro', accessEndsAt: 'August 24, 2026', immediate: false },
} satisfies TemplateEntry
