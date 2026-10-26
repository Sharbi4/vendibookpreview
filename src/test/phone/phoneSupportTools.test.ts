/* eslint-disable @typescript-eslint/no-explicit-any -- in-memory fake of the Supabase query builder */
import { describe, it, expect, vi } from "vitest";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { normalizeNanpToE164, SMS_POLICY_VERSION } from "../../../supabase/functions/_shared/smsConsent";
import { FEE_CONFIG } from "../../../supabase/functions/_shared/feeConfig";

type Row = Record<string, any>;
const SECRET = "test-tool-secret";
const CALLER = "+18035551234";
const CONV = "conv_test_1";

// Minimal PostgREST-style builder over in-memory tables.
function fakeDb(tables: Record<string, Row[]>) {
  return {
    rpc: async (fn: string, args: Row) => {
      if (fn !== "create_managed_inquiry") return { data: null, error: { message: `unknown rpc ${fn}` } };
      const rows = (tables.managed_inquiries ??= []);
      if (rows.some((r) => r.request_key === args.p_request)) return { data: null, error: { message: "Request already saved. Check your email." } };
      const id = crypto.randomUUID();
      rows.push({ id, request_key: args.p_request, listing_id: args.p_listing, email: args.p_email, body: args.p_body });
      return { data: id, error: null };
    },
    from(table: string) {
      const rows = (tables[table] ??= []);
      const filters: Array<(r: Row) => boolean> = [];
      let mode: "select" | "update" | "insert" = "select";
      let patch: Row = {};
      let inserted: Row | null = null;
      let limit = Infinity;
      const q: any = {
        select: () => q,
        eq: (k: string, v: unknown) => { filters.push((r) => r[k] === v); return q; },
        neq: (k: string, v: unknown) => { filters.push((r) => r[k] !== v); return q; },
        is: (k: string, v: unknown) => { filters.push((r) => (v === null ? r[k] == null : r[k] === v)); return q; },
        not: (k: string, _op: string, v: unknown) => { filters.push((r) => (v === null ? r[k] != null : r[k] !== v)); return q; },
        ilike: (k: string, v: string) => {
          const re = new RegExp(`^${v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/%/g, ".*")}$`, "i");
          filters.push((r) => re.test(String(r[k] ?? ""))); return q;
        },
        in: (k: string, v: unknown[]) => { filters.push((r) => v.includes(r[k])); return q; },
        order: () => q,
        limit: (n: number) => { limit = n; return q; },
        update: (p: Row) => { mode = "update"; patch = p; return q; },
        insert: (r: Row | Row[]) => {
          mode = "insert";
          for (const one of Array.isArray(r) ? r : [r]) {
            inserted = { id: crypto.randomUUID(), reference_code: `VB-${rows.length + 1}`, created_at: new Date().toISOString(), ...one };
            rows.push(inserted);
          }
          return q;
        },
        run() {
          if (mode === "insert") return [inserted];
          const hit = rows.filter((r) => filters.every((f) => f(r)));
          if (mode === "update") hit.forEach((r) => Object.assign(r, patch));
          return hit.slice(0, limit);
        },
        maybeSingle: () => Promise.resolve({ data: q.run()[0] ?? null, error: null }),
        single: () => { const d = q.run()[0]; return Promise.resolve({ data: d ?? null, error: d ? null : { message: "no row" } }); },
        then: (resolve: (v: Row) => void) => resolve({ data: q.run(), error: null }),
      };
      return q;
    },
  };
}

