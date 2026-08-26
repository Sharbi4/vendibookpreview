/**
 * Admin-only concierge provisioning: create (or reuse) a customer account and
 * seed a listing on their behalf, then email them access details.
 *
 * Protected by the shared `x-admin-secret` header — there is no browser
 * session for a server-initiated concierge action.
 *
 * POST {
 *   email, full_name?, temp_password?,
 *   listing: { ...allowed listing columns }
 * }
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { corsHeaders, jsonError, jsonResponse, unknownErrorResponse } from "../_shared/jsonError.ts";
import { sendTransactionalEmailInternal } from "../_shared/invokeTransactionalEmail.ts";

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

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    // --- Resolve or create the account -------------------------------------
    let userId: string | null = null;
    let createdAccount = false;
    let tempPassword: string | null = null;

    const { data: existingProfile } = await admin
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existingProfile?.id) {
      userId = existingProfile.id;
    } else {
      tempPassword = String(body?.temp_password ?? "").trim() || crypto.randomUUID().slice(0, 12);
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: fullName ? { full_name: fullName } : {},
      });
      if (createErr || !created?.user?.id) {
        // The account may already exist in auth without a profile row.
        return jsonError(400, "create_failed", createErr?.message ?? "Could not create the account.");
      }
      userId = created.user.id;
      createdAccount = true;
    }

    await admin.from("profiles").upsert(
      { id: userId, email, ...(fullName ? { full_name: fullName } : {}) },
      { onConflict: "id" },
    );
    await admin.from("user_roles").upsert({ user_id: userId, role: "host" }, { onConflict: "user_id,role" });

    // --- Seed the listing ---------------------------------------------------
    const { data: listing, error: listingErr } = await admin
      .from("listings")
      .insert({ ...listingInput, host_id: userId })
      .select("id, status, title")
      .single();

    if (listingErr) {
      return jsonError(400, "listing_failed", listingErr.message);
    }

    // --- Notify the customer -----------------------------------------------
    const paragraphs = [
      `Hi${fullName ? ` ${fullName.split(/\s+/)[0]}` : ""} — we built your Vendibook listing for you from the photos and details you shared.`,
      createdAccount
        ? "We created your Vendibook account so it's ready when you sign in. Use the temporary password below and change it from your profile once you're in."
        : "It's been added to your existing Vendibook account.",
      "Open your dashboard to review the listing, add anything we missed, and publish it when it looks right.",
    ];

    const details = [
      { label: "Listing", value: String(listing.title || "Your listing") },
      { label: "Status", value: listing.status === "published" ? "Live" : "Ready to review" },
      { label: "Sign in email", value: email },
      ...(tempPassword ? [{ label: "Temporary password", value: tempPassword, mono: true }] : []),
    ];

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
        ctaLabel: "Open my dashboard",
        ctaUrl: `${SITE_URL}/dashboard`,
        footnote: tempPassword
          ? "For your security, please change this temporary password after your first sign-in."
          : undefined,
      },
      metadata: { source: "admin-provision-customer-listing", listing_id: listing.id },
    });

    return jsonResponse({
      user_id: userId,
      created_account: createdAccount,
      temp_password_issued: Boolean(tempPassword),
      listing_id: listing.id,
      listing_status: listing.status,
      email_ok: emailResult.ok,
      email_body: emailResult.body,
    });
  } catch (error) {
    return unknownErrorResponse(error);
  }
});
