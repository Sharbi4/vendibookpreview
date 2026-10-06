import { describe, it, expect, vi } from "vitest";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { readAllRows } from "../../../supabase/functions/_shared/readAllRows";
import { hasContactDetails } from "../../../supabase/functions/_shared/contactPatterns";

type Row = Record<string, any>;
const seller = "20434a7d-a365-4d4a-ab9b-5cff26815f33";
const listing = "c649440f-d3df-4f3a-a622-e118767efb4d";
const ago = (hours: number) => new Date(Date.now() - hours * 3600000).toISOString();
function fixture(): Record<string, Row[]> {
  return {
    listings: [{ id: listing, host_id: seller, title: "Commercial food trailer", description: "Ready to inspect", price_sale: 20000, mode: "sale", status: "published", moderation_status: "clear", deleted_at: null, published_at: ago(300) }],
    profiles: [{ id: seller, email: "seller@business.net", first_name: "Seller", account_suspended: false }, { id: "buyer", account_suspended: false }],
    offers: [], conversations: [{ id: "conversation", listing_id: listing, host_id: seller, shopper_id: "buyer", last_message_at: ago(120) }],
    conversation_messages: [{ id: "message", conversation_id: "conversation", sender_id: "buyer", message: "Is it available?", created_at: ago(120) }],
    email_send_log: [], notification_preferences: [],
  };
}
// Execute the actual Deno handlers, replacing only runtime imports/services.
// No network or provider credentials are available in this test sandbox.
function worker(name: string, rows = fixture(), fail: (table: string, columns: string, filters: Row[]) => boolean = () => false, cap = 1000) {
  const dispatch = vi.fn(async (payload: Row) => {
    rows.email_send_log.push({ id: crypto.randomUUID(), idempotency_key: payload.idempotencyKey, status: "sent", created_at: new Date().toISOString() });
    return { data: { sent: true }, error: null };
  });
  const provider = vi.fn(async () => new Response(JSON.stringify({ id: "provider-id" })));
  const admin = { from(table: string) {
    let columns = "", start = 0, end = Infinity;
    const filters: Row[] = [], orders: Row[] = [];
    const q: any = {
      select(c: string) { columns = c; return q; },
      eq(k: string, v: unknown) { filters.push({ op: "eq", k, v }); return q; },
      in(k: string, v: unknown[]) { filters.push({ op: "in", k, v }); return q; },
      is(k: string, v: unknown) { return q.eq(k, v); },
      not(k: string, op: string, v: unknown) { filters.push({ op: "not", k, cmp: op, v }); return q; },
      gte(k: string, v: unknown) { filters.push({ op: "gte", k, v }); return q; },
      order(k: string, opts?: Row) { orders.push({ k, asc: opts?.ascending !== false }); return q; },
      range(a: number, b: number) { start = a; end = b; return q; },
      insert(row: Row) { (rows[table] ??= []).push(row); return Promise.resolve({ error: null }); },
      then(resolve: (value: Row) => void) {
        if (fail(table, columns, filters)) return Promise.resolve(resolve({ data: null, error: { message: `failed ${table}` } }));
        const result = (rows[table] ?? []).filter(r => filters.every(f => {
          if (f.op === "eq") return r[f.k] === f.v;
          if (f.op === "in") return f.v.includes(r[f.k]);
          if (f.op === "gte") return r[f.k] >= f.v;
          if (f.op === "not" && f.cmp === "is") return r[f.k] !== f.v;
          return true;
        })).sort((a, b) => {
          for (const o of orders) { const cmp = String(a[o.k]).localeCompare(String(b[o.k])); if (cmp) return o.asc ? cmp : -cmp; }
          return 0;
        });
        return Promise.resolve(resolve({ data: result.slice(start, Math.min(end + 1, start + cap)), error: null }));
      },
    };
    return q;
  } };
  let handler: (req: Request) => Promise<Response>;
  const source = fs.readFileSync(`supabase/functions/${name}/index.ts`, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
    transformers: { before: [context => root => ts.visitNode(root, function visit(node): any {
      return ts.isImportDeclaration(node) ? undefined : ts.visitEachChild(node, visit, context);
    }) as ts.SourceFile] },
  }).outputText.replace(/export \{\};?/, "");
  vm.runInNewContext(compiled, {
    serve: (h: typeof handler) => { handler = h; }, createClient: () => admin,
    Deno: { env: { get: () => "test-only" } }, Response, Date, console: { error: vi.fn() },
    setTimeout: (fn: () => void) => fn(), fetch: provider, readAllRows, pageAll: readAllRows,
    unsubToken: () => "test-token", isInternalCaller: () => true, isMailableAddress: () => true, hasContactDetails,
    maskContactDetails: (v: string) => v, pickListingFixes: () => [],
    invokeTransactionalEmail: dispatch, SELLER_CONCIERGE_CAMPAIGN_ID: "concierge",
    LISTING_FIX_CAMPAIGN_ID: "listing-fix", MARKETING_FROM: "test", MARKETING_REPLY_TO: "test",
    sellerConciergeSubject: () => "test", buildSellerConciergeHtml: JSON.stringify, buildSellerConciergeText: JSON.stringify,
    RENT_WHILE_YOU_SELL_CAMPAIGN_ID: "rent", rentCampaignSubject: () => "test", buildRentCampaignHtml: JSON.stringify, buildRentCampaignText: JSON.stringify,
  });
  return { dispatch, provider, run: async (body: Row = {}) => {
    const response = await handler!(new Request("https://test.invalid", { method: "POST", body: JSON.stringify(body) }));
    return { status: response.status, body: await response.json() };
  } };
}

