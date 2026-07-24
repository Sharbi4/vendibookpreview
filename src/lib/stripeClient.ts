import { loadStripe, type Stripe } from '@stripe/stripe-js';

// Publishable keys are safe to ship in the client bundle. See:
// https://stripe.com/docs/keys#obtain-api-keys
const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined;

let stripePromise: Promise<Stripe | null> | null = null;

/**
 * Singleton Stripe.js loader. Returns null (and logs once) when the
 * publishable key hasn't been configured — callers should fall back to
 * the hosted redirect Checkout flow in that case.
 */
export function getStripe(): Promise<Stripe | null> {
  if (!publishableKey) {
    if (!(getStripe as unknown as { warned?: boolean }).warned) {
      // eslint-disable-next-line no-console
      console.warn(
        '[stripeClient] VITE_STRIPE_PUBLISHABLE_KEY is not set — embedded checkout disabled, falling back to hosted mode.',
      );
      (getStripe as unknown as { warned?: boolean }).warned = true;
    }
    return Promise.resolve(null);
  }

  if (!stripePromise) {
    stripePromise = loadStripe(publishableKey);
  }
  return stripePromise;
}

export function hasStripePublishableKey(): boolean {
  return Boolean(publishableKey);
}
