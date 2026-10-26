// @vitest-environment jsdom
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
      if (url.includes('/convai/tools?')) return new Response(JSON.stringify({ tools: [
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
    expect(prompt.tool_ids.slice().sort()).toEqual(['browser-search', 'calendly-booking']);
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
  it('stores a default for the page_opening variable and drops malformed placeholders', async () => {
    const body = { action: 'apply', agent: 'atlas', prompt: 'updated', first_message: "Hi, I'm Atlas. {{page_opening}}", tools: [{ type: 'client', name: 'search_listings' }],
      dynamic_variable_placeholders: { page_opening: 'What city are you looking in?', 'Bad-Key': 'x', too_long: 'y'.repeat(501) } };
    expect((await handler(new Request('https://example.test/config', { method: 'POST', headers: { Authorization: 'Bearer test' }, body: JSON.stringify(body) }))).status).toBe(200);
    const patch = provider.mock.calls.find(([url, init]) => url.includes('/convai/agents/') && init?.method === 'PATCH');
    const agent = JSON.parse(patch![1].body).conversation_config.agent;
    expect(agent.first_message).toContain('{{page_opening}}');
    expect(agent.dynamic_variables).toEqual({ dynamic_variable_placeholders: { page_opening: 'What city are you looking in?' } });
  });
  it('still requires an actual admin session', async () => {
    isAdmin = false;
    expect((await handler(request())).status).toBe(403);
    expect(provider).not.toHaveBeenCalled();
  });
  it('sets a native AI handoff while preserving existing integrations', async () => {
    await handler(request());
    const patch = provider.mock.calls.find(([url, init]) => url.includes('/convai/agents/') && init?.method === 'PATCH');
    const transfer = JSON.parse(patch![1].body).conversation_config.agent.prompt.built_in_tools.transfer_to_agent;
    expect(transfer.params.transfers).toHaveLength(1);
    expect(transfer.params.transfers[0].condition).toContain('not a Vendibook website');
  });
  it('sends only managed fields, and retries without the AI handoff if the provider rejects it', async () => {
    let agentPatches = 0;
    const base = provider.getMockImplementation()!;
    provider.mockImplementation(async (url: string, init?: RequestInit) => {
      if (url.includes('/convai/agents/') && init?.method === 'PATCH') {
        agentPatches += 1;
        return agentPatches === 1 ? new Response(JSON.stringify({ detail: 'transfer rejected' }), { status: 422 }) : new Response('{}');
      }
      return base(url, init);
    });
    const res = await handler(request());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ agent_updated: true, native_transfer: { applied: false } });
    const patches = provider.mock.calls.filter(([url, init]) => url.includes('/convai/agents/') && init?.method === 'PATCH');
    const first = JSON.parse(patches[0][1].body).conversation_config.agent.prompt;
    const retry = JSON.parse(patches[1][1].body).conversation_config.agent.prompt;
    expect(Object.keys(first).sort()).toEqual(['built_in_tools', 'mcp_server_ids', 'prompt', 'tool_ids']);
    expect(Object.keys(retry).sort()).toEqual(['mcp_server_ids', 'prompt', 'tool_ids']);
  });
  it('fails closed when tool pagination is incomplete', async () => {
    provider.mockResolvedValue(new Response(JSON.stringify({ tools: [], has_more: true })));
    expect((await handler(request())).status).toBe(502);
    expect(provider.mock.calls.some(([, init]) => init?.method === 'PATCH')).toBe(false);
  });
});