describe("seller concierge required reads", () => {
  it.each(["email_unsubscribes", "suppressed_emails", "user_roles", "message_sending_holds", "email_send_log", "offers", "profiles"])("does not send if %s fails", async table => {
    const w = worker("send-seller-concierge", fixture(), t => t === table);
    expect((await w.run({ mode: "broadcast", confirm: "concierge" })).status).toBe(500);
    expect(w.provider).not.toHaveBeenCalled();
  });
  it.each(["concierge", "listing-fix"])("does not send if %s campaign history fails", async campaign => {
    const w = worker("send-seller-concierge", fixture(), (t, _, f) => t === "blog_campaign_sends" && f.some(x => x.v === campaign));
    expect((await w.run({ mode: "broadcast", confirm: "concierge" })).status).toBe(500);
    expect(w.provider).not.toHaveBeenCalled();
  });
  it.each(["email_unsubscribes", "message_sending_holds"])("excludes recipients beyond the first server page in %s", async table => {
    const rows = fixture();
    rows[table] = [{ id: "a", email: "other@business.net", user_id: "000-other" }, { id: "z", email: "seller@business.net", user_id: seller }];
    const w = worker("send-seller-concierge", rows, undefined, 1);
    expect((await w.run()).body.eligibleRecipients).toBe(0);
    expect(w.provider).not.toHaveBeenCalled();
  });
});

describe("rescue eligibility", () => {
  function rescueRows() {
    const rows = fixture();
    rows.offers = [{ id: "offer", listing_id: listing, seller_id: seller, buyer_id: "buyer", offer_amount: 17500, status: "expired", responded_at: null, expires_at: ago(200), created_at: ago(248) }];
    return rows;
  }
  // Contact details are stripped by the a00_strip_contact_details trigger, so they no longer change routing.
  it.each([["Call 602-555-1234 food trailer", "rescue"], ["Untitled", "fix_title"]])("routes integrity first: %s", async (title, variant) => {
    const rows = rescueRows(); rows.listings[0].title = title;
    const result = await worker("send-seller-concierge", rows).run();
    expect(result.body.byVariant).toEqual({ [variant]: 1 });
  });
  it("uses the current offer amount and price", async () => {
    const result = await worker("send-seller-concierge", rescueRows()).run({ mode: "preview_html", variant: "rescue" });
    expect(JSON.parse(result.body.html).rescue.offerAmount).toBe(17500);
  });
  it.each(["accepted", "rejected", "pending"])("does not rescue a now-%s offer", async status => {
    const rows = rescueRows(); rows.offers[0].status = status;
    expect((await worker("send-seller-concierge", rows).run()).body.byVariant.rescue).toBeUndefined();
  });
});

