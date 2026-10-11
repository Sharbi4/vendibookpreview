import { describe, expect, it } from 'vitest';
import { capturedFacts, capturedSummaryLine } from '../summary';
import type { VendiDraft } from '../script';

const draft = (over: Partial<VendiDraft> = {}): VendiDraft => ({
  title: null, description: null, category: null, mode: null, ...over,
} as VendiDraft);

describe('captured facts', () => {
  it('shows nothing before the seller has said anything', () => {
    expect(capturedFacts(draft())).toHaveLength(0);
    expect(capturedSummaryLine([])).toContain("don't have anything saved yet");
  });

  it('reports only explicitly captured values', () => {
    const facts = capturedFacts(draft({ category: 'food_trailer', mode: 'sale', price_sale: 45000 }), 3);
    const labels = facts.map((f) => f.label);
    expect(labels).toContain('Type');
    expect(labels).toContain('Asking price');
    expect(labels).not.toContain('Description');
    expect(facts.find((f) => f.label === 'Asking price')?.value).toBe('$45,000');
    expect(facts.find((f) => f.label === 'Media')?.value).toBe('3 photos');
  });

  it('never shows a sale price on a rental, and lists every rate given', () => {
    const facts = capturedFacts(draft({
      mode: 'rent', price_monthly: 1000, price_daily: 120, price_sale: 45000,
    }));
    expect(facts.find((f) => f.label === 'Asking price')).toBeUndefined();
    expect(facts.find((f) => f.label === 'Rate')?.value).toBe('$1,000/mo · $120/day');
  });

  it('ties each fact to the question that can correct it', () => {
    const facts = capturedFacts(draft({ city: 'Mesa', state: 'AZ' }));
    expect(facts.find((f) => f.label === 'Location')?.questionId).toBe('location');
  });
});
