/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

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
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Welcome to Vendibook — confirm your email to get started</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={card}>
          <Text style={brand}>VENDIBOOK</Text>
          <Heading style={h1}>Welcome aboard.</Heading>
          <Text style={lead}>
            You're one click away from booking, listing, and discovering vendor
            spaces, shared kitchens, food trucks and more.
          </Text>
          <Text style={text}>
            Confirm <strong style={emphasis}>{recipient}</strong> to activate your account.
          </Text>
          <Section style={buttonWrap}>
            <Button style={button} href={confirmationUrl}>
              Confirm email →
            </Button>
          </Section>
          <Text style={smallText}>Or paste this link into your browser:</Text>
          <Link href={confirmationUrl} style={linkUrl}>{confirmationUrl}</Link>
          <Hr style={hr} />
          <Text style={footer}>Didn't sign up? You can safely ignore this email.</Text>
          <Text style={footerBrand}>
            <Link href={siteUrl} style={footerLink}>{siteName}</Link> · The marketplace for vendor spaces
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

const main = { backgroundColor: '#ffffff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif', margin: 0, padding: '40px 0' }
const container = { maxWidth: '560px', margin: '0 auto', padding: '0 20px' }
const card = { backgroundColor: '#0f0f0f', border: '1px solid #1f1f1f', borderRadius: '14px', padding: '40px 36px' }
const brand = { fontSize: '11px', letterSpacing: '0.18em', color: '#a3a3a3', fontWeight: 600 as const, margin: '0 0 28px' }
const h1 = { fontSize: '28px', fontWeight: 600 as const, color: '#fafafa', letterSpacing: '-0.02em', margin: '0 0 14px', lineHeight: '1.2' }
const lead = { fontSize: '15px', color: '#a3a3a3', lineHeight: '1.6', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#d4d4d4', lineHeight: '1.6', margin: '0 0 28px' }
const emphasis = { color: '#fafafa' }
const buttonWrap = { margin: '0 0 28px' }
const button = { backgroundColor: '#f97316', color: '#0a0a0a', fontSize: '14px', fontWeight: 600 as const, borderRadius: '10px', padding: '13px 24px', textDecoration: 'none', display: 'inline-block' }
const smallText = { fontSize: '12px', color: '#737373', margin: '0 0 6px' }
const linkUrl = { fontSize: '12px', color: '#a3a3a3', textDecoration: 'underline', wordBreak: 'break-all' as const }
const hr = { borderColor: '#262626', margin: '32px 0 20px' }
const footer = { fontSize: '12px', color: '#737373', margin: '0 0 6px' }
const footerBrand = { fontSize: '11px', color: '#525252', margin: 0 }
const footerLink = { color: '#a3a3a3', textDecoration: 'none' }