function loadTools(tables: Record<string, Row[]>, searchRows: Row[] = []) {
  const emails = vi.fn(async (_input: Row) => ({ data: { sent: true }, error: null }));
  const sms = vi.fn(async (_input: Row) => ({ ok: true }));
  const fetchMock = vi.fn(async (url: string) =>
    new Response(JSON.stringify(String(url).includes("search-listings") ? { listings: searchRows, total_count: searchRows.length } : { sid: "SM1" })));
  let handler!: (req: Request) => Promise<Response>;
  const source = fs.readFileSync("supabase/functions/phone-support-tools/index.ts", "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
    transformers: { before: [(context) => (root) => ts.visitNode(root, function visit(node): any {
      return ts.isImportDeclaration(node) ? undefined : ts.visitEachChild(node, visit, context);
    }) as ts.SourceFile] },
  }).outputText.replace(/export \{\};?/, "");
  const db = fakeDb(tables);
  vm.runInNewContext(compiled, {
    Deno: { env: { get: (k: string) => (k === "PHONE_AGENT_TOOL_SECRET" ? SECRET : k === "LOVABLE_API_KEY" || k === "TWILIO_API_KEY" ? "x" : undefined) }, serve: (h: typeof handler) => { handler = h; } },
    createClient: () => db,
    invokeTransactionalEmail: emails,
    followUpDueAt: (d: Date) => new Date(d.getTime() + 2 * 3600_000),
    formatEt: () => "3:00 PM",
    inFollowUpHours: () => true,
    checkRateLimit: async () => true,
    normalizeNanpToE164,
    SMS_POLICY_VERSION,
    adminAlertEmails: () => ["owner@vendibook.test"],
    adminNoticeKey: (b: string, r: string) => `${b}:${r}`,
    FEE_CONFIG,
    phoneToolSecret: async () => SECRET,
    sendGuardedSms: sms,
    maskContactDetails: (v: string) => v,
    fetch: fetchMock,
    Response, URL, TextEncoder, Uint8Array, Uint32Array, Array, JSON, Date, Math, Number, String, Object, Promise, Set, RegExp, AbortSignal, URLSearchParams,
    crypto: globalThis.crypto, console: { error: vi.fn(), log: vi.fn() },
  });
  const call = async (tool: string, body: Row, secret = SECRET) => {
    const res = await handler(new Request(`https://x.test/phone-support-tools?tool=${tool}`, {
      method: "POST", headers: { "x-vendibook-tool-secret": secret }, body: JSON.stringify(body),
    }));
    return { status: res.status, body: await res.json() };
  };
  return { call, emails, sms, fetchMock, tables };
}

const LISTING = "11111111-2222-4333-8444-555555555555";
const live = (over: Row = {}) => ({ id: LISTING, title: "2020 Taco Truck", category: "food_truck", mode: "sale", status: "published", deleted_at: null, price_sale: 45000, city: "Houston", state: "TX", ...over });

const base = () => ({
  listings: [live()] as Row[], managed_inquiries: [] as Row[],
  support_tickets: [] as Row[], user_roles: [{ user_id: "admin-1", role: "admin" }], notifications: [] as Row[],
  sms_suppressions: [] as Row[], sms_preferences: [] as Row[], sms_consent_events: [] as Row[],
  phone_agent_verifications: [] as Row[],
  profiles: [{ id: "user-1", email: "pat@example.com", phone_number: "(803) 555-1234", first_name: "Pat" }],
});

