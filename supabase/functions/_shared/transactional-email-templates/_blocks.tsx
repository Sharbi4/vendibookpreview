/// <reference types="npm:@types/react@18.3.1" />
// Reusable Vendibook email content blocks:
//   - <BlogHighlights /> — smart-by-role article picks
//   - <ToolsBlock />     — role-aware Vendibook tools tour
//
// Templates pass `role` ('host' | 'shopper' | 'seller' | 'guest' | undefined)
// and these components pick relevant content with sane defaults so no trigger
// code has to know which articles or tools to feature.

import * as React from 'npm:react@18.3.1'
import { Button, Hr, Img, Section, Text } from 'npm:@react-email/components@0.0.22'
import { s, SITE_URL, LOGO_URL } from './_styles.ts'

// Editorial spot illustrations — flat hand-drawn, dark charcoal + orange.
// Hosted on the email-assets bucket so they load in every inbox.
export type HeroKind = 'celebrate' | 'booking' | 'payment' | 'message' | 'insight' | 'document'
const HERO_BASE = 'https://nbrehbwfsmedbelzntqs.supabase.co/storage/v1/object/public/email-assets'
const HERO_URLS: Record<HeroKind, string> = {
  celebrate: `${HERO_BASE}/hero-celebrate.png`,
  booking:   `${HERO_BASE}/hero-booking.png`,
  payment:   `${HERO_BASE}/hero-payment.png`,
  message:   `${HERO_BASE}/hero-message.png`,
  insight:   `${HERO_BASE}/hero-insight.png`,
  document:  `${HERO_BASE}/hero-document.png`,
}
const HERO_ALT: Record<HeroKind, string> = {
  celebrate: 'Celebration illustration',
  booking:   'Calendar illustration',
  payment:   'Receipt illustration',
  message:   'Speech bubbles illustration',
  insight:   'Chart illustration',
  document:  'Document illustration',
}

// Shared brand header used at the top of every email. Renders the wordmark plus
// either a real listing thumbnail (when supplied) or an editorial spot illustration.
// Passing `listingImageUrl` makes the email feel personalized to the recipient's
// actual listing; falls back to the `hero` illustration when no photo is available.
export const BrandHeader = ({
  hero,
  listingImageUrl,
  listingTitle,
  listingHref,
}: {
  hero?: HeroKind
  listingImageUrl?: string
  listingTitle?: string
  listingHref?: string
} = {}) => (
  <Section style={{ padding: '0 0 18px', textAlign: 'center' as const }}>
    <a href={SITE_URL} style={{ textDecoration: 'none', display: 'inline-block' }}>
      <Img
        src={LOGO_URL}
        alt="Vendibook"
        width="180"
        height="120"
        style={{ display: 'block', margin: '0 auto', border: 0, outline: 'none', maxWidth: '180px', height: 'auto' }}
      />
    </a>
    {listingImageUrl ? (
      <Section style={{ margin: '6px auto 0', maxWidth: '320px' }}>
        {listingHref ? (
          <a href={listingHref} style={{ textDecoration: 'none', display: 'block' }}>
            <Img
              src={listingImageUrl}
              alt={listingTitle || 'Listing photo'}
              width="320"
              style={{ display: 'block', margin: '0 auto', border: '1px solid #232323', borderRadius: '14px', width: '100%', maxWidth: '320px', height: 'auto' }}
            />
          </a>
        ) : (
          <Img
            src={listingImageUrl}
            alt={listingTitle || 'Listing photo'}
            width="320"
            style={{ display: 'block', margin: '0 auto', border: '1px solid #232323', borderRadius: '14px', width: '100%', maxWidth: '320px', height: 'auto' }}
          />
        )}
        {listingTitle ? (
          <Text style={{ fontSize: '12px', color: '#a3a3a3', textAlign: 'center' as const, margin: '8px 0 0', letterSpacing: '0.02em' }}>
            {listingTitle}
          </Text>
        ) : null}
      </Section>
    ) : null}
  </Section>
)

