import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { corsHeaders, jsonError, jsonResponse, unknownErrorResponse } from "../_shared/jsonError.ts";
import { paypalEnvironment, paypalRequest, safeLog } from "../_shared/paypal.ts";
import { invokeTransactionalEmail } from "../_shared/invokeTransactionalEmail.ts";

/**
 * Admin-only: quote a standalone freight request and email the customer a
 * branded quote with a working PayPal pay link.
 *
 * The pay link is a PayPal (Business REST) invoice — the requester is usually
 * a lead without a Vendibook account, so the hosted invoice lets them pay by
 * PayPal balance, bank, or card with no sign-in. Nothing here touches seller
 * payouts, which stay manual.
 */

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;
const fmtDate = (value?: string | null) => {
  if (!value) return null;
  const d = new Date(`${value}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    // ── auth: service-role key, or a signed-in admin ────────────────────
    const authHeader = req.headers.get("Authorization") ?? "";
    const bearer = authHeader.replace("Bearer ", "").trim();
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    // Internal admin-task secret (same shared secret the internal digest
    // tooling uses) so an operator run doesn't need a browser session.
    const taskSecret = (Deno.env.get("DIGEST_TEST_SECRET") ?? "").trim();
    const headerSecret = (req.headers.get("x-admin-task-secret") ?? "").trim();
    let authorized = (!!bearer && bearer === serviceKey) ||
      (!!taskSecret && headerSecret === taskSecret);
    if (!authorized) {
      if (!bearer) return jsonError(401, "unauthenticated", "Please sign in.");
      const { data: userData } = await admin.auth.getUser(bearer);
      const user = userData?.user;
      if (!user) return jsonError(401, "unauthenticated", "Your session expired. Please sign in again.");
      const { data: isAdmin } = await admin.rpc("has_role", { _user_id: user.id, _role: "admin" });
      authorized = !!isAdmin;
    }
    if (!authorized) return jsonError(403, "forbidden", "Admins only.");

    const body = await req.json().catch(() => ({}));
    const requestId = body?.request_id ? String(body.request_id) : "";
    const amountCents = Math.round(Number(body?.amount_cents ?? 0));
    if (!requestId) return jsonError(400, "missing_fields", "request_id is required.");
    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      return jsonError(400, "invalid_amount", "A positive quote amount is required.");
    }

    const insuranceText = body?.insurance ? String(body.insurance) : null;
    const guaranteeDate = body?.guarantee_date ? String(body.guarantee_date) : null; // YYYY-MM-DD
    const transitTime = body?.transit_time ? String(body.transit_time) : null;
    const notes = body?.notes ? String(body.notes) : null;
    const overrideEmail = body?.recipient_email ? String(body.recipient_email).trim() : "";

    const { data: fr } = await admin
      .from("freight_requests")
      .select("*")
      .eq("id", requestId)
      .maybeSingle();
    if (!fr) return jsonError(404, "not_found", "We couldn't find that freight request.");

    const recipient = (overrideEmail || fr.contact_email || "").trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(recipient)) {
      return jsonError(400, "invalid_recipient", "This request has no valid contact email.");
    }

    const quoteNumber = `VB-FRT-${String(fr.id).slice(0, 8).toUpperCase()}`;
    const route = `${fr.pickup_location} → ${fr.delivery_location}`;
    const nameParts = String(fr.contact_name ?? "").trim().split(/\s+/);
    const given = nameParts[0] || "Customer";
    const surname = nameParts.slice(1).join(" ") || "-";

    const lineItems = [
      `Door-to-door transport: ${route}`,
      insuranceText ? `Cargo insurance included: ${insuranceText}` : null,
      guaranteeDate ? `Guaranteed arrival by ${fmtDate(guaranteeDate)}` : null,
      notes,
    ].filter(Boolean).join("\n");

    // ── PayPal invoice (create → send → read hosted pay link) ───────────
    let invoiceId = fr.paypal_invoice_id as string | null;
    let payUrl = fr.paypal_invoice_url as string | null;

    if (!invoiceId || !payUrl) {
      const created = await paypalRequest<any>("/v2/invoicing/invoices", {
        method: "POST",
        idempotencyKey: `freight-quote-${fr.id}-${amountCents}`,
        body: {
          detail: {
            currency_code: "USD",
            note: lineItems,
            terms_and_conditions:
              "Payment reserves your slot and dispatches the carrier. Cargo insurance applies to the equipment in transit. Arrival dates are guaranteed as stated on this invoice.",
            payment_term: { term_type: "DUE_ON_RECEIPT" },
            reference: quoteNumber,
          },
          invoicer: { name: { business_name: "Vendibook Freight" } },
          primary_recipients: [{
            billing_info: {
              name: { given_name: given, surname },
              email_address: recipient,
            },
          }],
          items: [{
            name: `Freight transport — ${fr.equipment_type ?? "equipment"}`,
            description: route.slice(0, 1000),
            quantity: "1",
            unit_amount: { currency_code: "USD", value: (amountCents / 100).toFixed(2) },
            unit_of_measure: "AMOUNT",
          }],
          configuration: { allow_partial_payment: false, tax_inclusive: false, allow_tip: false },
        },
      });

      invoiceId = created?.id ?? created?.href?.split("/").pop() ?? null;
      if (!invoiceId) return jsonError(502, "paypal_error", "PayPal did not return an invoice id.");

      await paypalRequest(`/v2/invoicing/invoices/${invoiceId}/send`, {
        method: "POST",
        body: { send_to_recipient: true, send_to_invoicer: false },
      });

      const detail = await paypalRequest<any>(`/v2/invoicing/invoices/${invoiceId}`);
      payUrl = detail?.detail?.metadata?.recipient_view_url ??
        detail?.links?.find((l: any) => l.rel === "payer-view")?.href ?? null;
      safeLog("freight_invoice_ready", {
        invoice_id: invoiceId,
        environment: paypalEnvironment(),
        has_pay_url: !!payUrl,
      });
    }

    const equipmentSummary = [
      fr.year,
      [fr.length_ft && `${fr.length_ft} ft L`, fr.width_ft && `${fr.width_ft} ft W`, fr.height_ft && `${fr.height_ft} ft H`]
        .filter(Boolean).join(" × ") || null,
      fr.weight_lbs ? `${fr.weight_lbs} lbs` : null,
      fr.runs_and_drives ? `runs and drives: ${String(fr.runs_and_drives).toLowerCase()}` : null,
    ].filter(Boolean).join(" · ");

    const { error: emailError } = await invokeTransactionalEmail({
      templateName: "freight-quote",
      recipientEmail: recipient,
      idempotencyKey: `freight-quote-${fr.id}-${amountCents}`,
      templateData: {
        customerName: given,
        quoteNumber,
        pickupLocation: fr.pickup_location,
        deliveryLocation: fr.delivery_location,
        equipmentType: fr.equipment_type,
        equipmentSummary: equipmentSummary || null,
        pickupWindow: fmtDate(fr.pickup_date),
        guaranteedDelivery: fmtDate(guaranteeDate),
        insuranceCoverage: insuranceText,
        transitTime,
        amount: money(amountCents),
        notes,
        payUrl,
      },
      metadata: { freight_request_id: fr.id, paypal_invoice_id: invoiceId },
    });
    if (emailError) throw emailError;

    await admin.from("freight_requests").update({
      quote_amount_cents: amountCents,
      quote_transit_days: transitTime,
      quote_notes: [
        insuranceText ? `Insurance: ${insuranceText}` : null,
        guaranteeDate ? `Guaranteed arrival: ${fmtDate(guaranteeDate)}` : null,
        notes,
      ].filter(Boolean).join(" · ") || null,
      quoted_at: fr.quoted_at ?? new Date().toISOString(),
      quote_sent_at: new Date().toISOString(),
      paypal_invoice_id: invoiceId,
      paypal_invoice_url: payUrl,
      status: "quoted",
    }).eq("id", fr.id);

    return jsonResponse(200, {
      success: true,
      request_id: fr.id,
      recipient,
      quote_number: quoteNumber,
      amount: money(amountCents),
      paypal_invoice_id: invoiceId,
      pay_url: payUrl,
      environment: paypalEnvironment(),
    });
  } catch (error) {
    console.error("[send-freight-quote]", error instanceof Error ? error.message : String(error));
    return unknownErrorResponse(error);
  }
});
