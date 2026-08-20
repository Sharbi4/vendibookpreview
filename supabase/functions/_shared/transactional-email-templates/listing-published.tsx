import * as React from 'npm:react@18.3.1'
import { Img, Link, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import {
  Bullets,
  CtaButton,
  DetailTable,
  Divider,
  Eyebrow,
  H1,
  Lede,
  SITE_URL,
  SecondaryButton,
  SectionLabel,
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
  // 'rental' → Instant Book tip. 'sale' → Featured Boost tip. 'both' → show both.
  listingType?: 'rental' | 'sale' | 'both'
  // Optional — if absent, the referral section is hidden (no broken placeholders).
  referralCode?: string
  referralUrl?: string
}

const E = ({
  hostName, listingTitle, listingId, category, city, coverImageUrl, listingType,
  referralCode, referralUrl,
}: Props) => {
  const liveUrl = listingId ? `${SITE_URL}/listing/${listingId}` : `${SITE_URL}/host/listings`
  const shareKitUrl = listingId ? `${SITE_URL}/listing-published/${listingId}` : `${SITE_URL}/host/listings`
  const boostUrl = listingId ? `${SITE_URL}/host/listings?boost=${listingId}` : `${SITE_URL}/host/listings`
  const instantBookUrl = listingId
    ? `${SITE_URL}/create-listing/${listingId}?focus=instant-book`
    : `${SITE_URL}/host/listings`

  const kind: 'rental' | 'sale' | 'both' = listingType || 'rental'
  const showInstantBook = kind === 'rental' || kind === 'both'
  const showFeaturedBoost = kind === 'sale' || kind === 'both'

  const title = listingTitle || 'Your listing'
  const where = city ? ` in ${city}` : ''

  const tweetText = encodeURIComponent(
    `Just listed${listingTitle ? ` ${listingTitle}` : ''} on Vendibook${where}.`,
  )
  const twitterUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(liveUrl)}&text=${tweetText}`
  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(liveUrl)}`
  const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(liveUrl)}`
  const smsUrl = `sms:?&body=${encodeURIComponent(`Check out my new Vendibook listing: ${liveUrl}`)}`

  const hasReferral = Boolean(referralUrl || referralCode)
  const safeReferralUrl = referralUrl || (referralCode ? `${SITE_URL}/r/${referralCode}` : `${SITE_URL}/referral`)

  const shareLink = (href: string, label: string) => (
    <Text style={t.listItem}>
      <Link href={href} style={t.link}>{label}</Link>
    </Text>
  )

  return (
    <VendibookEmailLayout
      preview={`${listingTitle ? `“${listingTitle}”` : 'Your listing'} is live on Vendibook`}
    >
      <Eyebrow>Live on Vendibook</Eyebrow>
      <H1>{hostName ? `${hostName}, your listing is live` : 'Your listing is live'}</H1>
      <Lede>
        {`“${title}”`} is published and visible to people searching Vendibook{where}. Here's
        everything you need to share it.
      </Lede>

      {coverImageUrl ? (
        <Section style={{ margin: '0 0 20px' }}>
          <Img
            src={coverImageUrl}
            alt={title}
            width="544"
            style={{
              display: 'block',
              width: '100%',
              maxWidth: '544px',
              height: 'auto',
              borderRadius: '12px',
              border: `1px solid ${color.border}`,
            }}
          />
        </Section>
      ) : null}

      <DetailTable
        rows={[
          { label: 'Category', value: category },
          { label: 'Location', value: city },
          { label: 'Listing link', value: liveUrl, mono: true },
        ]}
      />

      <CtaButton href={liveUrl}>View your live listing</CtaButton>
      <SecondaryButton href={shareKitUrl}>Open your Share Kit</SecondaryButton>

      <Divider />

      <SectionLabel>Share your listing</SectionLabel>
      <Text style={t.text}>
        Your listing gives people one place to see photos, pricing, availability and next steps.
        Post the link anywhere people already find you.
      </Text>
      {shareLink(facebookUrl, 'Share on Facebook')}
      {shareLink(twitterUrl, 'Post on X / Twitter')}
      {shareLink(linkedinUrl, 'Share on LinkedIn')}
      {shareLink(smsUrl, 'Text the link to someone')}

      <Divider />

      <SectionLabel>Optional next steps</SectionLabel>
      <Bullets
        items={[
          ...(showInstantBook
            ? [
                <>
                  Turn on Instant Book so renters can reserve without waiting for approval —{' '}
                  <Link href={instantBookUrl} style={t.link}>update your settings</Link>.
                </>,
              ]
            : []),
          ...(showFeaturedBoost
            ? [
                <>
                  Add a Featured Boost to place your listing higher in search —{' '}
                  <Link href={boostUrl} style={t.link}>see boost options</Link>.
                </>,
              ]
            : []),
          <>
            Keep photos, pricing and availability current — you can edit your listing at any time.
          </>,
        ]}
      />

      {hasReferral ? (
        <>
          <Divider />
          <SectionLabel>Your referral link</SectionLabel>
          <Text style={t.text}>
            Invite other owners and operators with your link:{' '}
            <Link href={safeReferralUrl} style={t.link}>{safeReferralUrl}</Link>
          </Text>
        </>
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