// Compact listing card used inline in cards/lists. Shows a real thumbnail next
// to title + meta so emails listing multiple items feel like the marketplace.
export const ListingPreviewCard = ({
  imageUrl,
  title,
  meta,
  href,
  priceLabel,
}: {
  imageUrl?: string
  title?: string
  meta?: string
  href?: string
  priceLabel?: string
}) => {
  const inner = (
    <Section style={{
      backgroundColor: '#0f0f10',
      border: '1px solid #232323',
      borderRadius: '14px',
      overflow: 'hidden' as const,
      margin: '0 0 12px',
    }}>
      {imageUrl ? (
        <Img
          src={imageUrl}
          alt={title || 'Listing'}
          width="520"
          style={{ display: 'block', width: '100%', maxWidth: '100%', height: 'auto', maxHeight: '220px', objectFit: 'cover' as const }}
        />
      ) : null}
      <Section style={{ padding: '14px 16px' }}>
        {meta ? (
          <Text style={{ fontSize: '10px', letterSpacing: '0.2em', color: '#FF5124', fontWeight: 700, margin: '0 0 4px' }}>
            {meta.toUpperCase()}
          </Text>
        ) : null}
        {title ? (
          <Text style={{ fontSize: '15px', color: '#fafafa', fontWeight: 600, margin: '0 0 4px' }}>{title}</Text>
        ) : null}
        {priceLabel ? (
          <Text style={{ fontSize: '13px', color: '#a3a3a3', margin: 0 }}>{priceLabel}</Text>
        ) : null}
      </Section>
    </Section>
  )
  return href ? <a href={href} style={{ textDecoration: 'none', display: 'block' }}>{inner}</a> : inner
}

// Tiny inline-SVG icon set. Inline SVG renders crisply in Apple Mail, Gmail web,
// iOS Mail, and Outlook.com. Falls back to whitespace in legacy clients (no
// broken-image icon) because we omit alt text and dimensions on a span wrapper.
type IconName = 'arrow' | 'star' | 'spark' | 'check' | 'bolt' | 'gift'
const ICONS: Record<IconName, string> = {
  arrow: '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  star:  '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3 7 7 .6-5.4 4.6 1.7 7L12 17.3 5.7 21.2l1.7-7L2 9.6 9 9z"/></svg>',
  spark: '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8z"/></svg>',
  check: '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5L20 7"/></svg>',
  bolt:  '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L3 14h7l-1 8 10-12h-7z"/></svg>',
  gift:  '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="8" width="18" height="13" rx="1"/><path d="M3 12h18M12 8v13M7 8a3 3 0 010-6c2 0 3 2 5 6-3 0-5 0-5 0zM17 8a3 3 0 000-6c-2 0-3 2-5 6 3 0 5 0 5 0z"/></svg>',
}
export const Icon = ({ name, color = '#FF5124' }: { name: IconName; color?: string }) => (
  <span
    style={{ display: 'inline-block', verticalAlign: '-2px', color, lineHeight: 0, marginRight: '6px' }}
    dangerouslySetInnerHTML={{ __html: ICONS[name] }}
  />
)

export type Role = 'host' | 'shopper' | 'seller' | 'guest' | string | undefined

interface BlogPick { slug: string; title: string; eyebrow: string }

