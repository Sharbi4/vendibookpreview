// Admin-only health check for the video walkthrough (Daily.co) and e-signature
// (SignNow) integrations. Secrets never leave the server: responses carry
// states, counts and yes/no results only.
//
// Actions:
// - check: read-only. Daily webhook state, domain recording settings and room
//   count; SignNow token, active templates, open documents' invite status and
//   their completion subscriptions.
// - daily_test_room: creates a throwaway room (vb-healthcheck-*, 20 minutes,
//   cloud recording) and an owner token that starts recording on join, so a
//   real join can prove webhook delivery end to end. No walkthrough rows.
// - daily_test_cleanup: deletes vb-healthcheck-* rooms.
import { createClient } from "npm:@supabase/supabase-js@2";
import { getCaller, isAdminUser } from "../_shared/callerGuard.ts";
import { getAccessToken, getDocument, isSignNowConfigured, signnowBase } from "../_shared/signnow.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const TEST_PREFIX = "vb-healthcheck-";
const has = (name: string) => Boolean(Deno.env.get(name));

async function daily(path: string, init: RequestInit = {}) {
  const res = await fetch(`https://api.daily.co/v1${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${Deno.env.get("DAILY_API_KEY")}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
    signal: AbortSignal.timeout(15000),
  });
  const body = res.status === 204 ? {} : await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body: body as Record<string, any> };
}

async function signnowGet(path: string, token: string) {
  const res = await fetch(`${signnowBase()}${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    signal: AbortSignal.timeout(15000),
  });
  return { ok: res.ok, status: res.status, body: await res.json().catch(() => ({})) as Record<string, any> };
}

