// Concierge reply to a "Tell Vendibook" buyer/renter request (asset_requests)
// with matching live listings, on the transactional template
// 'request-matches' (VendibookEmailLayout, payment-safety callout).
//
// Admin-only (admin JWT or service role). Previews by default: nothing is
// sent unless the body has "send": true. Body:
//   { "asset_request_id": uuid,
//     "listing_ids"?: uuid[]   // optional; otherwise auto-matched (max 3)
//     "intro"?: string, "closing"?: string,   // optional copy overrides
//     "send"?: true }
// Guards: request must be open, have a mailable email, and not belong to a
// suspended account or one on a message sending hold; every listing must be
// publicly live. On a successful send the request is marked 'contacted' (if
// it was 'new') and matched_listing_id is set. Idempotent per request +
// listing set, so a repeated call never double-sends.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { isAdminOrInternalCaller } from "../_shared/internalAuth.ts";
import { isMailableAddress } from "../_shared/marketingAudience.ts";
import { invokeTransactionalEmail } from "../_shared/invokeTransactionalEmail.ts";
import { rankLeadMatches, type MatchableListing } from "../_shared/leadMatches.ts";
import { parseLocationInput } from "../_shared/locationSearch.ts";

const SITE_URL = "https://vendibook.com";
const UTM = "utm_source=email&utm_medium=concierge&utm_campaign=request-matches";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CLOSED = ["closed", "matched", "fulfilled", "archived", "spam", "converted"];
const LEAD_CATEGORY: Record<string, string> = {
  food_truck: "food_truck", food_trailer: "food_trailer", ghost_kitchen: "commercial_kitchen",
  commercial_kitchen: "commercial_kitchen", vendor_lot: "vendor_space", vendor_space: "vendor_space",
};
const CATEGORY_NOUN: Record<string, string> = {
  food_truck: "food truck", food_trailer: "food trailer", ghost_kitchen: "commercial kitchen",
  commercial_kitchen: "commercial kitchen", vendor_lot: "vendor space", vendor_space: "vendor space",
};
const LISTING_COLUMNS =
  "id, title, mode, category, city, state, status, moderation_status, deleted_at, published_at, price_sale, price_daily, price_weekly, price_monthly, instant_book, vendibook_freight_enabled";

type LiveListing = MatchableListing & {
  status: string; moderation_status: string | null; deleted_at: string | null; published_at: string | null; instant_book: boolean | null;
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const usd = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? `$${Math.round(n).toLocaleString("en-US")}` : null;
};