describe("polish review", () => {
  const polish = (listingId = listing) => ({ hostId: seller, featuredTrialOffer: true,
    items: [{ listingId, suggestedTitle: "2026 Food Trailer, Seguin TX", asks: [" Add  the VIN. ", ""] }] });
  it("sends the admin-written review to that host only", async () => {
    const rows = fixture();
    rows.listings.push({ ...rows.listings[0], id: "other-listing", host_id: "other-host" });
    rows.profiles.push({ id: "other-host", email: "other@business.net", first_name: "Other", account_suspended: false });
    const result = await worker("send-seller-concierge", rows).run({ mode: "preview_html", variant: "polish", polish: polish() });
    const data = JSON.parse(result.body.html);
    expect(data.variant).toBe("polish");
    expect(data.featuredTrialOffer).toBe(true);
    expect(data.polish).toEqual([{ listingId: listing, currentTitle: "Commercial food trailer", suggestedTitle: "2026 Food Trailer, Seguin TX", asks: ["Add the VIN."] }]);
    expect((await worker("send-seller-concierge", rows).run({ polish: polish() })).body.eligibleRecipients).toBe(1);
  });
  it("rejects a listing the host does not own", async () => {
    const rows = fixture();
    rows.listings.push({ ...rows.listings[0], id: "other-listing", host_id: "other-host" });
    const w = worker("send-seller-concierge", rows);
    expect((await w.run({ mode: "broadcast", confirm: "concierge", polish: polish("other-listing") })).status).toBe(400);
    expect(w.provider).not.toHaveBeenCalled();
  });
});

describe("rent while you sell", () => {
  const old = ago(24 * 45);
  function rentRows() {
    const rows = fixture();
    rows.listings = [
      { id: listing, host_id: seller, title: "Commercial food trailer", category: "food_trailer", state: "TX", mode: "sale", price_sale: 20000, status: "published", moderation_status: "clear", deleted_at: null, published_at: old },
    ];
    rows.conversations = []; rows.offers = []; rows.blog_campaign_sends = [];
    rows.listing_views = Array.from({ length: 12 }, (_, i) => ({ id: `v${i}`, listing_id: listing, viewed_at: ago(24) }));
    return rows;
  }
  it("targets a viewed sale trailer with no offers, by state", async () => {
    const result = await worker("send-rent-while-you-sell", rentRows()).run();
    expect(result.body.byVariant).toEqual({ rent_while_you_sell: 1 });
    expect(result.body.byState).toEqual({ TX: 1 });
    const html = JSON.parse((await worker("send-rent-while-you-sell", rentRows()).run({ mode: "preview_html" })).body.html);
    expect(html.views30).toBe(12);
  });
  it.each([
    ["an offer", (r: Record<string, Row[]>) => { r.offers = [{ id: "o", listing_id: listing }]; }],
    ["a linked rental", (r: Record<string, Row[]>) => { r.listings.push({ id: "rental", host_id: seller, source_listing_id: listing, mode: "rent", deleted_at: null, status: "draft" }); }],
    ["too few views", (r: Record<string, Row[]>) => { r.listing_views = r.listing_views.slice(0, 9); }],
    ["a recent concierge email", (r: Record<string, Row[]>) => { r.blog_campaign_sends = [{ id: "s", campaign_id: "concierge", user_id: seller, email: "x@y.z", status: "sent", is_test: false, created_at: ago(24) }]; }],
  ])("skips a listing with %s", async (_, mutate) => {
    const rows = rentRows(); mutate(rows);
    expect((await worker("send-rent-while-you-sell", rows).run()).body.eligibleRecipients).toBe(0);
  });
  it("asks a rental without a monthly rate, with live comps", async () => {
    const rows = rentRows();
    rows.listings = [
      { id: "r1", host_id: seller, title: "Trailer for rent", category: "food_trailer", state: "GA", mode: "rent", price_daily: 300, price_weekly: 1600, price_monthly: null, status: "published", moderation_status: "clear", deleted_at: null, published_at: old },
      { id: "r2", host_id: "h2", category: "food_trailer", mode: "rent", price_monthly: 3000, status: "published", moderation_status: "clear", deleted_at: null, published_at: old },
      { id: "r3", host_id: "h3", category: "food_truck", mode: "rent", price_monthly: 5000, status: "published", moderation_status: "clear", deleted_at: null, published_at: old },
    ];
    const data = JSON.parse((await worker("send-rent-while-you-sell", rows).run({ mode: "preview_html" })).body.html);
    expect(data).toMatchObject({ variant: "monthly_rate", listingId: "r1", dailyRate: 300, weeklyRate: 1600, monthlyComps: { min: 3000, max: 5000 } });
  });
  it("restricts a wave to the requested states and requires confirmation", async () => {
    expect((await worker("send-rent-while-you-sell", rentRows()).run({ states: ["ga"] })).body.eligibleRecipients).toBe(0);
    const w = worker("send-rent-while-you-sell", rentRows());
    expect((await w.run({ mode: "broadcast" })).status).toBe(400);
    expect(w.provider).not.toHaveBeenCalled();
  });
});

