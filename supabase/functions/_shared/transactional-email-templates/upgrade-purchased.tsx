import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { s, SITE_URL, SUPPORT_PHONE } from './_styles.ts'
import { BrandFooter, BrandHeader } from './_blocks.tsx'

interface Props {
  firstName?: string
  productName?: string
  amount?: string
  listingId?: string | null
  purchasesUrl?: string
}

const Email = ({ firstName, productName = 'Your upgrade', amount, listingId, purchasesUrl = '/purchases' }: Props) => {
  const primary = listingId ? `${SITE_URL}/listing/${listingId}` : `${SITE_URL}${purchasesUrl}`
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{productName} is now active</Preview>
      <Body style={s.main}>
        <Container style={s.container}>
          <BrandHeader hero="payment" />
          <Section style={s.card}>
            <Text style={s.kicker}>UPGRADE ACTIVE ✅</Text>
            <Heading style={s.h1}>{firstName ? `You're set, ${firstName}.` : "You're set."}</Heading>
            <Text style={s.lede}>
              {productName} is now live on your account. Nothing else to do — it kicks in automatically.
            </Text>
            <Section style={s.accentRow}>
              <Text style={s.accentLabel}>ITEM</Text>
              <Text style={s.accentValuePlain}>{productName}</Text>
            </Section>
            {amount && (
              <Section style={s.accentRow}>
                <Text style={s.accentLabel}>AMOUNT</Text>
                <Text style={s.accentValue}>{amount}</Text>
              </Section>
            )}
            <Section style={s.ctaWrap}>
              <Button href={primary} style={s.button}>
                {listingId ? 'View boosted listing' : 'See what you unlocked'}
              </Button>
            </Section>
            <Hr style={s.hr} />
            <Text style={s.footnote}>
              A receipt for this purchase is in your account under Purchases. Questions? Call {SUPPORT_PHONE} or reply to this email.
            </Text>
          </Section>
        <BrandFooter /></Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: Email,
  subject: (d: Record<string, any>) => `${d?.productName ?? 'Your upgrade'} is active`,
  displayName: 'Upgrade purchased (add-on / promotion receipt)',
  previewData: { firstName: 'Alex', productName: 'Featured Boost — 7 days', amount: '$29.00' },
} satisfies TemplateEntry
