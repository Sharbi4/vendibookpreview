/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import { Section, Text } from 'npm:@react-email/components@0.0.22'
import {
  Eyebrow,
  H1,
  Lede,
  SupportRow,
  VendibookEmailLayout,
  color,
  t,
} from '../email-brand/components.tsx'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <VendibookEmailLayout preview="Your Vendibook verification code">
    <Eyebrow>Verification code</Eyebrow>
    <H1>Confirm it's you</H1>
    <Lede>Use the code below to confirm your identity and continue.</Lede>

    <Section
      style={{
        backgroundColor: color.surfaceMuted,
        border: `1px solid ${color.border}`,
        borderRadius: '12px',
        padding: '20px',
        margin: '0 0 20px',
        textAlign: 'center' as const,
      }}
    >
      <Text
        style={{
          fontFamily: 'Menlo, Consolas, monospace',
          fontSize: '30px',
          fontWeight: 700,
          letterSpacing: '0.18em',
          color: color.text,
          margin: 0,
        }}
      >
        {token}
      </Text>
    </Section>

    <Text style={t.small}>
      This code expires shortly. If you didn't request it, you can safely ignore
      this email.
    </Text>

    <SupportRow />
  </VendibookEmailLayout>
)

export default ReauthenticationEmail