describe("unanswered message worker", () => {
  it.each(["profiles", "message_sending_holds", "message_safety_events", "notification_preferences", "listings", "email_send_log", "conversation_messages"])("does not dispatch if %s fails", async table => {
    const w = worker("send-unanswered-message-reminders", fixture(), t => t === table);
    expect((await w.run()).status).toBe(500);
    expect(w.dispatch).not.toHaveBeenCalled();
  });
  it("fails closed for missing buyer profiles", async () => {
    const rows = fixture(); rows.profiles = rows.profiles.filter(p => p.id !== "buyer");
    const w = worker("send-unanswered-message-reminders", rows);
    expect((await w.run()).status).toBe(500); expect(w.dispatch).not.toHaveBeenCalled();
  });
  it("finds opt-outs despite a smaller server row cap", async () => {
    const rows = fixture(); rows.notification_preferences = [{ id: "pref", user_id: seller, message_email: false }];
    const w = worker("send-unanswered-message-reminders", rows, undefined, 1);
    expect((await w.run()).body.planned[0].skipped).toMatch(/turned off/);
    expect(w.dispatch).not.toHaveBeenCalled();
  });
  it("retries support alone after final seller reminder succeeds", async () => {
    const rows = fixture(); rows.email_send_log = [{ id: "first", idempotency_key: "unanswered-msg-24h-message", status: "sent", created_at: ago(49) }];
    const w = worker("send-unanswered-message-reminders", rows);
    w.dispatch.mockImplementationOnce(async payload => {
      rows.email_send_log.push({ id: "final", idempotency_key: payload.idempotencyKey, status: "sent", created_at: ago(0) });
      return { data: { sent: true }, error: null };
    }).mockImplementationOnce(async () => ({ data: null, error: { message: "temporary provider error" } }) as any);
    expect((await w.run()).status).toBe(503);
    expect((await w.run()).body.support_sent).toBe(1);
    expect(w.dispatch.mock.calls.map(([p]) => p.idempotencyKey)).toEqual(["unanswered-msg-72h-message", "unanswered-msg-concierge-message", "unanswered-msg-concierge-message"]);
    await w.run(); expect(w.dispatch).toHaveBeenCalledTimes(3);
  });
  it("does not claim a suppressed reminder was sent or alert support", async () => {
    const rows = fixture(); rows.email_send_log = [{ id: "first", idempotency_key: "unanswered-msg-24h-message", status: "sent", created_at: ago(49) }];
    const w = worker("send-unanswered-message-reminders", rows);
    w.dispatch.mockResolvedValueOnce({ data: { success: false, reason: "email_suppressed" }, error: null } as any);
    expect((await w.run()).body.sent).toBe(0); expect(w.dispatch).toHaveBeenCalledTimes(1);
  });
});


