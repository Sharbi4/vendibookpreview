/**
 * Seller-facing PayPal vetting notices.
 *
 * PayPal's Integration Walkthrough requires that a seller is told when their
 * advanced-card (ACDC) or vaulting application needs more information, is still
 * in review, or has been denied — and when the feature is available to them
 * (IWT pp.5-6). This module maps the raw status PayPal returns in "show seller
 * status" onto the wording the seller reads.
 *
 * Pure presentation. Nothing here decides what a buyer is offered, and nothing
 * here affects routing, fees, or payouts.
 */

/** Scopes PayPal requires before vaulting is actually available (IWT p.6). */
export const VAULTING_SCOPES = [
  'https://uri.paypal.com/services/billing-agreements',
  'https://uri.paypal.com/services/vault/payment-tokens/read',
  'https://uri.paypal.com/services/vault/payment-tokens/readwrite',
];

export type VettingNotice = { tone: 'ok' | 'warn' | 'info'; text: string };

export type VettedFeature = 'card' | 'vault';

const FEATURE_LABEL: Record<VettedFeature, string> = {
  card: 'Advanced card payments',
  vault: 'Saved payment methods',
};

export function vettingNotice(
  feature: VettedFeature,
  status: string | null | undefined,
): VettingNotice | null {
  if (!status) return null;
  const state = status.trim().toUpperCase();
  const name = FEATURE_LABEL[feature];
  if (state === 'SUBSCRIBED' || state === 'APPROVED' || state === 'ACTIVE') {
    return { tone: 'ok', text: `${name}: approved by PayPal and available on your listings.` };
  }
  if (state === 'NEED_MORE_DATA') {
    return {
      tone: 'warn',
      text: `${name}: PayPal needs more information from you before this can be turned on. Finish your application on PayPal.com.`,
    };
  }
  if (state === 'IN_REVIEW' || state === 'PENDING' || state === 'SUBMITTED') {
    return { tone: 'info', text: `${name}: your application is still in review with PayPal.` };
  }
  if (state === 'DENIED' || state === 'DECLINED') {
    return {
      tone: 'warn',
      text: `${name}: PayPal denied your application. Contact PayPal Customer Support for details.`,
    };
  }
  return { tone: 'info', text: `${name}: PayPal reports ${state.toLowerCase().replace(/_/g, ' ')}.` };
}

/**
 * The notices a connected seller must see, in the order they are shown.
 *
 * Vaulting counts as available only when PayPal approved it *and* the vault
 * scopes were granted to Vendibook — an approved application whose scopes were
 * never granted cannot vault, so the seller is told to reconnect instead of
 * being told it works.
 */
export function sellerVettingNotices(input: {
  acdcVettingStatus: string | null | undefined;
  vaultingStatus: string | null | undefined;
  grantedScopes: string[];
}): VettingNotice[] {
  const card = vettingNotice('card', input.acdcVettingStatus);
  let vault = vettingNotice('vault', input.vaultingStatus);
  if (vault?.tone === 'ok' && !VAULTING_SCOPES.every((s) => input.grantedScopes.includes(s))) {
    vault = {
      tone: 'info',
      text: 'Saved payment methods: approved by PayPal, but the vaulting permissions were not granted to Vendibook. Reconnect to grant them.',
    };
  }
  return [card, vault].filter((n): n is VettingNotice => n !== null);
}