describe("phone support tools", () => {
  it("rejects requests without the tool secret", async () => {
    const t = loadTools(base());
    expect((await t.call("get_pricing", {}, "wrong")).status).toBe(403);
  });

  it("saves caller details first, then turns that ticket into the follow-up", async () => {
    const t = loadTools(base());
    const saved = await t.call("save_caller_details", { first_name: "Sam", last_name: "Lee", caller_id: CALLER, conversation_id: CONV });
    expect(saved.body.saved).toBe(true);
    expect(t.tables.support_tickets).toHaveLength(1);
    expect(t.tables.support_tickets[0]).toMatchObject({ customer_name: "Sam Lee", callback_phone_e164: CALLER, priority: "normal" });

    const follow = await t.call("request_live_follow_up", { preferred_method: "phone_call", topic: "Rental question", summary: "Wants a call", caller_id: CALLER, conversation_id: CONV });
    expect(follow.status).toBe(200);
    expect(t.tables.support_tickets).toHaveLength(1);
    expect(t.tables.support_tickets[0]).toMatchObject({ priority: "high", customer_name: "Sam Lee" });
    expect(follow.body.say_this).toContain("866-690-6227");
    expect(t.emails).toHaveBeenCalledTimes(1);
  });

  it("requires first and last name and a call-back number", async () => {
    const t = loadTools(base());
    expect((await t.call("save_caller_details", { first_name: "Sam", caller_id: CALLER, conversation_id: CONV })).status).toBe(400);
    expect((await t.call("save_caller_details", { first_name: "Sam", last_name: "Lee", caller_id: "", conversation_id: CONV })).status).toBe(400);
  });

  it("only texts after consent, only the calling number, never over a STOP", async () => {
    const t = loadTools(base());
    const args = { first_name: "Sam", last_name: "Lee", preferred_method: "text", topic: "Q", summary: "S", caller_id: CALLER, conversation_id: CONV };
    expect((await t.call("request_live_follow_up", args)).status).toBe(400);
    expect((await t.call("request_live_follow_up", { ...args, text_consent: true, phone: "8035559999" })).status).toBe(400);
    t.tables.sms_suppressions.push({ phone_e164: CALLER, released_at: null });
    expect((await t.call("request_live_follow_up", { ...args, text_consent: true })).status).toBe(409);
    t.tables.sms_suppressions.length = 0;
    const ok = await t.call("request_live_follow_up", { ...args, text_consent: true });
    expect(ok.status).toBe(200);
    expect(t.tables.sms_preferences[0]).toMatchObject({ phone_e164: CALLER, transactional_status: "opted_in" });
    expect(t.tables.sms_consent_events[0]).toMatchObject({ event_type: "opt_in", source: "support" });
  });

  it("verifies an account holder with a code before sharing their account", async () => {
    const t = loadTools(base());
    expect((await t.call("get_my_account_summary", { conversation_id: CONV })).status).toBe(403);
    const started = await t.call("start_account_verification", { channel: "email", email: "pat@example.com", caller_id: CALLER, conversation_id: CONV });
    expect(started.body.sent).toBe(true);
    const sentEmail = t.emails.mock.calls[0][0] as Row;
    const code = String(sentEmail.templateData.heading).match(/\d{6}/)![0];
    expect((await t.call("check_account_code", { code: code === "000000" ? "111111" : "000000", conversation_id: CONV })).body.verified).toBe(false);
    expect((await t.call("check_account_code", { code, conversation_id: CONV })).body).toMatchObject({ verified: true, first_name: "Pat" });
    expect((await t.call("get_my_account_summary", { conversation_id: CONV })).status).toBe(200);
  });

  it("gives the same answer when no account matches", async () => {
    const t = loadTools(base());
    const res = await t.call("start_account_verification", { channel: "email", email: "nobody@example.com", caller_id: CALLER, conversation_id: CONV });
    expect(res.status).toBe(200);
    expect(res.body.say_this).toMatch(/If that matches a Vendibook account/);
    expect(t.tables.phone_agent_verifications).toHaveLength(0);
  });
});

