/**
 * Admin-only: email a customer a secure, single-use link to set their own
 * Vendibook password, optionally referencing a listing that is waiting for them.
 *
 * Protected by the shared `x-admin-secret` header (ADMIN_OPS_TOKEN) — there is
 * no browser session for a server-initiated support action.
 *
 * This endpoint NEVER creates, returns, logs, or emails a plaintext password.
 * It generates a Supabase recovery link so the customer chooses their own.
 * It never modifies the listing.
 *
 * POST { "email": "...", "listing_id"?: "<uuid>", "first_name"?: "..." }
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { corsHeaders, jsonError, jsonResponse, unknownErrorResponse } from "../_shared/jsonError.ts";
import { sendTransactionalEmailInternal } from "../_shared/invokeTransactionalEmail.ts";

const SITE_URL = Deno.env.get("SITE_URL") || "https://vendibook.com";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const expected = Deno.env.get("ADMIN_OPS_TOKEN") ?? "";
    const provided = req.headers.get("x-admin-secret") ?? "";
    if (!expected || provided !== expected) {
      return jsonError(401, "unauthorized", "Not authorized.");
    }

    const body = await req.json().catch(() => ({}));
    const email = String(body?.email ?? "").trim().toLowerCase();
    const listingId = body?.listing_id ? String(body.listing_id) : "";
    if (!email || !email.includes("@")) return jsonError(400, "missing_fields", "A valid email is required.");

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const { data: profile } = await admin
      .from("profiles")
      .select("id, full_name")
      .eq("email", email)
      .maybeSingle();
    if (!profile?.id) return jsonError(404, "not_found", "No account with that email.");

    let listingTitle: string | null = null;
    let listingStatus: string | null = null;
    if (listingId) {
      const { data: listing } = await admin
        .from("listings")
        .select("id, title, status, host_id")
        .eq("id", listingId)
        .maybeSingle();
      if (!listing) return jsonError(404, "not_found", "Listing not found.");
      if (listing.host_id !== profile.id) return jsonError(400, "owner_mismatch", "That listing belongs to someone else.");
      listingTitle = listing.title;
      listingStatus = listing.status;
    }

    const { data: recovery, error: recoveryErr } = await admin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo: `${SITE_URL}/reset-password` },
    });
    if (recoveryErr || !recovery?.properties?.action_link) {
      return jsonError(500, "access_setup_failed", "Could not create a secure sign-in link.");
    }
    const setPasswordUrl = recovery.properties.action_link;

    const fullName = String(body?.first_name ?? profile.full_name ?? "").trim();
    const firstName = fullName ? fullName.split(/\s+/)[0] : "";

    const details = [
      { label: "Sign-in email", value: email },
      ...(listingTitle ? [{ label: "Listing", value: listingTitle }] : []),
      ...(listingStatus ? [{ label: "Status", value: listingStatus === "published" ? "Live" : "Draft — ready to publish" }] : []),
    ];

    const result = await sendTransactionalEmailInternal({
      templateName: "generic-notice",
      recipientEmail: email,
      idempotencyKey: `account-access-${profile.id}-${listingId || "none"}-${new Date().toISOString().slice(0, 10)}`,
      templateData: {
        subject: listingTitle
          ? "Your Vendibook listing is ready to publish"
          : "Set your Vendibook password",
        preview: "Set your password and publish your listing",
        kicker: "Vendibook Customer Success",
        heading: listingTitle ? "Your listing is ready to publish" : "Set your Vendibook password",
        greeting: firstName ? `Hi ${firstName},` : "Hi there,",
        paragraphs: [
          listingTitle
            ? `Your listing “${listingTitle}” is saved in your Vendibook account as a draft. Everything you sent us is already in place — review it and hit Publish whenever you're ready.`
            : "Your Vendibook account is ready — you just need to set a password.",
          "For your security we don't email passwords. Use the button below to set your own password; the link is single-use and expires shortly.",
          "Once you're signed in, open the listing from your dashboard, check the details and photos, then publish.",
        ],
        details,
        alert: {
          tone: "info",
          title: "One secure step",
          body: "The button below signs you in and takes you straight to choosing a password.",
        },
        ctaLabel: "Set my password",
        ctaUrl: setPasswordUrl,
        secondaryCtaLabel: "Go to my dashboard",
        secondaryCtaUrl: `${SITE_URL}/dashboard`,
        footnote: "If the link has expired, use “Forgot password” on the sign-in screen and we'll send a fresh one. — The Vendibook Customer Success Team",
      },
      metadata: { reason: "account_access_setup", listing_id: listingId || null },
    });

    if (!result.ok) {
      return jsonError(502, "send_failed", `Email send failed (${result.status}): ${result.body}`);
    }

    return jsonResponse(200, { ok: true, sent_to: email, listing_id: listingId || null, result: JSON.parse(result.body) });
  } catch (err) {
    return unknownErrorResponse(err);
  }
});
