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

// Shared brand header used at the top of every email. Renders the same wordmark
// as the homepage hero, sized for inbox visibility (~180px wide).
export const BrandHeader = () => (
  <Section style={{ padding: '0 0 22px', textAlign: 'center' as const }}>
    <a href={SITE_URL} style={{ textDecoration: 'none', display: 'inline-block' }}>
      <Img
        src={LOGO_URL}
        alt="Vendibook"
        width="180"
        height="120"
        style={{ display: 'block', margin: '0 auto', border: 0, outline: 'none', maxWidth: '180px', height: 'auto' }}
      />
    </a>
  </Section>
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
      <Text style={s.smallHeader}>FROM THE VENDIBOOK BLOG</Text>
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
      <Text style={s.smallHeader}>TOOLS BUILT FOR YOU</Text>
      {list.slice(0, 3).map((t) => (
        <Text key={t.label} style={s.listItem}>
          → <a href={t.href} style={{ color: '#FF5124', textDecoration: 'none', fontWeight: 600 }}>{t.label}</a>
          <span style={{ color: '#a3a3a3' }}> — {t.desc}</span>
        </Text>
      ))}
      <Section style={{ margin: '14px 0 0' }}>
        <Button href={`${SITE_URL}/dashboard`} style={s.buttonGhost}>Open your dashboard</Button>
      </Section>
    </>
  )
}