async function checkDaily(db: ReturnType<typeof createClient>) {
  const secrets = { DAILY_API_KEY: has("DAILY_API_KEY"), DAILY_DOMAIN: has("DAILY_DOMAIN"), DAILY_WEBHOOK_HMAC: has("DAILY_WEBHOOK_HMAC"), DAILY_JOIN_HOOK_SECRET: has("DAILY_JOIN_HOOK_SECRET") };
  if (!secrets.DAILY_API_KEY) return { secrets, error: "DAILY_API_KEY not set" };
  const { data: cfg } = await db.from("daily_webhook_config").select("webhook_uuid, webhook_url, state").eq("id", "default").maybeSingle();
  const hook = cfg?.webhook_uuid ? await daily(`/webhooks/${cfg.webhook_uuid}`) : null;
  const domain = await daily("/");
  const rooms = await daily("/rooms?limit=100");
  const expectedUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/daily-webhook`;
  const { count: events } = await db.from("daily_webhook_events").select("*", { count: "exact", head: true });
  return {
    secrets,
    webhook: hook
      ? {
          http: hook.status,
          state: hook.body.state ?? null,
          url_matches: hook.body.url === expectedUrl,
          event_types: hook.body.eventTypes ?? hook.body.event_types ?? null,
          failed_count: hook.body.failedCount ?? hook.body.failed_count ?? null,
          last_moment_pushed: hook.body.lastMomentPushed ?? null,
        }
      : { http: null, state: "not registered in daily_webhook_config" },
    domain: {
      http: domain.status,
      name: domain.body.domain_name ?? null,
      enable_recording: domain.body.config?.enable_recording ?? null,
      recordings_bucket: domain.body.config?.recordings_bucket ? "custom bucket" : "Daily storage",
    },
    rooms: { http: rooms.status, total: rooms.body.total_count ?? (rooms.body.data ?? []).length },
    webhook_events_received: events ?? 0,
  };
}

async function checkSignNow(db: ReturnType<typeof createClient>) {
  const secrets = {
    SIGNNOW_API_BASE: has("SIGNNOW_API_BASE"), SIGNNOW_BASIC_AUTH: has("SIGNNOW_BASIC_AUTH"),
    SIGNNOW_SERVICE_USER_EMAIL: has("SIGNNOW_SERVICE_USER_EMAIL"), SIGNNOW_SERVICE_USER_PASSWORD: has("SIGNNOW_SERVICE_USER_PASSWORD"),
    SIGNNOW_WEBHOOK_SECRET: has("SIGNNOW_WEBHOOK_SECRET"),
  };
  if (!isSignNowConfigured()) return { secrets, token: false, error: "SignNow is not configured" };
  let token: string;
  try { token = await getAccessToken(); } catch (e) { return { secrets, token: false, error: (e as Error).message.slice(0, 200) }; }

  const { data: templates } = await db.from("signnow_templates").select("kind, version, signnow_template_id").eq("status", "active");
  const templateResults = await Promise.all((templates ?? []).map(async (t: any) => {
    const r = await signnowGet(`/document/${t.signnow_template_id}`, token);
    return { kind: t.kind, version: t.version, ok: r.ok, http: r.status, roles: (r.body.roles ?? []).map((x: any) => x.name) };
  }));

  const callback = `${Deno.env.get("SUPABASE_URL")}/functions/v1/signnow-webhook`;
  const subs = await signnowGet("/v2/event-subscriptions?per_page=100", token);
  const subList: any[] = subs.body.data ?? [];
  const { data: docs } = await db.from("documents").select("id, document_type, status, signnow_document_id, created_at")
    .in("status", ["sent", "partially_signed"]).order("created_at", { ascending: false }).limit(20);
  const documentResults = await Promise.all((docs ?? []).map(async (d: any) => {
    let invites: Array<{ role: string | null; status: string }> = [];
    let http = 0;
    try {
      const remote = await getDocument(d.signnow_document_id);
      http = 200;
      invites = (remote?.field_invites ?? []).map((i: any) => ({ role: i.role ?? null, status: String(i.status ?? "") }));
    } catch (e) { http = Number(String((e as Error).message).match(/\d{3}/)?.[0] ?? 0); }
    const mine = subList.filter((s) => (s.entity_id ?? s.entityId) === d.signnow_document_id);
    return {
      id: d.id, type: d.document_type, local_status: d.status, signnow_http: http, invites,
      subscriptions: mine.map((s) => ({ event: s.event, callback_ok: (s.json_attributes?.callback ?? s.attributes?.callback ?? "").startsWith(callback) })),
    };
  }));
  return { secrets, token: true, templates: templateResults, subscriptions_http: subs.status, open_documents: documentResults };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const caller = await getCaller(req);
  if (!caller || !(await isAdminUser(caller.id))) return json({ error: "Forbidden" }, 403);
  const db = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", { auth: { persistSession: false } });

  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? "check");

    if (action === "check") {
      const [video, signing] = await Promise.all([
        checkDaily(db).catch((e) => ({ error: (e as Error).message.slice(0, 200) })),
        checkSignNow(db).catch((e) => ({ error: (e as Error).message.slice(0, 200) })),
      ]);
      return json({ checked_at: new Date().toISOString(), daily: video, signnow: signing });
    }

    if (action === "daily_test_room") {
      const name = `${TEST_PREFIX}${Date.now()}`;
      const exp = Math.floor(Date.now() / 1000) + 20 * 60;
      const room = await daily("/rooms", {
        method: "POST",
        body: JSON.stringify({ name, privacy: "private", properties: { exp, enable_recording: "cloud", eject_at_room_exp: true } }),
      });
      if (!room.ok) return json({ error: `Room create failed (${room.status})`, detail: room.body?.info ?? room.body?.error ?? null }, 502);
      const token = await daily("/meeting-tokens", {
        method: "POST",
        body: JSON.stringify({ properties: { room_name: name, is_owner: true, exp, user_name: "Vendibook health check", start_cloud_recording: true } }),
      });
      if (!token.ok) return json({ error: `Token create failed (${token.status})` }, 502);
      return json({ room_name: name, room_url: room.body.url, token: token.body.token, expires_at: new Date(exp * 1000).toISOString() });
    }

    if (action === "daily_test_cleanup") {
      const rooms = await daily("/rooms?limit=100");
      const test = ((rooms.body.data ?? []) as any[]).filter((r) => String(r.name).startsWith(TEST_PREFIX));
      for (const r of test) await daily(`/rooms/${r.name}`, { method: "DELETE" });
      const { data: events } = await db.from("daily_webhook_events").select("event_type, room_name, created_at")
        .like("room_name", `${TEST_PREFIX}%`).order("created_at", { ascending: true });
      return json({ deleted_rooms: test.length, test_webhook_events: events ?? [] });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("[integration-health]", e);
    return json({ error: "Health check failed", message: (e as Error).message.slice(0, 200) }, 500);
  }
});
