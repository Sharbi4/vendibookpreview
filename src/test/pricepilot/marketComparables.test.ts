import { describe, it, expect } from 'vitest';
import {
  buildMarketEvidence,
  evidencePrice,
  isUsableSaleComp,
  parseLocation,
  selectComparables,
  toSafeComparable,
  type ComparableRow,
  type CompSubject,
} from '../../../supabase/functions/_shared/marketComparables';

const row = (o: Partial<ComparableRow>): ComparableRow => ({
  source: 'facebook_marketplace',
  source_title: 'Food trailer',
  observed_status: 'sold',
  asset_category: 'food_trailer',
  valuation_mode: 'sale',
  city: 'Lubbock',
  state: 'TX',
  year: 2026,
  length_ft: 14,
  displayed_price: 16999,
  usable_for_valuation: true,
  evidence_confidence: 0.8,
  extraction_confidence: 0.9,
  transaction_price_verified: false,
  ...o,
});

const subject = (o: Partial<CompSubject> = {}): CompSubject => ({
  mode: 'sale',
  category: 'food_trailer',
  city: 'Lubbock',
  state: 'TX',
  year: 2026,
  lengthFt: 14,
  ...o,
});

describe('parseLocation', () => {
  it('parses city and state abbreviation', () => {
    expect(parseLocation('Lubbock, TX')).toEqual({ city: 'Lubbock', state: 'TX' });
  });
  it('parses full state names', () => {
    expect(parseLocation('San Antonio, Texas').state).toBe('TX');
  });
  it('handles empty input', () => {
    expect(parseLocation('')).toEqual({ city: null, state: null });
  });
});

describe('sale comp selection', () => {
  it('ranks same-state comps first and labels statewide scope', () => {
    const rows = [
      row({ state: 'CA', city: 'Fresno', source_title: 'CA trailer', displayed_price: 30000 }),
      row({ source_title: 'TX A' }),
      row({ source_title: 'TX B', city: 'Forney', displayed_price: 7500 }),
      row({ source_title: 'TX C', city: 'San Antonio', displayed_price: 2000 }),
    ];
    const { selected, geographicScope } = selectComparables(rows, subject());
    expect(geographicScope).toBe('TX statewide');
    expect(selected.every((s) => s.row.state === 'TX')).toBe(true);
  });

  it('expands nationally when same-state evidence is thin', () => {
    const rows = [
      row({ state: 'CA', city: 'Fresno', source_title: 'CA 1' }),
      row({ state: 'CO', city: 'Denver', source_title: 'CO 1' }),
    ];
    const { geographicScope, selected } = selectComparables(rows, subject());
    expect(geographicScope).toBe('national');
    expect(selected).toHaveLength(2);
  });

  it('never uses sale comps for rental valuations', () => {
    const res = selectComparables([row({})], subject({ mode: 'rental' }));
    expect(res.selected).toHaveLength(0);
    expect(buildMarketEvidence([row({})], subject({ mode: 'rental' }))).toBeNull();
  });

  it('excludes unusable, rental-mode, and low-confidence rows', () => {
    expect(isUsableSaleComp(row({ usable_for_valuation: false }))).toBe(false);
    expect(isUsableSaleComp(row({ valuation_mode: 'rental' }))).toBe(false);
    expect(isUsableSaleComp(row({ evidence_confidence: 0.1 }))).toBe(false);
    expect(isUsableSaleComp(row({ observed_status: 'ambiguous' }))).toBe(false);
    expect(isUsableSaleComp(row({ displayed_price: null }))).toBe(false);
  });

  it('never treats previous_displayed_price as a closing price', () => {
    const r = row({ displayed_price: 7550, previous_displayed_price: 12000 });
    expect(evidencePrice(r)).toBe(7550);
    const ev = buildMarketEvidence([r], subject())!;
    expect(ev.comparables[0].displayedPrice).toBe(7550);
    expect(JSON.stringify(ev)).not.toContain('12000');
  });

  it('ranks a verified transaction above a Facebook sold observation', () => {
    const verified = row({
      source: 'vendibook',
      source_title: 'Verified sale',
      transaction_price_verified: true,
      verified_transaction_price: 21000,
      displayed_price: 25000,
      observed_status: 'sold',
    });
    const { selected } = selectComparables([row({ source_title: 'FB sold' }), verified], subject());
    expect(selected[0].row.source_title).toBe('Verified sale');
    expect(selected[0].price).toBe(21000);
  });

  it('labels Facebook sold status as observed evidence only', () => {
    const safe = toSafeComparable(row({}));
    expect(safe.sourceLabel).toBe('Facebook Marketplace');
    expect(safe.transactionPriceVerified).toBe(false);
    expect(safe.evidenceNote).toContain('Observed sold-status listing');
    expect(safe.evidenceNote).toContain('not a confirmed final transaction price');
    expect(safe).not.toHaveProperty('id');
  });

  it('ranks pending below sold', () => {
    const { selected } = selectComparables(
      [row({ source_title: 'Pending', observed_status: 'pending' }), row({ source_title: 'Sold' })],
      subject(),
    );
    expect(selected[0].row.source_title).toBe('Sold');
  });

  it('computes deterministic evidence stats', () => {
    const rows = [
      row({ source_title: 'A', displayed_price: 7500 }),
      row({ source_title: 'B', displayed_price: 16999 }),
      row({ source_title: 'C', displayed_price: 2000 }),
    ];
    const ev = buildMarketEvidence(rows, subject())!;
    expect(ev.observationsAnalyzed).toBe(3);
    expect(ev.medianDisplayedPrice).toBe(7500);
    expect(ev.rangeLow).toBe(2000);
    expect(ev.rangeHigh).toBe(16999);
    expect(ev.comparables).toHaveLength(3);
  });

  it('returns null when no comparables are available', () => {
    expect(buildMarketEvidence([], subject())).toBeNull();
    expect(buildMarketEvidence([row({ usable_for_valuation: false })], subject())).toBeNull();
  });
});
