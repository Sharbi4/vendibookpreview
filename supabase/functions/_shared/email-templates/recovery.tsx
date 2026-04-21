/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Link, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import { s } from './_styles.ts'

interface RecoveryEmailProps { siteName: string; confirmationUrl: string }

export const RecoveryEmail = ({ siteName, confirmationUrl }: RecoveryEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Reset your Vendibook password</Preview>
    <Body style={s.main}>
      <Container style={s.container}>
        <Section style={s.brandBar}><Text style={s.brandMark}>VENDIBOOK</Text></Section>
        <Section style={s.card}>
          <Text style={s.kicker}>ACCOUNT SECURITY</Text>
          <Heading style={s.h1}>Reset your password.</Heading>
          <Text style={s.lede}>
            We received a request to reset the password for your {siteName} account. Choose a new password by clicking below.
          </Text>
          <Section style={s.ctaWrap}>
            <Button style={s.button} href={confirmationUrl}>Reset password →</Button>
          </Section>
          <Text style={s.smallText}>Or paste this link into your browser:</Text>
          <Link href={confirmationUrl} style={s.linkUrl}>{confirmationUrl}</Link>
          <Hr style={s.hr} />
          <Text style={s.footer}>Didn't request this? Your password is safe — you can ignore this email.</Text>
          <Text style={s.footerBrand}>{siteName} · Account security</Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail
