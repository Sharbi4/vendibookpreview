/**
 * Admin-only concierge provisioning: create (or reuse) a customer account and
 * seed a listing on their behalf, then email them access details.
 *
 * Protected by the shared `x-admin-secret` header — there is no browser
 * session for a server-initiated concierge action.
 *
 * POST { email, full_name?, listing: { explicitly customer-provided fields } }
 *
 * This endpoint never accepts or returns a plaintext password. New customers
 * receive a one-time recovery link so they can choose their own password.
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { corsHeaders, jsonError, jsonResponse, unknownErrorResponse } from "../_shared/jsonError.ts";
import { sendTransactionalEmailInternal } from "../_shared/invokeTransactionalEmail.ts";
import { buildConciergeListing, randomUnsharedPassword } from "./provisioning.ts";

const SITE_URL = Deno.env.get("SITE_URL") || "https://vendibook.com";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const expected = Deno.env.get("ADMIN_NOTIFY_SECRET") ?? "";
    const provided = req.headers.get("x-admin-secret") ?? "";
    if (!expected || provided !== expected) {
      return jsonError(401, "unauthorized", "Not authorized.");
    }

    const body = await req.json().catch(() => ({}));
    const email = String(body?.email ?? "").trim().toLowerCase();
    const fullName = String(body?.full_name ?? "").trim() || null;
    const listingInput = (body?.listing ?? null) as Record<string, unknown> | null;
    if (!email || !email.includes("@")) return jsonError(400, "missing_fields", "A valid email is required.");
    if (!listingInput) return jsonError(400, "missing_fields", "listing payload is required.");

    let listingPayload: ReturnType<typeof buildConciergeListing>;
    try {
      listingPayload = buildConciergeListing(listingInput);
    } catch (error) {
      return jsonError(400, "invalid_listing", error instanceof Error ? error.message : "Invalid listing data.");
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    // --- Resolve or create the account -------------------------------------
    let userId: string | null = null;
    let createdAccount = false;
    let passwordSetupUrl: string | null = null;

    const { data: existingProfile } = await admin
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existingProfile?.id) {
      userId = existingProfile.id;
    } else {
      // The random credential is never shared, returned, persisted by this
      // function, or logged. The customer chooses their password through the
      // single-use recovery link generated below.
      const unsharedPassword = randomUnsharedPassword();
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        password: unsharedPassword,
        email_confirm: true,
        user_metadata: fullName ? { full_name: fullName } : {},
      });
      if (createErr || !created?.user?.id) {
        // The account may already exist in auth without a profile row.
        return jsonError(400, "create_failed", createErr?.message ?? "Could not create the account.");
      }
      userId = created.user.id;
      createdAccount = true;

      const { data: recovery, error: recoveryErr } = await admin.auth.admin.generateLink({
        type: "recovery",
        email,
        options: { redirectTo: `${SITE_URL}/reset-password` },
      });
      if (recoveryErr || !recovery?.properties?.action_link) {
        await admin.auth.admin.deleteUser(userId);
        return jsonError(500, "access_setup_failed", "Could not create a secure first-login link.");
      }
      passwordSetupUrl = recovery.properties.action_link;
    }

    const { error: profileErr } = await admin.from("profiles").upsert(
      { id: userId, email, ...(fullName ? { full_name: fullName } : {}) },
      { onConflict: "id" },
    );
    if (profileErr) return jsonError(500, "profile_failed", "Could not prepare the customer profile.");

    const { error: roleErr } = await admin
      .from("user_roles")
      .upsert({ user_id: userId, role: "host" }, { onConflict: "user_id,role" });
    if (roleErr) return jsonError(500, "role_failed", "Could not prepare dashboard access.");

    // --- Seed the listing ---------------------------------------------------
    const { data: listing, error: listingErr } = await admin
      .from("listings")
      .insert({ ...listingPayload, host_id: userId })
      .select("id, status, title")
      .single();

    if (listingErr) {
      return jsonError(400, "listing_failed", listingErr.message);
    }

    // --- Notify the customer -----------------------------------------------
    const paragraphs = [
      `Hi${fullName ? ` ${fullName.split(/\s+/)[0]}` : ""} — we built your Vendibook listing for you from the photos and details you shared.`,
      createdAccount
        ? "We created your Vendibook account. Use the secure button below to choose your password and sign in."
        : "It's been added to your existing Vendibook account. Sign in with your existing password.",
      "Review the listing we prepared, add anything that was not explicitly provided, and publish it when it looks right.",
    ];

    const details = [
      { label: "Listing", value: String(listing.title || "Your listing") },
      { label: "Status", value: listing.status === "published" ? "Live" : "Ready to review" },
      { label: "Sign in email", value: email },
    ];

    const listingUrl = `${SITE_URL}/edit-listing/${listing.id}`;

    const emailResult = await sendTransactionalEmailInternal({
      templateName: "generic-notice",
      recipientEmail: email,
      idempotencyKey: `concierge-listing-${listing.id}`,
      templateData: {
        preview: "Your Vendibook listing is ready",
        kicker: "Concierge setup",
        heading: "Your listing is ready",
        paragraphs,
        details,
        ctaLabel: createdAccount ? "Choose my password" : "Review my listing",
        ctaUrl: passwordSetupUrl || listingUrl,
        secondaryCtaLabel: createdAccount ? "Review my listing" : "Open my dashboard",
        secondaryCtaUrl: createdAccount ? listingUrl : `${SITE_URL}/dashboard`,
        footnote: createdAccount
          ? "Your password link is private and intended only for you. If it expires, use Forgot password on the sign-in page."
          : "You can also find this listing from the Listings section of your dashboard.",
      },
      metadata: { source: "admin-provision-customer-listing", listing_id: listing.id },
    });

    return jsonResponse(200, {
      user_id: userId,
      created_account: createdAccount,
      secure_password_setup_issued: Boolean(passwordSetupUrl),
      listing_id: listing.id,
      listing_status: listing.status,
      email_ok: emailResult.ok,
      email_body: emailResult.body,
    });
  } catch (error) {
    return unknownErrorResponse(error);
  }
});
