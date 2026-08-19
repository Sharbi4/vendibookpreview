/**
 * PermitPath Basic vs Plus — single source of truth for what each tier gets
 * and who counts as a Plus member.
 *
 * BASIC (free, no account required to run):
 *   - Unlimited PermitPath searches and the full requirement roadmap on screen
 *   - Official links, costs, timelines, contacts
 *
 * PLUS ($7.99/mo, catalog `permit_path_plus_monthly`):
 *   - Save roadmaps to the dashboard and keep them
 *   - Per-permit status, permit numbers, expirations
 *   - Document uploads and renewal reminders
 *   - PDF export of a saved roadmap
 *
 * Plus is also included with Vendibook Pro. Nothing here charges or grants —
 * it only resolves entitlement that PayPal/the catalog already recorded.
 *
 * Keep in lockstep with supabase/functions/_shared/toolAccess.ts.
 */

/** Product slugs that grant PermitPath Plus (current + retired one-time SKU). */
export const PERMIT_PLUS_SLUGS = ['permit_path_plus_monthly', 'permit_path_plus'] as const;

/** The slug we sell today. */
export const PERMIT_PLUS_SLUG = 'permit_path_plus_monthly';

/** Subscription tiers that include Plus at no extra cost. */
const TIERS_INCLUDING_PLUS = new Set([
  'pro',
  'vendibook_pro',
  'vendibook-pro',
  'host_pro',
  'host-pro',
  'host_growth',
  'host-growth',
  'premium',
  'host_operator',
  'host-operator',
]);

export const ACTIVE_SUB_STATUSES = new Set(['active', 'trialing', 'past_due']);

const normalizeTier = (raw?: string | null) =>
  String(raw ?? '').toLowerCase().replace(/_(monthly|annual)$/, '').replace(/-(monthly|annual)$/, '');

export const isPermitPlusTier = (raw?: string | null) => {
  const key = normalizeTier(raw);
  return key === 'permit_path_plus' || key === 'permit-path-plus' || key === 'permitpath_plus';
};

export const tierIncludesPermitPlus = (raw?: string | null) =>
  TIERS_INCLUDING_PLUS.has(normalizeTier(raw));

/**
 * Anyone who saved permit data BEFORE Plus started gating saves keeps their
 * access forever (founding members). Rows created after the cutoff are the
 * result of a paid entitlement, so they must not grant one.
 */
export const PERMIT_PLUS_GRANDFATHER_CUTOFF = '2026-08-19T00:00:00.000Z';

export type PermitPlusReason =
  | 'subscription' // paid PermitPath Plus subscription
  | 'included' // Vendibook Pro (or legacy higher tier) includes Plus
  | 'purchase' // retired one-time Plus SKU
  | 'grandfathered' // used PermitPath before Plus gating
  | 'locked';

export interface PermitPlusInput {
  /** Every host_subscriptions row for the user (tier + status). */
  subscriptions?: Array<{ tier?: string | null; status?: string | null }> | null;
  /** Product slugs the user has a paid/fulfilled purchase for. */
  purchasedSlugs?: string[] | null;
  /** Has permit data created before the grandfather cutoff. */
  legacyUser?: boolean;
}

export interface PermitPlusAccess {
  isPlus: boolean;
  reason: PermitPlusReason;
}

export function resolvePermitPlus(input: PermitPlusInput): PermitPlusAccess {
  const subs = (input.subscriptions ?? []).filter((s) => ACTIVE_SUB_STATUSES.has(String(s?.status ?? '')));

  if (subs.some((s) => isPermitPlusTier(s.tier))) {
    return { isPlus: true, reason: 'subscription' };
  }
  if (subs.some((s) => tierIncludesPermitPlus(s.tier))) {
    return { isPlus: true, reason: 'included' };
  }
  if ((input.purchasedSlugs ?? []).some((slug) => (PERMIT_PLUS_SLUGS as readonly string[]).includes(slug))) {
    return { isPlus: true, reason: 'purchase' };
  }
  if (input.legacyUser) {
    return { isPlus: true, reason: 'grandfathered' };
  }
  return { isPlus: false, reason: 'locked' };
}

/** Marketing copy shared by the dashboard gate and the tool page upsell. */
export const PERMIT_BASIC_FEATURES = [
  'Unlimited permit searches for any city and business type',
  'Full requirement roadmap with costs, timelines and official links',
  'Health-department and fire-marshal contacts',
];

export const PERMIT_PLUS_FEATURES = [
  'Save roadmaps to your dashboard and keep them',
  'Track each permit: not started · in progress · submitted · approved',
  'Store permit numbers, expiration dates and uploaded documents',
  'Renewal reminders 60 / 30 / 7 days out',
  'PDF export for lenders, landlords and health inspectors',
];
