/**
 * Admin-only: send the "complimentary-featured-boost" email to the host of a
 * listing that was granted a free Featured Boost.
 *
 * Protected by a shared secret header (`x-admin-secret`) because this project
 * has no browser session for server-initiated sends; the actual email send is
 * performed server-to-server with the service role via the canonical helper.
 *
 * POST { "listing_id": "<uuid>" }
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { corsHeaders, jsonError, jsonResponse, unknownErrorResponse } from "../_shared/jsonError.ts";
import { sendTransactionalEmailInternal } from "../_shared/invokeTransactionalEmail.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // Either the admin notify secret, or the shared server-to-server secret
    // that scheduled jobs and database-initiated calls use.
    const adminSecret = Deno.env.get("ADMIN_NOTIFY_SECRET") ?? "";
    const sweepSecret = Deno.env.get("RELEASE_SWEEP_SECRET") ?? "";
    const providedAdmin = req.headers.get("x-admin-secret") ?? "";
    const providedCron = req.headers.get("x-cron-secret") ?? "";
    const authorized = (!!adminSecret && providedAdmin === adminSecret) ||
      (!!sweepSecret && providedCron === sweepSecret);
    if (!authorized) {
      return jsonError(401, "unauthorized", "Not authorized.");
    }

    const body = await req.json().catch(() => ({}));
    const listingId = body?.listing_id ? String(body.listing_id) : "";
    if (!listingId) return jsonError(400, "missing_fields", "listing_id is required.");

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const { data: listing } = await admin
      .from("listings")
      .select("id, title, cover_image_url, host_id, featured_enabled, featured_at, featured_expires_at")
      .eq("id", listingId)
      .maybeSingle();
    if (!listing) return jsonError(404, "not_found", "Listing not found.");
    if (!listing.featured_enabled || !listing.featured_expires_at) {
      return jsonError(400, "not_featured", "That listing is not currently featured.");
    }

    const { data: profile } = await admin
      .from("profiles")
      .select("email, full_name")
      .eq("id", listing.host_id)
      .maybeSingle();
    if (!profile?.email) return jsonError(400, "no_email", "Host has no email on file.");

    const fullName = (profile.full_name ?? "").trim();
    const firstName = fullName.length >= 2 ? fullName.split(/\s+/)[0] : undefined;

    const expiresAtFormatted = new Date(listing.featured_expires_at).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    });

    // Length of this grant (e.g. a 14-day trial), not a fixed 30 days.
    const startedAt = listing.featured_at ? new Date(listing.featured_at).getTime() : Date.now();
    const durationDays = Math.max(
      1,
      Math.round((new Date(listing.featured_expires_at).getTime() - startedAt) / 86_400_000),
    );

    const result = await sendTransactionalEmailInternal({
      templateName: "complimentary-featured-boost",
      recipientEmail: profile.email,
      // One email per grant: a later grant on the same listing gets its own.
      idempotencyKey: `complimentary-boost-${listing.id}-${listing.featured_at ?? listing.featured_expires_at}`,
      templateData: {
        firstName,
        listingTitle: listing.title,
        listingId: listing.id,
        listingImageUrl: listing.cover_image_url ?? undefined,
        expiresAtFormatted,
        durationDays,
      },
    });

    if (!result.ok) {
      return jsonError(502, "send_failed", `Email send failed (${result.status}): ${result.body}`);
    }

    return jsonResponse(200, { ok: true, sent_to: profile.email, listing_id: listing.id });
  } catch (err) {
    return unknownErrorResponse(err);
  }
});
