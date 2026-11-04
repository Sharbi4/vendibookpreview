// Admin-only management of r/mobilefoodbiz through Reddit's API.
// Uses a Reddit "script" app owned by the moderator account
// (REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET, REDDIT_USERNAME, REDDIT_PASSWORD).
// Credentials never leave the server. Scheduled posts are published by the
// `run_due` action, which only backend/cron callers may invoke.
import { getCaller, isAdminUser, isBackendCaller, serviceRoleClient } from "../_shared/callerGuard.ts";

const SUBREDDIT = "mobilefoodbiz";
const UA = "web:com.vendibook.subreddit-admin:v1.0 (by /u/" + (Deno.env.get("REDDIT_USERNAME") ?? "vendibook") + ")";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const REQUIRED = ["REDDIT_CLIENT_ID", "REDDIT_CLIENT_SECRET", "REDDIT_USERNAME", "REDDIT_PASSWORD"];
const missing = () => REQUIRED.filter((k) => !Deno.env.get(k));

let token: { value: string; exp: number } | null = null;
async function accessToken(): Promise<string> {
  if (token && token.exp > Date.now() + 60_000) return token.value;
  const res = await fetch("https://www.reddit.com/api/v1/access_token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${Deno.env.get("REDDIT_CLIENT_ID")}:${Deno.env.get("REDDIT_CLIENT_SECRET")}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": UA,
    },
    body: new URLSearchParams({
      grant_type: "password",
      username: Deno.env.get("REDDIT_USERNAME") ?? "",
      password: Deno.env.get("REDDIT_PASSWORD") ?? "",
    }),
    signal: AbortSignal.timeout(15000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) {
    throw new Error(`Reddit sign-in failed (${res.status}): ${String(data.error ?? data.message ?? "check the Reddit app credentials").slice(0, 200)}`);
  }
  token = { value: data.access_token, exp: Date.now() + (data.expires_in ?? 3600) * 1000 };
  return token.value;
}

