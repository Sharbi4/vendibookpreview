/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../../supabase/functions/_shared/paypal.ts', () => ({ newPaymentReference: (p: string) => `${p}-TEST` }));

// Deno modules without Deno APIs, loaded at runtime (same pattern as
// refundCloseout: non-literal paths keep the app typecheck off Deno files).
const shared = '../../../supabase/functions/_shared/';
const math = await import(/* @vite-ignore */ `${shared}campusPartnerMath.ts`);
const accounting = await import(/* @vite-ignore */ `${shared}paypalAccounting.ts`);
const orderDetail = await import(/* @vite-ignore */ `${shared}paypalOrderDetail.ts`);
const squareMath = await import(/* @vite-ignore */ `${shared}squareRentalMath.ts`);
const campus = await import(/* @vite-ignore */ `${shared}campusPartner.ts`);

const { applyCampusCredit, computeCampusCredit, normalizePartnerCode, rentalEligibleSubtotalCents, CAMPUS_CREDIT_LABEL } = math;
const { applyTaxToQuote, quoteBookingRequest, quoteSaleTransaction } = accounting;

const TERMS = { rental_percent: 10, rental_cap_cents: 10_000, purchase_credit_cents: 25_000, purchase_min_cents: 500_000 };
const tax = (taxCents: number) => ({ taxCents, ratePct: 8, state: 'AZ', source: 'state_table', label: 'Sales tax' });

/** A booking row priced the way public.guard_rental_checkout_snapshot prices it. */
function booking(baseDollars: number, deliveryDollars = 0, depositDollars = 0) {
  const sub = baseDollars + deliveryDollars;
  return {
    id: 'b1', host_id: 'h1', shopper_id: 'u1', listing_id: 'l1',
    total_price: Math.round((sub + Math.round(sub * 0.129 * 100) / 100) * 100) / 100,
    delivery_fee_snapshot: deliveryDollars || null,
    deposit_amount: depositDollars || null,
  };
}
const sale = (amount: number, extra: Record<string, unknown> = {}) => ({
  id: 's1', listing_id: 'l1', buyer_id: 'u1', seller_id: 'sel1', amount, status: 'pending', ...extra,
});

describe('code normalization', () => {
  it('is case-insensitive', () => expect(normalizePartnerCode('pima27')).toBe('PIMA27'));
  it('ignores whitespace anywhere', () => expect(normalizePartnerCode('  Pi ma\t27 \n')).toBe('PIMA27'));
});

describe('rental credit', () => {
  it('is 10% of the rental subtotal', () => {
    const r = computeCampusCredit({ type: 'rental', terms: TERMS, eligibleSubtotalCents: 80_000, platformFeeCents: 20_640 });
    expect(r).toMatchObject({ eligible: true, creditCents: 8_000 });
  });
  it('is capped at $100 per transaction', () => {
    const r = computeCampusCredit({ type: 'rental', terms: TERMS, eligibleSubtotalCents: 500_000, platformFeeCents: 129_000 });
    expect(r).toMatchObject({ eligible: true, creditCents: 10_000 });
  });
  it('rounds a fractional percentage to the cent', () => {
    const r = computeCampusCredit({ type: 'rental', terms: { ...TERMS, rental_percent: 10 }, eligibleSubtotalCents: 12_345, platformFeeCents: 9_999 });
    expect(r).toMatchObject({ creditCents: 1_235 });
  });
  it('never discounts delivery', () => {
    expect(rentalEligibleSubtotalCents(110_000, 10_000)).toBe(100_000);
  });
});

