import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Commission rates
const RENTAL_HOST_FEE_PERCENT = 12.9; // 12.9% from host
const RENTAL_RENTER_FEE_PERCENT = 12.9; // 12.9% platform fee from renter
const SALE_SELLER_FEE_PERCENT = 15; // 15% from seller on sales

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

interface CheckoutRequest {
  booking_id?: string;
  listing_id: string;
  mode: 'rent' | 'sale';
  amount: number; // Base price in dollars
  delivery_fee?: number;
  // Sale-specific fields
  fulfillment_type?: 'pickup' | 'delivery';
  delivery_address?: string | null;
  delivery_instructions?: string | null;
  buyer_name?: string;
  buyer_email?: string;
  buyer_phone?: string | null;
}

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
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const body: CheckoutRequest = await req.json();
    const { 
      booking_id, 
      listing_id, 
      mode, 
      amount, 
      delivery_fee = 0,
      fulfillment_type,
      delivery_address,
      delivery_instructions,
      buyer_name,
      buyer_email,
      buyer_phone,
    } = body;
    
    logStep("Request received", { booking_id, listing_id, mode, amount, delivery_fee, fulfillment_type });

    if (!listing_id || !mode || !amount) {
      throw new Error("Missing required fields: listing_id, mode, or amount");
    }

    // Fetch listing to get host's Stripe account
    const { data: listing, error: listingError } = await supabaseClient
      .from('listings')
      .select('host_id, title')
      .eq('id', listing_id)
      .single();

    if (listingError || !listing) {
      throw new Error("Listing not found");
    }
    logStep("Listing found", { host_id: listing.host_id, title: listing.title });

    // Fetch host's Stripe account
    const { data: hostProfile, error: hostError } = await supabaseClient
      .from('profiles')
      .select('stripe_account_id, stripe_onboarding_complete')
      .eq('id', listing.host_id)
      .single();

    if (hostError || !hostProfile?.stripe_account_id) {
      throw new Error("Host has not completed Stripe onboarding");
    }

    if (!hostProfile.stripe_onboarding_complete) {
      throw new Error("Host's Stripe account is not fully onboarded");
    }
    logStep("Host Stripe account verified", { stripe_account_id: hostProfile.stripe_account_id });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const origin = req.headers.get("origin") || "https://vendibook.com";

    // Calculate fees based on mode
    let customerTotal: number; // What the customer pays (in cents)
    let applicationFee: number; // Platform fee (in cents)
    let hostReceives: number; // What host gets after platform fee (in cents)

    if (mode === 'rent') {
      // Rentals: Dual-sided commission
      // Base price + delivery = subtotal
      const subtotal = amount + delivery_fee;
      
      // Customer pays: subtotal + 12.9% platform fee
      const renterFee = subtotal * (RENTAL_RENTER_FEE_PERCENT / 100);
      customerTotal = Math.round((subtotal + renterFee) * 100);
      
      // Host fee: 12.9% of subtotal
      const hostFee = subtotal * (RENTAL_HOST_FEE_PERCENT / 100);
      
      // Total platform revenue = renter fee + host fee
      applicationFee = Math.round((renterFee + hostFee) * 100);
      
      // Host receives subtotal minus their 12.9% fee
      hostReceives = Math.round((subtotal - hostFee) * 100);
      
      logStep("Rental fee calculation", {
        subtotal,
        renterFee: renterFee.toFixed(2),
        hostFee: hostFee.toFixed(2),
        customerTotal: (customerTotal / 100).toFixed(2),
        applicationFee: (applicationFee / 100).toFixed(2),
        hostReceives: (hostReceives / 100).toFixed(2),
      });
    } else {
      // Sales: 15% from seller only - ESCROW MODE
      // Payment is captured but NOT transferred until both parties confirm
      const salePrice = amount;
      const saleDeliveryFee = delivery_fee || 0;
      const totalSalePrice = salePrice + saleDeliveryFee;
      
      // Customer pays full price + delivery (no buyer fee)
      customerTotal = Math.round(totalSalePrice * 100);
      
      // Seller pays 15% fee on the sale price (not on delivery)
      const sellerFee = salePrice * (SALE_SELLER_FEE_PERCENT / 100);
      applicationFee = Math.round(sellerFee * 100);
      
      // Seller receives sale price minus 15% + full delivery fee
      hostReceives = Math.round((salePrice - sellerFee + saleDeliveryFee) * 100);
      
      logStep("Sale fee calculation (escrow)", {
        salePrice,
        saleDeliveryFee,
        totalSalePrice,
        sellerFee: sellerFee.toFixed(2),
        customerTotal: (customerTotal / 100).toFixed(2),
        applicationFee: (applicationFee / 100).toFixed(2),
        hostReceives: (hostReceives / 100).toFixed(2),
      });
    }

    // Check if customer already exists in Stripe
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Existing Stripe customer found", { customerId });
    }

    // Create the Checkout Session
    // For sales: Use separate charges (escrow) - funds go to platform first
    // For rentals: Use destination charges - funds go directly to host
    
    let sessionParams: Stripe.Checkout.SessionCreateParams;
    
    if (mode === 'rent') {
      // Rentals: Direct transfer to host
      sessionParams = {
        payment_method_types: ['card'],
        mode: 'payment',
        customer: customerId,
        customer_email: customerId ? undefined : user.email,
        // Enable automatic tax calculation based on customer location
        automatic_tax: { enabled: true },
        // Collect billing address for accurate tax calculation
        billing_address_collection: 'required',
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: listing.title,
                description: `Rental booking${delivery_fee > 0 ? ' (includes delivery)' : ''}`,
              },
              unit_amount: customerTotal,
              // Mark as taxable - Stripe will calculate based on customer location
              tax_behavior: 'exclusive',
            },
            quantity: 1,
          },
        ],
        payment_intent_data: {
          application_fee_amount: applicationFee,
          transfer_data: {
            destination: hostProfile.stripe_account_id,
          },
          metadata: {
            booking_id: booking_id || '',
            listing_id,
            mode,
            buyer_id: user.id,
            host_id: listing.host_id,
          },
        },
        success_url: `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/payment-cancelled?listing=${listing_id}`,
        metadata: {
          booking_id: booking_id || '',
          listing_id,
          mode,
          buyer_id: user.id,
          host_id: listing.host_id,
        },
      };
    } else {
      // Sales: ESCROW - Funds held on platform, transferred after confirmation
      // No transfer_data - funds stay on platform until both parties confirm
      const saleDeliveryFee = delivery_fee || 0;
      const productDescription = saleDeliveryFee > 0 
        ? `Purchase (Escrow) - includes $${saleDeliveryFee} delivery`
        : 'Purchase (Escrow - funds released after confirmation)';
      
      sessionParams = {
        payment_method_types: ['card'],
        mode: 'payment',
        customer: customerId,
        customer_email: customerId ? undefined : user.email,
        // Enable automatic tax calculation based on customer location
        automatic_tax: { enabled: true },
        // Collect billing address for accurate tax calculation
        billing_address_collection: 'required',
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: listing.title,
                description: productDescription,
              },
              unit_amount: customerTotal,
              // Mark as taxable - Stripe will calculate based on customer location
              tax_behavior: 'exclusive',
            },
            quantity: 1,
          },
        ],
        payment_intent_data: {
          metadata: {
            listing_id,
            mode: 'sale',
            buyer_id: user.id,
            seller_id: listing.host_id,
            escrow: 'true',
            platform_fee: applicationFee.toString(),
            seller_payout: hostReceives.toString(),
            fulfillment_type: fulfillment_type || 'pickup',
            delivery_fee: saleDeliveryFee.toString(),
            delivery_address: delivery_address || '',
            delivery_instructions: delivery_instructions || '',
            buyer_name: buyer_name || '',
            buyer_email: buyer_email || user.email,
            buyer_phone: buyer_phone || '',
          },
        },
        success_url: `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}&escrow=true`,
        cancel_url: `${origin}/payment-cancelled?listing=${listing_id}`,
        metadata: {
          listing_id,
          mode: 'sale',
          buyer_id: user.id,
          seller_id: listing.host_id,
          escrow: 'true',
          fulfillment_type: fulfillment_type || 'pickup',
        },
      };
    }

    const session = await stripe.checkout.sessions.create(sessionParams);
    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    return new Response(
      JSON.stringify({ 
        url: session.url,
        session_id: session.id,
        customer_total: customerTotal / 100,
        platform_fee: applicationFee / 100,
        host_receives: hostReceives / 100,
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
