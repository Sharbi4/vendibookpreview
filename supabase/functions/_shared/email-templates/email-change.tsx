/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import { Link, Text } from 'npm:@react-email/components@0.0.22'
import {
  CtaButton,
  CtaFallback,
  DetailTable,
  Eyebrow,
  H1,
  Lede,
  SupportRow,
  VendibookEmailLayout,
  t,
} from '../email-brand/components.tsx'

interface EmailChangeEmailProps {
  siteName: string
  // oldEmail is the user's current address (HookData.OldEmail). For the
  // NEW-recipient half of a secure email_change fanout, `email` equals the
  // recipient (NEW), so the "from" line must render oldEmail to read
  // "from OLD to NEW" instead of "from NEW to NEW".
  oldEmail: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({
  siteName,
  oldEmail,
  newEmail,
  confirmationUrl,
}: EmailChangeEmailProps) => (
  <VendibookEmailLayout preview={`Confirm your email change for ${siteName}`}>
    <Eyebrow>Account security</Eyebrow>
    <H1>Confirm your email change</H1>
    <Lede>
      You requested to change the email address on your {siteName} account.
      Confirm the change to finish.
    </Lede>

    <DetailTable
      rows={[
        {
          label: 'Current email',
          value: (
            <Link href={`mailto:${oldEmail}`} style={t.linkMuted}>{oldEmail}</Link>
          ),
        },
        {
          label: 'New email',
          value: (
            <Link href={`mailto:${newEmail}`} style={t.link}>{newEmail}</Link>
          ),
          emphasis: true,
        },
      ]}
    />

    <CtaButton href={confirmationUrl}>Confirm email change</CtaButton>
    <CtaFallback href={confirmationUrl} label="Button not working? Use this link:" />

    <Text style={t.small}>
      If you didn't request this change, please secure your account immediately
      by resetting your password.
    </Text>

    <SupportRow />
  </VendibookEmailLayout>
)

export default EmailChangeEmail