describe("phone listing tools", () => {
  it("searches through the website search and returns speakable results", async () => {
    const t = loadTools(base(), [live({ distance_miles: 4.4 })]);
    const res = await t.call("search_listings", { category: "food_truck", mode: "sale", location: "Houston, TX" });
    expect(res.status).toBe(200);
    expect(res.body.listings[0]).toMatchObject({ listing_id: LISTING, price: "$45,000 to buy", location: "Houston, TX", miles_away: 4 });
    const sent = JSON.parse(String((t.fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body));
    expect(sent).toMatchObject({ category: "food_truck", mode: "sale", location_text: "Houston, TX" });
  });

  it("puts local results before featured listings from other areas", async () => {
    const far = live({ id: "far", title: "Featured Miami truck", city: "Miami", state: "FL", distance_miles: 1180, featured_enabled: true, featured_expires_at: "2999-01-01" });
    const near = live({ id: "near", distance_miles: 9 });
    const t = loadTools(base(), [far, near]);
    (t.fetchMock as any).mockImplementationOnce(async () => new Response(JSON.stringify({ listings: [far, near], search_meta: { effective_radius_miles: 50 } })));
    const res = await t.call("search_listings", { location: "Houston, TX" });
    expect(res.body.listings.map((l: Row) => l.listing_id)).toEqual(["near", "far"]);
    expect(res.body.listings[1]).toMatchObject({ featured: true, outside_search_area: true });
  });

  it("only shows published listings", async () => {
    const tables = base();
    tables.listings[0].status = "draft";
    expect((await loadTools(tables).call("get_listing", { listing_id: LISTING })).status).toBe(404);
  });

  it("messages a seller only after the exact message is confirmed, through the reviewed relay", async () => {
    const t = loadTools(base());
    const args = { listing_id: LISTING, message: "Is it still available?", name: "Sam Lee", email: "sam@example.com", conversation_id: CONV, caller_id: CALLER };
    expect((await t.call("message_seller", args)).status).toBe(400);
    expect((await t.call("message_seller", { ...args, email: "", caller_confirmed_exact_message: true })).status).toBe(400);
    const ok = await t.call("message_seller", { ...args, caller_confirmed_exact_message: true });
    expect(ok.body.sent).toBe(true);
    expect(t.tables.managed_inquiries).toHaveLength(1);
    expect(String((t.emails.mock.calls[0][0] as Row).templateData.ctaUrl)).toMatch(/\/inquiries\/.+#access=[0-9a-f]{64}$/);
    // Same call, same listing: no duplicate inquiry.
    expect((await t.call("message_seller", { ...args, caller_confirmed_exact_message: true })).body.sent).toBe(true);
    expect(t.tables.managed_inquiries).toHaveLength(1);
  });

  it("starts a guest draft with a private finish link that only this call can send", async () => {
    const t = loadTools(base());
    const draft = await t.call("start_listing_draft", { category: "food_trailer", mode: "rent", title: "16 ft trailer", city: "Austin", state: "TX", price_daily: 250, conversation_id: CONV });
    expect(draft.body).toMatchObject({ created: true, on_account: false });
    const row = t.tables.listings.find((l) => l.id === draft.body.listing_id)!;
    expect(row).toMatchObject({ status: "draft", host_id: null, creation_session_key: `phone:${CONV}`, price_daily: 250, price_sale: null });
    expect(draft.body.finish_link).toBe(`https://vendibook.com/create-listing/${row.id}#draft=${row.guest_draft_token}`);
    expect((await t.call("send_listing_draft_link", { listing_id: row.id, method: "email", email: "sam@example.com", conversation_id: "other_call" })).status).toBe(403);
    const sent = await t.call("send_listing_draft_link", { listing_id: row.id, method: "email", email: "sam@example.com", conversation_id: CONV });
    expect(sent.body.sent).toBe(true);
  });

  it("puts a verified caller's draft on their own account", async () => {
    const tables = base();
    tables.phone_agent_verifications.push({ conversation_id: CONV, user_id: "user-1", verified_at: new Date().toISOString() });
    const t = loadTools(tables);
    const draft = await t.call("start_listing_draft", { category: "food_truck", mode: "sale", title: "Truck", city: "Dallas", state: "TX", price_sale: 60000, conversation_id: CONV });
    expect(draft.body).toMatchObject({ created: true, on_account: true });
    expect(t.tables.listings.find((l) => l.id === draft.body.listing_id)).toMatchObject({ host_id: "user-1", guest_draft_token: null });
  });

  it("texts listing links only after consent", async () => {
    const t = loadTools(base());
    const args = { listing_ids: [LISTING], method: "text", caller_id: CALLER, conversation_id: CONV };
    expect((await t.call("send_listing_links", args)).status).toBe(400);
    const ok = await t.call("send_listing_links", { ...args, text_consent: true });
    expect(ok.body.sent).toBe(true);
    expect(String((t.sms.mock.calls[0][0] as Row).body)).toContain(`https://vendibook.com/listing/${LISTING}`);
  });
});

describe("phone line shared secret", () => {
  const load = (env: Record<string, string>) => {
    const source = fs.readFileSync("supabase/functions/_shared/phoneLine.ts", "utf8");
    const out = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
    const mod: { exports: Record<string, any> } = { exports: {} };
    vm.runInNewContext(out, {
      module: mod, exports: mod.exports, crypto: globalThis.crypto, TextEncoder, Uint8Array, Array,
      Deno: { env: { get: (k: string) => env[k] } },
    });
    return mod.exports as { phoneToolSecret: () => Promise<string> };
  };

  it("prefers an explicit secret, otherwise derives a stable one from the ElevenLabs key", async () => {
    expect(await load({ PHONE_AGENT_TOOL_SECRET: "explicit" }).phoneToolSecret()).toBe("explicit");
    const a = await load({ ELEVENLABS_API_KEY: "key-a" }).phoneToolSecret();
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(await load({ ELEVENLABS_API_KEY: "key-a" }).phoneToolSecret()).toBe(a);
    expect(await load({ ELEVENLABS_API_KEY: "key-b" }).phoneToolSecret()).not.toBe(a);
    expect(await load({}).phoneToolSecret()).toBe("");
  });
});
