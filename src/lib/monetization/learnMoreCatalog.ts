/**
 * Curated "Learn more" content for every sellable product.
 *
 * Keyed by monetization_products.slug. Each entry is optional — the overlay
 * derives sensible defaults from the product row (features, price, refund
 * policy). Curated entries override those defaults with outcome-focused copy
 * and real screenshots captured from the running app.
 */
import {
  BarChart3, Calendar, Camera, DollarSign, FileCheck, Flame,
  Layers, LineChart, Megaphone, Rocket, Search, ShieldCheck,
  Sparkle, TrendingUp, Users, Wrench, Zap, type LucideIcon,
} from 'lucide-react';

import permitpathShot from '@/assets/tool-previews/permitpath.jpg';
import pricepilotShot from '@/assets/tool-previews/pricepilot.jpg';
import listingStudioShot from '@/assets/tool-previews/listing-studio.jpg';
import marketingStudioShot from '@/assets/tool-previews/marketing-studio.jpg';
import buildkitShot from '@/assets/tool-previews/buildkit.jpg';
import marketRadarShot from '@/assets/tool-previews/market-radar.jpg';
import startupGuideShot from '@/assets/tool-previews/startup-guide.jpg';
import regulationsHubShot from '@/assets/tool-previews/regulations-hub.jpg';
import conceptLabShot from '@/assets/tool-previews/concept-lab.jpg';

export interface LearnMoreOutcome {
  icon: LucideIcon;
  title: string;
  body: string;
}

export interface LearnMoreScreenshot {
  src: string;
  alt: string;
  caption: string;
}

export interface LearnMoreEntry {
  /** Deep-link key (?learn=<slug>). Matches product slug. */
  slug: string;
  /** Short outcome-driven promise. */
  promise: string;
  /** Optional "Best for …" copy for plans. */
  bestFor?: string;
  outcomes: LearnMoreOutcome[];
  screenshots: LearnMoreScreenshot[];
}

/** Alias any marketing-friendly slugs to the real product slug. */
export const LEARN_MORE_ALIASES: Record<string, string> = {
  free: 'host_free',
  starter: 'host_starter',
  pro: 'host_growth',
  growth: 'host_growth',
  premium: 'host_operator',
  operator: 'host_operator',
  weekly: 'pro_weekly_pass',
  featured: 'boost-featured-30',
  permit: 'permit_path_plus',
  permitpath: 'permit_path_plus',
};

export function resolveLearnMoreSlug(input: string): string {
  const key = input.trim().toLowerCase();
  return LEARN_MORE_ALIASES[key] ?? key;
}

