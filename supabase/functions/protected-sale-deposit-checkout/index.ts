// Creates a Stripe Checkout session for the Protected Sale deposit.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
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
    if (!user?.email) {
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
    const { data: ps } = await admin
      .from("protected_sales")
      .select("id, buyer_id, deposit_cents, status, sale_transaction_id")
      .eq("id", protected_sale_id)
      .maybeSingle();

    if (!ps || ps.buyer_id !== user.id) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (ps.status !== "agreement_signed" && ps.status !== "id_verified") {
      return new Response(JSON.stringify({ error: `deposit unavailable in status ${ps.status}` }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
      apiVersion: "2025-08-27.basil",
    });

    const origin = req.headers.get("origin") ?? "https://vendibook.com";
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: user.email,
      line_items: [{
        price_data: {
          currency: "usd",
          product_data: {
            name: "Vendibook Protected Sale — Deposit",
            description: "Non-refundable deposit that secures your protected purchase.",
          },
          unit_amount: ps.deposit_cents,
        },
        quantity: 1,
      }],
      metadata: {
        protected_sale_id: ps.id,
        sale_transaction_id: ps.sale_transaction_id,
        kind: "protected_sale_deposit",
      },
      success_url: `${origin}/sale/${ps.sale_transaction_id}/protection?deposit=success`,
      cancel_url: `${origin}/sale/${ps.sale_transaction_id}/protection?deposit=cancelled`,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
