import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { s, SITE_NAME, SITE_URL, SUPPORT_PHONE } from './_styles.ts'
import { BlogHighlights, BrandFooter, BrandHeader, ToolsBlock } from './_blocks.tsx'

interface WelcomeProps {
  name?: string
  role?: 'host' | 'shopper' | string
}

const WelcomeEmail = ({ name, role }: WelcomeProps) => {
  const isHost = role === 'host'
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>Welcome to {SITE_NAME} — your mobile food business marketplace</Preview>
      <Body style={s.main}>
        <Container style={s.container}>
          <BrandHeader hero="celebrate" />
          <Section style={s.card}>
            <Text style={s.kicker}>WELCOME ABOARD</Text>
            <Heading style={s.h1}>{name ? `Welcome, ${name}.` : 'Welcome.'}</Heading>
            <Text style={s.lede}>
              You've joined the marketplace built for mobile food entrepreneurs —
              trucks, trailers, ghost kitchens, and vendor lots, all in one place.
            </Text>

            <Section style={s.accentRow}>
              <Text style={s.accentLabel}>YOUR ROLE</Text>
              <Text style={s.accentValue}>{isHost ? 'Host' : 'Shopper'}</Text>
            </Section>

            <Text style={s.text}>
              {isHost
                ? 'List your assets, set your terms, and start earning from rentals or sales — payouts in 24 hours for rentals.'
                : 'Browse verified listings, book by the hour, day, week, or month — and meet the makers behind every kitchen.'}
            </Text>

            <Section style={s.ctaWrap}>
              <Button href={`${SITE_URL}/dashboard`} style={s.button}>
                {isHost ? 'Open your host dashboard' : 'Start exploring'}
              </Button>
            </Section>

            <Hr style={s.hr} />

            <Text style={s.smallHeader}>THREE THINGS WORTH DOING TODAY</Text>
            <Text style={s.listItem}>1. Complete your profile — trust drives bookings.</Text>
            <Text style={s.listItem}>
              2. {isHost ? 'Publish your first listing with great photos.' : 'Save a few favorites to track availability.'}
            </Text>
            <Text style={s.listItem}>
              3. {isHost ? 'Connect Stripe to receive payouts.' : 'Verify your identity for instant booking.'}
            </Text>

            <ToolsBlock role={role} />
            <BlogHighlights role={role} />
          </Section>

          <Text style={s.footnote}>
            Questions? Reply to this email or call {SUPPORT_PHONE}.
          </Text>
        <BrandFooter /></Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: WelcomeEmail,
  subject: (data: Record<string, any>) =>
    data?.name ? `Welcome to ${SITE_NAME}, ${data.name}` : `Welcome to ${SITE_NAME}`,
  displayName: 'Welcome',
  previewData: { name: 'Alex', role: 'host' },
} satisfies TemplateEntry
