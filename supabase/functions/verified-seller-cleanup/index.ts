import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { corsHeaders, jsonError, jsonResponse, unknownErrorResponse } from "../_shared/jsonError.ts";
import { cleanupAbandonedAuthorizations } from "../_shared/verifiedSeller.ts";

/**
 * Voids Verified Seller PayPal authorizations abandoned for more than 24h so
 * no seller is left with an indefinite pending hold.
 *
 * Idempotent and safe to run on any cadence. Invoked by pg_cron (see the
 * scheduling step in the release notes) or manually by an admin.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    // Either the scheduler's service-role key or a signed-in admin may run it.
    const authHeader = req.headers.get("Authorization")?.replace("Bearer ", "") ?? "";
    const isService = authHeader === (Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "\u0000");

    if (!isService) {
      const { data: userData } = await admin.auth.getUser(authHeader);
      const uid = userData?.user?.id;
      if (!uid) return jsonError(401, "unauthenticated", "Please sign in to continue.");
      const { data: isAdmin } = await admin.rpc("has_role", { _user_id: uid, _role: "admin" });
      if (!isAdmin) return jsonError(403, "forbidden", "Admins only.");
    }

    const body = await req.json().catch(() => ({}));
    const hours = Number(body?.hours) > 0 ? Number(body.hours) : undefined;

    const result = await cleanupAbandonedAuthorizations(admin, hours);
    return jsonResponse(200, { ok: true, ...result });
  } catch (err) {
    return unknownErrorResponse(err);
  }
});
