import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { invokeTransactionalEmail } from '../_shared/invokeTransactionalEmail.ts'

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Admin-only: emails a listing's own host about free QR signage.
 * The recipient, name and listing title are always loaded server-side from
 * the listing — callers can never choose who receives the email or its text.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: userData, error: userError } = await admin.auth.getUser(token);
    if (userError || !userData.user) return json({ error: "Unauthorized" }, 401);

    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: userData.user.id, _role: "admin" });
    if (!isAdmin) return json({ error: "Forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const listingId = typeof body?.listingId === "string" ? body.listingId : "";
    if (!UUID.test(listingId)) return json({ error: "Valid listingId required" }, 400);

    const { data: listing } = await admin
      .from("listings")
      .select("id, title, host_id")
      .eq("id", listingId)
      .is("deleted_at", null)
      .maybeSingle();
    if (!listing?.host_id) return json({ error: "Listing not found" }, 404);

    const { data: host } = await admin
      .from("profiles")
      .select("email, first_name")
      .eq("id", listing.host_id)
      .maybeSingle();
    if (!host?.email) return json({ error: "Host email unavailable" }, 404);

    const firstName = host.first_name || "there";
    const { error } = await invokeTransactionalEmail({
      templateName: "support-reply",
      recipientEmail: host.email,
      idempotencyKey: `signage-addr-${listing.id}-${new Date().toISOString().slice(0, 10)}`,
      templateData: {
        name: firstName,
        subject: `Free QR signage for ${listing.title}`,
        message: `Hi ${firstName}, we'd love to ship you free QR signage for "${listing.title}". Reply with your shipping address and we'll get it on the way.`,
      },
    });
    if (error) throw error;
    return json({ success: true });
  } catch (e) {
    console.error("send-qr-signage-address-request error", e instanceof Error ? e.message : e);
    return json({ error: "Could not send the signage email" }, 500);
  }
});
