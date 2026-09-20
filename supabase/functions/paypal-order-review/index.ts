import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { corsHeaders, jsonError, jsonResponse, unknownErrorResponse } from "../_shared/jsonError.ts";
import { getPayPalOrder, PayPalError } from "../_shared/paypal.ts";

/**
 * Read-only companion to `paypal-capture-order`.
 *
 * After the payer approves at PayPal the buyer is shown a final
 * "Review & authorize" step. This endpoint supplies exactly what that screen
 * needs — the approved funding method, the amount, and the order summary
 * re-derived from OUR database — and never moves money. Capture stays a
 * separate, explicitly named operation behind the Submit payment button.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonError(401, "unauthenticated", "Please sign in to continue.");
    const { data: userData } = await admin.auth.getUser(authHeader.replace("Bearer ", ""));
    const user = userData?.user;
    if (!user) return jsonError(401, "unauthenticated", "Your session expired.");

    const body = await req.json().catch(() => ({}));
    const orderId = typeof body?.order_id === "string" ? body.order_id : "";
    const reference = typeof body?.reference === "string" ? body.reference : "";
    if (!orderId && !reference) return jsonError(400, "missing_fields", "Missing order id.");

    let query = admin.from("payment_records").select("*");
    query = orderId ? query.eq("paypal_order_id", orderId) : query.eq("reference", reference);
    const { data: record } = await query.maybeSingle();

    if (!record) return jsonError(404, "not_found", "We couldn't find that payment.");
    if (record.buyer_id !== user.id) {
      return jsonError(403, "forbidden", "This payment belongs to another account.");
    }

    // Provider truth for the approval state and the chosen funding source.
    let order: any = null;
    try {
      order = record.paypal_order_id ? await getPayPalOrder(record.paypal_order_id) : null;
    } catch (_err) {
      order = null;
    }

    // ---- Listing context (photo / title / description) -------------------
    let listing: Record<string, unknown> | null = null;
    if (record.listing_id) {
      const { data } = await admin
        .from("listings")
        .select("title, description, cover_image_url, make, model, city, state, amenities")
        .eq("id", record.listing_id)
        .maybeSingle();
      if (data) {
        listing = {
          title: data.title ?? null,
          description: typeof data.description === "string" ? data.description.slice(0, 400) : null,
          image_url: data.cover_image_url ?? null,
          subtitle: [data.make, data.model].filter(Boolean).join(" ") || null,
          location: [data.city, data.state].filter(Boolean).join(", ") || null,
          features: Array.isArray(data.amenities) ? data.amenities.filter(Boolean).slice(0, 8) : [],
        };
      }
    }

    // ---- Summary lines: OUR numbers, never PayPal's echo ------------------
    const feeLines = Array.isArray((record.fee_breakdown as any)?.lines)
      ? ((record.fee_breakdown as any).lines as any[])
      : [];
    const lines = feeLines
      .filter((line) => line && typeof line.label === "string")
      .map((line) => ({
        label: String(line.label),
        amount_cents: Number(line.amountCents ?? line.amount_cents ?? 0),
      }));

    return jsonResponse(200, {
      reference: record.reference,
      order_id: record.paypal_order_id,
      // Where OUR record stands. `completed` means the receipt is the right
      // destination and this screen must not offer to capture again.
      record_status: record.payment_status,
      provider_reason: record.last_error?.issue ?? record.last_error?.reason ?? null,
      // Where PayPal says the order stands: APPROVED means awaiting capture.
      order_status: order?.status ?? null,
      payment_intent: record.payment_intent ?? "CAPTURE",
      currency: record.currency ?? "USD",
      amount_cents: record.gross_amount_cents ?? 0,
      tax_cents: record.tax_cents ?? 0,
      discount_cents: record.discount_cents ?? 0,
      lines,
      funding: describeFunding(order),
      fulfillment: {
        method: (record.metadata as any)?.fulfillment_method ??
          (record.shipping_address ? "delivery" : null),
        address: record.shipping_address ?? null,
      },
      transaction_type: record.transaction_type,
      listing,
    });
  } catch (err) {
    if (err instanceof PayPalError) {
      return jsonError(502, "paypal_error", "We couldn't reach PayPal. Please try again.");
    }
    return unknownErrorResponse(err);
  }
});

/**
 * Display-only description of what the payer approved with. Nothing sensitive
 * beyond a card's last four digits is ever returned.
 */
function describeFunding(order: any): {
  method: string;
  label: string;
  email: string | null;
  brand: string | null;
  last4: string | null;
} {
  const source = order?.payment_source ?? {};
  if (source.card) {
    const brand = typeof source.card.brand === "string" ? titleCase(source.card.brand) : "Card";
    const last4 = typeof source.card.last_digits === "string" ? source.card.last_digits : null;
    return {
      method: "card",
      label: last4 ? `${brand} ending ${last4}` : brand,
      email: null,
      brand,
      last4,
    };
  }
  if (source.venmo) {
    const handle = source.venmo.user_name ? `@${source.venmo.user_name}` : null;
    return {
      method: "venmo",
      label: handle ? `Venmo (${handle})` : "Venmo",
      email: source.venmo.email_address ?? null,
      brand: null,
      last4: null,
    };
  }
  if (source.paypal) {
    return {
      method: "paypal",
      label: "PayPal",
      email: source.paypal.email_address ?? null,
      brand: null,
      last4: null,
    };
  }
  return { method: "unknown", label: "PayPal", email: null, brand: null, last4: null };
}

function titleCase(value: string): string {
  return value
    .toLowerCase()
    .split(/[\s_]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
