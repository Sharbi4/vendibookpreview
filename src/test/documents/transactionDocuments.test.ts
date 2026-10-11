/**
 * Tests for the Vendibook transaction-document package: PDF generation,
 * template field definitions, versioning, and the "never invent data" rules.
 */
import { describe, expect, it } from 'vitest';
import { PdfDoc, toSignNowBox, PAGE_HEIGHT } from '../../../supabase/functions/_shared/pdfDoc.ts';
import {
  TEMPLATE_SPECS,
  SPEC_VERSIONS,
  getTemplateSpec,
  variantVersion,
  type TemplateSpec,
} from '../../../supabase/functions/_shared/signnowTemplateSpecs.ts';

const decode = (bytes: Uint8Array) => new TextDecoder('latin1').decode(bytes);

/** Rejoin the drawn text runs so wrapped sentences can be asserted on. */
const extractText = (bytes: Uint8Array): string =>
  Array.from(decode(bytes).matchAll(/\((.*?)\) Tj/g))
    .map((m) => m[1].replace(/\\([\\()])/g, '$1'))
    .join(' ')
    .replace(/\s+/g, ' ');
const specs = Object.values(TEMPLATE_SPECS) as TemplateSpec[];

describe('PDF engine', () => {
  it('emits a valid, multi-page PDF with matching xref entries', () => {
    const doc = new PdfDoc({ title: 'Test Document', version: '1', reference: 'REF-1' });
    doc.documentTitle('Test Document', 'subtitle');
    for (let i = 0; i < 60; i++) doc.paragraph(`Paragraph ${i} with enough words to occupy a real line of body text in the layout.`);
    const pdf = doc.build();
    const text = decode(pdf);

    expect(text.startsWith('%PDF-1.4')).toBe(true);
    expect(text.trimEnd().endsWith('%%EOF')).toBe(true);
    const pageCount = Number(/\/Count (\d+)/.exec(text)![1]);
    expect(pageCount).toBeGreaterThan(1);
    expect((text.match(/\/Type \/Page\b/g) ?? []).length).toBe(pageCount);
    // One xref line per object plus the free entry.
    const objectCount = (text.match(/\n\d+ 0 obj/g) ?? []).length;
    expect(text).toContain(`/Size ${objectCount + 1}`);
  });

  it('numbers every page footer', () => {
    const doc = new PdfDoc({ title: 'Footer Test', version: '1' });
    for (let i = 0; i < 80; i++) doc.paragraph('Filler line for pagination purposes in the footer test document.');
    const text = decode(doc.build());
    expect(text).toContain('Page 1 of ');
    expect(text).toContain('Page 2 of ');
  });

  it('converts field boxes to SignNow top-left coordinates', () => {
    const box = { page: 0, x: 56, y: 700, w: 200, h: 26 };
    expect(toSignNowBox(box)).toEqual({ page: 0, x: 56, y: PAGE_HEIGHT - 700 - 26, w: 200, h: 26 });
  });
});

describe('template package', () => {
  it('covers all seven document kinds', () => {
    expect(specs.map((s) => s.kind).sort()).toEqual([
      'delivery_handoff_acknowledgment',
      'purchase_sale_agreement',
      'rental_agreement',
      'rental_checkin_condition_report',
      'rental_checkout_condition_report',
      'sale_handoff_condition_acknowledgment',
      'transaction_amendment',
    ]);
  });

  it.each(specs.map((s) => [s.kind, s] as const))('%s builds a signable multi-page template', (_kind, spec) => {
    const { pdf, fields } = spec.build();
    const text = decode(pdf);
    expect(text.startsWith('%PDF-1.4')).toBe(true);

    // Both parties get a real signature field, a printed name and a date.
    for (const role of spec.roles) {
      const roleFields = fields.filter((f) => f.role === role);
      expect(roleFields.some((f) => f.type === 'signature' && f.required)).toBe(true);
      expect(roleFields.some((f) => f.name.endsWith('printed_name'))).toBe(true);
      expect(roleFields.some((f) => f.name.endsWith('signed_date'))).toBe(true);
    }

    // No field may reference a role the template does not define.
    for (const f of fields) expect(spec.roles).toContain(f.role);
    // Field names are unique, so prefill can never target two boxes at once.
    expect(new Set(fields.map((f) => f.name)).size).toBe(fields.length);
    // Every box sits on a real page, inside the page.
    const pageCount = Number(/\/Count (\d+)/.exec(text)![1]);
    for (const f of fields) {
      expect(f.page).toBeGreaterThanOrEqual(0);
      expect(f.page).toBeLessThan(pageCount);
      expect(f.y).toBeGreaterThanOrEqual(0);
      expect(f.y + f.h).toBeLessThanOrEqual(PAGE_HEIGHT);
    }
  });

  it('carries an explicit content version for every kind', () => {
    for (const spec of specs) {
      expect(SPEC_VERSIONS[spec.kind]).toBe(spec.version);
      expect(spec.version).toMatch(/^\d{4}-\d{2}-\d{2}(-[A-Z])?$/);
    }
  });

  it('resolves specs by kind and rejects unknown kinds', () => {
    expect(getTemplateSpec('rental_agreement').roles).toEqual(['Renter', 'Host']);
    expect(() => getTemplateSpec('bill_of_sale')).toThrow(/no template spec/);
  });
});