// Curated evergreen picks. Slugs verified against src/data/blogPosts.ts.
const HOST_PICKS: BlogPick[] = [
  { slug: 'stand-out-food-truck-marketplace-tools', eyebrow: 'Host playbook',  title: 'How to make your listing stand out (and book faster)' },
  { slug: 'parked-food-truck-losing-money-rent-it-out', eyebrow: 'Earn more', title: 'Parked truck losing money? Rent it out the right way' },
]
const SELLER_PICKS: BlogPick[] = [
  { slug: 'sell-my-food-truck-valuation-guide-2026', eyebrow: 'Selling guide', title: 'What’s my food truck actually worth? A 2026 valuation guide' },
  { slug: 'sell-vs-rent-food-trailer-truck-ghost-kitchen', eyebrow: 'Strategy',  title: 'Sell vs. rent: which makes you more money?' },
]
const SHOPPER_PICKS: BlogPick[] = [
  { slug: 'how-to-start-food-truck-business-2025', eyebrow: 'Getting started', title: 'How to start a food truck business in 2026' },
  { slug: 'food-truck-vs-food-trailer-which-is-right', eyebrow: 'Buyer’s guide', title: 'Food truck vs. food trailer — which is right for you?' },
]
const GENERAL_PICKS: BlogPick[] = [
  { slug: 'new-exit-plan-food-truck-after-layoffs', eyebrow: 'Featured', title: 'The new exit plan: a food truck, a recipe, a fresh start' },
  { slug: 'modern-food-truck-marketplace-2026', eyebrow: 'Industry', title: 'Inside the modern food truck marketplace (2026)' },
]

function pickArticles(role: Role): BlogPick[] {
  if (role === 'host') return HOST_PICKS
  if (role === 'seller') return SELLER_PICKS
  if (role === 'shopper' || role === 'guest') return SHOPPER_PICKS
  return GENERAL_PICKS
}

export const BlogHighlights = ({ role, posts }: { role?: Role; posts?: BlogPick[] }) => {
  const list = posts && posts.length ? posts : pickArticles(role)
  return (
    <>
      <Hr style={s.hr} />
      <Text style={s.smallHeader}><Icon name="spark" />FROM THE VENDIBOOK BLOG</Text>
      {list.slice(0, 2).map((p) => (
        <Section key={p.slug} style={{ margin: '0 0 14px' }}>
          <Text style={{ fontSize: '10px', letterSpacing: '0.2em', color: '#FF5124', fontWeight: 700, margin: '0 0 4px' }}>
            {p.eyebrow.toUpperCase()}
          </Text>
          <Text style={{ fontSize: '15px', lineHeight: 1.45, color: '#fafafa', fontWeight: 600, margin: '0 0 6px' }}>
            <a href={`${SITE_URL}/blog/${p.slug}`} style={{ color: '#fafafa', textDecoration: 'none' }}>
              {p.title}
            </a>
          </Text>
          <Text style={{ fontSize: '12px', margin: 0 }}>
            <a href={`${SITE_URL}/blog/${p.slug}`} style={{ color: '#FF5124', textDecoration: 'none', fontWeight: 600 }}>
              Read article →
            </a>
          </Text>
        </Section>
      ))}
      <Text style={{ fontSize: '12px', margin: '6px 0 0' }}>
        <a href={`${SITE_URL}/blog`} style={{ color: '#a3a3a3', textDecoration: 'none' }}>
          Browse all articles →
        </a>
      </Text>
    </>
  )
}

interface Tool { label: string; href: string; desc: string }

const HOST_TOOLS: Tool[] = [
  { label: 'Featured Boost',     href: `${SITE_URL}/host/listings`,                       desc: 'Pin your listing to the top for 30 days.' },
  { label: 'Share Kit',          href: `${SITE_URL}/host/listings`,                       desc: 'Auto-generated social posts, QR signs, and link.' },
  { label: 'Startup Cost Tool',  href: `${SITE_URL}/tools/food-truck-startup-costs-2026`, desc: 'Benchmark your numbers against the market.' },
]
const SELLER_TOOLS: Tool[] = [
  { label: 'Listing Wizard',     href: `${SITE_URL}/list`,                                desc: 'Publish a sale listing in under 5 minutes.' },
  { label: 'Market Research',    href: `${SITE_URL}/tools/market-radar`,                  desc: 'See what similar trucks sold for recently.' },
  { label: 'Share Kit',          href: `${SITE_URL}/host/listings`,                       desc: 'Cross-post to FB Marketplace, IG, and more.' },
]
const SHOPPER_TOOLS: Tool[] = [
  { label: 'Browse Marketplace', href: `${SITE_URL}/browse`,                         desc: 'Trucks, trailers, ghost kitchens, vendor lots.' },
  { label: 'Match Me',           href: `${SITE_URL}/browse?intent=match`,            desc: 'Tell us what you need — we surface the best matches.' },
  { label: 'Startup Guide',      href: `${SITE_URL}/tools/startup-guide`,            desc: 'Free playbook for first-time food entrepreneurs.' },
]

