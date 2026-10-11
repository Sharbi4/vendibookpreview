/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../../supabase/functions/_shared/paypal.ts', () => ({ newPaymentReference: () => 'VB-TEST' }));

// Deno modules, loaded at runtime so the app typecheck doesn't follow them.
const shared = '../../../supabase/functions/_shared/';
const acct = await import(/* @vite-ignore */ `${shared}paypalAccounting.ts`);
const cp = await import(/* @vite-ignore */ `${shared}campusPartner.ts`);
const od = await import(/* @vite-ignore */ `${shared}paypalOrderDetail.ts`);
const sq = await import(/* @vite-ignore */ `${shared}squareRentalMath.ts`);

const code = (over: Record<string, unknown> = {}) => ({
  id: 'c1', code: 'CSN27', partner_name: 'College of Southern Nevada', program: 'campus_partner', is_active: true,
  starts_at: new Date(Date.now() - 1000).toISOString(), expires_at: '2027-08-31T23:59:59Z',
  rental_percent: 10, rental_cap_cents: 10_000, purchase_credit_cents: 25_000, purchase_min_cents: 500_000,
  rental_uses_per_user: 2, purchase_uses_per_user: 1, ...over,
});

const tax = (cents: number) => ({ taxCents: cents, ratePct: 8, state: 'NV', source: 'state_table', label: 'Sales tax' });

/** Fake admin client: promo_codes lookup + active-use count RPC. */
function fakeAdmin(row: Record<string, unknown> | null, used = 0) {
  return {
    from: () => {
      const q: any = {
        select: () => q, eq: () => q, maybeSingle: async () => ({ data: row, error: null }),
        in: async () => ({ count: used, error: null }),
      };
      return q;
    },
    rpc: async (_name: string) => ({ data: used, error: null }),
  };
}

describe('normalization and status', () => {
  it('is case- and whitespace-insensitive', () => {
    expect(cp.normalizePartnerCode('  csn 27 ')).toBe('CSN27');
    expect(cp.normalizePartnerCode('Scottsdale27\t')).toBe('SCOTTSDALE27');
  });
  it('rejects invalid, inactive, not-yet-started and expired codes', () => {
    expect(cp.partnerCodeStatus(null)).toBe('invalid');
    expect(cp.partnerCodeStatus(code({ program: 'standard' }) as any)).toBe('invalid');
    expect(cp.partnerCodeStatus(code({ is_active: false }) as any)).toBe('inactive');
    expect(cp.partnerCodeStatus(code({ starts_at: new Date(Date.now() + 60_000).toISOString() }) as any)).toBe('not_started');
    expect(cp.partnerCodeStatus(code({ expires_at: new Date(Date.now() - 1).toISOString() }) as any)).toBe('expired');
    expect(cp.partnerCodeStatus(code() as any)).toBeNull();
  });
});

describe('rental credit', () => {
  it('is 10% of the eligible subtotal', () => {
    expect(cp.rentalPartnerCredit(code() as any, 45_000)).toBe(4_500);
  });
  it('caps at $100', () => {
    expect(cp.rentalPartnerCredit(code() as any, 300_000)).toBe(10_000);
  });
  it('excludes delivery, renter fee, deposit and tax; host payout and host fee unchanged', () => {
    // $1,000 rental + $100 delivery, 12.9% renter fee, $500 deposit, 8% tax.
    const booking = { total_price: 1241.9, deposit_amount: 500, fulfillment_selected: 'delivery', delivery_fee_snapshot: 100, host_id: 'h', shopper_id: 's' };
    const before = acct.quoteBookingRequest(booking, 'Truck', { isPro: false });
    acct.applyTaxToQuote(before, tax(8_800));
    const base = cp.rentalEligibleBaseCents(before, booking);
    expect(base).toBe(100_000);
    const credit = cp.rentalPartnerCredit(code() as any, base);
    expect(credit).toBe(10_000);
    const snapshot = { fee: before.platformFeeCents, host: before.sellerProceedsCents, hostFee: before.hostFeeCents, tax: before.taxCents, dep: before.depositCents, gross: before.grossCents };
    const after = cp.applyPartnerCredit(before, credit);
    expect(after.grossCents).toBe(snapshot.gross - 10_000);
    expect(after.platformFeeCents).toBe(snapshot.fee);
    expect(after.hostFeeCents).toBe(Math.round(110_000 * 0.129));
    expect(after.sellerProceedsCents).toBe(snapshot.host);
    expect(after.taxCents).toBe(snapshot.tax);
    expect(after.depositCents).toBe(snapshot.dep);
    expect(after.discountCents).toBe(10_000);
    expect(after.breakdown.at(-1)).toEqual({ label: 'Campus Partner credit', amountCents: -10_000, kind: 'credit' });
  });
  it('Square: the charged amount equals the shown total and the host still nets the same', () => {
    const booking = { total_price: 225.8, deposit_amount: 50, host_id: 'h', shopper_id: 's' };
    const q = acct.quoteBookingRequest(booking, 'Space', { isPro: false });
    acct.applyTaxToQuote(q, tax(1_600));
    const hostBefore = q.sellerProceedsCents;
    const credit = cp.rentalPartnerCredit(code() as any, cp.rentalEligibleBaseCents(q, booking));
    cp.applyPartnerCredit(q, credit);
    const shown = q.breakdown.reduce((s: number, l: { amountCents: number }) => s + l.amountCents, 0);
    expect(shown).toBe(q.grossCents);
    const split = sq.splitRentalCharge({ grossCents: q.grossCents, sellerProceedsCents: q.sellerProceedsCents });
    expect(split.sellerCents).toBe(hostBefore);
    expect(split.appFeeCents).toBeGreaterThanOrEqual(0);
  });
});

