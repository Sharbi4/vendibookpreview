import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FEATURED_LISTING_PRICE_ID = "price_1SukkdA6Qt4pF0fMXdgJjfJo";
const FEATURED_LISTING_FEE = 25;

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-FEATURED-CHECKOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    // Use service role key to bypass RLS for reading listing data
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

    const { listing_id } = await req.json();
    if (!listing_id) throw new Error("Missing listing_id");
    logStep("Request parsed", { listing_id });

    // Verify the listing exists and belongs to this user
    const { data: listing, error: listingError } = await supabaseClient
      .from("listings")
      .select("id, title, host_id, featured_enabled, status, mode")
      .eq("id", listing_id)
      .single();

    logStep("Listing query result", { 
      listing: listing ? { id: listing.id, title: listing.title, mode: listing.mode } : null, 
      error: listingError?.message || null 
    });

    if (listingError || !listing) {
      throw new Error(`Listing not found: ${listingError?.message || 'No data returned'}`);
    }

    if (listing.host_id !== user.id) {
      throw new Error("Unauthorized: You do not own this listing");
    }

    logStep("Listing verified", { listingId: listing.id, title: listing.title });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Check if customer exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Found existing Stripe customer", { customerId });
    }

    const origin = req.headers.get("origin") || req.headers.get("referer")?.replace(/\/$/, '').split('/').slice(0, 3).join('/') || "https://vendibook.com";
    logStep("Origin determined", { origin });

    // Create checkout session for the featured listing fee
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price: FEATURED_LISTING_PRICE_ID,
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${origin}/listing-published?listing_id=${listing_id}&featured_paid=true`,
      cancel_url: `${origin}/create-listing/${listing_id}?featured_cancelled=true`,
      metadata: {
        listing_id: listing_id,
        user_id: user.id,
        type: "featured_listing",
      },
    });

    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    return new Response(
      JSON.stringify({ 
        url: session.url,
        session_id: session.id,
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
