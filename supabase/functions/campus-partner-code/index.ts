/**
 * Checks a Campus Partner code for the signed-in buyer before payment.
 * Display only: paypal-create-order and square-rental-payment re-validate and
 * reserve the redemption immediately before any order or charge is created.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { corsHeaders, jsonError, jsonResponse, unknownErrorResponse } from "../_shared/jsonError.ts";
import { loadPartnerCode, normalizePartnerCode, PARTNER_MESSAGES, partnerCodeStatus, resolvePartnerCredit } from "../_shared/campusPartner.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonError(405, "method_not_allowed", "POST required.");
  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } });
    const authHeader = req.headers.get("Authorization") ?? "";
    const { data: userData } = await admin.auth.getUser(authHeader.replace("Bearer ", ""));
    const user = userData?.user;
    if (!user) return jsonError(401, "unauthenticated", "Please sign in to use a Campus Partner code.");

    const body = await req.json().catch(() => ({}));
    const code = normalizePartnerCode(body?.code);
    const kind = body?.kind === "purchase" ? "purchase" : body?.kind === "rental" ? "rental" : null;
    const listingId = String(body?.listing_id ?? "");
    if (!code || !kind || !UUID_RE.test(listingId)) return jsonError(400, "missing_fields", "Enter a code.");

    const { data: listing } = await admin.from("listings").select("id, host_id, price_sale").eq("id", listingId).maybeSingle();
    if (!listing) return jsonError(404, "not_found", "Listing not found.");
    if (listing.host_id === user.id) return jsonResponse(200, { valid: false, reason: "not_eligible", message: PARTNER_MESSAGES.not_eligible });

    if (kind === "purchase") {
      const res = await resolvePartnerCredit(admin, {
        code, userId: user.id, kind,
        eligibleBaseCents: Math.round(Number(listing.price_sale ?? 0) * 100),
        isCash: body?.payment_method === "cash",
      });
      return jsonResponse(200, res.ok
        ? { valid: true, code: res.row!.code, partner_name: res.row!.partner_name, credit_cents: res.creditCents }
        : { valid: false, reason: res.reason, message: res.message, partner_name: res.row?.partner_name ?? null });
    }

    // Rentals: the amount depends on the server booking quote, so only the
    // code and the buyer's remaining uses are checked here.
    const row = await loadPartnerCode(admin, code);
    const status = partnerCodeStatus(row);
    if (status) return jsonResponse(200, { valid: false, reason: status, message: PARTNER_MESSAGES[status] });
    const { data: used } = await admin.rpc("partner_code_active_uses", {
      p_code_id: row!.id, p_user: user.id, p_kind: "rental", p_exclude_record: null,
    });
    if (Number(used ?? 0) >= Number(row!.rental_uses_per_user ?? 0)) {
      return jsonResponse(200, { valid: false, reason: "limit_reached", message: PARTNER_MESSAGES.limit_reached });
    }
    return jsonResponse(200, {
      valid: true, code: row!.code, partner_name: row!.partner_name,
      rental_percent: Number(row!.rental_percent), rental_cap_cents: row!.rental_cap_cents,
    });
  } catch (err) {
    return unknownErrorResponse(err);
  }
});
