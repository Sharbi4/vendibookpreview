/**
 * guest-draft-access
 *
 * Server-side gatekeeper for guest (unauthenticated) draft listings. Replaces
 * the permissive RLS policies that allowed anyone to read/modify ANY row where
 * `guest_draft_token IS NOT NULL`. This function requires the caller to
 * *prove* possession of the specific token before it will act on the row.
 *
 * Actions:
 *   - `get`    { id, token }           → returns the draft row (only if token matches)
 *   - `update` { id, token, patch }    → updates the draft row (only if token matches)
 *   - `claim`  { id, token }           → sets host_id = auth.uid() (requires JWT + token match)
 *
 * Uses SERVICE ROLE, so it bypasses RLS itself — safety comes from the
 * token equality check enforced here.
 */
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

// Fields a guest is allowed to patch. Anything not in this allowlist is
// silently stripped — prevents privilege escalation via crafted requests
// (e.g. flipping status to 'published', mutating host_id, or setting
// featured_enabled without payment).
const PATCH_ALLOWLIST = new Set([
  "title",
  "description",
  "highlights",
  "amenities",
  "category",
  "subcategory",
  "mode",
  "fulfillment_type",
  "is_static_location",
  "pickup_location_text",
  "address",
  "country",
  "street_address",
  "apt_suite",
  "city",
  "state",
  "zip_code",
  "postal_code",
  "show_precise_location",
  "delivery_fee",
  "delivery_radius_miles",
  "pickup_instructions",
  "delivery_instructions",
  "access_instructions",
  "hours_of_access",
  "location_notes",
  "latitude",
  "longitude",
  "price_hourly",
  "price_daily",
  "price_weekly",
  "price_monthly",
  "price_sale",
  "available_from",
  "available_to",
  "image_urls",
  "video_urls",
  "instant_book",
  "deposit_amount",
  "vendibook_freight_enabled",
  "freight_payer",
  "weight_lbs",
  "length_inches",
  "width_inches",
  "height_inches",
  "freight_category",
  "required_documents",
  "accept_cash_payment",
  "accept_paypal_checkout",
  "proof_notary_enabled",
  "total_slots",
  "slot_names",
  "hourly_schedule",
  "hourly_special_pricing",
  "rental_min_days",
  // Booking-mode toggles + constraints saved by the wizard's availability step.
  "hourly_enabled",
  "daily_enabled",
  "min_hours",
  "max_hours",
  "buffer_time_mins",
  "min_notice_hours",
  // Location-step delivery pricing mode (flat / per-mile / free).
  "delivery_fee_type",
]);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Constant-time-ish string compare to make brute-forcing tokens harder.
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const { action, id, token, patch } = body ?? {};
  if (typeof id !== "string" || typeof token !== "string" || token.length < 16) {
    return json({ error: "missing_or_invalid_id_token" }, 400);
  }

  // Fetch the row (service role bypasses RLS). Only draft + unclaimed rows
  // that still hold a token are eligible.
  const { data: row, error: readErr } = await admin
    .from("listings")
    .select("*")
    .eq("id", id)
    .single();

  if (readErr || !row) return json({ error: "not_found" }, 404);
  if (row.host_id) return json({ error: "already_claimed" }, 403);
  if (row.status !== "draft") return json({ error: "not_a_draft" }, 403);
  if (!row.guest_draft_token || !safeEqual(row.guest_draft_token, token)) {
    return json({ error: "invalid_token" }, 403);
  }

  if (action === "get") {
    return json({ listing: row });
  }

  if (action === "update") {
    if (!patch || typeof patch !== "object") return json({ error: "missing_patch" }, 400);
    const clean: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(patch)) {
      if (PATCH_ALLOWLIST.has(k)) clean[k] = v;
    }
    if (Object.keys(clean).length === 0) return json({ error: "empty_patch" }, 400);

    const { data, error } = await admin
      .from("listings")
      .update(clean)
      .eq("id", id)
      .eq("guest_draft_token", token) // belt & braces
      .select("*")
      .single();
    if (error) return json({ error: error.message }, 400);
    return json({ listing: data });
  }

  if (action === "claim") {
    // Claiming requires a real signed-in user — verify the JWT in-code.
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "unauthenticated" }, 401);
    }
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const jwt = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await userClient.auth.getClaims(jwt);
    if (claimsErr || !claims?.claims?.sub) return json({ error: "unauthenticated" }, 401);
    const uid = claims.claims.sub as string;

    const clean: Record<string, unknown> = { host_id: uid, guest_draft_token: null };
    if (patch && typeof patch === "object") {
      for (const [k, v] of Object.entries(patch)) {
        if (PATCH_ALLOWLIST.has(k)) clean[k] = v;
      }
    }

    const { data, error } = await admin
      .from("listings")
      .update(clean)
      .eq("id", id)
      .eq("guest_draft_token", token)
      .is("host_id", null)
      .select("*")
      .single();
    if (error) return json({ error: error.message }, 400);
    return json({ listing: data });
  }

  return json({ error: "unknown_action" }, 400);
});
