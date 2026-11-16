import { expect, it } from 'vitest';
import { quoteRentalAmountDue } from '../../../supabase/functions/_shared/rentalQuote';

// Minimal admin stub: no Pro subscription, no tax exemption on file.
const admin = { from() {
  const q: any = { select: () => q, eq: () => q, limit: () => q, maybeSingle: async () => ({ data: null, error: null }),
    then: (resolve: any) => resolve({ data: [], error: null }) };
  return q;
} };

// First Square rental: 6 days x $90 in Hollywood, FL, 12.9% renter fee, $3,000 deposit.
const booking = {
  id: 'b1', host_id: 'h1', shopper_id: 's1', total_price: 609.66, deposit_amount: 3000,
  host_platform_fee: null, listing: { title: 'Trailer', city: 'Hollywood', state: 'FL', address: '18022 SW 29th Ln, Hollywood, FL 33029' },
};

it('charges rental + service fee + Florida sales tax + refundable deposit in one total', async () => {
  const { quote } = await quoteRentalAmountDue(admin, booking);
  expect(quote.taxableBaseCents).toBe(54000);
  expect(quote.taxCents).toBe(3769); // 6.98% of the $540 rental
  expect(quote.depositCents).toBe(300000);
  expect(quote.grossCents).toBe(364735); // $609.66 + $37.69 + $3,000
  expect(quote.breakdown.map((l) => l.amountCents)).toEqual([54000, 6966, 300000, 3769]);
});

it('never pays the deposit or the tax to the host', async () => {
  const { quote } = await quoteRentalAmountDue(admin, booking);
  expect(quote.sellerProceedsCents).toBe(54000 - Math.round(54000 * 0.129));
});
