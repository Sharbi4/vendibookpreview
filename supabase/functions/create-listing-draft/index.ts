import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3.23.8";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const BodySchema = z.object({
  mode: z.enum(["rent", "sale"]),
  category: z.enum(["food_truck", "food_trailer", "ghost_kitchen", "vendor_lot", "vendor_space"]),
  location: z.string().trim().max(255).optional().nullable(),
  city: z.string().trim().max(120).optional().nullable(),
  state: z.string().trim().max(40).optional().nullable(),
  zipCode: z.string().trim().max(20).optional().nullable(),
  latitude: z.number().finite().optional().nullable(),
  longitude: z.number().finite().optional().nullable(),
});

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return json({ error: "invalid_request", details: parsed.error.flatten().fieldErrors }, 400);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "unauthenticated" }, 401);

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await userClient.auth.getUser(token);
    const user = userData.user;
    if (userError || !user?.id) return json({ error: "unauthenticated" }, 401);

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const { mode, category, location, city, state, zipCode, latitude, longitude } = parsed.data;
    const normalizedLocation = location || [city, state].filter(Boolean).join(", ") || null;
    const fulfillmentType = category === "ghost_kitchen" || category === "vendor_lot" || category === "vendor_space"
      ? "on_site"
      : "pickup";

    // Guarantee a profiles row exists BEFORE any downstream code (identity
    // gate, quota, listing insert) reads it. If the auth trigger is missing
    // or slow, this prevents a null-profile lockout where the user can never
    // publish. Idempotent via onConflict.
    const { error: profileError } = await admin
      .from("profiles")
      .upsert(
        {
          id: user.id,
          email: user.email ?? null,
          full_name:
            (user.user_metadata as { full_name?: string } | null)?.full_name ?? null,
        },
        { onConflict: "id", ignoreDuplicates: false },
      );
    if (profileError) {
      console.error("[create-listing-draft] profile upsert failed", profileError.message);
      return json({ error: `We couldn't prepare your account: ${profileError.message}` }, 400);
    }

    // Granting the host role is best-effort: a duplicate or transient failure
    // must never block someone from starting a listing.
    const { error: roleError } = await admin
      .from("user_roles")
      .upsert({ user_id: user.id, role: "host" }, { onConflict: "user_id,role" });
    if (roleError) console.error("[create-listing-draft] role upsert failed", roleError.message);

    const { data: listing, error: listingError } = await admin
      .from("listings")
      .insert({
        host_id: user.id,
        guest_draft_token: null,
        mode,
        category,
        status: "draft",
        title: "",
        description: "",
        fulfillment_type: fulfillmentType,
        address: normalizedLocation,
        pickup_location_text: normalizedLocation,
        city: city || null,
        state: state || null,
        postal_code: zipCode || null,
        latitude: latitude ?? null,
        longitude: longitude ?? null,
        // accept_paypal_checkout is NOT NULL in the database — never write null.
        accept_paypal_checkout: mode === "sale",
        accept_cash_payment: false,
      })
      .select("id")
      .single();

    if (listingError) {
      console.error("[create-listing-draft] insert failed", listingError);
      return json(
        { error: `We couldn't start your draft: ${listingError.message}`, code: listingError.code ?? null },
        400,
      );
    }

    return json({ id: listing.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    return json({ error: message }, 500);
  }
});