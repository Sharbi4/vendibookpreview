import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[GET-CHECKOUT-SESSION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    const { session_id } = await req.json();
    if (!session_id) throw new Error("Missing session_id");
    logStep("Session ID received", { session_id });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Retrieve the checkout session with expanded line items and tax info
    const session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ['line_items', 'total_details.breakdown'],
    });
    logStep("Session retrieved", { 
      sessionId: session.id, 
      amount_total: session.amount_total,
      total_details: session.total_details
    });

    // Extract tax information
    const taxBreakdown = session.total_details?.breakdown?.taxes || [];
    const taxTotal = session.total_details?.amount_tax || 0;
    const subtotal = session.amount_subtotal || 0;
    const total = session.amount_total || 0;

    // Get customer billing details for state info
    const customerDetails = session.customer_details;
    const billingState = customerDetails?.address?.state || null;
    const billingCountry = customerDetails?.address?.country || null;

    logStep("Tax info extracted", {
      taxTotal: taxTotal / 100,
      taxBreakdownCount: taxBreakdown.length,
      billingState,
      billingCountry
    });

    // Format tax breakdown for frontend
    const formattedTaxes = taxBreakdown.map((tax: any) => ({
      amount: tax.amount / 100,
      rate: tax.rate?.display_name || 'Tax',
      percentage: tax.rate?.percentage || 0,
      jurisdiction: tax.rate?.jurisdiction || billingState || 'Unknown',
      tax_type: tax.rate?.tax_type || 'sales_tax',
    }));

    return new Response(
      JSON.stringify({
        session_id: session.id,
        subtotal: subtotal / 100,
        tax_total: taxTotal / 100,
        total: total / 100,
        taxes: formattedTaxes,
        billing_state: billingState,
        billing_country: billingCountry,
        currency: session.currency?.toUpperCase() || 'USD',
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
