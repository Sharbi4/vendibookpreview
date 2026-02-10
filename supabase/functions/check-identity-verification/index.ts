import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-IDENTITY-VERIFICATION] ${step}${detailsStr}`);
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
    if (!authHeader) {
      return new Response(JSON.stringify({ 
        verified: false, 
        status: "not_authenticated",
        error: "No authorization header provided" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const token = authHeader.replace("Bearer ", "");
    
    // Use getClaims to verify the token properly
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims?.sub) {
      logStep("Token validation failed - user not authenticated");
      return new Response(JSON.stringify({ 
        verified: false, 
        status: "not_authenticated",
        error: "Please log in to check verification status" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }
    
    const userId = claimsData.claims.sub;
    logStep("User authenticated", { userId });

    // Get user's profile to check verification status
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("identity_verified, stripe_identity_session_id, identity_verified_at")
      .eq("id", userId)
      .single();

    if (profileError) {
      logStep("Error fetching profile", { error: profileError.message });
      return new Response(JSON.stringify({ 
        verified: false, 
        status: "unknown",
        error: profileError.message 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // If already verified in our DB, return true
    if (profile.identity_verified) {
      logStep("User already verified in database");
      return new Response(JSON.stringify({ 
        verified: true, 
        status: "verified",
        verified_at: profile.identity_verified_at 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // If no session ID, user hasn't started verification
    if (!profile.stripe_identity_session_id) {
      logStep("No verification session found");
      return new Response(JSON.stringify({ 
        verified: false, 
        status: "not_started" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Check the verification session status with Stripe
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const session = await stripe.identity.verificationSessions.retrieve(
      profile.stripe_identity_session_id
    );

    logStep("Stripe session status", { status: session.status });

    if (session.status === "verified") {
      // Update the profile to mark as verified
      const { error: updateError } = await supabaseClient
        .from("profiles")
        .update({ 
          identity_verified: true,
          identity_verified_at: new Date().toISOString()
        })
        .eq("id", userId);

      if (updateError) {
        logStep("Error updating profile", { error: updateError.message });
      }

      return new Response(JSON.stringify({ 
        verified: true, 
        status: "verified" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    return new Response(JSON.stringify({ 
      verified: false, 
      status: session.status 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ 
      verified: false, 
      status: "error",
      error: errorMessage 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
