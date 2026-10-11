/**
 * Admin-only: Customer Success follow-up for sellers whose PayPal checkout
 * failed before the capture bug was fixed.
 *
 * Reads the recipient's listings and picks the right message:
 *   - published listing  -> "boost" variant (offer the Featured Boost again)
 *   - no published listing -> "publish" variant (prompt them to publish first)
 *
 * Protected by the shared `x-admin-secret` header, same as the other
 * server-initiated Customer Success senders. Never mutates listings or payments.
 *
 * POST { "email": "seller@example.com" }
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
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!email) return jsonError(400, "missing_fields", "email is required.");

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const { data: profile } = await admin
      .from("profiles")
      .select("id, email, full_name")
      .ilike("email", email)
      .maybeSingle();
    if (!profile?.email) return jsonError(404, "not_found", "No profile with that email.");

    const { data: listings } = await admin
      .from("listings")
      .select("id, title, status, cover_image_url, featured_enabled, featured_expires_at, updated_at")
      .eq("host_id", profile.id)
      .order("updated_at", { ascending: false })
      .limit(20);

    const rows = listings ?? [];
    const published = rows.filter((l) => l.status === "published");
    const now = Date.now();
    const alreadyBoosted = published.find(
      (l) => l.featured_enabled && l.featured_expires_at && new Date(l.featured_expires_at).getTime() > now,
    );

    if (alreadyBoosted) {
      return jsonResponse(200, {
        ok: true,
        skipped: "already_boosted",
        listing_id: alreadyBoosted.id,
        featured_expires_at: alreadyBoosted.featured_expires_at,
      });
    }

    const target = published[0] ?? null;
    const variant = target ? "boost" : "publish";
    const fullName = (profile.full_name ?? "").trim();
    const firstName = fullName.length >= 2 ? fullName.split(/\s+/)[0] : undefined;

    const result = await sendTransactionalEmailInternal({
      templateName: "checkout-recovery-cs",
      recipientEmail: profile.email,
      idempotencyKey: `checkout-recovery-${profile.id}-${variant}`,
      templateData: {
        firstName,
        variant,
        listingTitle: target?.title ?? undefined,
        listingId: target?.id ?? undefined,
        coverImageUrl: target?.cover_image_url ?? undefined,
      },
      metadata: { reason: "paypal_capture_fix_followup", variant },
    });

    if (!result.ok) {
      return jsonError(502, "send_failed", `Email send failed (${result.status}): ${result.body}`);
    }

    return jsonResponse(200, {
      ok: true,
      sent_to: profile.email,
      variant,
      listing_id: target?.id ?? null,
      result: JSON.parse(result.body),
    });
  } catch (err) {
    return unknownErrorResponse(err);
  }
});
