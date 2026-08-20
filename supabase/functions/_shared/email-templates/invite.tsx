/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import { Link, Text } from 'npm:@react-email/components@0.0.22'
import {
  CtaButton,
  CtaFallback,
  Eyebrow,
  H1,
  Lede,
  SupportRow,
  VendibookEmailLayout,
  t,
} from '../email-brand/components.tsx'

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({
  siteName,
  siteUrl,
  confirmationUrl,
}: InviteEmailProps) => (
  <VendibookEmailLayout preview={`You've been invited to join ${siteName}`}>
    <Eyebrow>Invitation</Eyebrow>
    <H1>You've been invited</H1>
    <Lede>
      You've been invited to join{' '}
      <Link href={siteUrl} style={t.link}>{siteName}</Link>. Accept the
      invitation below to create your account.
    </Lede>

    <CtaButton href={confirmationUrl}>Accept invitation</CtaButton>
    <CtaFallback href={confirmationUrl} label="Button not working? Use this link:" />

    <Text style={t.small}>
      If you weren't expecting this invitation, you can safely ignore this email.
    </Text>

    <SupportRow />
  </VendibookEmailLayout>
)

export default InviteEmail
