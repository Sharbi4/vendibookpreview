import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Img, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { s, SITE_URL, SUPPORT_PHONE } from './_styles.ts'
import { BrandHeader, BlogHighlights, ToolsBlock } from './_blocks.tsx'

interface Props {
  hostName?: string
  listingTitle?: string
  listingId?: string
  category?: string
  city?: string
  coverImageUrl?: string
  // Optional — if absent, the referral section is hidden (no broken placeholders).
  referralCode?: string
  referralUrl?: string
}

// "Launch kit" listing-published email. Designed to feel like a celebration +
// a toolkit so the host immediately knows how to drive their first booking.
const E = ({
  hostName, listingTitle, listingId, category, city, coverImageUrl, referralCode, referralUrl,
}: Props) => {
  const liveUrl = listingId ? `${SITE_URL}/listing/${listingId}` : `${SITE_URL}/dashboard?tab=listings`
  const shareUrl = listingId ? liveUrl : `${SITE_URL}/dashboard?tab=share`
  const shareKitDashUrl = `${SITE_URL}/dashboard?tab=share`
  const boostUrl = `${SITE_URL}/dashboard?tab=listings`
  const editUrl = listingId ? `${SITE_URL}/edit-listing/${listingId}` : `${SITE_URL}/dashboard?tab=listings`

  const title = listingTitle || 'Your listing'
  const subjectLine = listingTitle ? `“${listingTitle}” is live` : 'Your listing is live'
  const where = city ? ` in ${city}` : ''

  // Pre-built share text. Templates are simple so they render reliably across clients.
  const tweetText = encodeURIComponent(`Just listed${listingTitle ? ` ${listingTitle}` : ''} on Vendibook${where}. Book or buy 👉`)
  const twitterUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(liveUrl)}&text=${tweetText}`
  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(liveUrl)}`
  const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(liveUrl)}`
  const smsBody = encodeURIComponent(`Check out my new Vendibook listing: ${liveUrl}`)
  const smsUrl = `sms:?&body=${smsBody}`

  const hasReferral = Boolean(referralUrl || referralCode)
  const safeReferralUrl = referralUrl || (referralCode ? `${SITE_URL}/r/${referralCode}` : `${SITE_URL}/referrals`)

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{subjectLine} — your launch kit is inside</Preview>
      <Body style={s.main}>
        <Container style={s.container}>
          <BrandHeader />

          <Section style={s.card}>
            {/* Celebration block */}
            <Text style={{ ...s.kicker, color: '#10b981' }}>● LIVE ON VENDIBOOK</Text>
            <Heading style={s.h1}>
              {hostName ? `${hostName}, ` : ''}you're live. Let's get your first booking.
            </Heading>
            <Text style={s.lede}>
              {`“${title}”`} is now visible to vendors searching across Vendibook{where}.
              The next 48 hours matter most — here's your launch kit.
            </Text>

            {/* Optional cover image */}
            {coverImageUrl ? (
              <Section style={{ margin: '0 0 24px' }}>
                <Img
                  src={coverImageUrl}
                  alt={title}
                  width="488"
                  style={{ display: 'block', width: '100%', maxWidth: '488px', height: 'auto', borderRadius: '12px', border: '1px solid #232323' }}
                />
              </Section>
            ) : null}

            {/* Quick facts */}
            {(category || city) ? (
              <Section style={s.detailGrid}>
                {category ? (
                  <>
                    <Text style={s.detailLabel}>CATEGORY</Text>
                    <Text style={s.detailValue}>{category}</Text>
                  </>
                ) : null}
                {category && city ? <Hr style={s.hrThin} /> : null}
                {city ? (
                  <>
                    <Text style={s.detailLabel}>LOCATION</Text>
                    <Text style={s.detailValue}>{city}</Text>
                  </>
                ) : null}
              </Section>
            ) : null}

            {/* Primary CTAs */}
            <Section style={s.ctaWrap}>
              <Button href={liveUrl} style={s.button}>View your live listing</Button>
            </Section>
            <Section style={{ margin: '6px 0 4px' }}>
              <Button href={shareKitDashUrl} style={s.buttonGhost}>Open your Share Kit</Button>
            </Section>

            <Hr style={s.hr} />

            {/* Share row */}
            <Text style={s.smallHeader}>SHARE IT EVERYWHERE</Text>
            <Text style={s.text}>
              First 48 hours drive the most views. Post once on every channel — we built shareable
              copy and graphics for you inside your Share Kit.
            </Text>
            <Text style={s.listItem}>
              →{' '}
              <a href={facebookUrl} style={{ color: '#FF5124', textDecoration: 'none', fontWeight: 600 }}>Share on Facebook</a>
            </Text>
            <Text style={s.listItem}>
              →{' '}
              <a href={twitterUrl} style={{ color: '#FF5124', textDecoration: 'none', fontWeight: 600 }}>Post on X / Twitter</a>
            </Text>
            <Text style={s.listItem}>
              →{' '}
              <a href={linkedinUrl} style={{ color: '#FF5124', textDecoration: 'none', fontWeight: 600 }}>Share on LinkedIn</a>
            </Text>
            <Text style={s.listItem}>
              →{' '}
              <a href={smsUrl} style={{ color: '#FF5124', textDecoration: 'none', fontWeight: 600 }}>Text the link to a friend</a>
            </Text>
            <Section style={{ ...s.accentRow, margin: '14px 0 0' }}>
              <Text style={s.accentLabel}>YOUR LISTING LINK</Text>
              <Text style={{ ...s.detailMono, color: '#FF5124', wordBreak: 'break-all' as const }}>{shareUrl}</Text>
            </Section>

            <Hr style={s.hr} />

            {/* Playbook */}
            <Text style={s.smallHeader}>YOUR 48-HOUR PLAYBOOK</Text>
            <Text style={s.listItem}>
              <strong style={{ color: '#fafafa' }}>1. Post on social today.</strong> Listings shared on day one
              get 3× the views of listings that aren't.
            </Text>
            <Text style={s.listItem}>
              <strong style={{ color: '#fafafa' }}>2. Add 5+ high-quality photos.</strong> Listings with 5+ photos
              book up to 3× faster.{' '}
              <a href={editUrl} style={{ color: '#FF5124', textDecoration: 'none', fontWeight: 600 }}>Edit photos →</a>
            </Text>
            <Text style={s.listItem}>
              <strong style={{ color: '#fafafa' }}>3. Enable Instant Book.</strong> Lifts conversion ~30% by letting
              vetted vendors book without a back-and-forth.
            </Text>
            <Text style={s.listItem}>
              <strong style={{ color: '#fafafa' }}>4. Pin to the top with Featured Boost.</strong> 30 days at the top
              of search and category pages.{' '}
              <a href={boostUrl} style={{ color: '#FF5124', textDecoration: 'none', fontWeight: 600 }}>Boost this listing →</a>
            </Text>

            {/* Tools + Blog (role=host) */}
            <ToolsBlock role="host" />
            <BlogHighlights role="host" />

            {/* Optional referral section — completely hidden if no data */}
            {hasReferral ? (
              <>
                <Hr style={s.hr} />
                <Text style={s.smallHeader}>EARN WHEN YOU REFER OTHER HOSTS</Text>
                <Text style={s.text}>
                  Share your referral link with other operators. When they list and complete their first
                  transaction, you both earn a credit.
                </Text>
                <Section style={s.accentRow}>
                  <Text style={s.accentLabel}>YOUR REFERRAL LINK</Text>
                  <Text style={{ ...s.detailMono, color: '#FF5124', wordBreak: 'break-all' as const }}>
                    {safeReferralUrl}
                  </Text>
                </Section>
                <Section style={{ margin: '8px 0 0' }}>
                  <Button href={safeReferralUrl} style={s.buttonGhost}>Open referral dashboard</Button>
                </Section>
              </>
            ) : null}
          </Section>

          <Text style={s.footnote}>
            Need a hand promoting your listing? Reply to this email or call {SUPPORT_PHONE}.
            Mon–Fri 9a–5p AZ.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: E,
  subject: (d: any) =>
    d?.listingTitle ? `🎉 “${d.listingTitle}” is live — your launch kit` : `Your listing is live — your launch kit`,
  displayName: 'Listing published',
  previewData: {
    hostName: 'Sam',
    listingTitle: 'Downtown Food Truck',
    listingId: 'demo',
    category: 'Food Truck',
    city: 'Austin',
  },
} satisfies TemplateEntry
