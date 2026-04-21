/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import { s } from './_styles.ts'

interface ReauthenticationEmailProps { token: string }

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your Vendibook verification code</Preview>
    <Body style={s.main}>
      <Container style={s.container}>
        <Section style={s.brandBar}><Text style={s.brandMark}>VENDIBOOK</Text></Section>
        <Section style={s.card}>
          <Text style={s.kicker}>VERIFICATION CODE</Text>
          <Heading style={s.h1}>Verify it's you.</Heading>
          <Text style={s.lede}>Use the code below to confirm your identity. It expires shortly.</Text>
          <Section style={s.codeBox}>
            <Text style={s.code}>{token}</Text>
          </Section>
          <Hr style={s.hr} />
          <Text style={s.footer}>Didn't request this? You can safely ignore this email.</Text>
          <Text style={s.footerBrand}>Vendibook · Account security</Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail
