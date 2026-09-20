// Execute the actual Deno handler with mocked external services.
import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

function loadModule(path: string, dependencies: Record<string, unknown>, deno: unknown = {}) {
  const source = readFileSync(path, 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
  } }).outputText;
  const exports: Record<string, any> = {};
  new Function('require', 'exports', 'Deno', compiled)((name: string) => {
    if (!(name in dependencies)) throw new Error(`Unexpected dependency ${name}`);
    return dependencies[name];
  }, exports, deno);
  return exports;
}

describe('SignNow document endpoint authentication', () => {
  async function request(user: string | null, token: string, existing = false) {
    let handler: (req: Request) => Promise<Response>;
    const prepare = vi.fn().mockResolvedValue({ document_id: 'doc', created: !existing });
    const getUser = vi.fn().mockResolvedValue({ data: { user: user ? { id: user } : null }, error: user ? null : new Error('invalid token') });
    const chain: any = { select: () => chain, eq: () => chain, maybeSingle: async () => ({ data: { buyer_id: 'buyer', seller_id: 'seller' } }) };
    const client = { auth: { getUser }, from: () => chain, rpc: async () => ({ data: false }) };
    loadModule('supabase/functions/signnow-ensure-document/index.ts', {
      'npm:@supabase/supabase-js@2.45.0': { createClient: () => client },
      '../_shared/jsonError.ts': {
        corsHeaders: {}, jsonError: (status: number, code: string) => Response.json({ code }, { status }),
        jsonResponse: (status: number, body: unknown) => Response.json(body, { status }),
        unknownErrorResponse: () => Response.json({}, { status: 500 }),
      },
      '../_shared/signnowDocuments.ts': { ensurePurchaseSaleAgreement: prepare },
    }, { env: { get: (key: string) => key === 'SUPABASE_SERVICE_ROLE_KEY' ? 'service-secret' : 'test' }, serve: (fn: any) => { handler = fn; } });
    const result = await handler!(new Request('https://example.test', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify({ kind: 'purchase_sale_agreement', transaction_id: 'tx' }) }));
    return { result, prepare, getUser };
  }
  it('verifies a buyer with getUser before preparing the agreement', async () => {
    const { result, prepare, getUser } = await request('buyer', 'buyer-token');
    expect(result.status).toBe(200); expect(getUser).toHaveBeenCalledWith('buyer-token');
    expect(prepare).toHaveBeenCalledOnce();
  });
  it('rejects an expired token before creating any document', async () => {
    const { result, prepare } = await request(null, 'expired');
    expect(result.status).toBe(401); expect(prepare).not.toHaveBeenCalled();
  });
  it('rejects unrelated users', async () => {
    const { result, prepare } = await request('stranger', 'token');
    expect(result.status).toBe(403); expect(prepare).not.toHaveBeenCalled();
  });
  it('allows the payment finalizer service call without a user JWT', async () => {
    const { result, getUser, prepare } = await request(null, 'service-secret');
    expect(result.status).toBe(200); expect(getUser).not.toHaveBeenCalled(); expect(prepare).toHaveBeenCalledOnce();
  });
});

describe('document generation retry safety', () => {
  function generator(result: any) {
    const copy = vi.fn();
    const chain: any = {};
    for (const method of ['select', 'eq', 'neq', 'is', 'order', 'limit']) chain[method] = () => chain;
    chain.then = (resolve: any) => Promise.resolve(result).then(resolve);
    const module = loadModule('supabase/functions/_shared/signnowDocuments.ts', {
      'npm:@supabase/supabase-js@2.45.0': { createClient: () => ({ from: () => chain }) },
      './signnow.ts': { isSignNowConfigured: () => true, createDocumentFromTemplate: copy },
      './signnowTemplates.ts': {}, './invokeTransactionalEmail.ts': {}, './rentalRequirements.ts': {},
    }, { env: { get: () => 'test' } });
    return { generate: () => module.createPackageDocument({ kind: 'purchase_sale_agreement', parent: { transaction_id: 'tx' } }), copy };
  }
  it('returns an existing agreement without copying a template or inviting again', async () => {
    const { generate, copy } = generator({ data: [{ id: 'doc', status: 'sent' }], error: null });
    expect(await generate()).toEqual({ document_id: 'doc', created: false }); expect(copy).not.toHaveBeenCalled();
  });
  it('does not treat a failed database lookup as permission to create another document', async () => {
    const { generate, copy } = generator({ data: null, error: { message: 'database unavailable' } });
    await expect(generate()).rejects.toThrow('Document lookup failed'); expect(copy).not.toHaveBeenCalled();
  });
});