describe('purchase credit', () => {
  it('gives $250 at $5,000 or more', () => {
    const r = computeCampusCredit({ type: 'sale', terms: TERMS, eligibleSubtotalCents: 500_000, platformFeeCents: 64_500 });
    expect(r).toMatchObject({ eligible: true, creditCents: 25_000 });
  });
  it('is rejected below $5,000', () => {
    const r = computeCampusCredit({ type: 'sale', terms: TERMS, eligibleSubtotalCents: 499_999, platformFeeCents: 64_499 });
    expect(r).toMatchObject({ eligible: false, reason: 'below_minimum', minimumCents: 500_000 });
  });
  it('never exceeds the platform fee, so the fee net of credit is never negative', () => {
    const r = computeCampusCredit({ type: 'sale', terms: { ...TERMS, purchase_min_cents: 0 }, eligibleSubtotalCents: 100_000, platformFeeCents: 12_900 });
    expect(r).toMatchObject({ eligible: true, creditCents: 12_900 });
    const zeroFee = computeCampusCredit({ type: 'sale', terms: TERMS, eligibleSubtotalCents: 600_000, platformFeeCents: 0 });
    expect(zeroFee.eligible).toBe(false);
  });
});

describe('cash / pay-in-person exclusion', () => {
  it('only open online purchases take the credit', () => {
    expect(campus.saleTakesCampusCredit({ status: 'pending' })).toBe(true);
    expect(campus.saleTakesCampusCredit({ status: 'payment_failed' })).toBe(true);
    expect(campus.saleTakesCampusCredit({ status: 'pending_cash' })).toBe(false);
    expect(campus.saleTakesCampusCredit({ status: 'paid' })).toBe(false);
  });
  it('only unpaid open bookings take the credit', () => {
    expect(campus.bookingTakesCampusCredit({ status: 'approved', payment_status: 'unpaid' })).toBe(true);
    expect(campus.bookingTakesCampusCredit({ status: 'approved', payment_status: 'paid' })).toBe(false);
    expect(campus.bookingTakesCampusCredit({ status: 'cancelled', payment_status: 'unpaid' })).toBe(false);
  });
});

describe('rental checkout with a Campus credit', () => {
  // $1,000 rental + $150 delivery + $500 deposit, 8% tax on the rental base.
  const row = booking(1000, 150, 500);
  const quote = quoteBookingRequest(row, 'Trailer', { isPro: false });
  const before = { ...quote, breakdown: [...quote.breakdown] };
  applyTaxToQuote(quote, tax(9_200));
  const taxedGross = quote.grossCents;
  const eligible = rentalEligibleSubtotalCents(quote.taxableBaseCents, 15_000);
  const credit = computeCampusCredit({ type: 'rental', terms: TERMS, eligibleSubtotalCents: eligible, platformFeeCents: quote.platformFeeCents });
  if (!credit.eligible) throw new Error('expected eligible');
  applyCampusCredit(quote, credit.creditCents);

  it('discounts only the rental price (not delivery, deposit or tax)', () => {
    expect(eligible).toBe(100_000);
    expect(credit.creditCents).toBe(10_000);
  });
  it('keeps the host payout and host fee unchanged', () => {
    expect(quote.sellerProceedsCents).toBe(before.sellerProceedsCents);
    expect(quote.hostFeeCents).toBe(before.hostFeeCents);
    expect(quote.platformFeeCents).toBe(before.platformFeeCents);
  });
  it('keeps the tax and deposit unchanged', () => {
    expect(quote.taxCents).toBe(9_200);
    expect(quote.depositCents).toBe(50_000);
    expect(quote.taxableBaseCents).toBe(before.taxableBaseCents);
  });
  it('lowers only what the renter pays, with its own negative line', () => {
    expect(quote.grossCents).toBe(taxedGross - 10_000);
    expect(quote.discountCents).toBe(10_000);
    expect(quote.breakdown.at(-1)).toEqual({ label: CAMPUS_CREDIT_LABEL, amountCents: -10_000, kind: 'credit' });
  });
  it('Square charge = displayed amount, host keeps the same split, app fee stays positive', () => {
    const split = squareMath.splitRentalCharge({ grossCents: quote.grossCents, sellerProceedsCents: quote.sellerProceedsCents });
    expect(split.grossCents).toBe(quote.grossCents);
    expect(split.sellerCents).toBe(before.sellerProceedsCents);
    expect(split.appFeeCents).toBe(quote.grossCents - quote.sellerProceedsCents);
    expect(split.appFeeCents).toBeGreaterThan(0);
  });
  it('net platform revenue stays positive', () => {
    expect(quote.platformFeeCents - credit.creditCents).toBeGreaterThan(0);
  });
});

