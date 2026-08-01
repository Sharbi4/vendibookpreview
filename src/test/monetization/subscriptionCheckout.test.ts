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

describe('subscription checkout routing', () => {
  beforeEach(() => {
    invoke.mockReset();
    maybeSingle.mockReset();
    maybeSingle.mockResolvedValue({ data: { billing_type: 'recurring' } });
    invoke.mockResolvedValue({ data: { approve_url: 'https://paypal/approve' }, error: null });
  });

  it('routes recurring plans to PayPal, never Stripe', async () => {
    const { url } = await startMonetizationCheckout({ productSlug: 'host_growth', billingInterval: 'monthly' });
    expect(url).toBe('https://paypal/approve');
    expect(invoke).toHaveBeenCalledWith('paypal-subscription-create', expect.anything());
    expect(invoke).not.toHaveBeenCalledWith('create-monetization-checkout', expect.anything());
  });

  it('forwards the selected billing interval', async () => {
    await startMonetizationCheckout({ productSlug: 'host_growth_annual', billingInterval: 'annual' });
    expect(invoke.mock.calls[0][1].body.billing_interval).toBe('annual');
  });

  it('repeated clicks with identical params reuse one in-flight request', async () => {
    const p1 = startMonetizationCheckout({ productSlug: 'host_growth', billingInterval: 'monthly' });
    const p2 = startMonetizationCheckout({ productSlug: 'host_growth', billingInterval: 'monthly' });
    await Promise.all([p1, p2]);
    expect(invoke).toHaveBeenCalledTimes(1);
  });

  it('changed plan selection starts a fresh checkout operation', async () => {
    await startMonetizationCheckout({ productSlug: 'host_growth', billingInterval: 'monthly' });
    await startMonetizationCheckout({ productSlug: 'host_operator', billingInterval: 'monthly' });
    expect(invoke).toHaveBeenCalledTimes(2);
    expect(checkoutOperationKey({ productSlug: 'host_growth', billingInterval: 'monthly' }))
      .not.toBe(checkoutOperationKey({ productSlug: 'host_growth', billingInterval: 'annual' }));
  });

  it('falls back to PayPal subscriptions when the catalog row is missing', async () => {
    maybeSingle.mockResolvedValue({ data: null });
    await startMonetizationCheckout({ productSlug: 'host_starter' });
    expect(invoke).toHaveBeenCalledWith('paypal-subscription-create', expect.anything());
  });

  it('surfaces an existing-subscription error from the server', async () => {
    invoke.mockResolvedValue({ data: { error: 'You already have an active membership.' }, error: null });
    await expect(startMonetizationCheckout({ productSlug: 'host_growth' })).rejects.toThrow(
      /already have an active membership/,
    );
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
