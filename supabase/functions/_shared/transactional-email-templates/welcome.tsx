import * as React from 'npm:react@18.3.1'
import { Link, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import {
  Bullets,
  CtaButton,
  Divider,
  Eyebrow,
  H1,
  H2,
  Lede,
  P,
  SectionLabel,
  SupportRow,
  VendibookEmailLayout,
  BRAND_NAME,
  SITE_URL,
} from '../email-brand/components.tsx'
import { color, t } from '../email-brand/tokens.ts'

// ---- Verified live routes (checked against src/App.tsx) --------------
const URL = {
  browse: `${SITE_URL}/browse`,
  list: `${SITE_URL}/list`,
  sellGuide: `${SITE_URL}/sell-my-food-truck`,
  financing: `${SITE_URL}/financing`,
  permitPath: `${SITE_URL}/tools/permitpath`,
  help: `${SITE_URL}/help`,
  blog: `${SITE_URL}/blog`,
  dashboard: `${SITE_URL}/dashboard`,
  howItWorks: `${SITE_URL}/how-it-works`,
} as const

// ---- Verified live blog slugs (src/data/blogPosts.ts) ----------------
const ARTICLES = {
  start: {
    href: `${SITE_URL}/blog/how-to-start-food-truck-business-2025`,
    title: 'How to start a food truck business',
    blurb: 'The realistic path from concept to first service window.',
  },
  valuation: {
    href: `${SITE_URL}/blog/sell-my-food-truck-valuation-guide-2026`,
    title: 'What is my food truck actually worth?',
    blurb: 'A pricing guide before you publish your listing.',
  },
  financing: {
    href: `${SITE_URL}/blog/food-truck-financing-options`,
    title: 'Food truck financing options',
    blurb: 'How buyers fund equipment purchases today.',
  },
  permits: {
    href: `${SITE_URL}/blog/mobile-food-permit-guide-by-state`,
    title: 'Mobile food permit guide by state',
    blurb: 'What you need before you can legally operate.',
  },
} as const

// ---- Small local blocks (kept inside this template) -------------------
const LinkRow = ({ href, title, blurb }: { href: string; title: string; blurb?: string }) => (
  <Section
    style={{
      backgroundColor: color.surfaceMuted,
      border: `1px solid ${color.border}`,
      borderRadius: '12px',
      padding: '14px 16px',
      margin: '0 0 10px',
    }}
  >
    <Text style={{ margin: 0, fontSize: '15px', lineHeight: 1.4, fontWeight: 700 }}>
      <Link href={href} style={{ color: color.primaryDark, textDecoration: 'none' }}>
        {title}
      </Link>
    </Text>
    {blurb ? (
      <Text style={{ margin: '4px 0 0', fontSize: '13px', lineHeight: 1.5, color: color.textMuted }}>
        {blurb}
      </Text>
    ) : null}
  </Section>
)

const InlineLink = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <Link href={href} style={t.link}>{children}</Link>
)

interface WelcomeProps {
  name?: string
  role?: 'host' | 'shopper' | string
}

const WelcomeEmail = ({ name, role }: WelcomeProps) => {
  const isHost = role === 'host'
  const isShopper = role === 'shopper'

  return (
    <VendibookEmailLayout preview={`Welcome to ${BRAND_NAME} — here's how to get the most out of it`}>
      <Eyebrow>Welcome aboard</Eyebrow>
      <H1>{name ? `Welcome, ${name}.` : 'Welcome.'}</H1>
      <Lede>
        You've joined the marketplace built for mobile food entrepreneurs — trucks, trailers,
        ghost kitchens, and vendor lots, all in one place. Here's a short guide to what's worth
        doing first.
      </Lede>

      <CtaButton href={isHost ? URL.list : URL.browse}>
        {isHost ? 'Start your listing' : 'Browse the marketplace'}
      </CtaButton>

      <Divider />

      <SectionLabel>What you can do on Vendibook</SectionLabel>
      <Bullets
        items={[
          'Buy or rent trucks, trailers, ghost kitchens, and vendor lots.',
          'List your own equipment for sale or rent — self-service listings are free.',
          'Check out online, or arrange payment in person with the other party.',
          'Add optional identity verification to earn a Verified Seller badge.',
        ]}
      />

      <Divider />

      <H2>Selling or renting out equipment?</H2>
      <P>
        Publishing a listing is free. Add clear photos, real specs, and your terms — then
        decide whether to accept online checkout or handle payment in person.
      </P>
      <CtaButton href={URL.list}>Create a listing</CtaButton>
      <LinkRow
        href={URL.sellGuide}
        title="Seller guide: sell my food truck"
        blurb="Pricing, photos, and what buyers look for."
      />
      <LinkRow href={ARTICLES.valuation.href} title={ARTICLES.valuation.title} blurb={ARTICLES.valuation.blurb} />

      <Divider />

      <H2>Buying?</H2>
      <P>
        Search by location, category, and budget. Financing is available on eligible for-sale
        equipment through our financing partners — approval and terms are set by the lender.
      </P>
      <LinkRow href={URL.browse} title="Browse for-sale and rental listings" blurb="Filter by city, category, and price." />
      <LinkRow href={URL.financing} title="Equipment financing" blurb="See how buyer financing works on eligible listings." />

      <Divider />

      <SectionLabel>Useful tools &amp; resources</SectionLabel>
      <LinkRow href={URL.permitPath} title="PermitPath" blurb="Build a permit checklist for where you plan to operate." />
      <LinkRow href={URL.howItWorks} title="How Vendibook works" blurb="Booking, checkout, and payouts explained." />
      <LinkRow href={URL.help} title="Help Center" blurb="Answers on listings, payments, and bookings." />

      <Divider />

      <SectionLabel>Recommended reading</SectionLabel>
      <LinkRow href={ARTICLES.start.href} title={ARTICLES.start.title} blurb={ARTICLES.start.blurb} />
      <LinkRow href={ARTICLES.permits.href} title={ARTICLES.permits.title} blurb={ARTICLES.permits.blurb} />
      {isShopper ? (
        <LinkRow href={ARTICLES.financing.href} title={ARTICLES.financing.title} blurb={ARTICLES.financing.blurb} />
      ) : null}
      <Text style={{ ...t.small, margin: '2px 0 0' }}>
        More on the <InlineLink href={URL.blog}>Vendibook blog</InlineLink> · Manage your account
        anytime from your <InlineLink href={URL.dashboard}>dashboard</InlineLink>.
      </Text>

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