describe('purchase checkout with a Campus credit', () => {
  // $6,000 trailer, buyer-paid Vendibook Freight $1,200, 6% tax on merchandise.
  const tx = sale(6000, { fulfillment_type: 'vendibook_freight', freight_cost: 1200, freight_payment_status: 'unpaid' });
  const quote = quoteSaleTransaction(tx, 'Trailer', { freightPayer: 'buyer' });
  const before = { ...quote };
  applyTaxToQuote(quote, tax(36_000));
  const taxedGross = quote.grossCents;
  const credit = computeCampusCredit({ type: 'sale', terms: TERMS, eligibleSubtotalCents: 600_000, platformFeeCents: quote.platformFeeCents });
  if (!credit.eligible) throw new Error('expected eligible');
  applyCampusCredit(quote, credit.creditCents);

  it('keeps the seller payout and the 12.9% fee on the original price', () => {
    expect(quote.sellerProceedsCents).toBe(before.sellerProceedsCents);
    expect(quote.platformFeeCents).toBe(77_400);
    expect(quote.sellerProceedsCents).toBe(600_000 - 77_400);
  });
  it('does not discount freight or tax', () => {
    expect(quote.taxCents).toBe(36_000);
    expect(quote.taxableBaseCents).toBe(600_000);
    expect(quote.breakdown.find((l) => l.label === 'Vendibook Freight')?.amountCents).toBe(120_000);
  });
  it('charges $250 less', () => expect(quote.grossCents).toBe(taxedGross - 25_000));
  it('PayPal order reconciles to the displayed total (item + tax + shipping − discount)', () => {
    const d = orderDetail.buildOrderDetail(quote, { physical: true, itemName: 'Trailer' });
    expect(d.discountCents).toBe(25_000);
    expect(d.shippingCents).toBe(120_000);
    expect(d.itemTotalCents + d.taxCents + d.shippingCents - d.discountCents).toBe(quote.grossCents);
  });
  it('routed PayPal platform fee drops by the credit and stays positive; the seller nets the same', () => {
    const routedFee = quote.grossCents - quote.sellerProceedsCents;
    expect(quote.grossCents - routedFee).toBe(before.sellerProceedsCents);
    expect(routedFee).toBeGreaterThan(0);
  });
  it('refuses a credit that would cover the whole charge', () => {
    const q = { grossCents: 100, discountCents: 0, breakdown: [] as never[] };
    expect(() => applyCampusCredit(q, 100)).toThrow('campus_credit_exceeds_total');
  });
});

/** Minimal chainable Supabase stand-in for the reservation helpers. */
function fakeAdmin(opts: { reservation?: Record<string, unknown> | null; code?: Record<string, unknown> | null; rpc?: { data?: unknown; error?: { message: string } | null } }) {
  const writes: Array<{ table: string; value: unknown }> = [];
  const from = (table: string) => {
    const q: any = {
      select: () => q, eq: () => q, update: (value: unknown) => { writes.push({ table, value }); return q; },
      maybeSingle: async () => ({ data: table === 'discount_code_redemptions' ? opts.reservation ?? null : opts.code ?? null, error: null }),
      then: (resolve: (v: unknown) => void) => resolve({ error: null }),
    };
    return q;
  };
  return { admin: { from, rpc: async () => opts.rpc ?? { data: 'red-1', error: null } }, writes };
}