async function reddit(path: string, init: { method?: string; form?: Record<string, string> } = {}) {
  const res = await fetch(`https://oauth.reddit.com${path}`, {
    method: init.method ?? "GET",
    headers: {
      Authorization: `Bearer ${await accessToken()}`,
      "User-Agent": UA,
      ...(init.form ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
    },
    body: init.form ? new URLSearchParams({ api_type: "json", ...init.form }) : undefined,
    signal: AbortSignal.timeout(20000),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Reddit ${res.status}: ${text.slice(0, 300)}`);
  const data = text ? JSON.parse(text) : {};
  const errs = data?.json?.errors;
  if (Array.isArray(errs) && errs.length) throw new Error(`Reddit: ${errs.map((e: string[]) => e.join(" ")).join("; ")}`);
  return data;
}

type Item = Record<string, unknown>;
const slim = (c: { kind: string; data: Item }) => {
  const d = c.data;
  return {
    kind: c.kind === "t1" ? "comment" : "post",
    fullname: d.name,
    author: d.author,
    title: d.title ?? d.link_title ?? null,
    body: String(d.selftext ?? d.body ?? "").slice(0, 2000),
    url: d.permalink ? `https://www.reddit.com${d.permalink}` : null,
    score: d.score,
    num_comments: d.num_comments ?? null,
    created_utc: d.created_utc,
    reports: ((d.mod_reports as unknown[]) ?? []).length + ((d.user_reports as unknown[]) ?? []).length,
    removed: !!d.removed || !!d.banned_by,
  };
};
const listing = (data: { data?: { children?: { kind: string; data: Item }[] } }) => (data?.data?.children ?? []).map(slim);

async function submit(p: { kind: string; title: string; body?: string | null; url?: string | null }) {
  const form: Record<string, string> = { sr: SUBREDDIT, kind: p.kind, title: p.title, resubmit: "true" };
  if (p.kind === "link") form.url = p.url ?? ""; else form.text = p.body ?? "";
  const data = await reddit("/api/submit", { method: "POST", form });
  return { id: data?.json?.data?.name as string | undefined, url: data?.json?.data?.url as string | undefined };
}

function validPost(b: Item): { kind: "self" | "link"; title: string; body: string | null; url: string | null } | string {
  const kind = b.kind === "link" ? "link" : "self";
  const title = String(b.title ?? "").trim();
  if (!title || title.length > 300) return "Title is required (up to 300 characters).";
  const body = typeof b.body === "string" ? b.body.slice(0, 40000) : null;
  const url = typeof b.url === "string" ? b.url.trim() : null;
  if (kind === "link" && !/^https:\/\/\S+$/i.test(url ?? "")) return "Link posts need an https:// URL.";
  return { kind, title, body, url };
}

async function runDue() {
  const db = serviceRoleClient();
  const { data: due } = await db.from("reddit_scheduled_posts").select("*")
    .eq("status", "scheduled").lte("scheduled_for", new Date().toISOString()).limit(5);
  const results = [];
  for (const row of due ?? []) {
    const { data: claimed } = await db.from("reddit_scheduled_posts").update({ status: "posting" })
      .eq("id", row.id).eq("status", "scheduled").select("id");
    if (!claimed?.length) continue;
    try {
      const r = await submit(row);
      await db.from("reddit_scheduled_posts").update({ status: "posted", reddit_post_id: r.id, reddit_url: r.url, posted_at: new Date().toISOString(), error: null }).eq("id", row.id);
      results.push({ id: row.id, ok: true });
    } catch (e) {
      await db.from("reddit_scheduled_posts").update({ status: "failed", error: String((e as Error).message).slice(0, 500) }).eq("id", row.id);
      results.push({ id: row.id, ok: false });
    }
  }
  return results;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const body = (await req.json().catch(() => ({}))) as Item;
  const action = String(body.action ?? "");

  if (action === "run_due") {
    if (!(await isBackendCaller(req))) return json({ error: "Forbidden" }, 403);
    if (missing().length) return json({ error: "Reddit is not configured." }, 503);
    return json({ results: await runDue() });
  }

  const caller = await getCaller(req);
  if (!caller || !(await isAdminUser(caller.id))) return json({ error: "Administrator access required." }, 403);

  if (action === "status") {
    return json({ ready: missing().length === 0, missing: missing(), subreddit: SUBREDDIT, username: Deno.env.get("REDDIT_USERNAME") ?? null });
  }
  if (missing().length) return json({ error: "Reddit isn't connected yet. Add the Reddit app details first.", missing: missing() }, 503);

  try {
    switch (action) {
      case "stats": {
        const about = await reddit(`/r/${SUBREDDIT}/about`);
        const top = await reddit(`/r/${SUBREDDIT}/top?t=week&limit=5`);
        const d = about?.data ?? {};
        return json({
          subscribers: d.subscribers ?? null,
          active_users: d.active_user_count ?? d.accounts_active ?? null,
          title: d.title ?? null,
          created_utc: d.created_utc ?? null,
          top_week: listing(top),
        });
      }
      case "feed": {
        const [posts, comments] = await Promise.all([
          reddit(`/r/${SUBREDDIT}/new?limit=25`),
          reddit(`/r/${SUBREDDIT}/comments?limit=25`),
        ]);
        return json({ posts: listing(posts), comments: listing(comments) });
      }
      case "modqueue": {
        return json({ items: listing(await reddit(`/r/${SUBREDDIT}/about/modqueue?limit=50`)) });
      }
      case "moderate": {
        const id = String(body.fullname ?? "");
        if (!/^t[13]_[a-z0-9]+$/i.test(id)) return json({ error: "Invalid item." }, 400);
        const decision = body.decision;
        if (decision === "approve") await reddit("/api/approve", { method: "POST", form: { id } });
        else if (decision === "remove") await reddit("/api/remove", { method: "POST", form: { id, spam: body.spam ? "true" : "false" } });
        else return json({ error: "Decision must be approve or remove." }, 400);
        return json({ ok: true });
      }
      case "reply": {
        const id = String(body.fullname ?? "");
        const text = String(body.text ?? "").trim();
        if (!/^t[13]_[a-z0-9]+$/i.test(id)) return json({ error: "Invalid item." }, 400);
        if (!text || text.length > 10000) return json({ error: "Reply text is required (up to 10,000 characters)." }, 400);
        const data = await reddit("/api/comment", { method: "POST", form: { thing_id: id, text } });
        return json({ ok: true, id: data?.json?.data?.things?.[0]?.data?.name ?? null });
      }
      case "submit": {
        const p = validPost(body);
        if (typeof p === "string") return json({ error: p }, 400);
        return json({ ok: true, ...(await submit(p)) });
      }
      case "schedule": {
        const p = validPost(body);
        if (typeof p === "string") return json({ error: p }, 400);
        const when = new Date(String(body.scheduled_for ?? ""));
        if (isNaN(when.getTime()) || when.getTime() < Date.now() + 60_000) return json({ error: "Pick a time at least a minute from now." }, 400);
        const { data, error } = await serviceRoleClient().from("reddit_scheduled_posts")
          .insert({ ...p, subreddit: SUBREDDIT, scheduled_for: when.toISOString(), created_by: caller.id }).select("id").single();
        if (error) throw new Error(error.message);
        return json({ ok: true, id: data.id });
      }
      case "cancel": {
        const { error } = await serviceRoleClient().from("reddit_scheduled_posts").update({ status: "cancelled" })
          .eq("id", String(body.id ?? "")).eq("status", "scheduled");
        if (error) throw new Error(error.message);
        return json({ ok: true });
      }
      default:
        return json({ error: "Unknown action." }, 400);
    }
  } catch (e) {
    console.error("reddit-admin", action, (e as Error).message);
    return json({ error: (e as Error).message }, 502);
  }
});
