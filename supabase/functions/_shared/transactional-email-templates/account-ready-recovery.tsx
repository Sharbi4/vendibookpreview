import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { s, SITE_NAME, SITE_URL, SUPPORT_PHONE } from './_styles.ts'

import { BrandFooter, BrandHeader } from './_blocks.tsx'
interface AccountReadyRecoveryProps {
  name?: string
}

const AccountReadyRecoveryEmail = ({ name }: AccountReadyRecoveryProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your {SITE_NAME} account is ready — no verification email needed</Preview>
    <Body style={s.main}>
      <Container style={s.container}>
        <BrandHeader hero="celebrate" />
        <Section style={s.card}>
          <Text style={s.kicker}>YOUR ACCOUNT IS ACTIVE</Text>
          <Heading style={s.h1}>{name ? `${name}, you're all set.` : `You're all set.`}</Heading>
          <Text style={s.lede}>
            We noticed you signed up recently and may have been waiting on a verification
            email. That email was never needed — your {SITE_NAME} account was activated
            the moment you signed up. A display bug on our sign-up screen told you
            otherwise, and we're sorry for the confusion.
          </Text>

          <Text style={s.text}>
            You can sign in right now with the email and password you used at signup —
            no extra steps, no verification link required.
          </Text>

          <Section style={s.ctaWrap}>
            <Button href={`${SITE_URL}/auth`} style={s.button}>
              Sign in to your account
            </Button>
          </Section>

          <Hr style={s.hr} />

          <Text style={s.smallHeader}>FORGOT YOUR PASSWORD?</Text>
          <Text style={s.text}>
            No problem — use the "Forgot password" link on the sign-in screen and
            we'll send you a reset link instantly.
          </Text>

          <Text style={s.footnote}>
            We've fixed the sign-up flow so this won't happen to anyone else.
            Thanks for your patience — and welcome to {SITE_NAME}.
          </Text>
        </Section>

        <Text style={s.footnote}>
          Questions? Reply to this email or call {SUPPORT_PHONE}.
        </Text>
      <BrandFooter /></Container>
    </Body>
  </Html>
)

export const template = {
  component: AccountReadyRecoveryEmail,
  subject: (data: Record<string, any>) =>
    data?.name
      ? `${data.name}, your Vendibook account is ready to use`
      : `Your Vendibook account is ready to use`,
  displayName: 'Account ready (recovery)',
  previewData: { name: 'Alex' },
} satisfies TemplateEntry
