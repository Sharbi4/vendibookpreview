import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { corsHeaders, jsonError, jsonResponse, unknownErrorResponse } from "../_shared/jsonError.ts";
import { getPayPalOrder, PayPalError } from "../_shared/paypal.ts";
import { extractCaptureFacts, finalizeCapture } from "../_shared/paypalFinalize.ts";
import { auditPayment, requestIp } from "../_shared/paymentAudit.ts";
import { recordOrderEvent } from "../_shared/orders/orderEvents.ts";
import { deliverOrderReceipt } from "../_shared/orders/deliverOrderReceipt.ts";
import { resetReceiptForResend } from "../_shared/orders/orderReceipts.ts";

/**
 * Admin-only order operations: investigate failed checkouts, force a
 * reconciliation against PayPal, and resend a receipt. Every mutating action
 * writes to the immutable payment audit log.
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
    if (!authHeader) return jsonError(401, "unauthenticated", "Please sign in.");
    const { data: userData } = await admin.auth.getUser(authHeader.replace("Bearer ", ""));
    const user = userData?.user;
    if (!user) return jsonError(401, "unauthenticated", "Your session expired.");

    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) return jsonError(403, "forbidden", "Admin access is required.");

    const body = await req.json().catch(() => ({}));
    const { action, order_id, limit } = body ?? {};

    if (action === "list_failed_attempts") {
      const { data } = await admin
        .from("payment_attempts")
        .select(`
          id, payment_record_id, attempt_number, status, failure_category, failure_code,
          failure_message_safe, failure_message_internal, provider_order_id,
          provider_capture_id, created_at, completed_at
        `)
        .in("status", ["capture_failed_retryable", "capture_failed_terminal", "expired"])
        .order("created_at", { ascending: false })
        .limit(Math.min(Number(limit) || 50, 200));

      const recordIds = [...new Set((data ?? []).map((a: any) => a.payment_record_id))];
      const { data: records } = recordIds.length
        ? await admin
          .from("payment_records")
          .select("id, reference, buyer_id, buyer_email, gross_amount_cents, currency, payment_status, last_reconciled_at")
          .in("id", recordIds)
        : { data: [] as any[] };
      const { data: receipts } = recordIds.length
        ? await admin
          .from("payment_receipts")
          .select("payment_record_id, status, sent_at, attempt_count, failure_reason")
          .in("payment_record_id", recordIds)
        : { data: [] as any[] };

      return jsonResponse(200, {
        attempts: data ?? [],
        records: records ?? [],
        receipts: receipts ?? [],
      });
    }

    // ── Sandbox-only test reset ──────────────────────────────────────────
    // Clears payment + sale rows for one listing so a sandbox test purchase
    // never permanently bricks a test listing. Hard-refuses in live.
    if (action === "reset_sandbox_listing") {
      if ((Deno.env.get("PAYPAL_ENVIRONMENT") ?? "live").toLowerCase() === "live") {
        return jsonError(403, "live_environment", "Test reset is disabled in the live environment.");
      }
      const listingId = body?.listing_id ? String(body.listing_id) : null;
      if (!listingId) return jsonError(400, "missing_fields", "A listing id is required.");

      const { data: records } = await admin
        .from("payment_records")
        .select("id, reference, payment_status, paypal_order_id, paypal_capture_id")
        .eq("listing_id", listingId);
      const { data: sales } = await admin
        .from("sale_transactions")
        .select("id, status")
        .eq("listing_id", listingId);

      // Reconcile every record against PayPal first: never silently discard a
      // record that PayPal says actually captured without saying so.
      const provider: Array<Record<string, unknown>> = [];
      for (const rec of records ?? []) {
        if (!rec.paypal_order_id) continue;
        try {
          const order = await getPayPalOrder(rec.paypal_order_id);
          provider.push({
            reference: rec.reference,
            local_status: rec.payment_status,
            provider_status: order?.status ?? null,
            captured: !!extractCaptureFacts(order),
          });
        } catch {
          provider.push({ reference: rec.reference, local_status: rec.payment_status, provider_status: "unreachable" });
        }
      }

      const recordIds = (records ?? []).map((r: any) => r.id);
      const saleIds = (sales ?? []).map((r: any) => r.id);

      if (recordIds.length) {
        for (const child of [
          "payment_attempts",
          "payment_receipts",
          "order_timeline_events",
          "payment_ledger_entries",
        ]) {
          await admin.from(child).delete().in("payment_record_id", recordIds);
        }
        await admin.from("payment_records").delete().in("id", recordIds);
      }
      if (saleIds.length) {
        for (const child of [
          "sale_transaction_status_history",
          "transaction_terms",
          "seller_payables",
          "documents",
        ]) {
          await admin.from(child).delete().in("sale_transaction_id", saleIds);
        }
        await admin.from("sale_transactions").delete().in("id", saleIds);
      }
      await admin.from("listings").update({ status: "published" }).eq("id", listingId);

      await auditPayment(admin, {
        actorId: user.id,
        actorRole: "admin",
        actorIp: requestIp(req),
        provider: "paypal",
        action: "sandbox.reset_listing",
        entityType: "payment_record",
        entityId: listingId,
        newValue: {
          environment: Deno.env.get("PAYPAL_ENVIRONMENT") ?? "sandbox",
          listing_id: listingId,
          payment_records_removed: recordIds.length,
          sale_transactions_removed: saleIds.length,
          provider_states: provider,
        },
      });

      return jsonResponse(200, {
        listing_id: listingId,
        payment_records_removed: recordIds.length,
        sale_transactions_removed: saleIds.length,
        provider_states: provider,
        listing_status: "published",
      });
    }

    if (!order_id) return jsonError(400, "missing_fields", "An order id is required.");
    const { data: record } = await admin
      .from("payment_records")
      .select("*")
      .eq("id", order_id)
      .maybeSingle();
    if (!record) return jsonError(404, "not_found", "That order does not exist.");

    if (action === "reconcile") {
      if (!record.paypal_order_id) {
        return jsonError(409, "no_provider_order", "This order has no PayPal order to reconcile.");
      }
      let providerOrder: any;
      try {
        providerOrder = await getPayPalOrder(record.paypal_order_id);
      } catch (err) {
        const status = err instanceof PayPalError ? err.status : 502;
        return jsonError(status >= 500 ? 503 : 409, "reconcile_failed", "PayPal could not be reached for this order.");
      }

      const facts = extractCaptureFacts(providerOrder);
      let outcome = "no_capture_found";
      if (facts) {
        await finalizeCapture(admin, record, facts, "capture_endpoint");
        await deliverOrderReceipt(admin, record.id);
        outcome = "capture_applied";
      }
      await admin.from("payment_records")
        .update({ last_reconciled_at: new Date().toISOString() })
        .eq("id", record.id);

      await recordOrderEvent(admin, {
        paymentRecordId: record.id,
        code: "order_reconciled",
        title: "Order reconciled with PayPal",
        description: "An administrator re-checked this order against PayPal.",
        actorRole: "admin",
        visibility: "admin",
      });
      await auditPayment(admin, {
        actorId: user.id,
        actorRole: "admin",
        actorIp: requestIp(req),
        provider: "paypal",
        action: "order.manual_reconcile",
        entityType: "payment_record",
        entityId: record.id,
        reference: record.reference,
        newValue: { outcome, provider_status: providerOrder?.status ?? null },
      });
      return jsonResponse(200, { outcome, provider_status: providerOrder?.status ?? null });
    }

    if (action === "resend_receipt") {
      await resetReceiptForResend(admin, record.id);
      const result = await deliverOrderReceipt(admin, record.id);
      await auditPayment(admin, {
        actorId: user.id,
        actorRole: "admin",
        actorIp: requestIp(req),
        provider: "paypal",
        action: "order.resend_receipt",
        entityType: "payment_record",
        entityId: record.id,
        reference: record.reference,
        newValue: { sent: result.sent, reason: result.reason ?? null },
      });
      return jsonResponse(200, result);
    }

    return jsonError(400, "unknown_action", "That action is not supported.");
  } catch (err) {
    return unknownErrorResponse(err);
  }
});
