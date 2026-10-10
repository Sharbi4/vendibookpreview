// Prefill: optional template-missing fields are skipped; required ones fail.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

function loadSignNow() {
  const compiled = ts.transpileModule(readFileSync('supabase/functions/_shared/signnow.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports: Record<string, any> = {};
  new Function('require', 'exports', 'Deno', compiled)(() => ({}), exports, { env: { get: () => 'test' } });
  return exports;
}

function mockSignNow(templateFields: string[]) {
  const puts: string[][] = [];
  vi.stubGlobal('fetch', vi.fn(async (url: string, init: any) => {
    if (!String(url).includes('prefill-texts')) {
      return Response.json({ access_token: 'tok', expires_in: 3600 });
    }
    const names = JSON.parse(init.body).fields.map((f: any) => f.field_name);
    puts.push(names);
    const missing = names.find((n: string) => !templateFields.includes(n));
    return missing
      ? new Response(`Field ${missing} not found among text fields.`, { status: 400 })
      : Response.json({});
  }));
  return puts;
}

afterEach(() => vi.unstubAllGlobals());

describe('prefillFields', () => {
  const required = ['buyer_name', 'seller_name', 'asset_price', 'transaction_total'];
  const fields = { buyer_name: 'B', seller_name: 'S', asset_price: '$5,000', transaction_total: '$5,000', optional_note: 'x' };

  it('skips an optional field the template lacks', async () => {
    const puts = mockSignNow(required);
    await loadSignNow().prefillFields('doc', fields, required);
    expect(puts.at(-1)).toEqual(required);
  });

  it('fails explicitly when a required field is missing from the template', async () => {
    mockSignNow(['buyer_name', 'seller_name', 'transaction_total', 'optional_note']);
    await expect(loadSignNow().prefillFields('doc', fields, required))
      .rejects.toThrow('missing required field "asset_price"');
  });
});

describe('Purchase & Sale Agreement required values', () => {
  it('lists parties and price as required, without terms_version', () => {
    const src = readFileSync('supabase/functions/_shared/signnowDocuments.ts', 'utf8');
    expect(src).toContain("PSA_REQUIRED_FIELDS = ['buyer_name', 'seller_name', 'asset_price', 'transaction_total']");
    const psa = src.slice(src.indexOf('ensurePurchaseSaleAgreement'), src.indexOf("kind: 'purchase_sale_agreement'"));
    expect(psa).not.toMatch(/terms_version: str\(/);
  });
});