describe('purchase credit', () => {
  it('gives $250 at or above $5,000 and nothing below', () => {
    expect(cp.purchasePartnerCredit(code() as any, 500_000)).toBe(25_000);
    expect(cp.purchasePartnerCredit(code() as any, 499_999)).toBe(0);
  });
  it('excludes freight and tax; seller payout and seller fee unchanged; PayPal amount equals UI', () => {
    const tx = { amount: 25_000, freight_cost: 1_200, fulfillment_type: 'vendibook_freight', seller_id: 's', buyer_id: 'b' };
    const q = acct.quoteSaleTransaction(tx, 'Trailer', { freightPayer: 'buyer' });
    acct.applyTaxToQuote(q, tax(200_000));
    const fee = q.platformFeeCents;
    const seller = q.sellerProceedsCents;
    const uiTotalBefore = q.grossCents;
    cp.applyPartnerCredit(q, cp.purchasePartnerCredit(code() as any, 2_500_000));
    expect(fee).toBe(Math.round(2_500_000 * 0.129));
    expect(q.platformFeeCents).toBe(fee);
    expect(q.sellerProceedsCents).toBe(seller);
    expect(q.taxCents).toBe(200_000);
    // The UI subtracts exactly $250 from the same total.
    expect(q.grossCents).toBe(uiTotalBefore - 25_000);
    const detail = od.buildOrderDetail(q, { physical: true, itemName: 'Trailer' });
    expect(detail.discountCents).toBe(25_000);
    expect(detail.itemTotalCents + detail.taxCents + detail.shippingCents - detail.discountCents).toBe(q.grossCents);
  });
  it('never makes the platform share negative', () => {
    const q = acct.quoteSaleTransaction({ amount: 1_000, seller_id: 's', buyer_id: 'b' }, 'x');
    expect(() => cp.applyPartnerCredit(q, 25_000)).toThrow('partner_credit_exceeds_platform_share');
    expect(q.platformFeeCents).toBeGreaterThanOrEqual(0);
  });
});

describe('resolvePartnerCredit', () => {
  const base = { userId: 'u1' };
  it('accepts a valid purchase', async () => {
    const r = await cp.resolvePartnerCredit(fakeAdmin(code()), { ...base, code: ' csn27 ', kind: 'purchase', eligibleBaseCents: 600_000 });
    expect(r).toMatchObject({ ok: true, creditCents: 25_000 });
    expect(r.row?.partner_name).toBe('College of Southern Nevada');
  });
  it('excludes cash / pay-in-person sales', async () => {
    const r = await cp.resolvePartnerCredit(fakeAdmin(code()), { ...base, code: 'CSN27', kind: 'purchase', eligibleBaseCents: 600_000, isCash: true });
    expect(r.reason).toBe('cash_excluded');
  });
  it('enforces the $5,000 minimum', async () => {
    const r = await cp.resolvePartnerCredit(fakeAdmin(code()), { ...base, code: 'CSN27', kind: 'purchase', eligibleBaseCents: 400_000 });
    expect(r.reason).toBe('below_minimum');
  });
  it('enforces usage limits (1 purchase, 2 rentals)', async () => {
    expect((await cp.resolvePartnerCredit(fakeAdmin(code(), 1), { ...base, code: 'CSN27', kind: 'purchase', eligibleBaseCents: 600_000 })).reason).toBe('limit_reached');
    expect((await cp.resolvePartnerCredit(fakeAdmin(code(), 1), { ...base, code: 'CSN27', kind: 'rental', eligibleBaseCents: 50_000 })).ok).toBe(true);
    expect((await cp.resolvePartnerCredit(fakeAdmin(code(), 2), { ...base, code: 'CSN27', kind: 'rental', eligibleBaseCents: 50_000 })).reason).toBe('limit_reached');
  });
  it('rejects unknown and expired codes', async () => {
    expect((await cp.resolvePartnerCredit(fakeAdmin(null), { ...base, code: 'NOPE27', kind: 'rental', eligibleBaseCents: 50_000 })).reason).toBe('invalid');
    expect((await cp.resolvePartnerCredit(fakeAdmin(code({ expires_at: '2020-01-01' })), { ...base, code: 'CSN27', kind: 'rental', eligibleBaseCents: 50_000 })).reason).toBe('expired');
  });
});

