import { describe, expect, it } from 'vitest';
import { DIGITAL_TAX_RULES, STATE_SALES_TAX_RATES, quoteSalesTax, taxRateFor } from '../../../supabase/functions/_shared/tax';

const jul2026 = new Date('2026-10-13T12:00:00Z');
const quote = (state: string | null, kind: 'sale' | 'rental' | 'digital', exemption: { id: string; state: string } | null = null, today = jul2026) =>
  quoteSalesTax({ amountCents: 100_000, destination: { state }, kind, exemption, today });

describe('sales tax engine (state + average local, midyear 2026)', () => {
  it('uses the combined state and average local rate', async () => {
    expect(await quote('AZ', 'sale')).toMatchObject({ ratePct: 8.54, taxCents: 8540, source: 'state_table', label: 'Estimated tax (AZ)' });
    expect((await quote('LA', 'rental')).ratePct).toBe(10.13);
    expect((await quote('tx', 'sale')).taxCents).toBe(8200);
  });
  it('covers every state plus DC and never charges in no-tax states', async () => {
    expect(Object.keys(STATE_SALES_TAX_RATES)).toHaveLength(51);
    for (const s of ['DE', 'MT', 'NH', 'OR']) expect(await quote(s, 'sale')).toMatchObject({ taxCents: 0, source: 'no_tax_state' });
  });
  it('taxes digital items only where the state taxes online services', async () => {
    expect(await quote('FL', 'digital')).toMatchObject({ taxCents: 0, source: 'not_taxable', label: 'Sales tax (FL — not taxed)' });
    expect(await quote('NY', 'digital')).toMatchObject({ taxCents: 8540, ratePct: 8.54 });
    expect(await quote('TX', 'digital')).toMatchObject({ taxCents: 6560, ratePct: 6.56 });
    expect(await quote('CT', 'digital')).toMatchObject({ taxCents: 1000, ratePct: 1 });
  });
  it('starts California digital tax on January 1 2027', async () => {
    expect((await quote('CA', 'digital')).source).toBe('not_taxable');
    expect((await quote('CA', 'digital', null, new Date('2027-01-01T08:00:00Z'))).taxCents).toBe(9030);
    expect(DIGITAL_TAX_RULES.CA.from).toBe('2027-01-01');
  });
  it('applies an exemption only in its own state', async () => {
    const cert = { id: 'cert-1', state: 'AZ' };
    expect(await quote('AZ', 'sale', cert)).toMatchObject({ taxCents: 0, source: 'exempt', exemptionId: 'cert-1', label: 'Tax exempt (AZ)' });
    expect((await quote('NV', 'sale', cert)).taxCents).toBe(8240);
  });
  it('returns zero with a clear label when there is no destination', async () => {
    expect(await quote(null, 'rental')).toMatchObject({ taxCents: 0, source: 'no_destination' });
    expect(taxRateFor('ZZ', 'sale').ratePct).toBe(0);
  });
});
