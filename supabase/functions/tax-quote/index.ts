import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { corsHeaders, jsonError, jsonResponse, unknownErrorResponse } from "../_shared/jsonError.ts";
import {
  parseStateZipFromAddress,
  quoteSalesTax,
  type TaxDestination,
  type TaxKind,
} from "../_shared/tax.ts";

const RENTER_FEE_PERCENT = 12.9;

/**
 * Read-only estimated sales-tax quote for checkout UIs. Returns the SAME math
 * paypal-create-order applies authoritatively at payment time, so the buyer
 * sees the real total before the PayPal window opens.
 *
 * Anonymous-safe: exposes nothing beyond a tax estimate on a public listing
 * or catalog product.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return jsonError(405, "method_not_allowed", "Use POST.");
  }

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const body = await req.json().catch(() => ({}));
    const kind = String(body?.kind ?? "") as TaxKind;

    let amountCents = 0;
    let destination: TaxDestination = {};

    if (kind === "sale") {
      const listingId = body?.listing_id ? String(body.listing_id) : null;
      if (!listingId) return jsonError(400, "missing_fields", "Missing listing id.");
      const { data: listing } = await admin
        .from("listings")
        .select("price_sale, city, state, address")
        .eq("id", listingId)
        .maybeSingle();
      if (!listing) return jsonError(404, "not_found", "We couldn't find that listing.");

      const deliveryFeeCents = Math.max(0, Math.round(Number(body?.delivery_fee_cents ?? 0)));
      amountCents = Math.max(0, Math.round(Number(listing.price_sale ?? 0) * 100)) + deliveryFeeCents;

      const delivers = body?.fulfillment_type === "delivery" ||
        body?.fulfillment_type === "vendibook_freight";
      const parsed = delivers
        ? {
          state: body?.delivery_state ? String(body.delivery_state) : null,
          zip: body?.delivery_zip ? String(body.delivery_zip) : null,
        }
        : { state: null, zip: null };
      if (delivers && !parsed.state && typeof body?.delivery_address === "string") {
        const fromText = parseStateZipFromAddress(body.delivery_address);
        parsed.state = fromText.state;
        parsed.zip = fromText.zip;
      }
      const listingLoc = parseStateZipFromAddress(listing.address);
      destination = {
        state: parsed.state ?? listing.state ?? null,
        zip: parsed.zip ?? listingLoc.zip ?? null,
        city: listing.city ?? null,
      };
    } else if (kind === "rental") {
      const listingId = body?.listing_id ? String(body.listing_id) : null;
      if (!listingId) return jsonError(400, "missing_fields", "Missing listing id.");
      const { data: listing } = await admin
        .from("listings")
        .select("city, state, address")
        .eq("id", listingId)
        .maybeSingle();
      if (!listing) return jsonError(404, "not_found", "We couldn't find that listing.");

      // Caller passes the guest-facing total (incl. renter service fee); tax
      // applies to the rental subtotal only — never the fee or the deposit.
      const totalCents = Math.max(0, Math.round(Number(body?.total_cents ?? 0)));
      amountCents = Math.round(totalCents / (1 + RENTER_FEE_PERCENT / 100));
      const listingLoc = parseStateZipFromAddress(listing.address);
      destination = {
        state: listing.state ?? null,
        zip: listingLoc.zip ?? null,
        city: listing.city ?? null,
      };
    } else if (kind === "product") {
      const slug = body?.slug ? String(body.slug) : null;
      if (!slug) return jsonError(400, "missing_fields", "Missing product slug.");
      const { data: product } = await admin
        .from("monetization_products")
        .select("price_cents, promo_price_cents, promo_starts_at, promo_ends_at, is_active")
        .eq("slug", slug)
        .eq("is_active", true)
        .maybeSingle();
      if (!product) return jsonError(404, "not_found", "That product is no longer available.");
      const now = Date.now();
      const promoActive = product.promo_price_cents &&
        (!product.promo_starts_at || new Date(product.promo_starts_at).getTime() <= now) &&
        (!product.promo_ends_at || new Date(product.promo_ends_at).getTime() >= now);
      amountCents = promoActive ? product.promo_price_cents : product.price_cents;

      // Buyer location from their profile when signed in; otherwise no
      // destination → estimate shows $0 and tax is resolved at payment time.
      const authHeader = req.headers.get("Authorization");
      if (authHeader) {
        const { data: userData } = await admin.auth.getUser(
          authHeader.replace("Bearer ", ""),
        );
        if (userData?.user) {
          const { data: profile } = await admin
            .from("profiles")
            .select("state, zip_code, city")
            .eq("id", userData.user.id)
            .maybeSingle();
          destination = {
            state: profile?.state ?? null,
            zip: profile?.zip_code ?? null,
            city: profile?.city ?? null,
          };
        }
      }
    } else {
      return jsonError(400, "invalid_kind", "Unsupported quote type.");
    }

    if (amountCents <= 0) {
      return jsonError(400, "invalid_amount", "There's no taxable amount.");
    }

    const tax = await quoteSalesTax({ amountCents, destination, kind });

    return jsonResponse(200, {
      tax_cents: tax.taxCents,
      rate_pct: tax.ratePct,
      state: tax.state,
      source: tax.source,
      label: tax.label,
      taxable_amount_cents: tax.taxableAmountCents,
    });
  } catch (err) {
    return unknownErrorResponse(err);
  }
});
