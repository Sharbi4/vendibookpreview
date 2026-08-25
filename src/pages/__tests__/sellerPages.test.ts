import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Guardrail for the seller-marketing surfaces. These pages must never
 * reintroduce retired providers or unverified performance claims.
 */

const FILES = [
  'src/pages/SellMyFoodTruck.tsx',
  'src/pages/HowItWorksSeller.tsx',
  'src/components/sell/SellerLandingPage.tsx',
  'src/components/sell/SellerPaymentsExplainer.tsx',
  'src/pages/sell/SellFoodTrailer.tsx',
  'src/pages/sell/SellConcessionTrailer.tsx',
];

const BANNED = [
  'stripe',
  'affirm',
  'afterpay',
  'typically under 10',
  '24/7',
  '3x faster',
  '14 days',
  'escrow',
  'instant payout',
  'guaranteed payout',
];

const read = (f: string) => readFileSync(resolve(process.cwd(), f), 'utf8');

describe('seller marketing pages', () => {
  for (const file of FILES) {
    it(`${file} contains no retired provider or unverified claim wording`, () => {
      const text = read(file).toLowerCase();
      const hits = BANNED.filter((term) => text.includes(term));
      expect(hits).toEqual([]);
    });

    it(`${file} does not use the dead /list?mode=sale route`, () => {
      expect(read(file)).not.toContain('/list?mode=sale');
    });
  }

  it('the consolidated explainer states the fee, payout, and add-on facts', () => {
    const text = read('src/components/sell/SellerPaymentsExplainer.tsx');
    expect(text).toContain('12.9% seller platform fee');
    expect(text).toContain('no Vendibook seller platform fee');
    expect(text).toContain('$19.99');
    expect(text).toContain('Vendibook is not a lender');
    expect(text).toContain('PayPal Purchase Protection');
    expect(text).toContain('/identity-verification');
    expect(text).toContain('/financing');
  });

  it('the explainer uses the shared provider logo components', () => {
    const text = read('src/components/sell/SellerPaymentsExplainer.tsx');
    expect(text).toContain("from '@/components/brand/ProviderLogos'");
    expect(text).toContain('<PayPalWordmark');
    expect(text).toContain('<PlaidLogo');
    expect(text).toContain('<EquinoxFundingLogo');
  });
});