function pickTools(role: Role): Tool[] {
  if (role === 'host') return HOST_TOOLS
  if (role === 'seller') return SELLER_TOOLS
  if (role === 'shopper' || role === 'guest') return SHOPPER_TOOLS
  return SHOPPER_TOOLS
}

export const ToolsBlock = ({ role, tools }: { role?: Role; tools?: Tool[] }) => {
  const list = tools && tools.length ? tools : pickTools(role)
  return (
    <>
      <Hr style={s.hr} />
      <Text style={s.smallHeader}><Icon name="bolt" />TOOLS BUILT FOR YOU</Text>
      {list.slice(0, 3).map((t) => (
        <Text key={t.label} style={s.listItem}>
          <Icon name="arrow" /><a href={t.href} style={{ color: '#FF5124', textDecoration: 'none', fontWeight: 600 }}>{t.label}</a>
          <span style={{ color: '#a3a3a3' }}> — {t.desc}</span>
        </Text>
      ))}
      <Section style={{ margin: '14px 0 0' }}>
        <Button href={`${SITE_URL}/dashboard`} style={s.buttonGhost}>Open your dashboard</Button>
      </Section>
    </>
  )
}

// ─────────────────────────────────────────────────────────────
// TermsBlock — renders the immutable transaction_terms snapshot
// (pricing lines, cancellation policy, acknowledgements, version).
// Shared by booking + cash sale templates so every confirmation
// email shows the exact same policy/total snapshot the user agreed to.
// ─────────────────────────────────────────────────────────────
export interface TermsLine { label: string; amountCents: number; kind?: string; hint?: string }
export interface TermsSnapshot {
  termsVersion?: string
  pricing?: { lines?: TermsLine[]; total?: number }
  policies?: { cancellation?: string; acknowledgements?: string[] }
}

const termsMoney = (c: number) => `$${(Number(c || 0) / 100).toFixed(2)}`

export const TermsBlock = ({ snap, version }: { snap?: TermsSnapshot; version?: string }) => {
  const lines = snap?.pricing?.lines ?? []
  const acks = snap?.policies?.acknowledgements ?? []
  const cancellation = snap?.policies?.cancellation
  const v = version || snap?.termsVersion
  if (!lines.length && !cancellation && !acks.length) return null
  return (
    <Section style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, margin: '16px 0', background: '#ffffff' }}>
      <Text style={{ fontWeight: 600, color: '#111827', margin: '0 0 8px' }}>What you agreed to</Text>
      {lines.map((l, i) => (
        <Text key={i} style={{ margin: '4px 0', color: l.kind === 'total' ? '#111827' : '#374151', fontWeight: l.kind === 'total' ? 600 : 400, fontSize: 14 }}>
          {l.label}: {termsMoney(l.amountCents)}
        </Text>
      ))}
      {cancellation && (
        <>
          <Text style={{ fontWeight: 600, color: '#111827', margin: '12px 0 4px', fontSize: 13 }}>Cancellation policy</Text>
          <Text style={{ color: '#374151', fontSize: 13, margin: 0 }}>{cancellation}</Text>
        </>
      )}
      {acks.length > 0 && acks.map((a, i) => (
        <Text key={`ack-${i}`} style={{ color: '#374151', fontSize: 13, margin: '4px 0 0' }}>• {a}</Text>
      ))}
      {v ? <Text style={{ color: '#6b7280', fontSize: 12, margin: '12px 0 0' }}>Terms version {v}</Text> : null}
    </Section>
  )
}