const isLive = (l: LiveListing) =>
  l.status === "published" && l.moderation_status === "clear" && !l.deleted_at && !!l.published_at &&
  (l as { unlisted?: boolean }).unlisted !== true;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!(await isAdminOrInternalCaller(req))) return json({ error: "Forbidden" }, 403);

  const body = await req.json().catch(() => ({}));
  const requestId = String(body?.asset_request_id ?? "");
  if (!UUID_RE.test(requestId)) return json({ error: "asset_request_id is required" }, 400);
  const send = body?.send === true;

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const { data: request, error: reqErr } = await admin
    .from("asset_requests")
    .select("id, user_id, email, name, intent, asset_type, city, state, budget_max, status")
    .eq("id", requestId)
    .maybeSingle();
  if (reqErr || !request) return json({ error: "Request not found" }, 404);

  // ---- guards ----
  const email = String(request.email ?? "").trim().toLowerCase();
  if (CLOSED.includes(String(request.status ?? "").toLowerCase())) return json({ error: `Request is ${request.status}` }, 409);
  if (!isMailableAddress(email)) return json({ error: "Request has no mailable email" }, 422);
  if (request.user_id) {
    const [{ data: prof }, { data: hold }] = await Promise.all([
      admin.from("profiles").select("account_suspended").eq("id", request.user_id).maybeSingle(),
      admin.from("message_sending_holds").select("user_id").eq("user_id", request.user_id).maybeSingle(),
    ]);
    if (prof?.account_suspended || hold) return json({ error: "Requester account is suspended or on hold" }, 409);
  }

  // ---- listings: explicit, or auto-matched ----
  let listings: LiveListing[];
  const explicit: string[] = Array.isArray(body?.listing_ids) ? body.listing_ids.map(String) : [];
  if (explicit.length) {
    if (explicit.length > 5 || !explicit.every((id) => UUID_RE.test(id))) return json({ error: "listing_ids must be 1-5 uuids" }, 400);
    const { data, error } = await admin.from("listings").select(LISTING_COLUMNS).in("id", explicit);
    if (error) return json({ error: error.message }, 500);
    const rows = (data ?? []) as LiveListing[];
    const notLive = explicit.filter((id) => !rows.find((r) => r.id === id && isLive(r)));
    if (notLive.length) return json({ error: "Some listings are not live", listing_ids: notLive }, 409);
    listings = explicit.map((id) => rows.find((r) => r.id === id)!);
  } else {
    const mode = request.intent === "rent" ? "rent" : request.intent === "buy" ? "sale" : null;
    if (!mode) return json({ error: "Only rent/buy requests can be matched" }, 422);
    const { data, error } = await admin.from("listings").select(LISTING_COLUMNS)
      .eq("status", "published").eq("moderation_status", "clear").eq("unlisted", false).is("deleted_at", null)
      .not("published_at", "is", null).eq("mode", mode).limit(500);
    if (error) return json({ error: error.message }, 500);
    const budgetMax = Number(request.budget_max) || null;
    const candidates = ((data ?? []) as LiveListing[]).filter((l) =>
      !(mode === "sale" && budgetMax && l.price_sale && Number(l.price_sale) > budgetMax * 1.25));
    listings = rankLeadMatches(
      { intent: request.intent, category: request.asset_type ? LEAD_CATEGORY[request.asset_type] ?? null : null, city: [request.city, request.state].filter(Boolean).join(", ") },
      candidates,
      3,
    ) as LiveListing[];
  }
  if (!listings.length) return json({ error: "No live listings match; send this to Supply Desk as a sourcing need" }, 404);

  // ---- template data ----
  const noun = CATEGORY_NOUN[request.asset_type ?? ""] ?? "listing";
  const rawPlace = [request.city, request.state].filter(Boolean).join(", ");
  const place = parseLocationInput(rawPlace).label ?? rawPlace.trim();
  const requestLabel = `${noun} ${request.intent === "rent" ? "rental" : "purchase"}${place ? ` in ${place}` : ""}`;
  const templateData = {
    recipientName: String(request.name ?? "").trim().split(/\s+/)[0] || undefined,
    requestLabel,
    intro: typeof body?.intro === "string" && body.intro.trim()
      ? body.intro.trim().slice(0, 600)
      : `Thanks for telling us what you need. ${listings.length === 1 ? "This listing is" : "These listings are"} live on Vendibook right now.`,
    listings: listings.map((l) => ({
      title: String(l.title ?? "Listing").trim().replace(/\s+/g, " "),
      url: `${SITE_URL}/listing/${l.id}?${UTM}`,
      location: [l.city, l.state].filter(Boolean).join(", ") || undefined,
      rates: l.mode === "sale"
        ? [{ label: "Price", value: usd(l.price_sale) ?? "Make an offer" }]
        : ([["Daily", l.price_daily], ["Weekly", l.price_weekly], ["Monthly", l.price_monthly]] as const)
            .map(([label, v]) => ({ label, value: usd(v) }))
            .filter((r): r is { label: "Daily" | "Weekly" | "Monthly"; value: string } => !!r.value),
      note: l.instant_book ? "Instant Book available" : undefined,
    })),
    closing: typeof body?.closing === "string" && body.closing.trim()
      ? body.closing.trim().slice(0, 600)
      : "Reply with your dates and how you plan to use it, and we'll confirm availability with the owner for you.",
  };

  const listingIds = listings.map((l) => l.id);
  if (!send) {
    return json({ preview: true, to_domain: email.split("@")[1], template: "request-matches", templateData, listing_ids: listingIds });
  }

  const { error: sendErr } = await invokeTransactionalEmail({
    templateName: "request-matches",
    recipientEmail: email,
    idempotencyKey: `request-matches-${requestId}-${[...listingIds].sort().join("-")}`,
    templateData,
    metadata: { asset_request_id: requestId, listing_ids: listingIds },
  });
  if (sendErr) return json({ error: "Send failed", detail: String((sendErr as { message?: string })?.message ?? sendErr) }, 502);

  if (String(request.status ?? "new").toLowerCase() === "new") {
    await admin.from("asset_requests")
      .update({ status: "contacted", matched_listing_id: listingIds[0] })
      .eq("id", requestId);
  }
  return json({ sent: true, listing_ids: listingIds });
});
