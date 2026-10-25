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
    name: 'Vendibook Pro',
    tagline: 'Actively find your next buyer.',
    audience: 'For active hosts running the show.',
    ctaLabel: 'Go Pro',
    sellers: [
      'BuyerMatch AI — reviewed buyer and renter discovery and priority outreach',
      'Activity reports for eligible sale and rental listings, subject to activation and capacity',
      '1 Featured Boost credit per paid billing period',
      'Premium tools bundle — PricePilot appraisals and PermitPath Plus',
    ],
    hosts: [
      'Multiple active listings',
      'Custom deposits & cancellation rules',
      'Storage add-ons and cleaning fees',
    ],
    shared: [
      'PermitPath Plus included — no per-tool paywalls',
      '8.7% on new equipment sales for Standard and Pro sellers',
      'Everything in Free',
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
      'Every premium tool included',
      'Dedicated support in hours, not days',
      'Everything in Growth',
    ],
  },
};

export function getTierGroups(role: TierRole): TierFeatureGroups {
  return TIER_CATALOG[role];
}
