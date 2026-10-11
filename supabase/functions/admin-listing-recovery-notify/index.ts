/**
 * Admin-only: send a Customer Success follow-up to the owner of a listing whose
 * draft was consolidated after the "List with Vendi" duplicate-draft issue.
 *
 * Protected by the shared secret header (`x-admin-secret`), the same pattern as
 * admin-complimentary-boost-notify: there is no browser session for
 * server-initiated sends. The send itself goes through the canonical
 * transactional helper, so suppression, idempotency, and email_send_log
 * auditing behave exactly like every other app email.
 *
 * This function NEVER changes the listing — it only reads it and emails the owner.
 *
 * POST { "listing_id": "<uuid>", "asset_summary"?: string, "asking_price"?: string }
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { corsHeaders, jsonError, jsonResponse, unknownErrorResponse } from "../_shared/jsonError.ts";
import { sendTransactionalEmailInternal } from "../_shared/invokeTransactionalEmail.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const expected = Deno.env.get("ADMIN_NOTIFY_SECRET") ?? "";
    const provided = req.headers.get("x-admin-secret") ?? "";
    if (!expected || provided !== expected) {
      return jsonError(401, "unauthorized", "Not authorized.");
    }

    const body = await req.json().catch(() => ({}));
    const listingId = body?.listing_id ? String(body.listing_id) : "";
    if (!listingId) return jsonError(400, "missing_fields", "listing_id is required.");

    const assetSummary = typeof body?.asset_summary === "string" ? body.asset_summary.slice(0, 160) : undefined;
    const askingPrice = typeof body?.asking_price === "string" ? body.asking_price.slice(0, 40) : undefined;

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const { data: listing } = await admin
      .from("listings")
      .select("id, title, cover_image_url, host_id, status")
      .eq("id", listingId)
      .maybeSingle();
    if (!listing) return jsonError(404, "not_found", "Listing not found.");

    const { data: profile } = await admin
      .from("profiles")
      .select("email, full_name")
      .eq("id", listing.host_id)
      .maybeSingle();
    if (!profile?.email) return jsonError(400, "no_email", "Owner has no email on file.");

    const fullName = (profile.full_name ?? "").trim();
    const firstName = fullName.length >= 2 ? fullName.split(/\s+/)[0] : undefined;

    const result = await sendTransactionalEmailInternal({
      templateName: "listing-draft-consolidated",
      recipientEmail: profile.email,
      idempotencyKey: `listing-draft-consolidated-${listing.id}`,
      templateData: {
        firstName,
        listingTitle: listing.title,
        listingId: listing.id,
        coverImageUrl: listing.cover_image_url ?? undefined,
        assetSummary,
        askingPrice,
      },
      metadata: { reason: "vendi_duplicate_draft_consolidation", listing_status: listing.status },
    });

    if (!result.ok) {
      return jsonError(502, "send_failed", `Email send failed (${result.status}): ${result.body}`);
    }

    return jsonResponse(200, {
      ok: true,
      sent_to: profile.email,
      listing_id: listing.id,
      result: JSON.parse(result.body),
    });
  } catch (err) {
    return unknownErrorResponse(err);
  }
});
