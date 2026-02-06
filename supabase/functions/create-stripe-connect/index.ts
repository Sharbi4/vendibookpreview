import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-CONNECT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    // Parse request body for optional returnPath
    let returnPath = "/list";
    try {
      const body = await req.json();
      if (body?.returnPath) {
        returnPath = body.returnPath;
      }
    } catch {
      // No body or invalid JSON, use default
    }
    logStep("Return path", { returnPath });

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
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Check if user already has a Stripe account and get profile data
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('stripe_account_id, stripe_onboarding_complete, first_name, last_name, phone_number')
      .eq('id', user.id)
      .single();

    logStep("Profile fetched", { 
      hasStripeAccount: !!profile?.stripe_account_id,
      firstName: profile?.first_name,
      lastName: profile?.last_name,
      hasPhone: !!profile?.phone_number
    });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const origin = req.headers.get("origin") || "http://localhost:5173";

    let accountId = profile?.stripe_account_id;

    if (!accountId) {
      // Create new Stripe Connect account with pre-filled data
      logStep("Creating new Stripe Connect account");
      
      // Build individual object if we have name data
      const individual: Record<string, unknown> = {};
      if (profile?.first_name) individual.first_name = profile.first_name;
      if (profile?.last_name) individual.last_name = profile.last_name;
      if (profile?.phone_number) individual.phone = profile.phone_number;

      const account = await stripe.accounts.create({
        type: "express",
        email: user.email,
        metadata: { user_id: user.id },
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        ...(Object.keys(individual).length > 0 && { 
          business_type: "individual",
          individual 
        }),
      });
      accountId = account.id;

      // Save account ID and onboarding start time to profile
      await supabaseClient
        .from('profiles')
        .update({ 
          stripe_account_id: accountId,
          stripe_onboarding_started_at: new Date().toISOString()
        })
        .eq('id', user.id);

      logStep("Stripe account created", { accountId });
    }

    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${origin}${returnPath}?stripe=refresh`,
      return_url: `${origin}${returnPath}?stripe=complete`,
      type: "account_onboarding",
    });

    logStep("Account link created", { url: accountLink.url });

    return new Response(JSON.stringify({ url: accountLink.url }), {
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
