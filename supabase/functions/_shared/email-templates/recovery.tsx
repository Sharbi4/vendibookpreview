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

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({
  siteName,
  confirmationUrl,
}: RecoveryEmailProps) => (
  <VendibookEmailLayout preview={`Reset your password for ${siteName}`}>
    <Eyebrow>Password reset</Eyebrow>
    <H1>Reset your password</H1>
    <Lede>
      We received a request to reset the password for your {siteName} account.
      Choose a new password using the button below.
    </Lede>

    <CtaButton href={confirmationUrl}>Reset password</CtaButton>
    <CtaFallback href={confirmationUrl} label="Button not working? Use this link:" />

    <Text style={t.small}>
      If you didn't request a password reset, you can safely ignore this email —
      your password will not be changed.
    </Text>

    <SupportRow />
  </VendibookEmailLayout>
)

export default RecoveryEmail