describe('document language guardrails', () => {
  const allText = specs.map((s) => extractText(s.build().pdf)).join(' ');

  it('never describes the transaction as escrow or promises released funds', () => {
    expect(/\bescrow\b/i.test(allText.replace(/not an escrow (agent|company)|not create an escrow/gi, ''))).toBe(false);
    expect(/funds will be released/i.test(allText)).toBe(false);
    expect(/guaranteed refund/i.test(allText)).toBe(false);
  });

  it('never claims Vendibook inspects, appraises, or guarantees the asset', () => {
    expect(/Vendibook (guarantees|inspects|appraises|verifies the condition)/i.test(allText)).toBe(false);
    expect(allText).toContain('Vendibook is not the owner, seller, dealer');
  });

  it('states the electronic signature consent in every signable document', () => {
    for (const spec of specs) {
      const text = extractText(spec.build().pdf);
      const hasEsign = /electronic signature/i.test(text);
      expect(hasEsign).toBe(true);
    }
  });
});

describe('contract documents carry the supplied legal language', () => {
  const psa = extractText(TEMPLATE_SPECS.purchase_sale_agreement.build().pdf);
  const handoff = extractText(TEMPLATE_SPECS.sale_handoff_condition_acknowledgment.build().pdf);

  it('versions both contracts as 2026-09-18-A', () => {
    expect(SPEC_VERSIONS.purchase_sale_agreement).toBe('2026-09-18-A');
    expect(SPEC_VERSIONS.sale_handoff_condition_acknowledgment).toBe('2026-09-18-A');
  });

  it('keeps every numbered clause of the purchase & sale agreement', () => {
    for (const heading of [
      '1. DEFINITIONS', '2. ASSET AND TRANSACTION IDENTIFICATION', '3. AGREEMENT TO BUY AND SELL',
      '4. PURCHASE PRICE AND PAYMENT TERMS', '5. SELLER REPRESENTATIONS', '6. BUYER DUE DILIGENCE',
      '7. CONDITION OF ASSET; WARRANTIES', '8. TITLE, OWNERSHIP, LIENS, AND TRANSFER DOCUMENTS',
      '9. INCLUDED EQUIPMENT AND EXCLUDED PROPERTY', '10. FULFILLMENT AND HANDOFF', '11. INSPECTION AT HANDOFF',
      '12. RISK OF LOSS AND LEGAL TITLE', '13. CANCELLATION, REFUNDS, PAYMENT DISPUTES, AND CHARGEBACKS',
      '14. TAXES, REGISTRATION, LICENSES, AND REGULATORY COMPLIANCE',
      '15. ELECTRONIC RECORDS AND ELECTRONIC SIGNATURES', '16. COMMUNICATIONS AND TRANSACTION RECORDS',
      '17. PRIVACY AND DEVICE PERMISSIONS', '18. PLATFORM ROLE AND LIMITATIONS', '19. AMENDMENTS',
      '20. ENTIRE TRANSACTION RECORD', '21. SUPPORT', '22. ACKNOWLEDGMENT AND SIGNATURES',
    ]) expect(psa).toContain(heading);
    expect(psa).toContain('Vendibook LC');
    expect(psa).toContain('END OF VENDIBOOK PURCHASE & SALE AGREEMENT');
  });

  it('keeps every numbered clause of the handoff acknowledgment with its checkbox lines', () => {
    for (const heading of [
      '1. PURPOSE OF THIS ACKNOWLEDGMENT', '2. ASSET IDENTITY CONFIRMATION', '3. INCLUDED EQUIPMENT',
      '4. CONDITION REVIEW', '5. DOCUMENTS AND KEYS EXCHANGED', '6. PHOTOS AND OTHER CONDITION EVIDENCE',
      '7. MATERIAL DISCREPANCIES OR UNRESOLVED ISSUES', '8. HANDOFF STATUS', '9. IMPORTANT LEGAL LIMITATIONS',
      '10. ACKNOWLEDGMENT',
    ]) expect(handoff).toContain(heading);
    expect(handoff).toContain('[ ] I received physical possession of the Asset.');
    expect(handoff).toContain('END OF SALE HANDOFF & CONDITION ACKNOWLEDGMENT');
  });

  it('never carries payout, release, or held-funds language', () => {
    for (const text of [psa, handoff]) {
      expect(/funds (are|will be|being) (held|released)/i.test(text)).toBe(false);
      expect(/release condition/i.test(text)).toBe(false);
      expect(/payout/i.test(text)).toBe(false);
      expect(/\bescrow\b/i.test(text)).toBe(false);
    }
  });

  it('maps both contracts to Buyer and Seller signer roles only', () => {
    for (const kind of ['purchase_sale_agreement', 'sale_handoff_condition_acknowledgment'] as const) {
      const spec = TEMPLATE_SPECS[kind];
      expect(spec.roles).toEqual(['Buyer', 'Seller']);
      const { fields } = spec.build();
      expect(fields.filter((f) => f.type === 'signature').map((f) => f.role).sort()).toEqual(['Buyer', 'Seller']);
    }
  });

  it('leaves optional identity fields empty rather than inventing a VIN', () => {
    const { fields } = TEMPLATE_SPECS.purchase_sale_agreement.build();
    const vin = fields.find((f) => f.name === 'asset_identifier')!;
    expect(vin.required).toBe(false);
    expect(psa).toContain('VIN / serial / identifying number, if captured');
    expect(psa).toContain('rather than populated with estimated or invented information');
  });
});

