import * as React from 'npm:react@18.3.1'
import { Img, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import {
  ActionRow,
  BRAND_NAME,
  CtaButton,
  DetailTable,
  Divider,
  H1,
  H2,
  Lede,
  P,
  SITE_URL,
  StatusChip,
  SupportRow,
  VendibookEmailLayout,
  color,
  t,
} from '../email-brand/components.tsx'

interface ComplimentaryFeaturedBoostProps {
  firstName?: string
  listingTitle?: string
  listingId?: string
  listingImageUrl?: string
  expiresAtFormatted?: string
  durationDays?: number
}

const ComplimentaryFeaturedBoostEmail = ({
  firstName,
  listingTitle,
  listingId,
  listingImageUrl,
  expiresAtFormatted,
  durationDays = 30,
}: ComplimentaryFeaturedBoostProps) => {
  const title = listingTitle || 'Your listing'
  const listingHref = listingId ? `${SITE_URL}/listing/${listingId}` : SITE_URL
  const editHref = listingId ? `${SITE_URL}/edit-listing/${listingId}` : `${SITE_URL}/dashboard/listings`
  const offersHref = `${SITE_URL}/dashboard/offers`

  return (
    <VendibookEmailLayout
      preview={`We've featured ${listingTitle || 'your listing'} on ${BRAND_NAME}, on us, for ${durationDays} days.`}
      logoWidth={132}
    >
      <StatusChip label="Featured, on us" tone="brand" />
      <H1>{firstName ? `${firstName}, your listing is featured.` : 'Your listing is featured.'}</H1>
      <Lede>
        Buyers are already looking at {`“${title}”`}, so our team has placed it in the Featured
        rotation for {durationDays} days at no cost to you. Featured listings appear first on the
        homepage, in search and in category rows.
      </Lede>

      {listingImageUrl ? (
        <Section style={{ margin: '0 0 14px' }}>
          <Img
            src={listingImageUrl}
            alt={title}
            width="544"
            style={{
              display: 'block',
              width: '100%',
              maxWidth: '544px',
              maxHeight: '240px',
              objectFit: 'cover' as const,
              height: 'auto',
              borderRadius: '12px',
              border: `1px solid ${color.border}`,
            }}
          />
        </Section>
      ) : null}

      <DetailTable
        rows={[
          { label: 'Listing', value: title, emphasis: true },
          { label: 'Placement', value: 'Homepage, search and category rows' },
          { label: 'Featured until', value: expiresAtFormatted || `${durationDays} days from today` },
          { label: 'Cost to you', value: 'Free' },
        ]}
      />

      <CtaButton href={listingHref}>View your featured listing</CtaButton>

      <Divider />

      <H2>Turn the extra attention into buyers</H2>
      <Text style={{ ...t.small, margin: '0 0 6px' }}>
        The next {durationDays} days are your best window. These three things matter most.
      </Text>
      <ActionRow
        href={editHref}
        title="Polish your listing"
        description="8+ photos, a clear price, condition, title status and what's included."
      />
      <ActionRow
        href={editHref}
        title="Turn on offers"
        description="Most buyers start with an offer. You can set a private minimum."
      />
      <ActionRow
        href={offersHref}
        title="Reply fast"
        description="Answer questions and offers the same day. Fast replies close more deals."
      />

      <Divider />

      <P>
        No action is required to keep the placement. When it ends you can renew Featured from your
        dashboard if you'd like, entirely optional.
      </P>
      <P>Thank you for listing with {BRAND_NAME}.</P>

      <Text className="vb-ink" style={{ ...t.text, margin: '20px 0 0', fontWeight: 700 }}>Brad Pitman</Text>
      <Text style={{ ...t.small, margin: '2px 0 0' }}>Customer Success · {BRAND_NAME}</Text>

      <SupportRow note="Questions? Just reply to this email." />
    </VendibookEmailLayout>
  )
}

export const template = {
  component: ComplimentaryFeaturedBoostEmail,
  subject: (data: Record<string, any>) => {
    const days = Number(data?.durationDays) > 0 ? Number(data.durationDays) : 30
    return `Your listing is featured on ${BRAND_NAME} for ${days} days, on us`
  },
  displayName: 'Complimentary Featured Boost',
  previewData: {
    firstName: 'Alex',
    listingTitle: '2024 8x16 Turnkey Food Trailer',
    listingId: 'preview',
    expiresAtFormatted: 'October 19, 2026',
    durationDays: 14,
  },
} satisfies TemplateEntry
