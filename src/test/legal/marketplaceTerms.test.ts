import { describe, expect, it } from 'vitest';
import { MARKETPLACE_TERMS_TABS, type TermsTab } from '@/lib/legal/marketplaceTerms';

const text = (tab: TermsTab) => JSON.stringify(tab);
const all = MARKETPLACE_TERMS_TABS.map(text).join(' ');

describe('Vendibook marketplace terms', () => {
  it('has the seven tabs in order', () => {
    expect(MARKETPLACE_TERMS_TABS.map((t) => t.id)).toEqual(['site-usage', 'buyer', 'seller', 'rental', 'guarantee', 'abandonment', 'privacy']);
  });
  it('contains no template placeholders or another company’s names', () => {
    expect(all).not.toMatch(/\[[A-Z ]+\]|_{3,}|\bTBD\b|\bINSERT\b|Company Name|lorem/i);
    expect(all).not.toMatch(/IronPlanet|Ritchie|RB Group|IronClad|Paysafe|Marketplace-E|GovPlanet/i);
  });
  it('never uses custodial wording', () => {
    expect(all).not.toMatch(/escrow(?!\s+arrangement)|hold(s|ing)? (your|the buyer’s|buyer) (money|funds|payment)|held in trust/i);
    expect(text(MARKETPLACE_TERMS_TABS[4])).toMatch(/not insurance, a warranty on the equipment, a financial guarantee or an escrow arrangement/);
  });
  it('states the real marketplace rules', () => {
    expect(all).toContain('8.7%');
    expect(all).toMatch(/14 days/);
    expect(all).toMatch(/48 hours/);
    expect(text(MARKETPLACE_TERMS_TABS[3])).toMatch(/Square/);
    expect(text(MARKETPLACE_TERMS_TABS[3])).not.toMatch(/PayPal/);
    expect(all).not.toMatch(/Stripe/);
    expect(all).toContain('Vendibook LC');
  });
  it('gives every section a unique id', () => {
    const ids = MARKETPLACE_TERMS_TABS.flatMap((t) => t.sections.map((s) => s.id));
    expect(new Set(ids).size).toBe(ids.length);
  });
});
