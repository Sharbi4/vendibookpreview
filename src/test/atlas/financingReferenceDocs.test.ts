import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

// Shared reference documents attached to Atlas, Allison and the support phone
// line (replaced 2026-11-07). APPROVE is the only financing partner; older
// partners may appear only as "not offered".
const docs = {
  guide: readFileSync('docs/support/vendibook-ai-support-master-guide-v5.3.txt', 'utf8'),
  allison: readFileSync('docs/atlas/allison-knowledge-base.json', 'utf8'),
};

describe('financing reference documents are APPROVE-only', () => {
  it.each(Object.entries(docs))('%s links the APPROVE hosted application', (_n, text) => {
    expect(text).toContain('https://financing.approvepayments.com/vendibook');
  });

  it.each(Object.entries(docs))('%s never sends customers to a former partner', (_n, text) => {
    expect(text).not.toMatch(/Apply with Equinox|Equinox Funding (handles|reviews)|Discuss the exact equipment and expenses with\s+Equinox/);
    expect(text).not.toMatch(/ClickLease has been discussed/);
    expect(text).not.toMatch(/Never suggest PayPal installments for rentals/);
  });

  it.each(Object.entries(docs))('%s makes no 24-48 hour decision claim', (_n, text) => {
    expect(text).not.toMatch(/24[-–]48/);
  });
});
