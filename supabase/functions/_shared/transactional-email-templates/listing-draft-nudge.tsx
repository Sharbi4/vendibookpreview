import * as React from 'npm:react@18.3.1'
import { Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import {
  Bullets,
  CtaButton,
  Eyebrow,
  H1,
  Lede,
  SITE_URL,
  SupportRow,
  VendibookEmailLayout,
  t,
} from '../email-brand/components.tsx'

interface Props {
  hostName?: string
  listingTitle?: string
  listingId?: string
  coverImageUrl?: string
}

const E = ({ hostName, listingTitle, listingId }: Props) => {
  const finishUrl = listingId ? `${SITE_URL}/create-listing/${listingId}` : `${SITE_URL}/list`
  return (
    <VendibookEmailLayout preview="Your listing is saved as a draft — finish publishing it">
      <Eyebrow>Draft saved</Eyebrow>
      <H1>{hostName ? `${hostName}, your listing is still a draft` : 'Your listing is still a draft'}</H1>
      <Lede>
        {listingTitle ? `“${listingTitle}”` : 'Your listing'} is saved but not published yet, so
        it isn't visible to anyone searching Vendibook. Pick up where you left off whenever
        you're ready.
      </Lede>

      <Bullets
        items={[
          'Publishing a standard listing is free.',
          'You can edit photos, pricing, and availability any time after publishing.',
          'Your draft stays saved until you publish it.',
        ]}
      />

      <CtaButton href={finishUrl}>Finish and publish</CtaButton>

      <Text style={t.small}>
        Not ready yet? No action is needed — your draft will be waiting in your dashboard.
      </Text>

      <SupportRow />
    </VendibookEmailLayout>
  )
}

export const template = {
  component: E,
  subject: () => 'Your Vendibook listing is still a draft',
  displayName: 'Draft nudge',
  previewData: {
    hostName: 'Sam',
    listingTitle: 'Downtown Food Truck',
    listingId: 'demo',
  },
} satisfies TemplateEntry