const liveCode = {
  id: 'c1', code: 'PIMA27', code_normalized: 'PIMA27', campaign_type: 'campus_partner', active: true,
  starts_at: null, ends_at: null, partner_id: 'p1', partner: { id: 'p1', name: 'Pima Community College', slug: 'pima-cc', active: true },
  ...TERMS,
};
const rentalQuote = () => {
  const q = quoteBookingRequest(booking(1000), 'Trailer', { isPro: false });
  applyTaxToQuote(q, tax(8_000));
  return q;
};

describe('checkout re-validation', () => {
  it('re-validates and keeps a live reservation (retry-safe: same redemption id)', async () => {
    const { admin } = fakeAdmin({ reservation: { id: 'red-1', code_id: 'c1', user_id: 'u1', status: 'reserved' }, code: liveCode });
    const r = await campus.campusCreditForCheckout(admin, { userId: 'u1', type: 'rental', bookingRequestId: 'b1', listingId: 'l1', quote: rentalQuote(), row: booking(1000) });
    expect(r).toMatchObject({ applied: true, reservation: { redemptionId: 'red-1', creditCents: 10_000, partnerName: 'Pima Community College' } });
  });
  it('an expired code is released before payment and reported, never charged', async () => {
    const { admin, writes } = fakeAdmin({
      reservation: { id: 'red-1', code_id: 'c1', user_id: 'u1', status: 'reserved' },
      code: { ...liveCode, ends_at: '2020-01-01T00:00:00Z' },
    });
    const r = await campus.campusCreditForCheckout(admin, { userId: 'u1', type: 'rental', bookingRequestId: 'b1', listingId: 'l1', quote: rentalQuote(), row: booking(1000) });
    expect('error' in r && r.error.code).toBe('partner_code_inactive');
    expect(writes.some((w) => w.table === 'discount_code_redemptions' && (w.value as any).status === 'released')).toBe(true);
  });
  it('an inactive code is rejected with the friendly message', async () => {
    const { admin } = fakeAdmin({});
    await expect(campus.reserveCampusCredit(admin, {
      code: { ...liveCode, active: false } as any, userId: 'u1', type: 'rental', bookingRequestId: 'b1', listingId: 'l1', quote: rentalQuote(), row: booking(1000),
    })).rejects.toMatchObject({ code: 'partner_code_inactive', message: math.CAMPUS_INACTIVE_MESSAGE });
  });
  it('a used-up per-user limit maps to a clear message', async () => {
    const { admin } = fakeAdmin({ rpc: { data: null, error: { message: 'campus_limit_reached' } } });
    await expect(campus.reserveCampusCredit(admin, {
      code: liveCode as any, userId: 'u1', type: 'sale', saleTransactionId: 's1', listingId: 'l1',
      quote: quoteSaleTransaction(sale(6000), 'Trailer'), row: sale(6000),
    })).rejects.toMatchObject({ code: 'partner_code_limit' });
  });
  it('a purchase under the minimum never reaches the reservation', async () => {
    const rpc = vi.fn();
    const admin = { ...fakeAdmin({}).admin, rpc };
    await expect(campus.reserveCampusCredit(admin, {
      code: liveCode as any, userId: 'u1', type: 'sale', saleTransactionId: 's1', listingId: 'l1',
      quote: quoteSaleTransaction(sale(4999), 'Trailer'), row: sale(4999),
    })).rejects.toMatchObject({ code: 'partner_code_below_minimum' });
    expect(rpc).not.toHaveBeenCalled();
  });
  it('fee_breakdown carries the redemption id the payment trigger completes', () => {
    const fb = campus.campusFeeBreakdown({
      redemptionId: 'red-1', creditCents: 25_000, eligibleSubtotalCents: 600_000, codeId: 'c1', code: 'PIMA27',
      partnerId: 'p1', partnerName: 'Pima Community College', partnerSlug: 'pima-cc',
    });
    expect(fb).toMatchObject({ redemption_id: 'red-1', credit_cents: 25_000, funded_by: 'vendibook', campaign_type: 'campus_partner' });
  });
});
