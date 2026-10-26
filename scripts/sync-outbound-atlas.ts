// Sync "Atlas — Vendibook Outbound" (agent_6701…) ONLY. Run: bun scripts/sync-outbound-atlas.ts [--apply]
// Uses ELEVENLABS_API_KEY from the environment; never prints it. Refuses any other agent ID,
// never resolves agents by name, never touches phone numbers, inbound agents or platform privacy.
import { createHmac } from 'node:crypto';
import { OUTBOUND_AGENT_ID, OUTBOUND_DISPLAY_NAME, FIRST_MESSAGE, OUTBOUND_PROMPT, DYNAMIC_VARIABLES, OUTBOUND_KB_DOC_NAMES, OUTBOUND_TOOL_SECRET_NAME, OUTBOUND_TOOL_HEADER, OUTBOUND_TOOL_LABEL } from '../supabase/functions/_shared/outboundAtlas.ts';

const APPLY = process.argv.includes('--apply');
const KEY = process.env.ELEVENLABS_API_KEY ?? '';
if (!KEY) throw new Error('ELEVENLABS_API_KEY missing');
const API = 'https://api.elevenlabs.io/v1';
const FN = 'https://nbrehbwfsmedbelzntqs.supabase.co/functions/v1/outbound-atlas-tools';
const INBOUND_KB_SOURCE = 'agent_1501m4rhvkz9fsbs5ce89zvk2k7b'; // read-only: where the shared KB IDs are looked up
async function el(path: string, init: RequestInit = {}) {
  const r = await fetch(API + path, { ...init, headers: { 'xi-api-key': KEY, 'Content-Type': 'application/json', ...(init.headers ?? {}) } });
  const text = await r.text();
  if (!r.ok) throw new Error(`${init.method ?? 'GET'} ${path} -> ${r.status}: ${text.slice(0, 800)}`);
  return text ? JSON.parse(text) : {};
}
const str = (description: string) => ({ type: 'string', description });
const TOOLS = [
  { name: 'get_platform_facts', description: 'Current Vendibook fees and optional upgrade prices with an as_of date. Call before quoting any fee or price.', props: { topic: str('What the prospect asked about, e.g. selling fees, rental fees or memberships.') } },
  { name: 'search_listings', description: 'Search published public Vendibook listings. Returns at most five with title, price and city. Does not confirm date availability.', props: { query: str('Keywords such as coffee trailer or 16 ft truck. Leave empty if none.'), location: str('City and state or ZIP the prospect gave.'), mode: str('rent or sale.'), category: str('One of food_truck, food_trailer, ghost_kitchen, vendor_lot, vendor_space, or empty.'), max_price: { type: 'number', description: 'Maximum price in US dollars, if the prospect gave a budget.' } } },
  { name: 'get_listing', description: 'Details of one published listing returned by search_listings. Availability for dates is not verified.', props: { listing_id: str('The listing_id from search_listings. Never read it aloud.') } },
  { name: 'get_prospect_context', description: 'Verified prior context for this call, only when a server-issued call scope exists. If unavailable, proceed with no prior context.', props: { call_scope: { type: 'string', dynamic_variable: 'call_scope' } } },
];

const agent = await el(`/convai/agents/${OUTBOUND_AGENT_ID}`);
if (agent.agent_id !== OUTBOUND_AGENT_ID) throw new Error('Persisted agent ID readback mismatch; aborting');
console.log('readback ok:', agent.agent_id, '| current name:', agent.name);

// Focused prompt corrections must not mutate tools, KB, workspace secrets or privacy.
if (process.argv.includes('--prompt-only')) {
  if (!APPLY) { console.log('dry run: prompt/first-message only'); process.exit(0); }
  await el(`/convai/agents/${OUTBOUND_AGENT_ID}`, { method: 'PATCH', body: JSON.stringify({
    conversation_config: { agent: { first_message: FIRST_MESSAGE, prompt: { prompt: OUTBOUND_PROMPT } } },
  }) });
  const readback = await el(`/convai/agents/${OUTBOUND_AGENT_ID}`);
  if (readback.agent_id !== OUTBOUND_AGENT_ID || readback.conversation_config?.agent?.first_message !== FIRST_MESSAGE || readback.conversation_config?.agent?.prompt?.prompt !== OUTBOUND_PROMPT) throw new Error('Prompt readback mismatch');
  console.log('verified: same outbound ID, prompt and first message match');
  process.exit(0);
}

