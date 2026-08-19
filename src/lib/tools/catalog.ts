/**
 * SINGLE SOURCE OF TRUTH for the premium-tools surface.
 *
 * Every tool tile, preview page, pricing panel, dashboard tab, and
 * server-side gate reads from this catalog. Update one row here to
 * change price, tier, tagline, screenshot, or icon everywhere.
 */
import {
  DollarSign, FileCheck, FileText, Rocket, Megaphone,
  Search, Wrench, Lightbulb, Building2, type LucideIcon,
} from 'lucide-react';

import permitpathShot from '@/assets/tool-previews/permitpath.jpg';
import pricepilotShot from '@/assets/tool-previews/pricepilot.jpg';
import listingStudioShot from '@/assets/tool-previews/listing-studio.jpg';
import marketingStudioShot from '@/assets/tool-previews/marketing-studio.jpg';
import conceptLabShot from '@/assets/tool-previews/concept-lab.jpg';
import marketRadarShot from '@/assets/tool-previews/market-radar.jpg';
import buildkitShot from '@/assets/tool-previews/buildkit.jpg';
import startupGuideShot from '@/assets/tool-previews/startup-guide.jpg';
import regulationsHubShot from '@/assets/tool-previews/regulations-hub.jpg';

export type ToolTier = 'free' | 'starter' | 'pro' | 'premium';

export interface ToolDef {
  /** Stable slug — matches monetization_products.metadata.tool_slug and preview URL. */
  slug: string;
  name: string;
  /** One-line outcome for tiles and hero. */
  tagline: string;
  /** 3–4 benefit bullets shown on the preview. */
  bullets: string[];
  icon: LucideIcon;
  /** Full route to the actual tool experience. */
  href: string;
  /** Real screenshot captured from the tool page. */
  screenshot: string;
  /** Minimum subscription tier that unlocks this tool. */
  minTier: ToolTier;
  /** One-time unlock product slug (undefined for always-free tools). */
  unlockProductSlug?: string;
  /** Marketing price for the one-time unlock (display only). */
  unlockPrice?: string;
  /** Flame accent for the highest-value / lead tool. */
  flame?: boolean;
}

export const TOOLS: ToolDef[] = [
  {
    slug: 'permitpath',
    name: 'PermitPath',
    tagline: 'Every license, permit, and inspection required to operate legally — in one roadmap.',
    bullets: [
      'City, county, and state requirements matched to your address',
      'Deadline reminders so you never miss a renewal',
      'Save progress, upload documents, export a PDF checklist',
      'Health-department and fire-marshal contacts included',
    ],
    icon: FileCheck,
    href: '/tools/permitpath',
    screenshot: permitpathShot,
    minTier: 'free',
    unlockProductSlug: 'permit_path_plus_monthly',
    unlockPrice: '$7.99/mo',
    flame: true,
  },
  {
    slug: 'pricepilot',
    name: 'PricePilot',
    tagline: 'Set nightly, weekly, and monthly rates that beat your local market.',
    bullets: [
      'Pricing model powered by Spark trained on live marketplace data',
      'Compares your rates to comparable listings in your metro',
      'Recommends event-week and seasonal premiums',
    ],
    icon: DollarSign,
    href: '/tools/pricepilot',
    screenshot: pricepilotShot,
    minTier: 'pro',
  },
  {
    slug: 'listing-studio',
    name: 'Listing Studio',
    tagline: 'Write listings that convert browsers into paid bookings.',
    bullets: [
      'Spark writes titles and descriptions in your voice',
      'Search-optimized for the Vendibook index',
      'Photo hints and highlight suggestions',
    ],
    icon: FileText,
    href: '/tools/listing-studio',
    screenshot: listingStudioShot,
    minTier: 'pro',
  },
  {
    slug: 'marketing-studio',
    name: 'Marketing Studio',
    tagline: 'Ad copy, social posts, and launch kits — ready to publish.',
    bullets: [
      'Multi-channel copy: Facebook, Instagram, email, SMS',
      'Templates for launches, promos, and repeat customers',
      'Voice tuned to your brand',
    ],
    icon: Megaphone,
    href: '/tools/marketing-studio',
    screenshot: marketingStudioShot,
    minTier: 'pro',
  },
  {
    slug: 'concept-lab',
    name: 'Concept Lab',
    tagline: 'Validate menu, truck, and business concepts before you invest.',
    bullets: [
      'Concept scoring against local demand and competition',
      'Margin, price-point, and cost modeling built in',
      'Idea variations tuned to your metro',
    ],
    icon: Lightbulb,
    href: '/tools/concept-lab',
    screenshot: conceptLabShot,
    minTier: 'pro',
  },
  {
    slug: 'market-radar',
    name: 'Market Radar',
    tagline: 'See demand, competition, and opportunity gaps in any metro.',
    bullets: [
      'Demand and competition heatmap',
      'Event and seasonality overlays',
      'Drive-time trade-area analysis',
    ],
    icon: Search,
    href: '/tools/market-radar',
    screenshot: marketRadarShot,
    minTier: 'pro',
  },
  {
    slug: 'buildkit',
    name: 'BuildKit',
    tagline: 'Blueprints, equipment specs, and vetted vendor sourcing.',
    bullets: [
      'Kitchen and trailer blueprints by service style',
      'Vetted vendor list with cost benchmarks',
      'Build-out cost estimator by stage',
    ],
    icon: Wrench,
    href: '/tools/buildkit',
    screenshot: buildkitShot,
    minTier: 'premium',
  },

  {
    slug: 'startup-guide',
    name: 'Startup Guide',
    tagline: 'The step-by-step launch checklist from concept to first booking.',
    bullets: [
      'Every milestone from formation to opening day',
      'Cost, timeline, and vendor references at each step',
      'Free — always',
    ],
    icon: Rocket,
    href: '/tools/startup-guide',
    screenshot: startupGuideShot,
    minTier: 'free',
  },
  {
    slug: 'regulations-hub',
    name: 'Regulations Hub',
    tagline: 'State-by-state operating rules, certifications, and inspections.',
    bullets: [
      'Every state, in one searchable index',
      'Direct links to the source regulation',
      'Free — always',
    ],
    icon: Building2,
    href: '/tools/regulations-hub',
    screenshot: regulationsHubShot,
    minTier: 'free',
  },
];

export const getToolBySlug = (slug: string): ToolDef | undefined =>
  TOOLS.find((t) => t.slug === slug);
