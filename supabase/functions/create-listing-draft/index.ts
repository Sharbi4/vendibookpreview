import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const BodySchema = z.object({
  mode: z.enum(["rent", "sale"]),
  category: z.enum(["food_truck", "food_trailer", "ghost_kitchen", "vendor_lot", "vendor_space"]),
  location: z.string().trim().max(255).optional().nullable(),
  city: z.string().trim().min(2).max(120),
  state: z.string().trim().min(2).max(40),
  zipCode: z.string().trim().regex(/^\d{5}$/),
  latitude: z.number().finite().min(-90).max(90).optional().nullable(),
  longitude: z.number().finite().min(-180).max(180).optional().nullable(),
  // Optional for compatibility with an already-open/cached pre-deploy client.
  // The current client always sends it.
  idempotencyKey: z.string().uuid().optional(),
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
    let requestBody: unknown;
    try {
      requestBody = await req.json();
    } catch {
      return json({ error: "invalid_request" }, 400);
    }
    const parsed = BodySchema.safeParse(requestBody);
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

    const {
      mode,
      category,
      city,
      state,
      zipCode,
      latitude,
      longitude,
      idempotencyKey,
    } = parsed.data;
    const requestKey = idempotencyKey ?? crypto.randomUUID();
    const normalizedLocation = [city, state].join(", ");
    const fulfillmentType = category === "ghost_kitchen" || category === "vendor_lot" || category === "vendor_space"
      ? "on_site"
      : "pickup";

    // Guarantee a profiles row exists BEFORE downstream code reads it. Insert
    // only: a draft retry must never overwrite an existing name or email with
    // null metadata from an older auth session.
    const { error: profileError } = await admin
      .from("profiles")
      .upsert(
        {
          id: user.id,
          email: user.email ?? null,
          full_name:
            (user.user_metadata as { full_name?: string } | null)?.full_name ?? null,
        },
        { onConflict: "id", ignoreDuplicates: true },
      );
    if (profileError) {
      console.error("[create-listing-draft] profile upsert failed", profileError.message);
      return json({ error: "We couldn't prepare your account. Please try again." }, 500);
    }

    // Granting the host role is best-effort: a duplicate or transient failure
    // must never block someone from starting a listing.
    const { error: roleError } = await admin
      .from("user_roles")
      .upsert({ user_id: user.id, role: "host" }, { onConflict: "user_id,role" });
    if (roleError) console.error("[create-listing-draft] role upsert failed", roleError.message);

    // The RPC owns the transaction and serializes by (user, request key), so
    // timeouts, retries, and double-clicks all return one durable draft.
    const { data: listing, error: listingError } = await admin
      .rpc("create_listing_draft_idempotent", {
        p_user_id: user.id,
        p_idempotency_key: requestKey,
        p_mode: mode,
        p_category: category,
        p_fulfillment_type: fulfillmentType,
        p_pickup_location_text: normalizedLocation,
        p_city: city,
        p_state: state,
        p_postal_code: zipCode,
        p_latitude: latitude ?? null,
        p_longitude: longitude ?? null,
      })
      .single();

    if (listingError) {
      console.error("[create-listing-draft] insert failed", listingError);
      return json({ error: "We couldn't start your draft. Please try again." }, 500);
    }

    return json({ id: listing.id, replayed: listing.replayed });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    return json({ error: message }, 500);
  }
});
