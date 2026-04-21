/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Link, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import { s } from './_styles.ts'

interface EmailChangeEmailProps { siteName: string; email: string; newEmail: string; confirmationUrl: string }

export const EmailChangeEmail = ({ siteName, email, newEmail, confirmationUrl }: EmailChangeEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Confirm your new email address for Vendibook</Preview>
    <Body style={s.main}>
      <Container style={s.container}>
        <Section style={s.brandBar}><Text style={s.brandMark}>VENDIBOOK</Text></Section>
        <Section style={s.card}>
          <Text style={s.kicker}>EMAIL CHANGE REQUEST</Text>
          <Heading style={s.h1}>Confirm your new email.</Heading>
          <Text style={s.lede}>You requested to change your {siteName} email address.</Text>
          <Section style={s.accentRow}>
            <Text style={s.accentLabel}>FROM</Text>
            <Text style={s.accentValueMuted}>{email}</Text>
            <Text style={s.accentLabel}>TO</Text>
            <Text style={s.accentValue}>{newEmail}</Text>
          </Section>
          <Section style={s.ctaWrap}>
            <Button style={s.button} href={confirmationUrl}>Confirm change →</Button>
          </Section>
          <Text style={s.smallText}>Or paste this link into your browser:</Text>
          <Link href={confirmationUrl} style={s.linkUrl}>{confirmationUrl}</Link>
          <Hr style={s.hr} />
          <Text style={s.footer}>Didn't request this? Secure your account immediately.</Text>
          <Text style={s.footerBrand}>{siteName} · Account security</Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default EmailChangeEmail
