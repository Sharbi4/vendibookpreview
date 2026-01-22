import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Verify user authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    const { transaction_id } = await req.json();

    if (!transaction_id) {
      throw new Error("Transaction ID is required");
    }

    // Fetch the transaction
    const { data: transaction, error: txError } = await supabaseClient
      .from("sale_transactions")
      .select(`
        id,
        buyer_id,
        seller_id,
        amount,
        freight_cost,
        fulfillment_type,
        status,
        buyer_name,
        buyer_email,
        freight_payment_status,
        seller_confirmed_at,
        listing:listings(id, title, host_id)
      `)
      .eq("id", transaction_id)
      .single();

    if (txError || !transaction) {
      throw new Error("Transaction not found");
    }

    // Verify the user is the buyer
    if (transaction.buyer_id !== user.id) {
      throw new Error("Only the buyer can pay for freight");
    }

    // Check if seller has confirmed
    if (!transaction.seller_confirmed_at) {
      throw new Error("Seller must confirm the transaction before freight can be paid");
    }

    // Check if this is a cash + freight transaction
    if (transaction.fulfillment_type !== "vendibook_freight") {
      throw new Error("This transaction does not use VendiBook freight");
    }

    // Check if freight is already paid
    if (transaction.freight_payment_status === "paid") {
      throw new Error("Freight has already been paid");
    }

    const freightCost = transaction.freight_cost || 0;
    if (freightCost <= 0) {
      throw new Error("No freight cost to pay");
    }

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Check for existing customer
    const customers = await stripe.customers.list({
      email: transaction.buyer_email || user.email,
      limit: 1,
    });

    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    // Get listing title - handle both array and object responses from Supabase
    const listing = transaction.listing as { id: string; title: string; host_id: string } | { id: string; title: string; host_id: string }[] | null;
    const listingTitle = Array.isArray(listing) 
      ? listing[0]?.title 
      : listing?.title;

    // Create the Stripe checkout session for freight only
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : (transaction.buyer_email || user.email),
      payment_method_types: ["card", "affirm", "afterpay_clearpay", "klarna"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `VendiBook Freight - ${listingTitle || "Item Shipping"}`,
              description: "Nationwide freight shipping with delivery scheduling",
            },
            unit_amount: Math.round(freightCost * 100),
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      automatic_tax: { enabled: true },
      success_url: `${req.headers.get("origin")}/order-tracking/${transaction_id}?freight_paid=true`,
      cancel_url: `${req.headers.get("origin")}/order-tracking/${transaction_id}?freight_cancelled=true`,
      metadata: {
        transaction_id,
        type: "freight_payment",
        buyer_id: transaction.buyer_id,
      },
    });

    // Update transaction with freight checkout session
    await supabaseClient
      .from("sale_transactions")
      .update({
        freight_checkout_session_id: session.id,
        freight_payment_status: "pending",
      })
      .eq("id", transaction_id);

    return new Response(
      JSON.stringify({ url: session.url }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error creating freight checkout:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});
