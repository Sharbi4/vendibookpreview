import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const statuses = new Set(['started', 'submitted', 'queued_for_vendor_submission', 'in_review', 'approved', 'pending_signature', 'funded', 'declined', 'closed', 'cancelled']);
const json = (status: number, body: object) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204 });
  if (request.method !== 'POST') return json(405, { error: 'method_not_allowed' });
  const secret = Deno.env.get('APPROVE_WEBHOOK_SECRET');
  if (!secret) return json(503, { error: 'webhook_not_configured' });
  const signature = request.headers.get('x-message-signature');
  if (!signature || !/^[A-Za-z0-9_-]{43}$/.test(signature)) return json(401, { error: 'invalid_signature' });
  // Bound the actual streamed body, including requests without Content-Length.
  const reader = request.body?.getReader();
  if (!reader) return json(400, { error: 'missing_body' });
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 262144) { await reader.cancel(); return json(413, { error: 'body_too_large' }); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  const body = new TextDecoder().decode(bytes);
  // Supplied APPROVE code specifies body + JSON headers, excluding signature.
  // A real provider test must confirm header serialization through the gateway.
  const headers = Object.fromEntries([...request.headers].filter(([name]) => name !== 'x-message-signature'));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
  const signatureBytes = Uint8Array.from(atob(signature.replace(/-/g, '+').replace(/_/g, '/') + '='), c => c.charCodeAt(0));
  const verified = await crypto.subtle.verify('HMAC', key, signatureBytes, new TextEncoder().encode(body + JSON.stringify(headers)));
  if (!verified) return json(401, { error: 'invalid_signature' });
  let event;
  try { event = JSON.parse(body); } catch { return json(400, { error: 'invalid_json' }); }
  const data = event?.data ?? event;
  const application = data?.application;
  const applicationId = data?.application_id ?? application?.id;
  const rawStatus = data?.status ?? application?.status;
  const status = typeof rawStatus === 'string' ? rawStatus.toLowerCase().replace(/\s+/g, '_') : '';
  if (!statuses.has(status) || !['string', 'number'].includes(typeof applicationId) || !/^[A-Za-z0-9_-]{1,128}$/.test(String(applicationId))) return json(422, { error: 'unsupported_event_shape' });
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const eventHash = [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { error } = await db.from('approve_application_events').upsert({ event_hash: eventHash, application_id: String(applicationId), status }, { onConflict: 'event_hash', ignoreDuplicates: true });
  if (error) return json(503, { error: 'event_storage_failed' });
  return json(200, { received: true });
});
