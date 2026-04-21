import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'VendiBook'
const SITE_URL = 'https://vendibook.com'

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
      <Body style={main}>
        <Container style={container}>
          <Section style={brandBar}>
            <Text style={brandMark}>VENDIBOOK</Text>
          </Section>

          <Section style={card}>
            <Heading style={h1}>
              {name ? `Welcome, ${name}.` : 'Welcome.'}
            </Heading>
            <Text style={lede}>
              You've joined the marketplace built for mobile food entrepreneurs —
              trucks, trailers, ghost kitchens, and vendor lots, all in one place.
            </Text>

            <Section style={accentRow}>
              <Text style={accentLabel}>YOUR ROLE</Text>
              <Text style={accentValue}>{isHost ? 'Host' : 'Shopper'}</Text>
            </Section>

            <Text style={text}>
              {isHost
                ? 'List your assets, set your terms, and start earning from rentals or sales — payouts in 24 hours for rentals.'
                : 'Browse verified listings, book by the hour, day, week, or month — and meet the makers behind every kitchen.'}
            </Text>

            <Section style={ctaWrap}>
              <Button href={`${SITE_URL}/dashboard`} style={button}>
                {isHost ? 'Open your host dashboard' : 'Start exploring'}
              </Button>
            </Section>

            <Hr style={hr} />

            <Text style={smallHeader}>Three things worth doing today</Text>
            <Text style={listItem}>1. Complete your profile — trust drives bookings.</Text>
            <Text style={listItem}>
              2. {isHost ? 'Publish your first listing with great photos.' : 'Save a few favorites to track availability.'}
            </Text>
            <Text style={listItem}>
              3. {isHost ? 'Connect Stripe to receive payouts.' : 'Verify your identity for instant booking.'}
            </Text>
          </Section>

          <Text style={footnote}>
            Questions? Reply to this email or call (725) 755-9598.
          </Text>
        </Container>
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

const main = { backgroundColor: '#ffffff', fontFamily: "'Helvetica Neue', Arial, sans-serif", margin: 0, padding: '32px 0' }
const container = { maxWidth: '560px', margin: '0 auto', padding: '0 20px' }
const brandBar = { padding: '0 0 20px' }
const brandMark = { fontSize: '12px', letterSpacing: '0.32em', color: '#0a0a0a', fontWeight: 700, margin: 0 }
const card = { backgroundColor: '#0a0a0a', color: '#fafafa', borderRadius: '16px', padding: '40px 36px', border: '1px solid #1a1a1a' }
const h1 = { fontSize: '30px', lineHeight: 1.15, fontWeight: 600, color: '#ffffff', margin: '0 0 16px', letterSpacing: '-0.02em' }
const lede = { fontSize: '16px', lineHeight: 1.6, color: '#a3a3a3', margin: '0 0 28px' }
const accentRow = { backgroundColor: '#141414', border: '1px solid #232323', borderRadius: '10px', padding: '14px 18px', margin: '0 0 24px' }
const accentLabel = { fontSize: '10px', letterSpacing: '0.2em', color: '#737373', margin: '0 0 4px', fontWeight: 600 }
const accentValue = { fontSize: '16px', color: '#FF5124', fontWeight: 600, margin: 0 }
const text = { fontSize: '15px', lineHeight: 1.65, color: '#d4d4d4', margin: '0 0 28px' }
const ctaWrap = { margin: '8px 0 8px' }
const button = { backgroundColor: '#FF5124', color: '#0a0a0a', padding: '14px 28px', borderRadius: '10px', fontWeight: 600, fontSize: '15px', textDecoration: 'none', display: 'inline-block' }
const hr = { borderColor: '#1f1f1f', margin: '32px 0 24px' }
const smallHeader = { fontSize: '11px', letterSpacing: '0.2em', color: '#737373', fontWeight: 600, margin: '0 0 14px' }
const listItem = { fontSize: '14px', color: '#d4d4d4', margin: '0 0 8px', lineHeight: 1.55 }
const footnote = { fontSize: '12px', color: '#737373', textAlign: 'center' as const, margin: '24px 0 0' }
