/**
 * Lightweight feature-flag registry. Values default to build-time constants
 * but can be overridden per-browser via localStorage for quick kill-switch
 * behavior (e.g. `localStorage.setItem('ff.embeddedCheckout', 'false')`).
 */

import { hasStripePublishableKey } from './stripeClient';

function readLocalOverride(key: string): boolean | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(`ff.${key}`);
    if (raw === 'true') return true;
    if (raw === 'false') return false;
    return null;
  } catch {
    return null;
  }
}

/**
 * When true, checkout flows mount Stripe's Custom Checkout (Payment Element)
 * inside a branded overlay. When false (or when the publishable key is
 * missing), we fall back to the classic hosted redirect flow.
 */
export function isEmbeddedCheckoutEnabled(): boolean {
  const override = readLocalOverride('embeddedCheckout');
  if (override !== null) return override && hasStripePublishableKey();
  return hasStripePublishableKey();
}