const secretValue = process.env.OUTBOUND_ATLAS_TOOL_SECRET || createHmac('sha256', KEY).update(OUTBOUND_TOOL_LABEL).digest('hex');
const secrets = (await el('/convai/secrets')).secrets ?? [];
let secret = secrets.find((s: any) => s.name === OUTBOUND_TOOL_SECRET_NAME);
const toolsList = (await el('/convai/tools')).tools ?? [];
const ours = toolsList.filter((t: any) => String(t.tool_config?.api_schema?.url ?? '').startsWith(FN + '?tool='));
const kbSource = await el(`/convai/agents/${INBOUND_KB_SOURCE}`);
const kb = (kbSource.conversation_config?.agent?.prompt?.knowledge_base ?? []).filter((k: any) => (OUTBOUND_KB_DOC_NAMES as readonly string[]).includes(k.name));
console.log('plan:', { secret: secret ? 'update' : 'create', tools_existing: ours.map((t: any) => t.tool_config.name), kb: kb.map((k: any) => k.name) });
if (kb.length !== OUTBOUND_KB_DOC_NAMES.length) throw new Error('Shared KB documents not all found; aborting');
if (!APPLY) { console.log('dry run only'); process.exit(0); }

if (secret) await el(`/convai/secrets/${secret.secret_id}`, { method: 'PATCH', body: JSON.stringify({ type: 'update', name: OUTBOUND_TOOL_SECRET_NAME, value: secretValue }) });
else secret = await el('/convai/secrets', { method: 'POST', body: JSON.stringify({ type: 'new', name: OUTBOUND_TOOL_SECRET_NAME, value: secretValue }) });

const toolIds: string[] = [];
for (const t of TOOLS) {
  const tool_config = { type: 'webhook', name: t.name, description: t.description, response_timeout_secs: 20,
    api_schema: { url: `${FN}?tool=${t.name}`, method: 'POST', request_headers: { [OUTBOUND_TOOL_HEADER]: { secret_id: secret.secret_id } },
      request_body_schema: { type: 'object', description: t.description, properties: t.props, required: [] } } };
  const existing = ours.find((o: any) => o.tool_config.name === t.name);
  const res = existing ? await el(`/convai/tools/${existing.id}`, { method: 'PATCH', body: JSON.stringify({ tool_config }) })
                       : await el('/convai/tools', { method: 'POST', body: JSON.stringify({ tool_config }) });
  toolIds.push(existing?.id ?? res.id);
}

const prompt = agent.conversation_config.agent.prompt;
const endCall = { ...prompt.built_in_tools.end_call, description: 'End the call on refusal, opt-out, wrong number, busy, or when the conversation is done.' };
await el(`/convai/agents/${OUTBOUND_AGENT_ID}`, { method: 'PATCH', body: JSON.stringify({
  name: OUTBOUND_DISPLAY_NAME,
  conversation_config: { agent: {
    first_message: FIRST_MESSAGE,
    dynamic_variables: { dynamic_variable_placeholders: DYNAMIC_VARIABLES },
    prompt: { prompt: OUTBOUND_PROMPT, tool_ids: toolIds, built_in_tools: { ...prompt.built_in_tools, end_call: endCall },
      knowledge_base: kb.map((k: any) => ({ type: k.type, id: k.id, name: k.name, usage_mode: k.usage_mode ?? 'auto' })),
      rag: { ...prompt.rag, enabled: true } },
  } },
}) });
console.log('applied: tools', toolIds.length, 'kb', kb.length);
