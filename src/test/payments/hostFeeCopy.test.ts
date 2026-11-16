import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

/**
 * Owner rule (confirmed 2026-11-16): Vendibook Pro does NOT discount the rental
 * host fee. New rentals are 12.9% for the host and 12.9% for the renter on both
 * plans. Equipment sales are 8.7% for the seller. Stale "10.9% for Pro hosts"
 * copy was corrected on the host explainer, the homepage seller explainer and
 * the Fee Breakdown help article; this test keeps it from coming back.
 */
const HOST_FEE_COPY_FILES = [
  'src/pages/HowItWorksHost.tsx',
  'src/components/home/v2/HomeExplainer.tsx',
  'src/data/helpArticles.ts',
];

describe('host fee copy matches the 12.9% rule', () => {
  for (const file of HOST_FEE_COPY_FILES) {
    it(`${file} never advertises a 10.9% host fee`, () => {
      const src = readFileSync(file, 'utf8');
      expect(src).not.toMatch(/10\.9\s*%/);
      expect(src).toContain('12.9%');
    });
  }

  it('the host explainer states the fee is the same on Pro and the free plan', () => {
    const src = readFileSync('src/pages/HowItWorksHost.tsx', 'utf8');
    expect(src).toMatch(/same (rate )?on Vendibook Pro and the free plan/);
  });

  it('the fee-breakdown article does not claim a Pro host discount', () => {
    const src = readFileSync('src/data/helpArticles.ts', 'utf8');
    expect(src).not.toMatch(/Pro (discount|hosts? (pay|save))/i);
    expect(src).toMatch(/12\.9% host commission on Standard and Pro/);
  });

  it('no other app source advertises a 10.9% fee', () => {
    const scanned = [
      'src/data/pricingFaq.ts',
      'src/lib/fees/proFee.ts',
      'src/pages/Pricing.tsx',
      'src/pages/BecomeAHost.tsx',
    ];
    const offenders = scanned.filter((file) => {
      try {
        return /10\.9\s*%/.test(readFileSync(file, 'utf8'));
      } catch {
        return false;
      }
    });
    expect(offenders).toEqual([]);
  });
});
