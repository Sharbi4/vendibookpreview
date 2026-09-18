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
      expect(spec.version).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('resolves specs by kind and rejects unknown kinds', () => {
    expect(getTemplateSpec('rental_agreement').roles).toEqual(['Host', 'Renter']);
    expect(() => getTemplateSpec('bill_of_sale')).toThrow(/no template spec/);
  });
});

describe('document language guardrails', () => {
  const allText = specs.map((s) => extractText(s.build().pdf)).join(' ');

  it('never describes the transaction as escrow or promises released funds', () => {
    expect(/\bescrow\b/i.test(allText.replace(/not an escrow agent|not create an escrow/gi, ''))).toBe(false);
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
      const hasEsign = /sign this document electronically/i.test(text) || /Acknowledgments/i.test(text);
      expect(hasEsign).toBe(true);
    }
  });
});
