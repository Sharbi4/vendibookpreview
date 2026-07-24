import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const log = (step: string, details?: unknown) =>
  console.log(`[ADMIN-GRANT] ${step}${details ? " - " + JSON.stringify(details) : ""}`);

interface Body {
  product_slug: string;
  target_user_id: string;
  listing_id?: string;
  note?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: uErr } = await supabase.auth.getUser(token);
    if (uErr) throw new Error(`Authentication error: ${uErr.message}`);
    const user = userData.user;
    if (!user) throw new Error("Not authenticated");

    const { data: isAdmin } = await supabase.rpc("is_admin", { user_id: user.id });
    if (!isAdmin) return new Response(JSON.stringify({ error: "Admin only" }), { status: 403, headers: corsHeaders });

    const body = (await req.json()) as Body;
    if (!body.product_slug || !body.target_user_id) throw new Error("Missing product_slug or target_user_id");

    const { data: product, error: pErr } = await supabase
      .from("monetization_products")
      .select("*")
      .eq("slug", body.product_slug)
      .maybeSingle();
    if (pErr) throw pErr;
    if (!product) throw new Error("Product not found");

    const idempotencyKey = `grant-${user.id}-${body.target_user_id}-${product.id}-${body.listing_id ?? "none"}-${Date.now()}`;

    const { data: purchase, error: insErr } = await supabase
      .from("monetization_purchases")
      .insert({
        user_id: body.target_user_id,
        product_id: product.id,
        listing_id: body.listing_id ?? null,
        amount_cents: 0,
        currency: product.currency,
        status: "fulfilled",
        fulfillment_status: "granted",
        fulfillment_notes: body.note ?? `Complimentary grant by admin ${user.email}`,
        idempotency_key: idempotencyKey,
        metadata: { source: "admin_grant", granted_by: user.id },
        paid_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (insErr) throw insErr;

    // Activate a listing promotion if the product supports it
    if (body.listing_id && product.promo_type && product.duration_days) {
      const starts = new Date();
      const ends = new Date(starts.getTime() + product.duration_days * 24 * 60 * 60 * 1000);
      await supabase.from("listing_promotions").insert({
        listing_id: body.listing_id,
        product_id: product.id,
        purchase_id: purchase.id,
        promo_type: product.promo_type,
        starts_at: starts.toISOString(),
        ends_at: ends.toISOString(),
        active: true,
      });
    }

    await supabase.from("notifications").insert({
      user_id: body.target_user_id,
      type: "purchase",
      title: `${product.name} granted 🎁`,
      message: "A Vendibook admin has granted you complimentary access.",
      link: body.listing_id ? `/listing/${body.listing_id}` : "/dashboard",
    });

    log("granted", { purchase: purchase.id });
    return new Response(JSON.stringify({ ok: true, purchase_id: purchase.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log("ERROR", { msg });
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
