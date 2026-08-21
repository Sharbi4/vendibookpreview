import * as React from 'npm:react@18.3.1'
import { Img, Link, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import {
  ActionRow,
  CtaButton,
  Divider,
  H1,
  H2,
  Lede,
  SITE_URL,
  StatusChip,
  SupportRow,
  VendibookEmailLayout,
  color,
  t,
} from '../email-brand/components.tsx'

interface Props {
  hostName?: string
  listingTitle?: string
  listingId?: string
  category?: string
  city?: string
  coverImageUrl?: string
  // 'rental' → Instant Book tip. 'sale' → financing + boost. 'both' → both.
  listingType?: 'rental' | 'sale' | 'both'
  referralCode?: string
  referralUrl?: string
}

const E = ({
  hostName, listingTitle, listingId, category, city, coverImageUrl, listingType,
  referralCode, referralUrl,
}: Props) => {
  const liveUrl = listingId ? `${SITE_URL}/listing/${listingId}` : `${SITE_URL}/host/listings`
  const shareKitUrl = listingId ? `${SITE_URL}/listing-published/${listingId}` : `${SITE_URL}/host/listings`
  const manageUrl = listingId ? `${SITE_URL}/create-listing/${listingId}` : `${SITE_URL}/host/listings`
  const boostUrl = listingId ? `${SITE_URL}/host/listings?boost=${listingId}` : `${SITE_URL}/host/listings`

  const kind: 'rental' | 'sale' | 'both' = listingType || 'rental'
  const forSale = kind === 'sale' || kind === 'both'

  const title = listingTitle || 'Your listing'
  const where = city ? ` in ${city}` : ''
  const meta = [category, city].filter(Boolean).join(' · ')

  const hasReferral = Boolean(referralUrl || referralCode)
  const safeReferralUrl = referralUrl || (referralCode ? `${SITE_URL}/r/${referralCode}` : `${SITE_URL}/referral`)

  return (
    <VendibookEmailLayout
      preview={`${listingTitle ? `“${listingTitle}”` : 'Your listing'} is live on Vendibook`}
      logoWidth={132}
    >
      <StatusChip label="Published" tone="success" />
      <H1>{hostName ? `${hostName}, your listing is live.` : 'Your listing is live.'}</H1>
      <Lede>
        {`“${title}”`} is published and discoverable by people searching Vendibook{where}.
      </Lede>

      {coverImageUrl ? (
        <Section style={{ margin: '0 0 14px' }}>
          <Img
            src={coverImageUrl}
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

      <Text className="vb-ink" style={{ ...t.text, margin: '0 0 2px', fontWeight: 700 }}>{title}</Text>
      {meta ? <Text style={{ ...t.small, margin: '0 0 16px' }}>{meta}</Text> : null}

      <CtaButton href={liveUrl}>View your live listing</CtaButton>

      <Divider />

      {/* ---- Seller success module ---- */}
      <H2>Your listing is live. Now get it seen.</H2>
      <Text style={{ ...t.small, margin: '0 0 6px' }}>
        Three things that move listings fastest on Vendibook.
      </Text>

      <ActionRow
        href={shareKitUrl}
        title="Share your listing"
        description="Ready-made links and images for social, text and email."
      />
      <ActionRow
        href={manageUrl}
        title="Improve your listing"
        description="Better photos, pricing and details win more enquiries."
      />
      <ActionRow
        href={boostUrl}
        title="Boost visibility"
        description="Featured Boost places your listing higher in search results."
      />

      {forSale ? (
        <>
          <Divider />
          <Text style={{ ...t.small, margin: 0 }}>
            Buyer financing is available on eligible for-sale equipment through our lending partner,
            subject to approval.{' '}
            <Link href={`${SITE_URL}/financing`} style={t.link}>How financing works</Link>.
          </Text>
        </>
      ) : null}

      {hasReferral ? (
        <Text style={{ ...t.small, margin: '10px 0 0' }}>
          Invite other owners and operators:{' '}
          <Link href={safeReferralUrl} style={t.link}>{safeReferralUrl}</Link>
        </Text>
      ) : null}

      <SupportRow />
    </VendibookEmailLayout>
  )
}

export const template = {
  component: E,
  subject: (d: Record<string, any>) =>
    d?.listingTitle ? `“${d.listingTitle}” is live on Vendibook` : 'Your listing is live on Vendibook',
  displayName: 'Listing published',
  previewData: {
    hostName: 'Sam',
    listingTitle: 'Downtown Food Truck',
    listingId: 'demo',
    category: 'Food truck',
    city: 'Tucson, AZ',
    listingType: 'both',
    coverImageUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&q=80',
  },
} satisfies TemplateEntry
