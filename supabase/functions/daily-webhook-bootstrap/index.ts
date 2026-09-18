/**
 * Admin-only bootstrap for the single active Daily webhook subscription.
 *
 * Creates (or re-points) exactly one webhook for this project, using the
 * server-held HMAC secret, and stores its uuid and state for diagnostics.
 * The Daily API key and the HMAC secret are never returned or logged.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: cors });

const EVENTS = [
  'meeting.started',
  'meeting.ended',
  'participant.joined',
  'participant.left',
  'recording.started',
  'recording.ready-to-download',
  'recording.error',
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  try {
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
    const token = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) return json({ error: 'authentication_required' }, 401);
    const { data: { user } } = await admin.auth.getUser(token);
    if (!user) return json({ error: 'authentication_required' }, 401);
    const { data: isAdmin } = await admin.rpc('has_role', { _user_id: user.id, _role: 'admin' });
    if (!isAdmin) return json({ error: 'not_authorized' }, 403);

    const key = Deno.env.get('DAILY_API_KEY');
    const hmac = Deno.env.get('DAILY_WEBHOOK_HMAC');
    const base = Deno.env.get('SUPABASE_URL');
    if (!key || !base) return json({ error: 'provider_unavailable', message: 'Video provider credentials are not configured.' }, 503);
    if (!hmac) return json({ error: 'hmac_missing', message: 'The webhook signing secret is not configured yet.' }, 503);

    const url = `${base}/functions/v1/daily-webhook`;
    const call = async (path: string, init: RequestInit) => {
      const res = await fetch(`https://api.daily.co/v1${path}`, {
        ...init,
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', ...(init.headers || {}) },
      });
      const body = await res.json().catch(() => ({}));
      return { ok: res.ok, status: res.status, body } as { ok: boolean; status: number; body: any };
    };

    const existing = await call('/webhooks', { method: 'GET' });
    const list: any[] = Array.isArray(existing.body?.data) ? existing.body.data : Array.isArray(existing.body) ? existing.body : [];
    const mine = list.find((w) => w?.url === url);

    const body = JSON.stringify({ url, eventTypes: EVENTS, hmac });
    const result = mine?.uuid
      ? await call(`/webhooks/${encodeURIComponent(mine.uuid)}`, { method: 'POST', body })
      : await call('/webhooks', { method: 'POST', body });

    if (!result.ok) {
      const reason = typeof result.body?.error === 'string' ? result.body.error : `provider_status_${result.status}`;
      await admin.from('daily_webhook_config').upsert({
        id: 'default', provider: 'daily', webhook_url: url, state: 'FAILED',
        subscribed_events: EVENTS, last_error: reason.slice(0, 300),
      });
      return json({
        state: 'FAILED',
        reason,
        message: result.status === 402 || /billing|plan/i.test(reason)
          ? 'Daily reports that webhooks require a plan that supports them. Enable webhooks on the Daily account, then run this again.'
          : 'Daily rejected the webhook configuration.',
      }, 502);
    }

    const uuid = result.body?.uuid || mine?.uuid || null;
    const state = String(result.body?.state || 'ACTIVE').toUpperCase();
    await admin.from('daily_webhook_config').upsert({
      id: 'default', provider: 'daily', webhook_uuid: uuid, webhook_url: url,
      state, subscribed_events: EVENTS, last_verified_at: new Date().toISOString(), last_error: null,
    });

    return json({ state, webhook_uuid: uuid, url, events: EVENTS });
  } catch (e) {
    console.error('[daily-webhook-bootstrap]', e instanceof Error ? e.message : 'failed');
    return json({ error: 'bootstrap_failed', message: 'The webhook could not be configured.' }, 500);
  }
});
