import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

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
          const paymentIntentId = typeof session.payment_intent === 'string' 
            ? session.payment_intent 
            : session.payment_intent?.id;
          
          // Get the charge ID from the payment intent for deposit tracking
          let depositChargeId: string | null = null;
          if (depositAmount > 0 && paymentIntentId) {
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
              payment_status: "paid",
              checkout_session_id: session.id,
              payment_intent_id: paymentIntentId,
              paid_at: new Date().toISOString(),
              // Security deposit tracking - set to 'charged' when payment is made
              ...(depositAmount > 0 && {
                deposit_amount: depositAmount,
                deposit_status: 'charged',
                deposit_charge_id: depositChargeId,
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
                      amount: bookingData.total_price,
                      paymentMethod: "Card",
                      transactionType: "rental",
                      startDate: bookingData.start_date,
                      endDate: bookingData.end_date,
                      address: bookingData.listings?.address || bookingData.address_snapshot,
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

            // Send payment confirmation notification to host
            try {
              await supabaseClient.functions.invoke("send-booking-notification", {
                body: { booking_id: bookingId, event_type: "payment_received" },
              });
              logStep("Payment notification sent", { bookingId });
            } catch (notifyError) {
              logStep("WARNING: Failed to send notification", { error: String(notifyError) });
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
            const platformFee = platformFeeStr ? Number(platformFeeStr) : amount * 0.15;
            const sellerPayout = sellerPayoutStr ? Number(sellerPayoutStr) : amount - platformFee;
            
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

              // Create in-app notification for buyer
              try {
                await supabaseClient.from("notifications").insert({
                  user_id: buyerId,
                  type: "purchase",
                  title: "Purchase Confirmed",
                  message: `Your payment of $${amount.toFixed(2)} for "${listing?.title || 'item'}" has been confirmed. View your purchase in Transactions.`,
                  link: "/transactions?tab=purchases",
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
                  title: "New Sale!",
                  message: `Someone purchased "${listing?.title || 'your item'}" for $${amount.toFixed(2)}. View it in your Transactions.`,
                  link: "/transactions?tab=purchases",
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
          // Update as backup in case checkout.session.completed didn't fire
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
            logStep("Booking updated from payment_intent.succeeded", { bookingId });
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
            }
          }
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
