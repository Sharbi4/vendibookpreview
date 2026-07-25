/**
 * Canonical tier feature catalog for the plans page.
 *
 * Drives PremiumTierCard's grouped "For sellers" / "For hosts" rendering.
 * Every line here maps to a real, delivered feature — no marketing that
 * doesn't work.
 */

export type TierRole = 'free' | 'starter' | 'pro' | 'premium';

export interface TierFeatureGroups {
  role: TierRole;
  name: string;
  tagline: string;
  audience: string;
  ctaLabel: string;
  /** For sellers (sale mode) */
  sellers: string[];
  /** For hosts (rental mode) */
  hosts: string[];
  /** Everyone / both */
  shared: string[];
  /** Optional bottom-of-card break-even line */
  breakEven?: string;
}

export const TIER_CATALOG: Record<TierRole, TierFeatureGroups> = {
  free: {
    role: 'free',
    name: 'Free',
    tagline: 'Start free — list without paying anything.',
    audience: 'Anyone getting started.',
    ctaLabel: 'Start free',
    sellers: [
      'List trucks and trailers — no monthly cost',
      'Unlimited buyer inquiries and messages',
      'Free e-signatures on every bill of sale',
    ],
    hosts: [
      'List kitchens and vendor spaces free',
      'Unlimited renter inquiries and messages',
      'Free e-signatures on every rental agreement',
    ],
    shared: [
      'Secure card payments with payment protection',
      'Basic dashboard + PermitPath basic',
    ],
  },
  starter: {
    role: 'starter',
    name: 'Starter',
    tagline: 'List like a pro.',
    audience: 'For occasional hosts and sellers.',
    ctaLabel: 'Start with Starter',
    sellers: [
      'Enhanced listing tools (extra photos, richer specs, badges)',
      'AI listing description generator',
    ],
    hosts: [
      'Booking calendar + inquiry management',
      'Automated renter messages',
    ],
    shared: [
      'Basic analytics',
      'Priority email support',
      'Everything in Free — including free e-signatures',
    ],
  },
  pro: {
    role: 'pro',
    name: 'Growth',
    tagline: 'Sell and book faster.',
    audience: 'For active hosts running the show.',
    ctaLabel: 'Go Pro',
    sellers: [
      '1 active Featured Boost included',
      'Full premium tools bundle — PricePilot, Listing Studio, Marketing Studio',
    ],
    hosts: [
      'Multiple active listings',
      'Custom deposits & cancellation rules',
      'Storage add-ons and cleaning fees',
    ],
    shared: [
      'Concept Lab, Market Radar, PermitPath Plus — no per-tool paywalls',
      '$10 off notarization ($39 instead of $49)',
      'Everything in Starter',
    ],
  },
  premium: {
    role: 'premium',
    name: 'Operator',
    tagline: 'Run your whole operation.',
    audience: 'For fleets, kitchens, and busy operators.',
    ctaLabel: 'Talk business — go Premium',
    sellers: [
      'Portfolio-level dashboards across every sale',
      'Priority listing review and boost placement',
    ],
    hosts: [
      'Portfolio dashboard across every listing',
      'Custom intake questions per booking',
      'Urgent-tier priority support',
    ],
    shared: [
      'BuildKit included',
      'Dedicated support in hours, not days',
      'Everything in Growth',
    ],
  },
};

export function getTierGroups(role: TierRole): TierFeatureGroups {
  return TIER_CATALOG[role];
}