const CATALOG: Record<string, LearnMoreEntry> = {
  host_free: {
    slug: 'host_free',
    promise: 'Start free — list a truck, trailer, kitchen, or vendor space without paying a monthly fee.',
    bestFor: 'Best for owner-operators testing the waters, one listing at a time.',
    outcomes: [
      { icon: DollarSign, title: 'No monthly cost, ever', body: 'List for sale or rent free. Marketplace commission applies only when you actually close a booking or sale.' },
      { icon: FileCheck, title: 'Free e-signatures on every agreement', body: 'Bills of sale for sellers, rental agreements for hosts — signed online, no printing, no extra fee.' },
      { icon: ShieldCheck, title: 'Payment protection at checkout', body: 'Every transaction is held securely and released only after fulfillment.' },
      { icon: Users, title: 'Unlimited inquiries', body: 'Buyers and renters can message you as much as they need — no reply caps.' },
    ],
    screenshots: [
      { src: listingStudioShot, alt: 'Free listing editor', caption: 'Build a real listing in minutes — no card required.' },
      { src: pricepilotShot, alt: 'Inquiry inbox', caption: 'One inbox for buyer and renter conversations.' },
    ],
  },
  host_starter: {
    slug: 'host_starter',
    promise: 'List like a pro — turn a single space or truck into a booked, paid, professional business.',
    bestFor: 'Best for owner-operators with one truck, trailer, or kitchen listing.',
    outcomes: [
      { icon: Camera, title: 'Enhanced listing tools', body: 'Add more photos, richer descriptions, and highlight badges so your listing looks credible next to national competitors.' },
      { icon: Calendar, title: 'Booking calendar & inquiries', body: 'Manage requests, dates, and pricing in one place instead of texting back and forth.' },
      { icon: ShieldCheck, title: 'Payment protection built in', body: 'Every booking is held until fulfillment, so you never chase a payment.' },
      { icon: DollarSign, title: 'Lower marketplace commission', body: 'Starter members keep more of every sale versus free-tier hosts.' },
    ],
    screenshots: [
      { src: listingStudioShot, alt: 'Listing studio editor', caption: 'Rich listing editor — photos, pricing, availability.' },
      { src: pricepilotShot, alt: 'Bookings and calendar view', caption: 'Booking calendar with inquiries in one inbox.' },
    ],
  },
  host_growth: {
    slug: 'host_growth',
    promise: 'Sell faster and book more — the toolkit active hosts use to run a busy pipeline.',
    bestFor: 'Best for hosts with 2+ active listings or a growing customer base.',
    outcomes: [
      { icon: TrendingUp, title: 'Featured placement included', body: 'Your listings show above standard results, typically 3–5× more views than untreated listings.' },
      { icon: LineChart, title: 'PricePilot dynamic pricing', body: 'See what similar trucks and kitchens book for and adjust rates without guessing.' },
      { icon: Megaphone, title: 'AI listing rewrite credits', body: 'Rewrite tired copy in one click — headline, description, and highlights tuned for conversion.' },
      { icon: Zap, title: 'Faster payouts, lower fees', body: 'Reduced marketplace commission on every paid booking or sale.' },
      { icon: Users, title: 'Multiple active listings', body: 'Run several units, spaces, or trucks from one dashboard.' },
    ],
    screenshots: [
      { src: pricepilotShot, alt: 'PricePilot dashboard', caption: 'PricePilot — see comps and set winning rates.' },
      { src: marketingStudioShot, alt: 'Marketing studio', caption: 'Spark-written listing copy and email pushes.' },
      { src: marketRadarShot, alt: 'Analytics dashboard', caption: 'Views, saves, offers, and revenue at a glance.' },
    ],
  },
  host_operator: {
    slug: 'host_operator',
    promise: 'Run your whole operation — everything in Growth, plus team access and portfolio tools for multi-location hosts.',
    bestFor: 'Best for fleets, commissary kitchens, and multi-location teams.',
    outcomes: [
      { icon: Layers, title: 'Multi-location portfolio', body: 'Manage every unit, kitchen, or lot from one dashboard with roll-up reporting.' },
      { icon: Users, title: 'Team member access', body: 'Invite managers with scoped permissions — no shared logins.' },
      { icon: Wrench, title: 'Every premium tool unlocked', body: 'PermitPath, BuildKit, Concept Lab, Market Radar — no per-tool paywalls.' },
      { icon: BarChart3, title: 'Portfolio analytics', body: 'Cross-listing revenue, occupancy, and demand insights.' },
      { icon: Flame, title: 'Priority support', body: 'Human help in hours, not days, from our founding team.' },
    ],
    screenshots: [
      { src: marketRadarShot, alt: 'Portfolio analytics', caption: 'Portfolio analytics across every listing.' },
      { src: buildkitShot, alt: 'BuildKit', caption: 'BuildKit — spec, source, and cost every build.' },
      { src: permitpathShot, alt: 'PermitPath', caption: 'PermitPath — city-by-city permit roadmaps.' },
    ],
  },
  pro_weekly_pass: {
    slug: 'pro_weekly_pass',
    promise: 'Try every Pro benefit for 7 days — one flat charge, no auto-renew.',
    bestFor: 'Best for a one-off push: a busy weekend, a launch, or a limited promotion.',
    outcomes: [
      { icon: TrendingUp, title: 'Featured placement for a week', body: 'Your listings ride above standard results for the full 7 days.' },
      { icon: Sparkle, title: 'All Pro tools unlocked', body: 'PricePilot, listing rewrite credits, and analytics — full access.' },
      { icon: ShieldCheck, title: 'No recurring charge', body: 'Access ends automatically after 7 days. Nothing to cancel.' },
    ],
    screenshots: [
      { src: pricepilotShot, alt: 'PricePilot dashboard', caption: 'PricePilot pricing intelligence.' },
      { src: marketingStudioShot, alt: 'Marketing studio', caption: 'AI listing rewrite tool.' },
    ],
  },
  'boost-featured-30': {
    slug: 'boost-featured-30',
    promise: 'Push a single listing above standard results for 30 days.',
    outcomes: [
      { icon: TrendingUp, title: 'Above the fold in search', body: 'Your listing appears in the Featured strip for every relevant search — typically 3–5× more views.' },
      { icon: Flame, title: 'Featured badge on the card', body: 'A visible badge signals demand and helps the click-through rate.' },
      { icon: BarChart3, title: 'Track the lift in real time', body: 'Views, saves, and messages from the boost are broken out in your analytics tab.' },
    ],
    screenshots: [
      { src: marketRadarShot, alt: 'Featured placement analytics', caption: 'Boost analytics — see the lift over standard placement.' },
      { src: listingStudioShot, alt: 'Featured card treatment', caption: 'Your listing with the Featured badge.' },
    ],
  },
  permit_path_plus: {
    slug: 'permit_path_plus',
    promise: 'A city-by-city permit roadmap — every form, fee, inspection, and deadline you actually need.',
    outcomes: [
      { icon: FileCheck, title: 'Custom permit plan', body: 'Answer a few questions and get a step-by-step plan tailored to your city, county, and operation type.' },
      { icon: Search, title: 'Real fees and processing times', body: 'No more guessing what the health department wants — we pull the actual current requirements.' },
      { icon: Rocket, title: 'Save and share the roadmap', body: 'Download a PDF, share with a partner, or come back and check off items as you go.' },
    ],
    screenshots: [
      { src: permitpathShot, alt: 'PermitPath results', caption: 'A live PermitPath roadmap for one city.' },
      { src: regulationsHubShot, alt: 'Regulations hub', caption: 'Regulation library backing every roadmap.' },
    ],
  },
  listing_rewrite: {
    slug: 'listing_rewrite',
    promise: 'Rewrite a tired listing — headline, description, highlights — tuned for conversion in one click.',
    outcomes: [
      { icon: Megaphone, title: 'Conversion-tuned headline', body: 'A rewritten headline that leads with what buyers actually search for.' },
      { icon: Sparkle, title: 'Description that scans', body: 'Short paragraphs, real specs, and clear value — no more wall-of-text listings.' },
      { icon: BarChart3, title: 'Highlights buyers care about', body: 'Trust and utility highlights auto-selected from your listing data.' },
    ],
    screenshots: [
      { src: marketingStudioShot, alt: 'Marketing studio rewrite', caption: 'One-click listing rewrite in Marketing Studio.' },
      { src: listingStudioShot, alt: 'Listing editor', caption: 'The rewritten listing landing back in your editor.' },
    ],
  },
};

/** Register aliases so the annual/plan variants inherit their base entry. */
CATALOG.host_starter_annual = { ...CATALOG.host_starter, slug: 'host_starter_annual' };
CATALOG.host_growth_annual = { ...CATALOG.host_growth, slug: 'host_growth_annual' };
CATALOG.host_operator_annual = { ...CATALOG.host_operator, slug: 'host_operator_annual' };

export function getLearnMoreEntry(slug: string): LearnMoreEntry | null {
  const resolved = resolveLearnMoreSlug(slug);
  return CATALOG[resolved] ?? CATALOG[slug] ?? null;
}
