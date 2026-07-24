// Party-driven updates for a Protected Sale: agreement sign, handoff details,
// identity re-check ping. Payment webhooks are handled elsewhere; this function
// only mutates fields the party can legitimately change.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type Action =
  | { type: "sign_agreement"; agreement_snapshot: Record<string, unknown>; terms_id?: string }
  | { type: "set_handoff"; handoff_mode: "pickup" | "delivery"; handoff_location: Record<string, unknown>; handoff_scheduled_at: string }
  | { type: "cancel"; reason?: string }
  | { type: "mark_identity_verified" };  // dev/preview helper; production sets via Stripe webhook

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

    const body = await req.json() as { protected_sale_id: string; action: Action };
    const { protected_sale_id, action } = body;
    if (!protected_sale_id || !action?.type) {
      return new Response(JSON.stringify({ error: "protected_sale_id and action required" }), {
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
    const ip = req.headers.get("x-forwarded-for") ?? null;
    const patch: Record<string, unknown> = {};
    const eventPayload: Record<string, unknown> = { action: action.type };

    switch (action.type) {
      case "mark_identity_verified": {
        if (role === "buyer") patch.buyer_identity_verified_at = now;
        else patch.seller_identity_verified_at = now;
        const bothVerified =
          (role === "buyer" ? true : Boolean(ps.buyer_identity_verified_at)) &&
          (role === "seller" ? true : Boolean(ps.seller_identity_verified_at));
        if (bothVerified && ps.status === "initiated") patch.status = "id_verified";
        break;
      }
      case "sign_agreement": {
        // Only buyer signs the buyer-facing agreement in Phase 2 (seller pre-signs on opt-in).
        if (role !== "buyer") {
          return new Response(JSON.stringify({ error: "only buyer signs agreement" }), {
            status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (!ps.buyer_identity_verified_at || !ps.seller_identity_verified_at) {
          return new Response(JSON.stringify({ error: "both parties must verify identity first" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        patch.agreement_snapshot = action.agreement_snapshot;
        patch.agreement_signed_at = now;
        patch.agreement_signer_ip = ip;
        if (action.terms_id) patch.terms_id = action.terms_id;
        if (ps.status === "id_verified") patch.status = "agreement_signed";
        break;
      }
      case "set_handoff": {
        if (!["pickup", "delivery"].includes(action.handoff_mode)) {
          return new Response(JSON.stringify({ error: "invalid handoff_mode" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        patch.handoff_mode = action.handoff_mode;
        patch.handoff_location = action.handoff_location;
        patch.handoff_scheduled_at = action.handoff_scheduled_at;
        if (["deposit_paid", "balance_authorized", "agreement_signed"].includes(ps.status)) {
          patch.status = "handoff_scheduled";
        }
        break;
      }
      case "cancel": {
        if (["funds_released", "completed"].includes(ps.status)) {
          return new Response(JSON.stringify({ error: "cannot cancel after funds released" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        patch.status = "cancelled";
        patch.cancelled_at = now;
        patch.cancellation_reason = action.reason ?? null;
        break;
      }
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
        event: action.type,
        actor_id: user.id,
        actor_role: role,
        ip,
        payload: { ...eventPayload, patch },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
