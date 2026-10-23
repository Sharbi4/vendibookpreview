// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
let handler: (request: Request) => Promise<Response>;
let isAdmin = true;
let failTool = false;
let inline: unknown[] = [];
const provider = vi.fn();
const source = readFileSync('supabase/functions/elevenlabs-agent-configure/index.ts', 'utf8').replace(/^import .*;\r?\n/gm, '');
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
const client = () => {
  const query: any = { select: () => query, eq: () => query, maybeSingle: async () => ({ data: isAdmin ? { role: 'admin' } : null }) };
  return { auth: { getUser: async () => ({ data: { user: { id: 'admin-test' } }, error: null }) }, from: () => query };
};
new Function('serve', 'createClient', 'Deno', 'fetch', compiled)((fn: typeof handler) => { handler = fn; }, client, { env: { get: () => 'test-only-secret' } }, provider);
const request = () => new Request('https://example.test/config', { method: 'POST', headers: { Authorization: 'Bearer test' }, body: JSON.stringify({ action: 'apply', agent: 'atlas', prompt: 'updated', first_message: 'Hello', tools: [{ type: 'client', name: 'search_listings' }] }) });
describe('Atlas provider sync protects integrations', () => {
  beforeEach(() => {
    isAdmin = true; failTool = false; inline = []; provider.mockReset();
    provider.mockImplementation(async (url: string, init?: RequestInit) => {
      if (url.endsWith('/convai/tools')) return new Response(JSON.stringify({ tools: [
        { id: 'browser-search', tool_config: { type: 'client', name: 'search_listings' } },
        { id: 'calendly-booking', tool_config: { type: 'webhook', name: 'book_calendly' } },
      ] }));
      if (url.includes('/convai/tools/browser-search')) return new Response(JSON.stringify({ id: 'browser-search' }), { status: failTool ? 500 : 200 });
      if (init?.method === 'PATCH') return new Response('{}');
      return new Response(JSON.stringify({ conversation_config: { agent: { prompt: { prompt: 'old', tool_ids: ['browser-search', 'calendly-booking'], mcp_server_ids: ['connected-calendar'], tools: inline } } } }));
    });
  });
  it('retains existing Calendly and MCP attachments when updating browser tools', async () => {
    expect((await handler(request())).status).toBe(200);
    const patch = provider.mock.calls.find(([url, init]) => url.includes('/convai/agents/') && init?.method === 'PATCH');
    const prompt = JSON.parse(patch![1].body).conversation_config.agent.prompt;
    expect(prompt.tool_ids).toEqual(['browser-search', 'calendly-booking']);
    expect(prompt.mcp_server_ids).toEqual(['connected-calendar']);
    expect(provider.mock.calls.some(([url, init]) => url.includes('/tools/calendly-booking') && init?.method === 'PATCH')).toBe(false);
  });
  it('does not replace agent configuration when a tool update fails', async () => {
    failTool = true;
    expect((await handler(request())).status).toBe(502);
    expect(provider.mock.calls.some(([url, init]) => url.includes('/agents/') && init?.method === 'PATCH')).toBe(false);
  });
  it('refuses to silently discard an inline integration', async () => {
    inline = [{ type: 'webhook', name: 'unregistered_calendar' }];
    expect((await handler(request())).status).toBe(409);
    expect(provider.mock.calls.some(([url, init]) => url.includes('/agents/') && init?.method === 'PATCH')).toBe(false);
  });
  it('still requires an actual admin session', async () => {
    isAdmin = false;
    expect((await handler(request())).status).toBe(403);
    expect(provider).not.toHaveBeenCalled();
  });
});
