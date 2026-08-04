import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Img, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { s, SITE_URL, SUPPORT_PHONE } from './_styles.ts'
import { BlogHighlights, BrandFooter, BrandHeader, ToolsBlock } from './_blocks.tsx'

interface Props {
  hostName?: string
  listingTitle?: string
  listingId?: string
  category?: string
  city?: string
  coverImageUrl?: string
  // 'rental' → push Instant Book. 'sale' → push Featured Boost. 'both' → show both. Defaults to 'rental'.
  listingType?: 'rental' | 'sale' | 'both'
  // Optional — if absent, the referral section is hidden (no broken placeholders).
  referralCode?: string
  referralUrl?: string
}

// "Launch kit" listing-published email. Designed to feel like a celebration +
// a toolkit so the host immediately knows how to drive their first booking.
const E = ({
  hostName, listingTitle, listingId, category, city, coverImageUrl, listingType, referralCode, referralUrl,
}: Props) => {
  const liveUrl = listingId ? `${SITE_URL}/listing/${listingId}` : `${SITE_URL}/host/listings`
  const shareUrl = listingId ? liveUrl : `${SITE_URL}/host/listings`
  const shareKitDashUrl = listingId ? `${SITE_URL}/listing-published/${listingId}` : `${SITE_URL}/host/listings`
  const boostUrl = listingId
    ? `${SITE_URL}/host/listings?boost=${listingId}`
    : `${SITE_URL}/host/listings`
  const instantBookUrl = listingId
    ? `${SITE_URL}/create-listing/${listingId}?focus=instant-book`
    : `${SITE_URL}/host/listings`
  const editUrl = listingId ? `${SITE_URL}/create-listing/${listingId}` : `${SITE_URL}/host/listings`
  const kind: 'rental' | 'sale' | 'both' = listingType || 'rental'
  const showInstantBook = kind === 'rental' || kind === 'both'
  const showFeaturedBoost = kind === 'sale' || kind === 'both'

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
  const safeReferralUrl = referralUrl || (referralCode ? `${SITE_URL}/r/${referralCode}` : `${SITE_URL}/referral`)

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{subjectLine} — your launch kit is inside</Preview>
      <Body style={s.main}>
        <Container style={s.container}>
          <BrandHeader hero="celebrate" listingImageUrl={coverImageUrl} listingTitle={listingTitle} />

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

            {/* Where to share — places + why + copy-this examples */}
            <Text style={s.smallHeader}>WHERE TO PUT YOUR VENDIBOOK LINK</Text>
            <Text style={s.text}>
              Your listing gives people one clean place to see photos, pricing, availability,
              and next steps. Drop your link anywhere people already find you so they can
              learn more and act faster.
            </Text>

            {[
              {
                where: 'Facebook Marketplace',
                why: 'Marketplace gets attention, but people need details before they reach out. Your Vendibook link gives them a cleaner place to see the full offer.',
                copy: 'See full details, photos, pricing, and availability here:\n' + shareUrl,
              },
              {
                where: 'Facebook groups',
                why: 'Local food truck, vendor, farmers market, commissary, and small business groups are full of people already looking. Your link makes your post easier to trust and act on.',
                copy: 'I listed this on Vendibook so everything is in one place. View the full details here:\n' + shareUrl,
              },
              {
                where: 'Instagram bio, story, or highlights',
                why: 'Posts and stories disappear fast. Your listing link gives interested people a next step without making them DM you for basics.',
                copy: 'Now available on Vendibook. Full listing here:\n' + shareUrl,
              },
              {
                where: 'TikTok bio or caption',
                why: 'A short video creates interest fast. The listing link turns viewers into real leads instead of comments asking for details.',
                copy: 'Full details are on Vendibook. Link in bio:\n' + shareUrl,
              },
              {
                where: 'Craigslist & other classifieds',
                why: 'Classified posts feel limited. Your Vendibook link gives interested people a more professional, complete view of the listing.',
                copy: 'For more photos, details, pricing, and booking steps, view the Vendibook listing here:\n' + shareUrl,
              },
              {
                where: 'Text messages & DMs',
                why: 'Instead of typing the same answers over and over, send one clean link that explains the listing clearly.',
                copy: 'Here\u2019s the full listing with photos, pricing, details, and next steps:\n' + shareUrl,
              },
              {
                where: 'Email signature',
                why: 'Every email you already send becomes a quiet promotion for your listing.',
                copy: 'View my Vendibook listing:\n' + shareUrl,
              },
              {
                where: 'Your own website or landing page',
                why: 'Your site explains who you are. Vendibook organizes the listing details, availability, and booking flow in one tidy place.',
                copy: 'View availability and listing details on Vendibook:\n' + shareUrl,
              },
            ].map((tip) => (
              <Section
                key={tip.where}
                style={{
                  backgroundColor: '#141414',
                  border: '1px solid #232323',
                  borderRadius: '12px',
                  padding: '16px 18px',
                  margin: '0 0 12px',
                }}
              >
                <Text style={{ ...s.detailLabel, color: '#FF5124' }}>WHERE TO SHARE</Text>
                <Text style={{ fontSize: '15px', color: '#fafafa', fontWeight: 600, margin: '0 0 10px' }}>
                  {tip.where}
                </Text>
                <Text style={{ fontSize: '13px', color: '#a3a3a3', lineHeight: 1.55, margin: '0 0 10px' }}>
                  <strong style={{ color: '#d4d4d4' }}>Why it helps: </strong>{tip.why}
                </Text>
                <Text style={{ ...s.detailLabel, margin: '0 0 4px' }}>COPY THIS</Text>
                <Text
                  style={{
                    fontSize: '13px',
                    color: '#fafafa',
                    lineHeight: 1.5,
                    margin: 0,
                    padding: '10px 12px',
                    backgroundColor: '#0a0a0a',
                    border: '1px solid #1f1f1f',
                    borderRadius: '8px',
                    whiteSpace: 'pre-wrap' as const,
                    wordBreak: 'break-word' as const,
                  }}
                >
                  {tip.copy}
                </Text>
              </Section>
            ))}

            <Section style={{ margin: '14px 0 4px' }}>
              <Button href={shareKitDashUrl} style={s.button}>Copy my listing link</Button>
            </Section>
            <Text style={{ ...s.small, textAlign: 'center' as const, margin: '6px 0 0' }}>
              Opens your Share Kit with one-tap copy + ready-made graphics.
            </Text>

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
              <strong style={{ color: '#fafafa' }}>3. {showInstantBook ? 'Enable Instant Book.' : 'Make it a Featured listing.'}</strong>{' '}
              {showInstantBook ? (
                <>
                  Lifts rental conversion ~30% by letting vetted vendors book without back-and-forth.{' '}
                  <a href={instantBookUrl} style={{ color: '#FF5124', textDecoration: 'none', fontWeight: 600 }}>Turn on Instant Book →</a>
                </>
              ) : (
                <>
                  Boosted items sell faster — your listing pins to the top of search and category pages for 30 days.{' '}
                  <a href={boostUrl} style={{ color: '#FF5124', textDecoration: 'none', fontWeight: 600 }}>Make it Featured →</a>
                </>
              )}
            </Text>
            {kind === 'both' ? (
              <Text style={s.listItem}>
                <strong style={{ color: '#fafafa' }}>4. Pin to the top with Featured Boost.</strong> 30 days at the top
                of search and category pages.{' '}
                <a href={boostUrl} style={{ color: '#FF5124', textDecoration: 'none', fontWeight: 600 }}>Boost this listing →</a>
              </Text>
            ) : showInstantBook ? (
              <Text style={s.listItem}>
                <strong style={{ color: '#fafafa' }}>4. Pin to the top with Featured Boost.</strong> 30 days at the top
                of search and category pages.{' '}
                <a href={boostUrl} style={{ color: '#FF5124', textDecoration: 'none', fontWeight: 600 }}>Boost this listing →</a>
              </Text>
            ) : (
              <Text style={s.listItem}>
                <strong style={{ color: '#fafafa' }}>4. Answer buyer questions fast.</strong> Sellers who reply within an hour
                close ~2× more deals.{' '}
                <a href={`${SITE_URL}/messages`} style={{ color: '#FF5124', textDecoration: 'none', fontWeight: 600 }}>Open messages →</a>
              </Text>
            )}

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
        <BrandFooter /></Container>
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
    listingTitle: 'Downtown Food Truck', coverImageUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&q=80', listingId: 'demo',
    category: 'Food Truck',
    city: 'Austin',
  },
} satisfies TemplateEntry
