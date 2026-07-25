import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import {
  adjustReferralsForTransaction as _adjustReferralsForTransaction,
  type ReferralAdjustOpts,
} from "./_referral.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

// Thin wrapper that swallows errors and forwards logs to the webhook logger.
async function adjustReferralsForTransaction(
  supabaseClient: any,
  opts: ReferralAdjustOpts,
) {
  try {
    return await _adjustReferralsForTransaction(supabaseClient, opts, logStep);
  } catch (e) {
    logStep("WARNING: adjustReferralsForTransaction threw", { error: String(e) });
  }
}


serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Webhook received");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    if (!webhookSecret) throw new Error("STRIPE_WEBHOOK_SECRET is not set");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get the signature from the headers
    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      logStep("ERROR: No signature provided");
      return new Response(JSON.stringify({ error: "No signature" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Get the raw body for signature verification
    const body = await req.text();
    
    // Verify the webhook signature
    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
      logStep("Signature verified", { type: event.type, id: event.id });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      logStep("ERROR: Signature verification failed", { message: errorMessage });
      return new Response(JSON.stringify({ error: `Webhook signature verification failed: ${errorMessage}` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Handle the event
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        logStep("Processing checkout.session.completed", { 
          sessionId: session.id,
          paymentStatus: session.payment_status,
          metadata: session.metadata,
        });

        const bookingId = session.metadata?.booking_id;
        const listingId = session.metadata?.listing_id;
        const mode = session.metadata?.mode;
        const isEscrow = session.metadata?.escrow === 'true';
        const paymentType = session.metadata?.type;
        const protectedSaleKind = session.metadata?.kind;

        // Handle Vendibook Protected Sale deposit
        if (protectedSaleKind === 'protected_sale_deposit' && session.payment_status === 'paid') {
          const protectedSaleId = session.metadata?.protected_sale_id;
          logStep("Processing protected sale deposit", { protectedSaleId, sessionId: session.id });
          if (protectedSaleId) {
            const { data: ps } = await supabaseClient
              .from('protected_sales')
              .select('id,status,deposit_paid_at')
              .eq('id', protectedSaleId)
              .maybeSingle();
            if (ps && !ps.deposit_paid_at) {
              const patch: Record<string, unknown> = {
                deposit_stripe_session_id: session.id,
                deposit_paid_at: new Date().toISOString(),
              };
              // Advance status to deposit_paid unless we've already moved beyond it.
              const rank = ['initiated','id_verified','agreement_signed','deposit_paid','balance_authorized','handoff_scheduled','funds_released','completed'];
              if (rank.indexOf(ps.status) < rank.indexOf('deposit_paid')) {
                patch.status = 'deposit_paid';
              }
              await supabaseClient.from('protected_sales').update(patch).eq('id', protectedSaleId);
              await supabaseClient.from('protected_sale_events').insert({
                protected_sale_id: protectedSaleId,
                event: 'deposit_paid',
                payload: { session_id: session.id, amount_total: session.amount_total },
              });
            }
          }
          return new Response(JSON.stringify({ received: true, kind: 'protected_sale_deposit' }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Handle freight payment for cash transactions
        if (paymentType === 'freight_payment' && session.payment_status === "paid") {
          const transactionId = session.metadata?.transaction_id;
          logStep("Processing freight payment", { transactionId });

          if (transactionId) {
            const paymentIntentId = typeof session.payment_intent === 'string' 
              ? session.payment_intent 
              : session.payment_intent?.id;

            const { error: updateError } = await supabaseClient
              .from("sale_transactions")
              .update({
                freight_payment_status: "paid",
                freight_payment_intent_id: paymentIntentId,
                freight_paid_at: new Date().toISOString(),
              })
              .eq("id", transactionId);

            if (updateError) {
              logStep("ERROR: Failed to update freight payment status", { 
                error: updateError.message, 
                transactionId 
              });
            } else {
              logStep("Freight payment marked as paid", { transactionId });

              // Get transaction for notifications
              const { data: txData } = await supabaseClient
                .from("sale_transactions")
                .select("buyer_id, seller_id, freight_cost, listing:listings(title)")
                .eq("id", transactionId)
                .single();

              if (txData) {
                const listing = Array.isArray(txData.listing) ? txData.listing[0] : txData.listing;
                const listingTitle = listing?.title || "your order";

                // Notify buyer
                await supabaseClient.from("notifications").insert({
                  user_id: txData.buyer_id,
                  type: "payment",
                  title: "Freight Payment Confirmed",
                  message: `Your freight payment of $${txData.freight_cost} for "${listingTitle}" has been confirmed. Shipping will be arranged shortly.`,
                  link: `/order-tracking/${transactionId}`,
                });

                // Notify seller
                await supabaseClient.from("notifications").insert({
                  user_id: txData.seller_id,
                  type: "shipping",
                  title: "Freight Payment Received",
                  message: `The buyer has paid for freight on "${listingTitle}". VendiBook Freight will contact you to arrange pickup.`,
                  link: `/order-tracking/${transactionId}`,
                });
              }
            }
          }
          break;
        }

        // Handle Featured Listing payment - enable featured status
        if (paymentType === 'featured_listing' && listingId && session.payment_status === "paid") {
          logStep("Processing Featured Listing payment", { listingId });
          
          const paymentIntentId = typeof session.payment_intent === 'string' 
            ? session.payment_intent 
            : session.payment_intent?.id;

          // First, fetch the listing to check current status
          const { data: existingListing, error: fetchError } = await supabaseClient
            .from("listings")
            .select("id, title, host_id, published_at, status, featured_enabled, featured_expires_at, pending_featured_payment, boost_history")
            .eq("id", listingId)
            .single();

          if (fetchError) {
            logStep("ERROR: Failed to fetch listing for featured", { error: fetchError.message, listingId });
            break;
          }

          // IDEMPOTENCY: if this exact Stripe session was already applied, skip everything.
          const priorPayment = existingListing.pending_featured_payment as
            | { session_id?: string; applied_at?: string }
            | null;
          if (priorPayment?.session_id === session.id) {
            logStep("Featured payment already recorded for this session — skipping duplicate", {
              sessionId: session.id,
              alreadyApplied: !!priorPayment?.applied_at,
            });
            break;
          }

          const isFirstTimePublish = !existingListing.published_at;
          const isDraft = existingListing.status !== 'published' || !existingListing.published_at;
          const now = new Date();
          // STACKING + SCHEDULING: pick the latest of (now, requested start, current expiry).
          // Never shrinks remaining time; never allows two boosts to overlap.
          const scheduledStartRaw = session.metadata?.scheduled_start_at;
          const scheduledStartMs = scheduledStartRaw ? new Date(scheduledStartRaw).getTime() : 0;
          const currentExpiresMs = existingListing.featured_enabled && existingListing.featured_expires_at
            ? new Date(existingListing.featured_expires_at).getTime()
            : 0;
          const startFromMs = Math.max(now.getTime(), scheduledStartMs || 0, currentExpiresMs);
          const startAt = new Date(startFromMs);
          const expiresAt = new Date(startFromMs + 30 * 24 * 60 * 60 * 1000);
          // If the effective start is in the future, we still mark the listing
          // as featured_enabled=true (the search rank uses expires_at, and
          // upstream sort/filter logic checks the active window itself).

          // Try to capture the Stripe-hosted receipt URL from the underlying charge
          let receiptUrl: string | null = null;
          try {
            if (paymentIntentId) {
              const pi = await stripe.paymentIntents.retrieve(paymentIntentId, {
                expand: ['latest_charge'],
              });
              const latestCharge = pi.latest_charge as Stripe.Charge | string | null;
              if (latestCharge && typeof latestCharge !== 'string') {
                receiptUrl = latestCharge.receipt_url ?? null;
              }
            }
          } catch (rcptErr) {
            logStep("WARNING: Failed to retrieve receipt_url for boost", { error: String(rcptErr) });
          }

          // Always write a `pending_featured_payment` record (with applied_at when activated immediately).
          // This is our permanent ledger entry and the dedup key for future webhook retries.
          const paymentLedger = {
            source: 'stripe',
            status: 'paid',
            payment_intent_id: paymentIntentId,
            session_id: session.id,
            amount: '$30.00',
            paid_at: now.toISOString(),
            receipt_url: receiptUrl,
            scheduled_start_at: scheduledStartRaw ?? null,
            ...(isDraft ? {} : { applied_at: now.toISOString(), applied_expires_at: expiresAt.toISOString() }),
          };

          // Append an audit entry to boost_history for the promotions UI.
          const historyEntry = {
            session_id: session.id,
            payment_intent_id: paymentIntentId,
            paid_at: now.toISOString(),
            amount_cents: 3000,
            starts_at: startAt.toISOString(),
            ends_at: expiresAt.toISOString(),
            receipt_url: receiptUrl,
            status: isDraft ? 'queued' : 'active',
          };
          const priorHistory = Array.isArray((existingListing as { boost_history?: unknown[] }).boost_history)
            ? ((existingListing as { boost_history?: unknown[] }).boost_history as unknown[])
            : [];
          const nextHistory = [...priorHistory, historyEntry];

          const updateData: Record<string, unknown> = isDraft
            ? { pending_featured_payment: paymentLedger, boost_history: nextHistory }
            : {
                status: 'published',
                featured_enabled: true,
                featured_at: now.toISOString(),
                featured_expires_at: expiresAt.toISOString(),
                pending_featured_payment: paymentLedger,
                boost_history: nextHistory,
                ...(isFirstTimePublish ? { published_at: now.toISOString() } : {}),
              };

          const { error: updateError } = await supabaseClient
            .from("listings")
            .update(updateData)
            .eq("id", listingId);

          if (updateError) {
            logStep("ERROR: Failed to update listing with featured status", { 
              error: updateError.message, 
              listingId 
            });
            // Hard failure on a paid boost is critical — alert admin immediately
            try {
              await fetch(
                `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-transactional-email`,
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
                  },
                  body: JSON.stringify({
                    templateName: 'featured-payment-admin-alert',
                    recipientEmail: 'support@vendibook.com',
                    idempotencyKey: `featured-admin-alert-fail-${session.id}`,
                    templateData: {
                      hostName: 'UNKNOWN',
                      hostEmail: session.customer_details?.email || session.customer_email || '—',
                      listingTitle: `⚠️ FAILED TO APPLY BOOST · listing ${listingId}`,
                      listingId,
                      amount: '$30.00',
                      receiptId: paymentIntentId,
                    },
                  }),
                }
              );
            } catch (alertErr) {
              logStep("ERROR: Failed to send admin failure alert", { error: String(alertErr) });
            }
          } else {
            logStep(`Listing ${isFirstTimePublish ? 'published and' : ''} marked as featured`, { listingId });

            if (existingListing) {
              // Fetch host profile for emails
              const { data: hostProfile } = await supabaseClient
                .from("profiles")
                .select("email, first_name, full_name")
                .eq("id", existingListing.host_id)
                .single();

              // Create in-app notification for host
              try {
                await supabaseClient.from("notifications").insert({
                  user_id: existingListing.host_id,
                  type: "listing",
                  title: isDraft ? "Featured Boost Reserved ⭐" : "Featured Listing Activated! ⭐",
                  message: isDraft
                    ? `We received your $30 Featured Boost for "${existingListing.title}". It will automatically activate for 30 days the moment you publish your listing.`
                    : `Your listing "${existingListing.title}" is now featured and will appear at the top of search results for 30 days.`,
                  link: `/listing/${listingId}`,
                });
                logStep("Featured notification created for host", { hostId: existingListing.host_id, isDraft });
              } catch (notifError) {
                logStep("WARNING: Failed to create featured notification", { error: String(notifError) });
              }

              // Send host-facing boost receipt email
              if (hostProfile?.email) {
                try {
                  await fetch(
                    `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-transactional-email`,
                    {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
                      },
                      body: JSON.stringify({
                        templateName: 'featured-payment-receipt',
                        recipientEmail: hostProfile.email,
                        idempotencyKey: `featured-receipt-${session.id}`,
                        templateData: {
                          firstName: hostProfile.first_name || (hostProfile.full_name?.split(' ')[0]),
                          listingTitle: existingListing.title,
                          listingId,
                          amount: '$30.00',
                          expiresAt: expiresAt.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
                          receiptId: paymentIntentId,
                        },
                      }),
                    }
                  );
                  logStep("Boost receipt email sent to host", { email: hostProfile.email });
                } catch (emailError) {
                  logStep("WARNING: Failed to send boost receipt email", { error: String(emailError) });
                }
              }

              // Send admin alert email — every paid boost generates an internal notification
              try {
                await fetch(
                  `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-transactional-email`,
                  {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
                    },
                    body: JSON.stringify({
                      templateName: 'featured-payment-admin-alert',
                      recipientEmail: 'support@vendibook.com',
                      idempotencyKey: `featured-admin-alert-${session.id}`,
                      templateData: {
                        hostName: hostProfile?.full_name || 'Unknown',
                        hostEmail: hostProfile?.email || '—',
                        listingTitle: existingListing.title,
                        listingId,
                        amount: '$30.00',
                        receiptId: paymentIntentId,
                      },
                    }),
                  }
                );
                logStep("Admin alert email sent for boost payment");
              } catch (adminErr) {
                logStep("WARNING: Failed to send admin alert email", { error: String(adminErr) });
              }

              // ALSO trigger the generic admin-notification (in-app/email) so the
              // owner reliably sees a featured purchase regardless of template routing.
              // Idempotency key reuses session.id so webhook retries don't duplicate.
              try {
                await fetch(
                  `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-admin-notification`,
                  {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
                    },
                    body: JSON.stringify({
                      type: 'featured_purchase',
                      data: {
                        listing_title: existingListing.title,
                        listing_url: `https://vendibook.com/listing/${listingId}`,
                        listing_id: listingId,
                        host_name: hostProfile?.full_name || 'Unknown',
                        host_email: hostProfile?.email || '—',
                        amount: '$30.00',
                        package: 'Featured Boost · 30 days',
                        start_date: now.toISOString().slice(0, 10),
                        end_date: expiresAt.toISOString().slice(0, 10),
                        stripe_payment_id: paymentIntentId || session.id,
                        featured_source: 'paid',
                      },
                    }),
                  }
                );
                logStep("send-admin-notification fired for featured_purchase");
              } catch (genericErr) {
                logStep("WARNING: send-admin-notification failed", { error: String(genericErr) });
              }

              // Trigger listing live email only for first-time publishes
              if (isFirstTimePublish) {
                try {
                  const emailResponse = await fetch(
                    `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-listing-live-email`,
                    {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
                      },
                      body: JSON.stringify({
                        listing_id: listingId,
                      }),
                    }
                  );
                  
                  if (emailResponse.ok) {
                    logStep("Listing live email triggered for featured listing", { listingId });
                  } else {
                    logStep("WARNING: Failed to trigger listing live email", { 
                      status: emailResponse.status 
                    });
                  }
                } catch (emailError) {
                  logStep("WARNING: Error triggering listing live email", { 
                    error: String(emailError) 
                  });
                }
              }
            }
          }
          
          break;
        }

        // Handle Proof Notary payment - publish listing after successful payment
        if (paymentType === 'proof_notary' && listingId && session.payment_status === "paid") {
          logStep("Processing Proof Notary payment", { listingId });
          
          const paymentIntentId = typeof session.payment_intent === 'string' 
            ? session.payment_intent 
            : session.payment_intent?.id;

          // First, fetch the listing to check if it was already published
          const { data: existingListing, error: fetchError } = await supabaseClient
            .from("listings")
            .select("id, title, host_id, published_at, status")
            .eq("id", listingId)
            .single();

          if (fetchError) {
            logStep("ERROR: Failed to fetch listing", { error: fetchError.message, listingId });
            break;
          }

          const isFirstTimePublish = !existingListing.published_at;

          // Update listing to published status - only set published_at if first time
          const updateData: Record<string, unknown> = { status: 'published' };
          if (isFirstTimePublish) {
            updateData.published_at = new Date().toISOString();
          }

          const { error: updateError } = await supabaseClient
            .from("listings")
            .update(updateData)
            .eq("id", listingId);

          if (updateError) {
            logStep("ERROR: Failed to publish listing after notary payment", { 
              error: updateError.message, 
              listingId 
            });
          } else {
            logStep(`Listing ${isFirstTimePublish ? 'published' : 'updated'} after notary payment`, { listingId });

            if (existingListing) {
              // Create notification for host
              try {
                await supabaseClient.from("notifications").insert({
                  user_id: existingListing.host_id,
                  type: "listing",
                  title: isFirstTimePublish ? "Listing Published!" : "Listing Updated!",
                  message: isFirstTimePublish 
                    ? `Your listing "${existingListing.title}" is now live with Proof Notary protection. The $45 notary fee has been charged.`
                    : `Your listing "${existingListing.title}" has been updated with Proof Notary protection. The $45 notary fee has been charged.`,
                  link: `/listing/${listingId}`,
                });
                logStep("Notification created for host", { hostId: existingListing.host_id });
              } catch (notifError) {
                logStep("WARNING: Failed to create notification", { error: String(notifError) });
              }

              // Trigger listing live email only for first-time publishes
              if (isFirstTimePublish) {
                try {
                  const emailResponse = await fetch(
                    `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-listing-live-email`,
                    {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
                      },
                      body: JSON.stringify({
                        listing_id: listingId,
                      }),
                    }
                  );
                  
                  if (emailResponse.ok) {
                    logStep("Listing live email triggered", { listingId });
                  } else {
                    logStep("WARNING: Failed to trigger listing live email", { 
                      status: emailResponse.status 
                    });
                  }
                } catch (emailError) {
                  logStep("WARNING: Error triggering listing live email", { 
                    error: String(emailError) 
                  });
                }
              }
            }
          }
          
          break;
        }

        // Handle rental bookings
        if (bookingId && session.payment_status === "paid") {
          // Get booking details for admin notification and receipt
          const { data: bookingData } = await supabaseClient
            .from("booking_requests")
            .select("*, listings(title, address)")
            .eq("id", bookingId)
            .single();

          // Get shopper profile for receipt email
          const { data: shopperProfile } = await supabaseClient
            .from("profiles")
            .select("email, full_name")
            .eq("id", bookingData?.shopper_id)
            .single();

          // Get deposit amount from metadata
          const depositAmount = session.metadata?.deposit_amount ? parseFloat(session.metadata.deposit_amount) : 0;
          const isAuthorizationHold = session.metadata?.authorization_hold === 'true';
          const paymentIntentId = typeof session.payment_intent === 'string' 
            ? session.payment_intent 
            : session.payment_intent?.id;
          
          // Check if this is an authorization hold (manual capture) vs immediate capture
          let holdStatus = 'none';
          let paymentStatus = 'paid';
          let paidAt: string | null = new Date().toISOString();
          
          if (isAuthorizationHold && paymentIntentId) {
            try {
              const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
              if (paymentIntent.status === 'requires_capture') {
                // Authorization hold - not yet captured
                holdStatus = 'held';
                paymentStatus = 'authorized';
                paidAt = null; // Not paid yet, just authorized
                logStep("Authorization hold detected", { paymentIntentId, status: paymentIntent.status });
              } else if (paymentIntent.status === 'succeeded') {
                // Already captured
                holdStatus = 'captured';
                paymentStatus = 'paid';
              }
            } catch (piError) {
              logStep("WARNING: Could not check payment intent status", { error: String(piError) });
            }
          }
          
          // Get the charge ID from the payment intent for deposit tracking
          let depositChargeId: string | null = null;
          if (depositAmount > 0 && paymentIntentId && paymentStatus === 'paid') {
            try {
              const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
              if (paymentIntent.latest_charge) {
                depositChargeId = typeof paymentIntent.latest_charge === 'string' 
                  ? paymentIntent.latest_charge 
                  : paymentIntent.latest_charge.id;
              }
              logStep("Retrieved charge ID for deposit", { depositChargeId, depositAmount });
            } catch (chargeError) {
              logStep("WARNING: Could not retrieve charge ID", { error: String(chargeError) });
            }
          }

          // Update booking with payment info and deposit tracking
          const { error: updateError } = await supabaseClient
            .from("booking_requests")
            .update({
              payment_status: paymentStatus,
              checkout_session_id: session.id,
              payment_intent_id: paymentIntentId,
              ...(paidAt && { paid_at: paidAt }),
              hold_status: holdStatus,
              // Security deposit tracking - set to 'charged' when payment is made (not authorized)
              ...(depositAmount > 0 && paymentStatus === 'paid' && {
                deposit_amount: depositAmount,
                deposit_status: 'charged',
                deposit_charge_id: depositChargeId,
              }),
              // For authorization holds, store deposit amount but don't mark as charged yet
              ...(depositAmount > 0 && paymentStatus === 'authorized' && {
                deposit_amount: depositAmount,
                deposit_status: 'pending',
              }),
              // Persist referral code for rental attribution at completion time
              ...(session.metadata?.referral_code && {
                referral_code: session.metadata.referral_code,
              }),
            })
            .eq("id", bookingId);

          if (updateError) {
            logStep("ERROR: Failed to update booking", { error: updateError.message, bookingId });
          } else {
            logStep("Booking marked as paid", { bookingId, depositAmount, depositChargeId });

            const listingTitle = bookingData?.listings?.title || "your booking";

            // Create in-app notification for shopper
            try {
              await supabaseClient.from("notifications").insert({
                user_id: bookingData?.shopper_id,
                type: "payment",
                title: "Payment Confirmed",
                message: `Your payment of $${bookingData?.total_price} for "${listingTitle}" has been confirmed. View your booking in your dashboard.`,
                link: "/dashboard",
              });
              logStep("In-app notification created for shopper", { shopperId: bookingData?.shopper_id });
            } catch (notifError) {
              logStep("WARNING: Failed to create shopper notification", { error: String(notifError) });
            }

            // Create in-app notification for host
            try {
              await supabaseClient.from("notifications").insert({
                user_id: bookingData?.host_id,
                type: "booking",
                title: "Payment Received",
                message: `A renter has paid $${bookingData?.total_price} for "${listingTitle}". The booking is now confirmed.`,
                link: "/dashboard",
              });
              logStep("In-app notification created for host", { hostId: bookingData?.host_id });
            } catch (notifError) {
              logStep("WARNING: Failed to create host notification", { error: String(notifError) });
            }

            // Send payment receipt email to shopper
            if (shopperProfile?.email && bookingData) {
              try {
                const paymentIntentId = typeof session.payment_intent === 'string' 
                  ? session.payment_intent 
                  : session.payment_intent?.id;
                
                const receiptResponse = await fetch(
                  `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-payment-receipt`,
                  {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
                    },
                    body: JSON.stringify({
                      email: shopperProfile.email,
                      fullName: shopperProfile.full_name || "Valued Customer",
                      transactionId: paymentIntentId || bookingId,
                      itemName: listingTitle,
                      amount: bookingData.total_price + depositAmount,
                      paymentMethod: "Card",
                      transactionType: "rental",
                      startDate: bookingData.start_date,
                      endDate: bookingData.end_date,
                      address: bookingData.listings?.address || bookingData.address_snapshot,
                      depositAmount: depositAmount,
                      basePrice: bookingData.total_price,
                      isRental: true,
                      bookingId: bookingId,
                    }),
                  }
                );
                
                if (receiptResponse.ok) {
                  logStep("Payment receipt email sent", { to: shopperProfile.email });
                } else {
                  const errorData = await receiptResponse.json();
                  logStep("WARNING: Failed to send payment receipt", { error: errorData });
                }
              } catch (receiptError: any) {
                logStep("WARNING: Error sending payment receipt", { error: receiptError.message });
              }
            }

            // Send SMS confirmation to shopper (if opted in + verified)
            try {
              const startStr = bookingData?.start_date
                ? new Date(bookingData.start_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                : "your dates";
              const smsBody = `VendiBook: Booking confirmed for "${listingTitle}" starting ${startStr}. View: https://vendibook.com/dashboard?booking=${bookingId}. Reply STOP to opt out.`;
              await supabaseClient.functions.invoke("send-sms", {
                body: {
                  user_id: bookingData?.shopper_id,
                  template_name: "booking_confirmed",
                  body: smsBody,
                  category: "transactional",
                  metadata: { booking_id: bookingId },
                },
              });
              logStep("SMS confirmation sent to shopper (if subscribed)", { shopperId: bookingData?.shopper_id });
            } catch (smsError) {
              logStep("WARNING: Failed to send SMS confirmation", { error: String(smsError) });
            }
            // Notify the host that payment was received and the booking is confirmed.
            try {
              await supabaseClient.functions.invoke("send-booking-notification", {
                body: { booking_id: bookingId, event_type: "paid" },
              });
              logStep("Payment-received notification sent to host", { bookingId });
            } catch (notifyError) {
              logStep("WARNING: Failed to send booking notification", { error: String(notifyError) });
            }

            // Send admin notification for booking payment
            try {
              await supabaseClient.functions.invoke("send-admin-notification", {
                body: {
                  type: "booking_paid",
                  data: {
                    booking_id: bookingId,
                    listing_title: listingTitle,
                    total_price: bookingData?.total_price,
                    payment_intent_id: typeof session.payment_intent === 'string' 
                      ? session.payment_intent 
                      : session.payment_intent?.id,
                    shopper_id: bookingData?.shopper_id,
                    host_id: bookingData?.host_id,
                    start_date: bookingData?.start_date,
                    end_date: bookingData?.end_date,
                  },
                },
              });
              logStep("Admin notification sent for payment", { bookingId });
            } catch (adminNotifyError) {
              logStep("WARNING: Failed to send admin notification", { error: String(adminNotifyError) });
            }
          }
        } else if (isEscrow && listingId && session.payment_status === "paid") {
          // Handle escrow sale payments
          logStep("Escrow sale payment completed", { 
            listingId, 
            sessionId: session.id,
            paymentIntent: session.payment_intent 
          });

          // Get listing and buyer info for receipt email
          const { data: listing } = await supabaseClient
            .from("listings")
            .select("title, address")
            .eq("id", listingId)
            .single();

          const buyerId = session.metadata?.buyer_id;
          const sellerId = session.metadata?.seller_id;
          const buyerEmail = session.customer_email || session.customer_details?.email;
          
          // Get buyer profile for name
          let buyerName = "Valued Customer";
          if (buyerId) {
            const { data: buyerProfile } = await supabaseClient
              .from("profiles")
              .select("full_name")
              .eq("id", buyerId)
              .single();
            if (buyerProfile?.full_name) {
              buyerName = buyerProfile.full_name;
            }
          }

          // ========== CREATE SALE TRANSACTION RECORD ==========
          // Check if transaction already exists (idempotency)
          const { data: existingTx } = await supabaseClient
            .from("sale_transactions")
            .select("id")
            .eq("checkout_session_id", session.id)
            .maybeSingle();

          let transactionId: string | null = existingTx?.id || null;

          if (!existingTx && buyerId && sellerId) {
            // Calculate amounts from session metadata
            const amount = session.amount_total ? session.amount_total / 100 : 0;
            const platformFeeStr = session.metadata?.platform_fee;
            const sellerPayoutStr = session.metadata?.seller_payout;
            // Metadata values are stored as integer cents — divide by 100 to get dollars.
            const platformFee = platformFeeStr ? Number(platformFeeStr) / 100 : amount * 0.129;
            const sellerPayout = sellerPayoutStr ? Number(sellerPayoutStr) / 100 : amount - platformFee;
            
            // Get fulfillment data from metadata
            const fulfillmentType = session.metadata?.fulfillment_type || 'pickup';
            const deliveryAddress = session.metadata?.delivery_address || null;
            const deliveryInstructions = session.metadata?.delivery_instructions || null;
            const deliveryFeeStr = session.metadata?.delivery_fee;
            const deliveryFee = deliveryFeeStr ? Number(deliveryFeeStr) : 0;
            const freightCostStr = session.metadata?.freight_cost;
            const freightCost = freightCostStr ? Number(freightCostStr) : 0;
            const buyerNameMeta = session.metadata?.buyer_name || null;
            const buyerEmailMeta = session.metadata?.buyer_email || buyerEmail || null;
            const buyerPhone = session.metadata?.buyer_phone || null;
            
            const paymentIntentIdForTx = typeof session.payment_intent === 'string' 
              ? session.payment_intent 
              : session.payment_intent?.id;

            const { data: newTx, error: txError } = await supabaseClient
              .from("sale_transactions")
              .insert({
                listing_id: listingId,
                buyer_id: buyerId,
                seller_id: sellerId,
                amount: amount,
                platform_fee: platformFee,
                seller_payout: sellerPayout,
                payment_intent_id: paymentIntentIdForTx,
                checkout_session_id: session.id,
                status: 'paid',
                fulfillment_type: fulfillmentType,
                delivery_address: deliveryAddress,
                delivery_instructions: deliveryInstructions,
                delivery_fee: deliveryFee,
                freight_cost: freightCost,
                buyer_name: buyerNameMeta,
                buyer_email: buyerEmailMeta,
                buyer_phone: buyerPhone,
              })
              .select("id")
              .single();

            if (txError) {
              logStep("ERROR: Failed to create sale transaction", { error: txError.message });
            } else {
              transactionId = newTx.id;
              logStep("Sale transaction created", { transactionId, amount, buyerId, sellerId });

              // Kick off Bill of Sale generation (SignNow). Fire-and-forget;
              // idempotent on the server; safe to skip if not configured.
              try {
                fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/signnow-ensure-bill-of-sale`, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
                  },
                  body: JSON.stringify({ transaction_id: transactionId }),
                }).catch((e) => logStep("bill_of_sale invoke failed", { error: String(e) }));
              } catch (e) {
                logStep("bill_of_sale trigger error", { error: String(e) });
              }

              // Persist referral_code from session metadata for audit trail
              const refCodeFromMeta = session.metadata?.referral_code || '';
              if (refCodeFromMeta) {
                await supabaseClient
                  .from("sale_transactions")
                  .update({ referral_code: refCodeFromMeta })
                  .eq("id", transactionId);
              }

              // Fire purchase referral qualifying event (idempotent via session id).
              // referral-record-event handles all eligibility/fraud gates.
              try {
                await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/referral-record-event`, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
                  },
                  body: JSON.stringify({
                    program_type: "purchase",
                    referred_user_id: buyerId,
                    transaction_id: transactionId,
                    transaction_value: amount,
                    referral_code: refCodeFromMeta || undefined,
                    seller_id: sellerId,
                    idempotency_key: `purchase-${session.id}`,
                  }),
                });
                logStep("Purchase referral event posted", { transactionId });
              } catch (refErr) {
                logStep("WARNING: purchase referral event failed", { error: String(refErr) });
              }

              // Fire supply referral qualifying event for the seller (their referrer earns
              // when the listing's first transaction closes within the 30–90 day window).
              try {
                await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/referral-record-event`, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
                  },
                  body: JSON.stringify({
                    program_type: "supply",
                    referred_user_id: sellerId,
                    transaction_id: transactionId,
                    transaction_value: amount,
                    listing_id: listingId,
                    idempotency_key: `supply-${session.id}`,
                  }),
                });
                logStep("Supply referral event posted", { transactionId });
              } catch (refErr) {
                logStep("WARNING: supply referral event failed", { error: String(refErr) });
              }


              // Create in-app notification for buyer
              try {
                await supabaseClient.from("notifications").insert({
                  user_id: buyerId,
                  type: "purchase",
                  title: "Purchase Confirmed",
                  message: `Your payment of $${amount.toFixed(2)} for "${listing?.title || 'item'}" has been confirmed. View your purchase in your dashboard.`,
                  link: `/order-tracking/${transactionId}`,
                });
                logStep("In-app notification created for buyer", { buyerId });
              } catch (notifError) {
                logStep("WARNING: Failed to create buyer notification", { error: String(notifError) });
              }

              // Create in-app notification for seller
              try {
                await supabaseClient.from("notifications").insert({
                  user_id: sellerId,
                  type: "sale",
                  title: "💰 New Sale!",
                  message: `Someone purchased "${listing?.title || 'your item'}" for $${amount.toFixed(2)}. View it in your dashboard.`,
                  link: `/order-tracking/${transactionId}`,
                });
                logStep("In-app notification created for seller", { sellerId });
              } catch (notifError) {
                logStep("WARNING: Failed to create seller notification", { error: String(notifError) });
              }

              // Send sale notification email (fire and forget)
              try {
                await fetch(
                  `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-sale-notification`,
                  {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
                    },
                    body: JSON.stringify({
                      transaction_id: transactionId,
                      notification_type: 'payment_received',
                    }),
                  }
                );
                logStep("Sale notification email triggered");
              } catch (saleNotifyError) {
                logStep("WARNING: Failed to trigger sale notification", { error: String(saleNotifyError) });
              }
            }
          } else if (existingTx) {
            logStep("Sale transaction already exists", { transactionId: existingTx.id });
          }

          // Send payment receipt email for escrow sale
          if (buyerEmail) {
            try {
              const paymentIntentId = typeof session.payment_intent === 'string' 
                ? session.payment_intent 
                : session.payment_intent?.id;
              const amount = session.amount_total ? session.amount_total / 100 : 0;
              
              const receiptResponse = await fetch(
                `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-payment-receipt`,
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
                  },
                  body: JSON.stringify({
                    email: buyerEmail,
                    fullName: buyerName,
                    transactionId: paymentIntentId || session.id,
                    itemName: listing?.title || "Purchase",
                    amount: amount,
                    paymentMethod: "Card",
                    transactionType: "purchase",
                    address: listing?.address,
                    fulfillmentType: session.metadata?.fulfillment_type || "pickup",
                    isEscrow: true,
                  }),
                }
              );
              
              if (receiptResponse.ok) {
                logStep("Payment receipt email sent for escrow sale", { to: buyerEmail });
              } else {
                const errorData = await receiptResponse.json();
                logStep("WARNING: Failed to send escrow payment receipt", { error: errorData });
              }
            } catch (receiptError: any) {
              logStep("WARNING: Error sending escrow payment receipt", { error: receiptError.message });
            }
          }

          // Send admin notification for sale payment
          try {
            await supabaseClient.functions.invoke("send-admin-notification", {
              body: {
                type: "sale_payment",
                data: {
                  listing_id: listingId,
                  checkout_session_id: session.id,
                  payment_intent_id: typeof session.payment_intent === 'string' 
                    ? session.payment_intent 
                    : session.payment_intent?.id,
                  buyer_id: session.metadata?.buyer_id,
                  seller_id: session.metadata?.seller_id,
                  amount: session.amount_total ? session.amount_total / 100 : null,
                  transaction_id: transactionId,
                },
              },
            });
            logStep("Admin notification sent for sale payment");
          } catch (adminNotifyError) {
            logStep("WARNING: Failed to send admin notification for sale", { error: String(adminNotifyError) });
          }
        } else if (!bookingId && !isEscrow) {
          logStep("No booking_id or escrow flag in metadata, skipping update", { sessionId: session.id });
        }
        break;
      }

      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        logStep("Processing checkout.session.expired", { sessionId: session.id });

        const bookingId = session.metadata?.booking_id;
        if (bookingId) {
          const { error: updateError } = await supabaseClient
            .from("booking_requests")
            .update({
              payment_status: "failed",
              checkout_session_id: session.id,
            })
            .eq("id", bookingId);

          if (updateError) {
            logStep("ERROR: Failed to update expired booking", { error: updateError.message });
          } else {
            logStep("Booking marked as failed (expired)", { bookingId });
          }
        }
        break;
      }

      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        logStep("Processing payment_intent.succeeded", { 
          paymentIntentId: paymentIntent.id,
          metadata: paymentIntent.metadata,
        });

        const bookingId = paymentIntent.metadata?.booking_id;
        if (bookingId) {
          // Update as backup in case checkout.session.completed didn't fire.
          // We select the row first so we can detect whether this is the first time the booking
          // transitioned to paid — if so, fire the full notification fan-out as a safety net.
          const { data: priorBooking } = await supabaseClient
            .from("booking_requests")
            .select("payment_status")
            .eq("id", bookingId)
            .maybeSingle();

          const wasUnpaid = priorBooking?.payment_status === "unpaid";

          const { error: updateError } = await supabaseClient
            .from("booking_requests")
            .update({
              payment_status: "paid",
              payment_intent_id: paymentIntent.id,
              paid_at: new Date().toISOString(),
            })
            .eq("id", bookingId)
            .eq("payment_status", "unpaid"); // Only update if not already paid

          if (updateError) {
            logStep("ERROR: Failed to update booking from payment_intent", { error: updateError.message });
          } else {
            logStep("Booking updated from payment_intent.succeeded", { bookingId, wasUnpaid });

            // Fallback notification fan-out — only runs when checkout.session.completed failed
            // to deliver and this is the first time the booking flipped to paid.
            if (wasUnpaid) {
              try {
                await supabaseClient.functions.invoke("send-booking-notification", {
                  body: { booking_id: bookingId, event_type: "paid" },
                });
                logStep("Fallback payment-received notification sent", { bookingId });
              } catch (notifyError) {
                logStep("WARNING: Fallback booking notification failed", { error: String(notifyError) });
              }
            }
          }
        }
        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        logStep("Processing payment_intent.payment_failed", { paymentIntentId: paymentIntent.id });

        const bookingId = paymentIntent.metadata?.booking_id;
        if (bookingId) {
          const { error: updateError } = await supabaseClient
            .from("booking_requests")
            .update({
              payment_status: "failed",
              payment_intent_id: paymentIntent.id,
            })
            .eq("id", bookingId);

          if (updateError) {
            logStep("ERROR: Failed to update failed payment", { error: updateError.message });
          } else {
            logStep("Booking marked as payment failed", { bookingId });
          }
        }
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        logStep("Processing charge.refunded", { chargeId: charge.id });

        const paymentIntentId = typeof charge.payment_intent === 'string' 
          ? charge.payment_intent 
          : charge.payment_intent?.id;

        if (paymentIntentId) {
          // Find the booking
          const { data: booking } = await supabaseClient
            .from("booking_requests")
            .select("id, shopper_id, host_id, total_price, listing_id")
            .eq("payment_intent_id", paymentIntentId)
            .single();

          const { error: updateError } = await supabaseClient
            .from("booking_requests")
            .update({
              payment_status: "refunded",
              status: "cancelled",
            })
            .eq("payment_intent_id", paymentIntentId);

          if (updateError) {
            logStep("ERROR: Failed to update refunded booking", { error: updateError.message });
          } else {
            logStep("Booking marked as refunded", { paymentIntentId });

            // Send refund notification emails if booking found
            if (booking) {
              const refundAmount = charge.amount_refunded / 100;

              // Get listing title
              const { data: listing } = await supabaseClient
                .from("listings")
                .select("title")
                .eq("id", booking.listing_id)
                .single();

              const listingTitle = listing?.title || "Booking";

              // Get shopper profile
              const { data: shopperProfile } = await supabaseClient
                .from("profiles")
                .select("email, full_name")
                .eq("id", booking.shopper_id)
                .single();

              // Send refund notification to shopper
              if (shopperProfile?.email) {
                try {
                  await fetch(
                    `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-refund-notification`,
                    {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
                      },
                      body: JSON.stringify({
                        email: shopperProfile.email,
                        fullName: shopperProfile.full_name || "Valued Customer",
                        bookingId: booking.id,
                        listingTitle,
                        refundAmount,
                        reason: "Booking cancelled",
                        recipientType: 'shopper',
                      }),
                    }
                  );
                  logStep("Refund notification sent to shopper via webhook", { email: shopperProfile.email });
                } catch (emailError) {
                  logStep("WARNING: Failed to send refund notification", { error: String(emailError) });
                }
              }

              // Create in-app notification
              await supabaseClient.from('notifications').insert({
                user_id: booking.shopper_id,
                type: 'refund',
                title: 'Refund Processed',
                message: `Your refund of $${refundAmount.toFixed(2)} for "${listingTitle}" has been processed.`,
                link: '/dashboard',
              });

              // Void any qualifying referrals tied to this booking
              await adjustReferralsForTransaction(supabaseClient, {
                bookingId: booking.id,
                eventId: event.id,
                newStatus: "voided",
                note: `Auto-void: rental refunded ($${refundAmount.toFixed(2)}) — payment_intent ${paymentIntentId}`,
                actionType: "void_refund",
              });
            }
          }

          // Also void referrals tied to a refunded sale_transaction
          const { data: saleTx } = await supabaseClient
            .from("sale_transactions")
            .select("id")
            .eq("payment_intent_id", paymentIntentId)
            .maybeSingle();
          if (saleTx?.id) {
            await supabaseClient
              .from("sale_transactions")
              .update({ status: "refunded" })
              .eq("id", saleTx.id);
            await adjustReferralsForTransaction(supabaseClient, {
              transactionId: saleTx.id,
              eventId: event.id,
              newStatus: "voided",
              note: `Auto-void: sale refunded — payment_intent ${paymentIntentId}`,
              actionType: "void_refund",
            });
          }

          // ===== Featured Boost refunds =====
          // Find any listing whose recorded boost payment matches this PI.
          const { data: boostedListings, error: boostLookupErr } = await supabaseClient
            .from('listings')
            .select('id, title, host_id, featured_enabled, featured_expires_at, pending_featured_payment')
            .filter('pending_featured_payment->>payment_intent_id', 'eq', paymentIntentId);

          if (boostLookupErr) {
            logStep('WARNING: boost refund lookup failed', { error: boostLookupErr.message });
          } else if (boostedListings && boostedListings.length > 0) {
            for (const listing of boostedListings) {
              const prior = (listing.pending_featured_payment || {}) as Record<string, any>;
              // Idempotency: skip if we already recorded this exact refund event
              if (prior.refund_event_id === event.id || prior.status === 'refunded') {
                logStep('Boost refund already applied — skipping', { listingId: listing.id });
                continue;
              }

              const refundAmount = (charge.amount_refunded || 0) / 100;
              const refundedAt = new Date().toISOString();
              const updatedLedger = {
                ...prior,
                status: 'refunded',
                refunded_at: refundedAt,
                refund_amount: `$${refundAmount.toFixed(2)}`,
                refund_event_id: event.id,
                refund_reason: (charge.refunds?.data?.[0]?.reason) || 'requested_by_customer',
              };

              const { error: boostUpdErr } = await supabaseClient
                .from('listings')
                .update({
                  featured_enabled: false,
                  featured_expires_at: refundedAt,
                  pending_featured_payment: updatedLedger,
                })
                .eq('id', listing.id);

              if (boostUpdErr) {
                logStep('ERROR: Failed to mark boost as refunded', { listingId: listing.id, error: boostUpdErr.message });
                continue;
              }
              logStep('Boost marked as refunded', { listingId: listing.id, refundAmount });

              // Fetch host profile for notification + email
              const { data: hostProfile } = await supabaseClient
                .from('profiles')
                .select('email, first_name, full_name')
                .eq('id', listing.host_id)
                .single();

              // In-app notification
              try {
                await supabaseClient.from('notifications').insert({
                  user_id: listing.host_id,
                  type: 'listing',
                  title: 'Featured Boost Refunded',
                  message: `Your $${refundAmount.toFixed(2)} Featured Boost for "${listing.title}" was refunded. Featured status has been removed.`,
                  link: '/transactions?tab=charges',
                });
              } catch (n) {
                logStep('WARNING: refund notification insert failed', { error: String(n) });
              }

              // Refund email
              if (hostProfile?.email) {
                try {
                  await fetch(
                    `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-transactional-email`,
                    {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
                      },
                      body: JSON.stringify({
                        templateName: 'featured-payment-refunded',
                        recipientEmail: hostProfile.email,
                        idempotencyKey: `featured-refund-${event.id}-${listing.id}`,
                        templateData: {
                          firstName: hostProfile.first_name || hostProfile.full_name?.split(' ')[0],
                          listingTitle: listing.title,
                          listingId: listing.id,
                          amount: `$${refundAmount.toFixed(2)}`,
                          refundedAt: new Date(refundedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
                          receiptId: paymentIntentId,
                          reason: updatedLedger.refund_reason,
                        },
                      }),
                    }
                  );
                  logStep('Boost refund email sent', { email: hostProfile.email });
                } catch (e) {
                  logStep('WARNING: refund email failed', { error: String(e) });
                }
              }
            }
          }
        }
        break;
      }

      case "charge.dispute.created": {
        const dispute = event.data.object as Stripe.Dispute;
        logStep("Processing charge.dispute.created", { disputeId: dispute.id });
        const paymentIntentId = typeof dispute.payment_intent === 'string'
          ? dispute.payment_intent
          : dispute.payment_intent?.id;
        if (paymentIntentId) {
          const { data: booking } = await supabaseClient
            .from("booking_requests")
            .select("id")
            .eq("payment_intent_id", paymentIntentId)
            .maybeSingle();
          const { data: saleTx } = await supabaseClient
            .from("sale_transactions")
            .select("id")
            .eq("payment_intent_id", paymentIntentId)
            .maybeSingle();
          await adjustReferralsForTransaction(supabaseClient, {
            bookingId: booking?.id ?? null,
            transactionId: saleTx?.id ?? null,
            eventId: event.id,
            newStatus: "on_hold",
            note: `Auto-hold: Stripe dispute opened (${dispute.reason ?? "unknown reason"}) on payment_intent ${paymentIntentId}`,
            actionType: "hold_dispute",
          });
        }
        break;
      }


      case "transfer.paid": {
        const transfer = event.data.object as Stripe.Transfer;
        logStep("Processing transfer.paid", { 
          transferId: transfer.id,
          amount: transfer.amount,
          destination: transfer.destination,
          metadata: transfer.metadata,
        });

        // Check if this is a rental booking payout
        const bookingId = transfer.metadata?.booking_id;
        const saleTransactionId = transfer.metadata?.sale_transaction_id;

        if (bookingId) {
          // Handle rental booking payout
          const { data: booking } = await supabaseClient
            .from("booking_requests")
            .select("*, listings(title, host_id)")
            .eq("id", bookingId)
            .single();

          if (booking) {
            const hostId = booking.listings?.host_id || booking.host_id;
            const listingTitle = booking.listings?.title || "Rental";
            const payoutAmount = transfer.amount / 100;

            // Get host profile for email
            const { data: hostProfile } = await supabaseClient
              .from("profiles")
              .select("email, full_name, display_name")
              .eq("id", hostId)
              .single();

            if (hostProfile?.email) {
              try {
                await fetch(
                  `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-payout-notification`,
                  {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
                    },
                    body: JSON.stringify({
                      hostEmail: hostProfile.email,
                      hostName: hostProfile.display_name || hostProfile.full_name || "Host",
                      payoutAmount,
                      listingTitle,
                      bookingId,
                      hostId,
                      transferId: transfer.id,
                      payoutStatus: "completed",
                      transactionType: "rental",
                    }),
                  }
                );
                logStep("Payout notification sent to host for rental", { 
                  email: hostProfile.email, 
                  amount: payoutAmount 
                });
              } catch (emailError) {
                logStep("WARNING: Failed to send rental payout notification", { error: String(emailError) });
              }
            }

            // In-app notification for successful rental payout
            try {
              await supabaseClient.from("notifications").insert({
                user_id: hostId,
                type: "payout",
                title: "💸 Payout Sent",
                message: `Your payout of $${payoutAmount.toFixed(2)} for "${listingTitle}" was sent to your bank.`,
                link: "/dashboard",
              });
            } catch (notifErr) {
              logStep("WARNING: Failed to create rental payout in-app notification", { error: String(notifErr) });
            }

            // Fire orchestrator event for payout received
            try {
              await fetch(
                `${Deno.env.get("SUPABASE_URL")}/functions/v1/concierge-orchestrator`,
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
                  },
                  body: JSON.stringify({
                    user_id: hostId,
                    event_type: "payout_received",
                    entity_id: bookingId,
                    payload: {
                      amount: payoutAmount,
                      listing_title: listingTitle,
                      transfer_id: transfer.id,
                      transaction_type: "rental",
                    },
                  }),
                }
              );
            } catch (orchErr) {
              logStep("WARNING: Orchestrator trigger failed (rental payout)", { error: String(orchErr) });
            }
          }
        } else if (saleTransactionId) {
          // Handle escrow sale payout
          const { data: saleTransaction } = await supabaseClient
            .from("sale_transactions")
            .select("*, listings(title)")
            .eq("id", saleTransactionId)
            .single();

          if (saleTransaction) {
            const sellerId = saleTransaction.seller_id;
            const listingTitle = saleTransaction.listings?.title || "Sale";
            const payoutAmount = transfer.amount / 100;

            // Get seller profile for email
            const { data: sellerProfile } = await supabaseClient
              .from("profiles")
              .select("email, full_name, display_name")
              .eq("id", sellerId)
              .single();

            if (sellerProfile?.email) {
              try {
                await fetch(
                  `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-payout-notification`,
                  {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
                    },
                    body: JSON.stringify({
                      hostEmail: sellerProfile.email,
                      hostName: sellerProfile.display_name || sellerProfile.full_name || "Seller",
                      payoutAmount,
                      listingTitle,
                      saleTransactionId,
                      hostId: sellerId,
                      transferId: transfer.id,
                      payoutStatus: "completed",
                      transactionType: "sale",
                    }),
                  }
                );
                logStep("Payout notification sent to seller for sale", { 
                  email: sellerProfile.email, 
                  amount: payoutAmount 
                });
              } catch (emailError) {
                logStep("WARNING: Failed to send sale payout notification", { error: String(emailError) });
              }
            }

            // Update sale transaction with payout completion
            await supabaseClient
              .from("sale_transactions")
              .update({
                payout_completed_at: new Date().toISOString(),
                transfer_id: transfer.id,
              })
              .eq("id", saleTransactionId);

            logStep("Sale transaction updated with payout completion", { saleTransactionId });

            // In-app notification for successful sale payout
            try {
              await supabaseClient.from("notifications").insert({
                user_id: sellerId,
                type: "payout",
                title: "💸 Payout Sent",
                message: `Your payout of $${payoutAmount.toFixed(2)} for "${listingTitle}" was sent to your bank.`,
                link: "/dashboard",
              });
            } catch (notifErr) {
              logStep("WARNING: Failed to create sale payout in-app notification", { error: String(notifErr) });
            }
          }
        } else {
          // Try to find by destination account
          const destinationAccount = typeof transfer.destination === 'string' 
            ? transfer.destination 
            : transfer.destination?.id;

          if (destinationAccount) {
            const { data: hostProfile } = await supabaseClient
              .from("profiles")
              .select("id, email, full_name, display_name")
              .eq("stripe_account_id", destinationAccount)
              .single();

            if (hostProfile?.email) {
              const payoutAmount = transfer.amount / 100;
              try {
                await fetch(
                  `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-payout-notification`,
                  {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
                    },
                    body: JSON.stringify({
                      hostEmail: hostProfile.email,
                      hostName: hostProfile.display_name || hostProfile.full_name || "Host",
                      payoutAmount,
                      listingTitle: "Payout",
                      hostId: hostProfile.id,
                      transferId: transfer.id,
                      payoutStatus: "completed",
                      transactionType: "payout",
                    }),
                  }
                );
                logStep("Generic payout notification sent", { 
                  email: hostProfile.email, 
                  amount: payoutAmount 
                });
              } catch (emailError) {
                logStep("WARNING: Failed to send generic payout notification", { error: String(emailError) });
              }
            }
          }
        }
        break;
      }

      case "transfer.failed": {
        const transfer = event.data.object as Stripe.Transfer;
        logStep("Processing transfer.failed", { 
          transferId: transfer.id,
          metadata: transfer.metadata,
        });

        const bookingId = transfer.metadata?.booking_id;
        const saleTransactionId = transfer.metadata?.sale_transaction_id;
        
        // Determine recipient and send failure notification
        let recipientId: string | null = null;
        let listingTitle = "Transaction";
        
        if (bookingId) {
          const { data: booking } = await supabaseClient
            .from("booking_requests")
            .select("host_id, listings(title)")
            .eq("id", bookingId)
            .single();
          if (booking) {
            recipientId = booking.host_id;
            const listingsData = booking.listings as unknown as { title: string } | null;
            listingTitle = listingsData?.title || "Rental";
          }
        } else if (saleTransactionId) {
          const { data: sale } = await supabaseClient
            .from("sale_transactions")
            .select("seller_id, listings(title)")
            .eq("id", saleTransactionId)
            .single();
          if (sale) {
            recipientId = sale.seller_id;
            const listingsData = sale.listings as unknown as { title: string } | null;
            listingTitle = listingsData?.title || "Sale";
          }
        }

        if (recipientId) {
          const { data: profile } = await supabaseClient
            .from("profiles")
            .select("email, full_name, display_name")
            .eq("id", recipientId)
            .single();

          if (profile?.email) {
            try {
              await fetch(
                `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-payout-notification`,
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
                  },
                  body: JSON.stringify({
                    hostEmail: profile.email,
                    hostName: profile.display_name || profile.full_name || "User",
                    payoutAmount: transfer.amount / 100,
                    listingTitle,
                    hostId: recipientId,
                    transferId: transfer.id,
                    payoutStatus: "failed",
                    transactionType: bookingId ? "rental" : "sale",
                  }),
                }
              );
              logStep("Failed payout notification sent", { email: profile.email });
            } catch (emailError) {
              logStep("WARNING: Failed to send failed payout notification", { error: String(emailError) });
            }
          }

          // Create in-app notification for failed payout
          await supabaseClient.from("notifications").insert({
            user_id: recipientId,
            type: "payout_failed",
            title: "Payout Failed",
            message: `Your payout of $${(transfer.amount / 100).toFixed(2)} for "${listingTitle}" could not be processed. Please check your Stripe account settings.`,
            link: "/dashboard",
          });
        }
        break;
      }

      case "account.updated": {
        // Stripe Connect account status sync (Express accounts)
        const account = event.data.object as Stripe.Account;
        logStep("Processing account.updated", {
          accountId: account.id,
          detailsSubmitted: account.details_submitted,
          payoutsEnabled: account.payouts_enabled,
          chargesEnabled: account.charges_enabled,
        });

        // Look up which user owns this connected account
        const { data: profile } = await supabaseClient
          .from("profiles")
          .select("id, stripe_onboarding_complete, email, display_name, full_name")
          .eq("stripe_account_id", account.id)
          .maybeSingle();

        if (!profile) {
          logStep("account.updated: no matching profile", { accountId: account.id });
          break;
        }

        const isComplete = Boolean(account.details_submitted);
        const wasComplete = Boolean(profile.stripe_onboarding_complete);

        await supabaseClient
          .from("profiles")
          .update({ stripe_onboarding_complete: isComplete })
          .eq("id", profile.id);

        // First-time completion: notify the user their payouts are live
        if (isComplete && !wasComplete) {
          await supabaseClient.from("notifications").insert({
            user_id: profile.id,
            type: "stripe_connect_complete",
            title: "Payouts activated",
            message: "Your Stripe account is verified. You can now receive payouts from Vendibook.",
            link: "/dashboard",
          });
          logStep("Stripe onboarding marked complete", { userId: profile.id });
        }

        // If Stripe disabled payouts (requirements re-opened), warn the user
        if (wasComplete && !account.payouts_enabled) {
          await supabaseClient.from("notifications").insert({
            user_id: profile.id,
            type: "stripe_connect_action_required",
            title: "Stripe needs more info",
            message: "Stripe temporarily paused your payouts and needs additional information. Open your dashboard to resolve it.",
            link: "/dashboard",
          });
          logStep("Payouts disabled, user notified", { userId: profile.id });
        }
        break;
      }

      default:
        logStep("Unhandled event type", { type: event.type });
    }


    return new Response(JSON.stringify({ received: true }), {
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
