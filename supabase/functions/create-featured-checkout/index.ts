import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FEATURED_LISTING_PRICE_ID = "price_1TOQ1tA6Qt4pF0fMO57qmD1n";
const FEATURED_LISTING_FEE = 30;

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

    const body = await req.json().catch(() => ({}));
    const { listing_id, starts_at } = body as { listing_id?: string; starts_at?: string };
    if (!listing_id) throw new Error("Missing listing_id");

    // Validate optional starts_at: must be an ISO date, today or up to +60 days.
    let scheduledStartIso: string | null = null;
    if (typeof starts_at === "string" && starts_at.trim() !== "") {
      const parsed = new Date(starts_at);
      if (Number.isNaN(parsed.getTime())) {
        throw new Error("Invalid starts_at — expected ISO date string");
      }
      const minMs = Date.now() - 24 * 60 * 60 * 1000; // yesterday tolerance for TZ
      const maxMs = Date.now() + 60 * 24 * 60 * 60 * 1000;
      if (parsed.getTime() < minMs || parsed.getTime() > maxMs) {
        throw new Error("starts_at must be within the next 60 days");
      }
      scheduledStartIso = parsed.toISOString();
    }

    logStep("Request parsed", { listing_id, scheduledStartIso });

    // Verify the listing exists and belongs to this user
    const { data: listing, error: listingError } = await supabaseClient
      .from("listings")
      .select("id, title, host_id, featured_enabled, featured_expires_at, status, mode, published_at, pending_featured_payment")
      .eq("id", listing_id)
      .single();

    logStep("Listing query result", { 
      listing: listing ? { id: listing.id, title: listing.title, mode: listing.mode, status: listing.status, published_at: listing.published_at } : null, 
      error: listingError?.message || null 
    });

    if (listingError || !listing) {
      throw new Error(`Listing not found: ${listingError?.message || 'No data returned'}`);
    }

    if (listing.host_id !== user.id) {
      throw new Error("Unauthorized: You do not own this listing");
    }

    const origin = req.headers.get("origin") || req.headers.get("referer")?.replace(/\/$/, '').split('/').slice(0, 3).join('/') || "https://vendibook.com";
    logStep("Origin determined", { origin });

    // NOTE: If a boost is already active we ALLOW the extend purchase and let
    // stripe-webhook stack the additional 30 days onto the existing expiry.
    // Duplicate submits are coalesced by the hourly idempotency key below.
    const now = Date.now();
    const activeBoost =
      listing.featured_enabled === true &&
      listing.featured_expires_at &&
      new Date(listing.featured_expires_at).getTime() > now;
    if (activeBoost) {
      logStep("Boost already active — creating extend session (webhook will stack days)", {
        listingId: listing.id,
        currentExpires: listing.featured_expires_at,
      });
    }

    // IDEMPOTENCY GUARD 2: a prior boost payment is queued (paid but listing was draft).
    // Don't charge again — send the user to the published page so the queued boost can apply on publish.
    const pendingPaid = listing.pending_featured_payment as { session_id?: string; applied_at?: string } | null;
    if (pendingPaid?.session_id && !pendingPaid.applied_at) {
      logStep("Pending paid boost exists — returning without new charge", {
        listingId: listing.id,
        priorSessionId: pendingPaid.session_id,
      });
      return new Response(
        JSON.stringify({
          url: `${origin}/listing-published?listing_id=${listing_id}&featured_paid=true&pending=true`,
          already_paid: true,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // If the listing wizard sends the boost checkout request while the saved
    // row is still a draft, publish it here before creating checkout.
    if (listing.status !== 'published' || !listing.published_at) {
      const nowIso = new Date().toISOString();
      const { data: publishedListing, error: publishError } = await supabaseClient
        .from("listings")
        .update({
          status: 'published',
          published_at: listing.published_at ?? nowIso,
        })
        .eq("id", listing.id)
        .eq("host_id", user.id)
        .select("id, status, published_at")
        .single();

      if (publishError || publishedListing?.status !== 'published' || !publishedListing?.published_at) {
        throw new Error(`Unable to publish listing before boost checkout: ${publishError?.message || 'Unknown publish error'}`);
      }

      logStep("Draft listing published before checkout", { listingId: listing.id, published_at: publishedListing.published_at });
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


    // Create checkout session for the featured listing fee.
    // Idempotency key scopes to (user, listing, hour) — bursty double-clicks return the SAME session
    // instead of creating duplicate Stripe sessions.
    const idempotencyKey = `featured-${user.id}-${listing_id}-${Math.floor(Date.now() / (60 * 60 * 1000))}`;
    const session = await stripe.checkout.sessions.create(
      {
        customer: customerId,
        customer_email: customerId ? undefined : user.email,
        line_items: [{ price: FEATURED_LISTING_PRICE_ID, quantity: 1 }],
        mode: "payment",
        success_url: `${origin}/listing-published?listing_id=${listing_id}&featured_paid=true`,
        cancel_url: `${origin}/create-listing/${listing_id}?featured_cancelled=true`,
        metadata: {
          listing_id: listing_id,
          user_id: user.id,
          type: "featured_listing",
          ...(scheduledStartIso ? { scheduled_start_at: scheduledStartIso } : {}),
        },
      },
      { idempotencyKey }
    );

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
