/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Link, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import { s } from './_styles.ts'

interface InviteEmailProps { siteName: string; siteUrl: string; confirmationUrl: string }

export const InviteEmail = ({ siteName, siteUrl, confirmationUrl }: InviteEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>You're invited to join Vendibook</Preview>
    <Body style={s.main}>
      <Container style={s.container}>
        <Section style={s.brandBar}><Text style={s.brandMark}>VENDIBOOK</Text></Section>
        <Section style={s.card}>
          <Text style={s.kicker}>YOU'RE INVITED</Text>
          <Heading style={s.h1}>Join {siteName}.</Heading>
          <Text style={s.lede}>
            You've been invited to join{' '}
            <Link href={siteUrl} style={{ color: '#ffffff', textDecoration: 'none' }}>
              <strong style={s.emphasis}>{siteName}</strong>
            </Link>
            {' '}— the marketplace for vendor spaces, shared kitchens, food trucks, and more.
          </Text>
          <Section style={s.ctaWrap}>
            <Button style={s.button} href={confirmationUrl}>Accept invitation →</Button>
          </Section>
          <Text style={s.smallText}>Or paste this link into your browser:</Text>
          <Link href={confirmationUrl} style={s.linkUrl}>{confirmationUrl}</Link>
          <Hr style={s.hr} />
          <Text style={s.footer}>Wasn't expecting this? You can safely ignore this email.</Text>
          <Text style={s.footerBrand}>{siteName}</Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default InviteEmail
