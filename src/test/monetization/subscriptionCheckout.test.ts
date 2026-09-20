import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  buildCheckoutIdempotencyKey,
  canonicalizeCheckoutParams,
  type CheckoutOperationParams,
} from '../../../supabase/functions/_shared/payments/checkoutIdempotency';

const base: CheckoutOperationParams = {
  userId: 'user-1',
  productId: 'prod-1',
  productSlug: 'host_growth',
  mode: 'payment',
  amountCents: 8900,
  currency: 'usd',
  quantity: 1,
  listingId: null,
  discountCodeId: null,
  discountAppliedCents: 0,
  customerRef: 'cus_1',
  priceRef: 'price_1',
  successUrl: 'https://x/s',
  cancelUrl: 'https://x/c',
};

describe('checkout idempotency key', () => {
  it('same request retry produces the same key', async () => {
    expect(await buildCheckoutIdempotencyKey(base)).toBe(
      await buildCheckoutIdempotencyKey({ ...base }),
    );
  });

  it('repeated clicks (identical params) reuse one key', async () => {
    const keys = await Promise.all([1, 2, 3].map(() => buildCheckoutIdempotencyKey(base)));
    expect(new Set(keys).size).toBe(1);
  });

  it('changed plan creates a new key', async () => {
    expect(await buildCheckoutIdempotencyKey({ ...base, productId: 'prod-2', productSlug: 'host_operator' }))
      .not.toBe(await buildCheckoutIdempotencyKey(base));
  });

  it('changed billing interval / price creates a new key', async () => {
    expect(await buildCheckoutIdempotencyKey({ ...base, amountCents: 89000, billingInterval: 'annual' }))
      .not.toBe(await buildCheckoutIdempotencyKey(base));
  });

  it('changed customer, quantity or promotion creates a new key', async () => {
    const a = await buildCheckoutIdempotencyKey(base);
    expect(await buildCheckoutIdempotencyKey({ ...base, customerRef: 'cus_2' })).not.toBe(a);
    expect(await buildCheckoutIdempotencyKey({ ...base, quantity: 2 })).not.toBe(a);
    expect(await buildCheckoutIdempotencyKey({ ...base, discountCodeId: 'promo-1', discountAppliedCents: 500 })).not.toBe(a);
  });

  it('is not time-bucketed (no stale key reuse across params)', () => {
    const canon = canonicalizeCheckoutParams(base);
    expect(canon).not.toMatch(/\d{6,}/);
    expect(canon).toContain('amount=8900');
  });
});

// --- client routing -------------------------------------------------------

const invoke = vi.fn();
const maybeSingle = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: { invoke: (...a: unknown[]) => invoke(...a) },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: () => maybeSingle() }) }) }),
  },
}));

import { startMonetizationCheckout, checkoutOperationKey } from '@/lib/monetization/products';

describe('Square subscription checkout routing', () => {
  beforeEach(() => invoke.mockReset());
  it('routes memberships to secure checkout with consent and selected interval', async () => {
    const result = await startMonetizationCheckout({productSlug:'host_growth_annual',billingInterval:'annual',consentId:'consent-1'});
    const url = new URL(result.url);
    expect(url.pathname).toBe('/checkout/product/host_growth_annual');
    expect(url.searchParams.get('consent_id')).toBe('consent-1');
    expect(url.searchParams.get('interval')).toBe('annual');
    expect(invoke).not.toHaveBeenCalled();
  });
  it('preserves listing ownership context for an add-on', async () => {
    const {url}=await startMonetizationCheckout({productSlug:'featured_7',listingId:'listing-1'});
    expect(new URL(url).searchParams.get('listing_id')).toBe('listing-1');
  });
});

import { toSafeCheckoutMessage } from '@/hooks/useSubscriptionConsent';

describe('safe checkout messaging', () => {
  it('hides raw provider errors', () => {
    expect(
      toSafeCheckoutMessage(
        'Keys for idempotent requests can only be used with the same parameters they were first used with',
      ),
    ).toMatch(/couldn’t start that checkout/);
    expect(toSafeCheckoutMessage('Stripe error: no such customer')).toMatch(/couldn’t start that checkout/);
  });

  it('keeps allow-listed product messages', () => {
    expect(toSafeCheckoutMessage("You're already on this plan or better.", 'already_entitled')).toBe(
      "You're already on this plan or better.",
    );
  });
});

import { buildPlanAuthReturnTo } from '@/lib/monetization/returnRoutes';

describe('unauthenticated plan selection', () => {
  it('preserves plan + interval through auth and auto-resumes', () => {
    const url = buildPlanAuthReturnTo({ planSlug: 'host_growth_annual', interval: 'annual', pathname: '/plans' });
    const returnTo = decodeURIComponent(url.replace('/auth?returnTo=', ''));
    expect(returnTo).toContain('/plans?');
    expect(returnTo).toContain('plan=host_growth_annual');
    expect(returnTo).toContain('interval=annual');
    expect(returnTo).toContain('auto=1');
  });

  it('carries wizard returnTo + listing context and defaults off-plans pages to /pricing', () => {
    const url = buildPlanAuthReturnTo({
      planSlug: 'host_starter',
      interval: 'monthly',
      pathname: '/dashboard',
      search: '?returnTo=/create-listing/1&listingContext=abc',
    });
    const returnTo = decodeURIComponent(url.replace('/auth?returnTo=', ''));
    expect(returnTo.startsWith('/pricing?')).toBe(true);
    expect(returnTo).toContain('listingContext=abc');
  });
});
