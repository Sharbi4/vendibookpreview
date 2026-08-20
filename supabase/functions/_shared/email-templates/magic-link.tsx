/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import { Text } from 'npm:@react-email/components@0.0.22'
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

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({
  siteName,
  confirmationUrl,
}: MagicLinkEmailProps) => (
  <VendibookEmailLayout preview={`Your login link for ${siteName}`}>
    <Eyebrow>Sign in</Eyebrow>
    <H1>Your login link</H1>
    <Lede>
      Use the button below to log in to {siteName}. For your security this link
      expires shortly and can only be used once.
    </Lede>

    <CtaButton href={confirmationUrl}>Log in</CtaButton>
    <CtaFallback href={confirmationUrl} label="Button not working? Use this link:" />

    <Text style={t.small}>
      If you didn't request this link, you can safely ignore this email.
    </Text>

    <SupportRow />
  </VendibookEmailLayout>
)

export default MagicLinkEmail
