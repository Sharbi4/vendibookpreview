/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Link, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import { s } from './_styles.ts'

interface MagicLinkEmailProps { siteName: string; confirmationUrl: string }

export const MagicLinkEmail = ({ siteName, confirmationUrl }: MagicLinkEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your secure sign-in link for Vendibook</Preview>
    <Body style={s.main}>
      <Container style={s.container}>
        <Section style={s.brandBar}><Text style={s.brandMark}>VENDIBOOK</Text></Section>
        <Section style={s.card}>
          <Text style={s.kicker}>SECURE SIGN-IN</Text>
          <Heading style={s.h1}>Sign in to {siteName}.</Heading>
          <Text style={s.lede}>
            Tap the button below to access your account. This link expires shortly for your security.
          </Text>
          <Section style={s.ctaWrap}>
            <Button style={s.button} href={confirmationUrl}>Sign in securely →</Button>
          </Section>
          <Text style={s.smallText}>Or paste this link into your browser:</Text>
          <Link href={confirmationUrl} style={s.linkUrl}>{confirmationUrl}</Link>
          <Hr style={s.hr} />
          <Text style={s.footer}>Didn't request this? You can safely ignore this email.</Text>
          <Text style={s.footerBrand}>{siteName} · Secure sign-in</Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default MagicLinkEmail
