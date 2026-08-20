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

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <VendibookEmailLayout preview={`Confirm your email for ${siteName}`}>
    <Eyebrow>Confirm your email</Eyebrow>
    <H1>One quick step to finish signing up</H1>
    <Lede>
      Thanks for creating a{' '}
      <Link href={siteUrl} style={t.link}>{siteName}</Link> account. Confirm{' '}
      {recipient} to activate it.
    </Lede>

    <CtaButton href={confirmationUrl}>Verify email address</CtaButton>
    <CtaFallback href={confirmationUrl} label="Button not working? Use this link:" />

    <Text style={t.small}>
      If you didn't create an account, you can safely ignore this email.
    </Text>

    <SupportRow />
  </VendibookEmailLayout>
)

export default SignupEmail
