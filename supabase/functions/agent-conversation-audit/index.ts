// Hourly read-only audit of ElevenLabs conversations (owner, 2026-11-02).
// GET-only against ElevenLabs for Atlas, Allison and the phone-line agent;
// upserts one admin-only row per conversation into agent_conversation_audit.
// Contains NO email, SMS, call or agent-update code by design.
import { createClient } from "npm:@supabase/supabase-js@2";
import { getCaller, isAdminUser, isCronCaller } from "../_shared/callerGuard.ts";
import { phoneLineAgent } from "../_shared/phoneLine.ts";

const ATLAS = "agent_1501m4rhvkz9fsbs5ce89zvk2k7b";
const ALLISON = Deno.env.get("ALLISON_AGENT_ID") || "agent_8301m5nh7dq6e1x9wgqk2yx7k4pd";
const DEFAULT_LOOKBACK_MIN = 75;
const MAX_LOOKBACK_MIN = 7 * 24 * 60;
const API = "https://api.elevenlabs.io/v1/convai";
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const FOLLOW_UP_HINTS = /(call ?back|follow[- ]?up|contact (the )?owner|message (to|on behalf)|request(ed)? .*(link|quote)|spanish|correct(ed|ion).*email)/i;

export function followUpReason(c: { duration: number; successful: string | null; termination: string | null; summary: string }): string | null {
  if (c.duration < 20) return null;
  if (c.successful === "failure") return "Provider marked call unsuccessful";
  if (/disconnected: 1006/i.test(c.termination ?? "") && c.duration >= 60) return "Dropped mid-conversation";
  if (FOLLOW_UP_HINTS.test(c.summary)) return "Summary mentions a request to follow up";
  return null;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!(await isCronCaller(req))) {
    const caller = await getCaller(req);
    if (!caller || !(await isAdminUser(caller.id))) return json({ error: "Forbidden" }, 403);
  }
  const body = await req.json().catch(() => ({}));
  const lookback = Math.min(MAX_LOOKBACK_MIN, Math.max(5, Number(body?.lookback_minutes) || DEFAULT_LOOKBACK_MIN));
  const key = Deno.env.get("ELEVENLABS_API_KEY");
  if (!key) return json({ error: "ElevenLabs not configured" }, 503);
  const headers = { "xi-api-key": key };
  const db = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", {
    auth: { persistSession: false },
  });

  const phone = await phoneLineAgent();
  const agents = [
    { key: "atlas", id: ATLAS },
    { key: "allison", id: ALLISON },
    ...(phone ? [{ key: "phone", id: phone.agent_id }] : []),
  ];
  const since = Math.floor(Date.now() / 1000) - lookback * 60;
  const result: Record<string, number | string> = {};

  for (const agent of agents) {
    try {
      const ids: string[] = [];
      let cursor: string | null = null;
      do {
        const q = new URLSearchParams({ agent_id: agent.id, call_start_after_unix: String(since), page_size: "100" });
        if (cursor) q.set("cursor", cursor);
        const res = await fetch(`${API}/conversations?${q}`, { headers, signal: AbortSignal.timeout(15000) });
        if (!res.ok) throw new Error(`list ${res.status}`);
        const page = await res.json();
        for (const c of page.conversations ?? []) ids.push(c.conversation_id);
        cursor = page.has_more ? page.next_cursor : null;
      } while (cursor && ids.length < 500);

      const { data: existing } = await db.from("agent_conversation_audit").select("conversation_id, status").in("conversation_id", ids.length ? ids : ["-"]);
      const done = new Set((existing ?? []).filter((r) => r.status === "done").map((r) => r.conversation_id));
      let saved = 0;
      for (const id of ids) {
        if (done.has(id)) continue;
        const res = await fetch(`${API}/conversations/${encodeURIComponent(id)}`, { headers, signal: AbortSignal.timeout(15000) });
        if (!res.ok) continue;
        const c = await res.json();
        const m = c.metadata ?? {};
        const a = c.analysis ?? {};
        const summary = String(a.transcript_summary ?? "").slice(0, 4000);
        const reason = followUpReason({
          duration: Number(m.call_duration_secs ?? 0),
          successful: a.call_successful ?? null,
          termination: m.termination_reason ?? null,
          summary,
        });
        const { error } = await db.from("agent_conversation_audit").upsert({
          conversation_id: id,
          agent_key: agent.key,
          agent_id: agent.id,
          started_at: m.start_time_unix_secs ? new Date(m.start_time_unix_secs * 1000).toISOString() : null,
          duration_secs: m.call_duration_secs ?? null,
          status: c.status ?? null,
          call_successful: a.call_successful ?? null,
          termination_reason: m.termination_reason ?? null,
          title: a.call_summary_title ?? null,
          summary,
          needs_follow_up: reason !== null,
          follow_up_reason: reason,
          fetched_at: new Date().toISOString(),
        }, { onConflict: "conversation_id" });
        if (!error) saved++;
      }
      result[agent.key] = saved;
    } catch (e) {
      result[agent.key] = `unavailable (${(e as Error).message})`;
    }
  }
  return json({ ok: true, lookback_minutes: lookback, saved: result });
});
