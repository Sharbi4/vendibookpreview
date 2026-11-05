// bun scripts/sync-spanish-agents.ts [--apply]; outbound uses its own sync script.
import { SPANISH_GREETINGS, spanishConversationPatch, verifySpanishReadback } from '../supabase/functions/_shared/agentSpanish.ts';
const agents = {
  atlas: 'agent_1501m4rhvkz9fsbs5ce89zvk2k7b',
  allison: 'agent_8301m5nh7dq6e1x9wgqk2yx7k4pd',
  vendi: 'agent_0101kdmd2dn7exys7w22pnscqasf',
  phone: 'agent_4401m5tvvw3yewrt9sp6nbmbbvmd',
} as const;
const key = process.env.ELEVENLABS_API_KEY;
if (!key) throw new Error('ELEVENLABS_API_KEY missing');
async function api(id: string, body?: unknown) {
  const res = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${id}`, {
    method: body ? 'PATCH' : 'GET', headers: { 'xi-api-key': key!, 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) throw new Error(`ElevenLabs ${res.status} for ${id}`);
  return res.json();
}
for (const [name, id] of Object.entries(agents)) {
  const before = await api(id);
  if (before.agent_id !== id) throw new Error('Agent identity mismatch');
  const patch = spanishConversationPatch(before, SPANISH_GREETINGS[name as keyof typeof agents]);
  if (!process.argv.includes('--apply')) { console.log(name, 'Spanish patch ready (dry run)'); continue; }
  await api(id, { conversation_config: patch });
  verifySpanishReadback(before, await api(id), patch);
  console.log(name, id, 'Spanish enabled and existing configuration preserved');
}