describe('rental, condition, amendment and delivery documents', () => {
  const build = (kind: string, variant?: 'mobile' | 'space' | 'general') =>
    extractText((TEMPLATE_SPECS as any)[kind].build(variant).pdf);

  it('versions the five documents as 2026-09-18-A with variant suffixes', () => {
    for (const kind of [
      'rental_agreement',
      'rental_checkin_condition_report',
      'rental_checkout_condition_report',
      'transaction_amendment',
      'delivery_handoff_acknowledgment',
    ]) {
      expect(SPEC_VERSIONS[kind as keyof typeof SPEC_VERSIONS]).toBe('2026-09-18-A');
    }
    expect(variantVersion('rental_agreement', 'mobile')).toBe('2026-09-18-A-mobile');
    expect(variantVersion('rental_agreement', 'general')).toBe('2026-09-18-A');
    // Amendments and delivery receipts are asset-agnostic.
    expect(variantVersion('transaction_amendment', 'mobile')).toBe('2026-09-18-A');
  });

  it('keeps the rental agreement clause structure', () => {
    const text = build('rental_agreement');
    for (const heading of [
      '1. DEFINITIONS',
      '2. BOOKING SUMMARY',
      'CANCELLATION, REFUNDS, AND NO-SHOWS',
      'ELECTRONIC RECORDS AND SIGNATURES',
    ]) {
      expect(text).toContain(heading);
    }
    expect(text).toContain('END OF VENDIBOOK RENTAL AGREEMENT');
  });

  it('omits inapplicable asset sections per variant', () => {
    const mobile = build('rental_agreement', 'mobile');
    const space = build('rental_agreement', 'space');
    expect(mobile).toContain('VEHICLE AND TRAILER TERMS');
    expect(mobile).not.toContain('COMMERCIAL KITCHEN / VENDOR SPACE TERMS');
    expect(space).toContain('COMMERCIAL KITCHEN / VENDOR SPACE TERMS');
    expect(space).not.toContain('VEHICLE AND TRAILER TERMS');
  });

  it('uses the correct signer roles for each document', () => {
    expect(getTemplateSpec('rental_agreement').roles).toEqual(['Renter', 'Host']);
    expect(getTemplateSpec('rental_checkin_condition_report').roles).toEqual(['Renter', 'Host']);
    expect(getTemplateSpec('rental_checkout_condition_report').roles).toEqual(['Renter', 'Host']);
    expect(getTemplateSpec('delivery_handoff_acknowledgment').roles).toEqual([
      'Receiving Party',
      'Delivering Party',
    ]);
  });

  it('never promises payouts, escrow, insurance, or fixed fees', () => {
    const all = [
      build('rental_agreement', 'mobile'),
      build('rental_agreement', 'space'),
      build('rental_checkin_condition_report', 'mobile'),
      build('rental_checkout_condition_report', 'space'),
      build('transaction_amendment'),
      build('delivery_handoff_acknowledgment'),
    ].join(' ');
    expect(/funds will be released|holds your funds|payout will be/i.test(all)).toBe(false);
    expect(/Vendibook (insures|guarantees|determines liability)/i.test(all)).toBe(false);
    // No invented money amounts anywhere in the blank template.
    expect(/\$\d/.test(all)).toBe(false);
  });

  it('states that signing does not move money', () => {
    expect(build('transaction_amendment')).toMatch(/does not itself process, refund, capture, authorize, or move payment/i);
  });
});
