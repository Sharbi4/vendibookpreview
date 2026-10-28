import * as React from 'npm:react@18.3.1'
import { Text } from 'npm:@react-email/components@0.0.22'
import { CtaButton, SecondaryButton, H1, Eyebrow, SupportRow, VendibookEmailLayout, t } from '../email-brand/components.tsx'
import type { TemplateEntry } from './registry.ts'

interface Props {
  buyerName?: string
  listingTitle?: string
  totalPrice?: string
  resumeUrl?: string
  requestOnly?: boolean
  variant?: '2h' | '24h'
}

const E = ({ buyerName, listingTitle, totalPrice, resumeUrl, requestOnly = false, variant = '2h' }: Props) => {
  const isFollowup = variant === '24h'
  const item = listingTitle ? `"${listingTitle}"` : 'this listing'
  const headline = isFollowup
    ? `${buyerName ? buyerName + ', s' : 'S'}till interested in ${item}?`
    : `${buyerName ? buyerName + ', y' : 'Y'}our checkout is saved`
  const action = requestOnly ? 'send your Request to Buy' : 'complete your purchase'
  const lede = isFollowup
    ? `You were close to securing ${item}${totalPrice ? ` (${totalPrice})` : ''}. Equipment can sell quickly. Return to checkout to check it's still available and ${action}.`
    : `You started checking out ${item}${totalPrice ? ` (${totalPrice})` : ''} but didn't finish. Your details are saved, so you can ${action} in a few taps.`
  return (
    <VendibookEmailLayout preview="Pick up your checkout or talk with our sales team">
      <Eyebrow>Checkout saved</Eyebrow>
      <H1>{headline}</H1>
      <Text style={t.text}>{lede}</Text>
      <CtaButton href={resumeUrl || 'https://vendibook.com/dashboard'}>
        {requestOnly ? 'Resume Request to Buy' : 'Resume checkout'}
      </CtaButton>
      <Text style={t.text}>
        Questions about financing, delivery or whether this is the right truck or trailer?
        Our sales team can talk it through with you. Ask a representative to reach out
        personally, or arrange a free 30-minute Customer Success Meeting.
      </Text>
      <SecondaryButton href="https://vendibook.com/contact#callback">Request a personal callback</SecondaryButton>
      <SecondaryButton href="https://vendibook.com/contact#meeting">Schedule a 30-minute meeting</SecondaryButton>
      <SupportRow note="You can also reply to this email for help." />
    </VendibookEmailLayout>
  )
}

export const template = {
  component: E,
  subject: ({ variant, listingTitle }: Props) =>
    variant === '24h'
      ? `Still thinking about ${listingTitle || 'it'}? Your checkout is saved`
      : "You're one step away from your purchase",
  displayName: 'Sale checkout abandoned recovery',
  previewData: {
    buyerName: 'Jordan',
    listingTitle: '2019 Food Trailer',
    totalPrice: '$18,000.00',
    resumeUrl: 'https://vendibook.com/checkout/demo',
    requestOnly: false,
    variant: '2h',
  },
} satisfies TemplateEntry
