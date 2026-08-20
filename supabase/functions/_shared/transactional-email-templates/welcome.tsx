import * as React from 'npm:react@18.3.1'
import type { TemplateEntry } from './registry.ts'
import {
  Bullets,
  CtaButton,
  Divider,
  Eyebrow,
  H1,
  Lede,
  P,
  SectionLabel,
  SupportRow,
  VendibookEmailLayout,
  BRAND_NAME,
  SITE_URL,
} from '../email-brand/components.tsx'

interface WelcomeProps {
  name?: string
  role?: 'host' | 'shopper' | string
}

const WelcomeEmail = ({ name, role }: WelcomeProps) => {
  const isHost = role === 'host'
  return (
    <VendibookEmailLayout preview={`Welcome to ${BRAND_NAME} — your mobile food business marketplace`}>
      <Eyebrow>Welcome aboard</Eyebrow>
      <H1>{name ? `Welcome, ${name}.` : 'Welcome.'}</H1>
      <Lede>
        You've joined the marketplace built for mobile food entrepreneurs — trucks, trailers,
        ghost kitchens, and vendor lots, all in one place.
      </Lede>

      <P>
        {isHost
          ? 'List your assets, set your terms, and start earning from rentals or sales. Rental payouts release 24 hours after the booking starts.'
          : 'Browse verified listings, book by the hour, day, week, or month — and meet the makers behind every kitchen.'}
      </P>

      <CtaButton href={`${SITE_URL}/dashboard`}>
        {isHost ? 'Open your host dashboard' : 'Start exploring'}
      </CtaButton>

      <Divider />

      <SectionLabel>Three things worth doing today</SectionLabel>
      <Bullets
        items={[
          'Complete your profile — trust drives bookings.',
          isHost
            ? 'Publish your first listing with great photos.'
            : 'Save a few favorites to track availability.',
          isHost
            ? 'Add your payout details so you get paid on time.'
            : 'Save a payment method for faster checkout.',
        ]}
      />

      <SupportRow />
    </VendibookEmailLayout>
  )
}

export const template = {
  component: WelcomeEmail,
  subject: (data: Record<string, any>) =>
    data?.name ? `Welcome to ${BRAND_NAME}, ${data.name}` : `Welcome to ${BRAND_NAME}`,
  displayName: 'Welcome',
  previewData: { name: 'Alex', role: 'host' },
} satisfies TemplateEntry
