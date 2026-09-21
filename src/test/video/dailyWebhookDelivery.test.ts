import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { expect, it } from 'vitest';

async function deliver(code: string, signed = true) {
  let handler: (req: Request) => Promise<Response>;
  let writes = 0;
  const source = ts.transpileModule(readFileSync('supabase/functions/daily-webhook/index.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const dependencies: Record<string, unknown> = {
    'https://esm.sh/@supabase/supabase-js@2.57.2': { createClient: () => ({ from: () => ({ insert: async () => { writes++; return { error: { code } }; } }) }) },
    '../_shared/dailySignature.ts': { verifyDailySignature: async () => signed },
  };
  new Function('require', 'exports', 'Deno', source)((key: string) => dependencies[key], {}, {
    env: { get: () => 'test' }, serve: (fn: any) => { handler = fn; },
  });
  const response = await handler!(new Request('https://example.test', {
    method: 'POST', headers: { 'X-Webhook-Timestamp': '1', 'X-Webhook-Signature': 'test' },
    body: JSON.stringify({ id: 'provider-event', type: 'meeting.started', payload: { room: 'test' } }),
  }));
  return { response, writes };
}
it('rejects invalid signatures without database writes', async () => {
  const { response, writes } = await deliver('23505', false);
  expect(response.status).toBe(401); expect(writes).toBe(0);
});
it('acknowledges actual duplicate event keys', async () => {
  const { response } = await deliver('23505');
  expect(response.status).toBe(200); expect(await response.json()).toMatchObject({ duplicate: true });
});
it('returns a retryable error when event storage fails', async () => {
  const { response } = await deliver('08006');
  expect(response.status).toBe(503); expect(await response.json()).toMatchObject({ error: 'event_storage_failed' });
});
