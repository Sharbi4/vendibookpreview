// Records a party's handoff confirmation. When both parties confirm, marks funds_released.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } },
    );
    const { data: userData } = await userClient.auth.getUser();
    const user = userData?.user;
    if (!user) {
      return new Response(JSON.stringify({ error: "unauthenticated" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { protected_sale_id } = await req.json();
    if (!protected_sale_id) {
      return new Response(JSON.stringify({ error: "protected_sale_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { data: ps, error } = await admin
      .from("protected_sales")
      .select("*")
      .eq("id", protected_sale_id)
      .maybeSingle();
    if (error || !ps) {
      return new Response(JSON.stringify({ error: "not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let role: "buyer" | "seller";
    if (user.id === ps.buyer_id) role = "buyer";
    else if (user.id === ps.seller_id) role = "seller";
    else {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = new Date().toISOString();
    const patch: Record<string, unknown> = {};
    if (role === "buyer" && !ps.handoff_confirmed_by_buyer_at) {
      patch.handoff_confirmed_by_buyer_at = now;
    }
    if (role === "seller" && !ps.handoff_confirmed_by_seller_at) {
      patch.handoff_confirmed_by_seller_at = now;
    }

    const bothConfirmed =
      (role === "buyer" ? true : Boolean(ps.handoff_confirmed_by_buyer_at)) &&
      (role === "seller" ? true : Boolean(ps.handoff_confirmed_by_seller_at));

    if (bothConfirmed && ps.status !== "funds_released" && ps.status !== "completed") {
      patch.status = "funds_released";
      patch.funds_released_at = now;
    }

    if (Object.keys(patch).length > 0) {
      const { error: upErr } = await admin
        .from("protected_sales")
        .update(patch)
        .eq("id", protected_sale_id);
      if (upErr) {
        return new Response(JSON.stringify({ error: upErr.message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      await admin.from("protected_sale_events").insert({
        protected_sale_id,
        event: bothConfirmed ? "handoff_confirmed_both" : `handoff_confirmed_${role}`,
        actor_id: user.id,
        actor_role: role,
        payload: patch,
      });
    }

    return new Response(
      JSON.stringify({ ok: true, both_confirmed: bothConfirmed }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
