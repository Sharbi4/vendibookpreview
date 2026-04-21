/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Link, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import { s } from './_styles.ts'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({ siteName, siteUrl, recipient, confirmationUrl }: SignupEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Welcome to Vendibook — confirm your email to get started</Preview>
    <Body style={s.main}>
      <Container style={s.container}>
        <Section style={s.brandBar}><Text style={s.brandMark}>VENDIBOOK</Text></Section>
        <Section style={s.card}>
          <Text style={s.kicker}>WELCOME ABOARD</Text>
          <Heading style={s.h1}>Confirm your email.</Heading>
          <Text style={s.lede}>
            You're one click away from booking, listing, and discovering vendor spaces, shared kitchens, food trucks and more.
          </Text>
          <Text style={s.text}>
            Confirm <strong style={s.emphasis}>{recipient}</strong> to activate your account.
          </Text>
          <Section style={s.ctaWrap}>
            <Button style={s.button} href={confirmationUrl}>Confirm email →</Button>
          </Section>
          <Text style={s.smallText}>Or paste this link into your browser:</Text>
          <Link href={confirmationUrl} style={s.linkUrl}>{confirmationUrl}</Link>
          <Hr style={s.hr} />
          <Text style={s.footer}>Didn't sign up? You can safely ignore this email.</Text>
          <Text style={s.footerBrand}>
            <Link href={siteUrl} style={{ color: '#a3a3a3', textDecoration: 'none' }}>{siteName}</Link> · The marketplace for vendor spaces
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail
