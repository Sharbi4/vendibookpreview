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
  /**
   * Durable per-session idempotency key for the "List with Vendi" builder.
   * One key == one listing row for this owner, forever. Repeated effects,
   * remounts, StrictMode double-invocations, second tabs, reloads mid-create
   * and auth redirects all resolve to the same id instead of a new draft.
   */
  sessionKey: z.string().trim().min(8).max(80).optional().nullable(),
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

    const { mode, category, location, city, state, zipCode, latitude, longitude, sessionKey } = parsed.data;
    const normalizedLocation = location || [city, state].filter(Boolean).join(", ") || null;
    const fulfillmentType = category === "ghost_kitchen" || category === "vendor_lot" || category === "vendor_space"
      ? "on_site"
      : "pickup";

    // IDEMPOTENCY: a session key that already produced a row always returns
    // that same row. This is the server-authoritative guard that replaced the
    // browser-local draftId as the source of truth for listing identity.
    if (sessionKey) {
      const { data: existing } = await admin
        .from("listings")
        .select("id")
        .eq("host_id", user.id)
        .eq("vendi_session_key", sessionKey)
        .maybeSingle();
      if (existing?.id) return json({ id: existing.id, resumed: true });
    }


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
        vendi_session_key: sessionKey ?? null,
        // accept_paypal_checkout is NOT NULL in the database — never write null.
        accept_paypal_checkout: mode === "sale",
        accept_cash_payment: false,
      })
      .select("id")
      .single();

    if (listingError) {
      // Two tabs raced the same session key: the partial unique index rejected
      // the loser. Return the winner's row instead of surfacing an error.
      if (sessionKey && listingError.code === "23505") {
        const { data: winner } = await admin
          .from("listings")
          .select("id")
          .eq("host_id", user.id)
          .eq("vendi_session_key", sessionKey)
          .maybeSingle();
        if (winner?.id) return json({ id: winner.id, resumed: true });
      }
      console.error("[create-listing-draft] insert failed", listingError);
      return json(
        { error: `We couldn't start your draft: ${listingError.message}`, code: listingError.code ?? null },
        400,
      );
    }

    // Telemetry only — never merges or deletes anything. Surfaces same-owner
    // draft bursts (the Earl Wigger pattern) so admins can spot regressions.
    if (sessionKey) {
      const since = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      const { count } = await admin
        .from("listings")
        .select("id", { count: "exact", head: true })
        .eq("host_id", user.id)
        .eq("status", "draft")
        .not("vendi_session_key", "is", null)
        .gte("created_at", since);
      if ((count ?? 0) > 1) {
        console.warn(`[create-listing-draft] vendi_draft_burst host=${user.id} drafts_30m=${count}`);
        await admin.from("analytics_events").insert({
          event_name: "vendi_draft_burst",
          event_category: "Supply",
          user_id: user.id,
          listing_id: listing.id,
          metadata: { drafts_last_30m: count },
        } as never);

      }
    }

    return json({ id: listing.id, resumed: false });

  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    return json({ error: message }, 500);
  }
});