describe('brief matrix: boundaries, copy and receipts', () => {
  it('rental: $999.99 subtotal gives $99.99; $1,000 gives the full $100; $2,000 still $100', () => {
    expect(cp.rentalPartnerCredit(code() as any, 99_999)).toBe(9_999);
    expect(cp.rentalPartnerCredit(code() as any, 100_000)).toBe(10_000);
    expect(cp.rentalPartnerCredit(code() as any, 200_000)).toBe(10_000);
    expect(cp.rentalPartnerCredit(code() as any, 0)).toBe(0);
  });
  it('purchase: exactly $5,000.00 qualifies; $4,999.99 does not', () => {
    expect(cp.purchasePartnerCredit(code() as any, 500_000)).toBe(25_000);
    expect(cp.purchasePartnerCredit(code() as any, 499_999)).toBe(0);
  });
  it('pickup rentals keep the whole subtotal eligible (no delivery to exclude)', () => {
    const booking = { total_price: 1129, deposit_amount: 0, fulfillment_selected: 'pickup', delivery_fee_snapshot: 100, host_id: 'h', shopper_id: 's' };
    const q = acct.quoteBookingRequest(booking, 'Truck', { isPro: false });
    expect(cp.rentalEligibleBaseCents(q, booking)).toBe(100_000);
  });
  it('Pro hosts: credit still comes only out of Vendibook share; host payout unchanged', () => {
    const booking = { total_price: 1129, deposit_amount: 0, host_id: 'h', shopper_id: 's' };
    const q = acct.quoteBookingRequest(booking, 'Truck', { isPro: true });
    const host = q.sellerProceedsCents;
    cp.applyPartnerCredit(q, cp.rentalPartnerCredit(code() as any, cp.rentalEligibleBaseCents(q, booking)));
    expect(q.sellerProceedsCents).toBe(host);
  });
  it('uses the exact owner-approved messages', () => {
    expect(cp.PARTNER_MESSAGES.invalid).toBe("That Campus Partner code isn't active. Check the code with your school or continue without it.");
    expect(cp.PARTNER_MESSAGES.expired).toBe('This Campus Partner code has expired. Check with your school for the current code.');
    expect(cp.PARTNER_MESSAGES.limit_reached).toBe("You've already used the available Campus Partner benefit for this transaction type.");
  });
  it('fee_breakdown snapshot feeds receipts and emails', () => {
    const fb = { campus_partner: { promo_code_id: 'c1', code: 'PIMA27', partner_name: 'Pima Community College', credit_cents: 25_000 } };
    expect(cp.campusPartnerFromBreakdown(fb)).toEqual({ code: 'PIMA27', partner_name: 'Pima Community College', credit_cents: 25_000 });
    expect(cp.campusPartnerEmailFields(fb)).toEqual({ campusCredit: '$250.00', campusPartnerName: 'Pima Community College' });
    expect(cp.campusPartnerEmailFields({})).toEqual({});
    expect(cp.campusPartnerFromBreakdown(null)).toBeNull();
  });
  it('partner snapshot carries promo_code_id, code, school, kind and funding source', () => {
    const snap = cp.partnerSnapshot({ ok: true, row: code() as any, creditCents: 10_000, eligibleBaseCents: 100_000 }, 'rental');
    expect(snap).toEqual({
      promo_code_id: 'c1', code: 'CSN27', partner_name: 'College of Southern Nevada', kind: 'rental',
      credit_cents: 10_000, eligible_base_cents: 100_000, funded_by: 'vendibook',
    });
  });
  it('reservation maps server outcomes (retry-safe; limit, expired, inactive)', async () => {
    const admin = (data: string | null, error: unknown = null) => ({ rpc: async () => ({ data, error }) });
    const args = { codeId: 'c1', userId: 'u', kind: 'purchase', paymentRecordId: 'p', creditCents: 25_000, eligibleBaseCents: 600_000, grossCents: 1, platformFeeCents: 1 };
    expect(await cp.reservePartnerRedemption(admin('ok'), args)).toBeNull();
    expect(await cp.reservePartnerRedemption(admin('limit_reached'), args)).toBe('limit_reached');
    expect(await cp.reservePartnerRedemption(admin('expired'), args)).toBe('expired');
    expect(await cp.reservePartnerRedemption(admin('inactive'), args)).toBe('inactive');
    expect(await cp.reservePartnerRedemption(admin(null, { message: 'x' }), args)).toBe('not_eligible');
  });
});
