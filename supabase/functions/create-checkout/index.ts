import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { corsHeaders, jsonError, jsonResponse, unknownErrorResponse } from "../_shared/jsonError.ts";

// Commission rates
const RENTAL_HOST_FEE_PERCENT = 12.9; // 12.9% from host
const RENTAL_RENTER_FEE_PERCENT = 12.9; // 12.9% platform fee from renter
const SALE_SELLER_FEE_PERCENT = 12.9; // 12.9% from seller on sales

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
  deposit_amount?: number; // Security deposit in dollars (rentals only)
  // Sale-specific fields
  fulfillment_type?: 'pickup' | 'delivery' | 'vendibook_freight';
  delivery_address?: string | null;
  delivery_instructions?: string | null;
  buyer_name?: string;
  buyer_email?: string;
  buyer_phone?: string | null;
  // Vendibook freight fields
  vendibook_freight_enabled?: boolean;
  freight_payer?: 'buyer' | 'seller';
  freight_cost?: number; // Estimated freight cost in dollars
  // Referral attribution (manual code entered at checkout; cookie attribution is on the user's profile)
  referral_code?: string;
  // Optional draft transaction_terms id from create-transaction-terms-draft.
  // When present we reuse it (flip status → active) instead of inserting a
  // fresh terms row, preserving the acknowledgement stamp written by
  // acknowledge-terms in the FinalReviewSheet flow.
  terms_id?: string | null;
  // 'custom' → embedded Stripe Custom Checkout (client_secret returned).
  // 'hosted' → redirect Checkout Session (url returned).
  // 'elements' is accepted as a backward-compatible alias for 'custom'.
  ui_mode?: 'hosted' | 'custom' | 'elements';
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");


    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonError(401, "unauthenticated", "You must be signed in to check out.");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) return jsonError(401, "unauthenticated", `Authentication error: ${userError.message}`);

    const user = userData.user;
    if (!user?.email) return jsonError(401, "unauthenticated", "User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const body: CheckoutRequest = await req.json();
    const { 
      booking_id, 
      listing_id, 
      mode, 
      amount, 
      delivery_fee: rawDeliveryFee,
      deposit_amount: rawDepositAmount,
      fulfillment_type,
      delivery_address,
      delivery_instructions,
      buyer_name,
      buyer_email,
      buyer_phone,
      vendibook_freight_enabled = false,
      freight_payer = 'buyer',
      freight_cost: rawFreightCost,
      referral_code: rawReferralCode,
      terms_id: draftTermsId,
      ui_mode: uiModeRaw,
    } = body;
    // Accept 'elements' as a backward-compatible alias for 'custom'.
    const uiMode: 'hosted' | 'custom' = (uiModeRaw === 'custom' || uiModeRaw === 'elements') ? 'custom' : 'hosted';
    const referral_code = rawReferralCode ? String(rawReferralCode).trim().toUpperCase().slice(0, 32) : '';
    
    // Handle null values from request body (null !== undefined, so defaults don't apply)
    const delivery_fee = rawDeliveryFee ?? 0;
    const deposit_amount = rawDepositAmount ?? 0;
    const freight_cost = rawFreightCost ?? 0;
    
    logStep("Request received", { 
      booking_id, listing_id, mode, amount, delivery_fee, deposit_amount, fulfillment_type,
      vendibook_freight_enabled, freight_payer, freight_cost,
    });

    if (!listing_id || !mode || !amount) {
      return jsonError(400, "missing_fields", "Missing required fields: listing_id, mode, or amount");
    }

    // Fetch listing to get host's Stripe account and details for checkout display
    const { data: listing, error: listingError } = await supabaseClient
      .from('listings')
      .select('host_id, title, cover_image_url, address, pickup_location_text, city, state, category, mode')
      .eq('id', listing_id)
      .single();

    if (listingError || !listing) {
      return jsonError(404, "listing_not_found", "Listing not found");
    }
    logStep("Listing found", { host_id: listing.host_id, title: listing.title });

    // Owner cannot buy/rent their own listing.
    if (listing.host_id === user.id) {
      return jsonError(403, "owner_cannot_buy_own_listing", "You can't purchase your own listing.");
    }

    // Host display name for the checkout summary. Vendibook is the merchant
    // of record on PayPal and pays hosts out from `seller_payables`, so a
    // connected provider account is no longer required to accept a booking.
    const { data: hostProfile } = await supabaseClient
      .from('profiles')
      .select('display_name, business_name, full_name')
      .eq('id', listing.host_id)
      .maybeSingle();
    
    // Get host display name for checkout
    const hostDisplayName = hostProfile?.business_name || hostProfile?.display_name || hostProfile?.full_name || 'Host';
    
    // Fetch booking details if booking_id provided (for rentals)
    let bookingDetails: { start_date: string; end_date: string; start_time?: string; end_time?: string } | null = null;
    if (booking_id) {
      const { data: booking } = await supabaseClient
        .from('booking_requests')
        .select('start_date, end_date, start_time, end_time, is_hourly_booking, hourly_slots, slot_number')
        .eq('id', booking_id)
        .single();
      
      if (booking) {
        bookingDetails = booking;
        logStep("Booking details fetched", { 
          start_date: booking.start_date, 
          end_date: booking.end_date,
          start_time: booking.start_time,
          end_time: booking.end_time 
        });

        // === Availability guard for rentals: prevent double-booking ===
        if (mode === 'rent') {
          const { data: availability, error: availErr } = await supabaseClient.rpc(
            'check_booking_availability',
            {
              p_listing_id: listing_id,
              p_start_date: booking.start_date,
              p_end_date: booking.end_date,
              p_is_hourly_booking: (booking as { is_hourly_booking?: boolean }).is_hourly_booking ?? false,
              p_hourly_slots: (booking as { hourly_slots?: unknown }).hourly_slots ?? null,
              p_slot_number: (booking as { slot_number?: number }).slot_number ?? null,
              p_exclude_booking_id: booking_id,
            }
          );

          if (availErr) {
            logStep("Availability RPC error", { error: availErr.message });
          } else if (availability && (availability as { available?: boolean }).available === false) {
            const reason = (availability as { error?: string }).error || 'This time is no longer available.';
            logStep("Availability conflict", { reason });
            return jsonError(409, "availability_conflict", reason);
          }
        }
      }
    }

    
    // Build location string for display
    const locationDisplay = listing.address || listing.pickup_location_text || '';

    const origin = req.headers.get("origin") || "https://vendibook.com";
    
    // Generate idempotency key to prevent duplicate charges on retries
    const idempotencyKey = `checkout_${user.id}_${listing_id}_${mode}_${Date.now()}`;

    // Calculate fees based on mode
    let customerTotal: number; // What the customer pays (in cents)
    let applicationFee: number; // Platform fee (in cents)
    let hostReceives: number; // What host gets after platform fee (in cents)

    if (mode === 'rent') {
      // Rentals: Dual-sided commission
      // Base price + delivery = subtotal (deposit is separate, refundable)
      const subtotal = amount + delivery_fee;
      
      // Customer pays: subtotal + 12.9% platform fee + deposit
      const renterFee = subtotal * (RENTAL_RENTER_FEE_PERCENT / 100);
      // Deposit is added to total but NOT included in fee calculations
      customerTotal = Math.round((subtotal + renterFee + deposit_amount) * 100);
      
      // Host fee: 12.9% of subtotal (not deposit)
      const hostFee = subtotal * (RENTAL_HOST_FEE_PERCENT / 100);
      
      // Total platform revenue = renter fee + host fee (deposit not included)
      applicationFee = Math.round((renterFee + hostFee) * 100);
      
      // Host receives subtotal minus their 12.9% fee (deposit held separately)
      hostReceives = Math.round((subtotal - hostFee) * 100);
      
      logStep("Rental fee calculation", {
        subtotal,
        deposit_amount,
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
      
      // Vendibook Freight handling
      const isVendibookFreight = vendibook_freight_enabled && fulfillment_type === 'vendibook_freight';
      const isBuyerPaidFreight = isVendibookFreight && freight_payer === 'buyer';
      const isSellerPaidFreight = isVendibookFreight && freight_payer === 'seller';
      const freightAmount = isVendibookFreight ? freight_cost : 0;
      
      // Customer pays: sale price + delivery fee + freight (if buyer-paid)
      // If seller-paid freight, buyer sees $0 freight but seller pays from payout
      const buyerFreightCost = isBuyerPaidFreight ? freightAmount : 0;
      const totalSalePrice = salePrice + saleDeliveryFee + buyerFreightCost;
      customerTotal = Math.round(totalSalePrice * 100);
      
      // Seller pays 12.9% fee on the sale price (not on delivery or freight)
      const sellerFee = salePrice * (SALE_SELLER_FEE_PERCENT / 100);
      applicationFee = Math.round(sellerFee * 100);
      
      // Seller receives: sale price - 12.9% fee + delivery fee - seller-paid freight
      const sellerFreightDeduction = isSellerPaidFreight ? freightAmount : 0;
      hostReceives = Math.round((salePrice - sellerFee + saleDeliveryFee - sellerFreightDeduction) * 100);
      
      logStep("Sale fee calculation (escrow)", {
        salePrice,
        saleDeliveryFee,
        totalSalePrice,
        sellerFee: sellerFee.toFixed(2),
        customerTotal: (customerTotal / 100).toFixed(2),
        applicationFee: (applicationFee / 100).toFixed(2),
        hostReceives: (hostReceives / 100).toFixed(2),
        // Vendibook freight details
        isVendibookFreight,
        isBuyerPaidFreight,
        isSellerPaidFreight,
        freightAmount,
        buyerFreightCost,
        sellerFreightDeduction,
      });
    }

    // -------- Persist immutable transaction-terms snapshot --------
    // This mirrors src/lib/transactionTerms.ts (buildTerms) so the buyer
    // sees the same numbers/policies in the summary card, details modal,
    // price breakdown, final-review sheet, Stripe checkout, and receipt
    // email.
    const TERMS_VERSION = 'v1';
    const centsFrom = (n: number) => Math.round(Math.max(0, Number(n || 0)) * 100);
    const requiredDocsRes = await supabaseClient
      .from('listing_required_documents')
      .select('document_type')
      .eq('listing_id', listing_id);
    const requiredDocuments: string[] = (requiredDocsRes.data || [])
      .map((d) => String((d as { document_type?: string }).document_type || '').trim())
      .filter(Boolean);

    const snapshotLines: Array<{ label: string; amountCents: number; kind: string; hint?: string }> = [];
    if (mode === 'rent') {
      snapshotLines.push({ label: 'Rental', amountCents: centsFrom(amount) - centsFrom(delivery_fee) < 0 ? centsFrom(amount) : centsFrom(amount), kind: 'base' });
      if (delivery_fee > 0) snapshotLines.push({ label: 'Delivery', amountCents: centsFrom(delivery_fee), kind: 'delivery' });
      const rSubtotal = amount + delivery_fee;
      const rFee = rSubtotal * (RENTAL_RENTER_FEE_PERCENT / 100);
      snapshotLines.push({ label: 'Service fee (12.9%)', amountCents: centsFrom(rFee), kind: 'fee', hint: 'Vendibook marketplace fee. Non-refundable once the booking is confirmed.' });
      if (deposit_amount > 0) snapshotLines.push({ label: 'Refundable security deposit', amountCents: centsFrom(deposit_amount), kind: 'deposit', hint: 'Held on your card and released within 24 hours after the rental ends if there is no damage or late return.' });
      snapshotLines.push({ label: 'Total due today', amountCents: customerTotal, kind: 'total' });
    } else {
      snapshotLines.push({ label: listing.title || 'Item price', amountCents: centsFrom(amount), kind: 'base' });
      const isSellerPaid = Boolean(vendibook_freight_enabled && freight_payer === 'seller');
      const buyerDelivery = isSellerPaid ? 0 : (delivery_fee || 0);
      if (buyerDelivery > 0) snapshotLines.push({ label: 'Delivery / freight', amountCents: centsFrom(buyerDelivery), kind: 'delivery' });
      snapshotLines.push({ label: 'Buyer fee', amountCents: 0, kind: 'fee', hint: 'Vendibook does not charge buyers a fee on card sales.' });
      snapshotLines.push({ label: 'Total due today', amountCents: customerTotal, kind: 'total' });
    }

    const defaultCancellation = mode === 'sale'
      ? 'Sales are escrow-protected. Funds are held by Vendibook and released to the seller 25 days after you confirm the item is as described. Open a dispute from your order page if something is wrong.'
      : 'Free cancellation is not automatic. Contact the host to request a refund. Deposits are refunded within 24 hours after the rental ends if there is no damage or late return. Platform service fees are non-refundable once a booking is confirmed.';

    const snapshot = {
      termsVersion: TERMS_VERSION,
      mode,
      paymentMethod: 'stripe_card',
      listing: {
        id: listing_id,
        title: listing.title,
        coverImageUrl: listing.cover_image_url ?? null,
        hostId: listing.host_id,
        location: [listing.city, listing.state].filter(Boolean).join(', ') || null,
      },
      buyer: { id: user.id, email: user.email, name: buyer_name ?? null },
      schedule: bookingDetails
        ? {
            startDate: bookingDetails.start_date ?? null,
            endDate: bookingDetails.end_date ?? null,
            startTime: bookingDetails.start_time ?? null,
            endTime: bookingDetails.end_time ?? null,
            hourlySlots: null,
            slotNumber: null,
          }
        : {
            startDate: null,
            endDate: null,
            startTime: null,
            endTime: null,
            hourlySlots: null,
            slotNumber: null,
          },
      fulfillment: { type: fulfillment_type ?? null },
      pricing: {
        subtotalCents: centsFrom(amount),
        deliveryCents: centsFrom(delivery_fee),
        renterFeeCents: mode === 'rent' ? centsFrom((amount + delivery_fee) * (RENTAL_RENTER_FEE_PERCENT / 100)) : 0,
        commissionCents: mode === 'rent'
          ? centsFrom((amount + delivery_fee) * (RENTAL_HOST_FEE_PERCENT / 100))
          : centsFrom(amount * (SALE_SELLER_FEE_PERCENT / 100)),
        depositCents: centsFrom(deposit_amount),
        totalCents: customerTotal,
        currency: 'usd',
        lines: snapshotLines,
      },
      policies: {
        cancellation: defaultCancellation,
        rules: null,
        requiredDocuments,
        acknowledgements: [
          mode === 'rent'
            ? `You are booking "${listing.title}" for the dates shown above.`
            : `You are buying "${listing.title}" from the seller.`,
          mode === 'rent'
            ? 'Your card is authorized now; funds are held by Vendibook until 24 hours after the rental ends.'
            : 'Your card is charged now; funds are held in escrow and released to the seller 25 days after you confirm the item.',
          ...(mode === 'rent' && deposit_amount > 0
            ? [`A refundable $${deposit_amount.toFixed(2)} security deposit is included in your total.`]
            : []),
          ...(requiredDocuments.length
            ? [`You will need to provide: ${requiredDocuments.join(', ')}.`]
            : []),
        ],
      },
    };

    // If the client passed a draft terms_id from FinalReviewSheet, reuse it
    // (flip status → active) so the acknowledged_at stamp is preserved.
    // Otherwise insert a fresh authoritative row.
    let terms_id: string;
    if (draftTermsId) {
      const { data: updated, error: updErr } = await supabaseClient
        .from('transaction_terms')
        .update({
          status: 'active',
          booking_id: booking_id || null,
          total_cents: customerTotal,
          subtotal_cents: centsFrom(amount),
          deposit_cents: centsFrom(deposit_amount),
          commission_cents: snapshot.pricing.commissionCents,
          renter_fee_cents: snapshot.pricing.renterFeeCents,
          snapshot,
        })
        .eq('id', draftTermsId)
        .eq('buyer_id', user.id)
        .eq('listing_id', listing_id)
        .select('id')
        .maybeSingle();
      if (updErr || !updated) {
        logStep('Draft terms activation failed', { error: updErr?.message, draftTermsId });
        return jsonError(409, "terms_draft_invalid", `Could not activate the terms draft: ${updErr?.message || 'not found'}`);
      }
      terms_id = updated.id;
      logStep('Terms snapshot activated from draft', { terms_id });
    } else {
      const { data: termsRow, error: termsError } = await supabaseClient
        .from('transaction_terms')
        .insert({
          listing_id,
          booking_id: booking_id || null,
          buyer_id: user.id,
          host_id: listing.host_id,
          snapshot,
          total_cents: customerTotal,
          subtotal_cents: centsFrom(amount),
          deposit_cents: centsFrom(deposit_amount),
          commission_cents: snapshot.pricing.commissionCents,
          renter_fee_cents: snapshot.pricing.renterFeeCents,
          terms_version: TERMS_VERSION,
          payment_method: 'stripe_card',
          transaction_mode: mode,
          status: 'active',
        })
        .select('id')
        .single();
      if (termsError || !termsRow) {
        logStep('Terms snapshot insert failed', { error: termsError?.message });
        throw new Error(`Failed to record transaction terms: ${termsError?.message || 'unknown'}`);
      }
      terms_id = termsRow.id;
      logStep('Terms snapshot written', { terms_id });
    }



    // ------------------------------------------------------------------
    // PayPal is the only live payment provider. Everything above (ownership,
    // availability, pricing, terms snapshot) still runs server-side; we now
    // hand the buyer to Vendibook's own hosted PayPal checkout, where
    // `paypal-create-order` re-derives the authoritative amount from the
    // booking row before an order can exist.
    // ------------------------------------------------------------------
    if (mode !== 'rent' || !booking_id) {
      return jsonError(
        409,
        "unsupported_checkout",
        "This purchase is completed on the listing's checkout page.",
      );
    }

    const successPath = `/payment-success?booking_id=${booking_id}`;
    const cancelPath = `/payment-cancelled?listing=${listing_id}`;
    const hostedUrl = `${origin}/checkout/pay?kind=booking&id=${encodeURIComponent(booking_id)}` +
      `&amount_cents=${customerTotal}` +
      `&label=${encodeURIComponent(listing.title ?? 'Vendibook booking')}` +
      `&success=${encodeURIComponent(successPath)}&cancel=${encodeURIComponent(cancelPath)}`;

    logStep("Hosted PayPal checkout issued", { booking_id, customerTotal });

    return jsonResponse(200, {
      url: hostedUrl,
      provider: "paypal",
      ui_mode: "hosted",
      client_secret: null,
      session_id: null,
      customer_total: customerTotal / 100,
      platform_fee: applicationFee / 100,
      host_receives: hostReceives / 100,
      terms_id,
      terms_version: TERMS_VERSION,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return unknownErrorResponse(error);
  }
});
