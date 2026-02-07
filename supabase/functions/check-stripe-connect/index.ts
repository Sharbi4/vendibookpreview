import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-STRIPE-CONNECT] ${step}${detailsStr}`);
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
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
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

    // Get profile with Stripe account info
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('stripe_account_id, stripe_onboarding_complete')
      .eq('id', user.id)
      .single();

    if (!profile?.stripe_account_id) {
      logStep("No Stripe account found");
      return new Response(JSON.stringify({ 
        connected: false, 
        onboarding_complete: false 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    
    // Check account status
    const account = await stripe.accounts.retrieve(profile.stripe_account_id);
    // Treat onboarding as complete once details are submitted. `payouts_enabled` can temporarily toggle
    // (e.g., reviews/verification), and we don't want to force "reconnect" for already-linked accounts.
    const isComplete = Boolean(account.details_submitted);
    
    logStep("Account status checked", { 
      accountId: profile.stripe_account_id,
      detailsSubmitted: account.details_submitted,
      payoutsEnabled: account.payouts_enabled,
      isComplete
    });

    // Update profile if onboarding status changed
    if (isComplete && !profile.stripe_onboarding_complete) {
      await supabaseClient
        .from('profiles')
        .update({ stripe_onboarding_complete: true })
        .eq('id', user.id);
    }

    return new Response(JSON.stringify({ 
      connected: true,
      onboarding_complete: isComplete,
      account_id: profile.stripe_account_id
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
