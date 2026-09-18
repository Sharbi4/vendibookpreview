/**
 * Administrator cancel tool.
 *
 * Cancels a sale whose payment conditions were not met (or that an
 * administrator has decided to unwind) and refunds the buyer in full through
 * PayPal. There is no automated seller payout anywhere in this flow — the
 * seller payable is simply closed out as cancelled.
 *
 * Fail closed: the refund must succeed before anything is marked cancelled.
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { corsHeaders, jsonError, jsonResponse, unknownErrorResponse } from "../_shared/jsonError.ts";
import { invokeTransactionalEmail } from "../_shared/invokeTransactionalEmail.ts";
import { notifyUser } from "../_shared/notify.ts";

const SITE_URL = "https://vendibook.com";

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
    if (!isAdmin) return jsonError(403, "forbidden", "Administrator access required.");

    const body = await req.json().catch(() => ({}));
    const paymentRecordId = body?.payment_record_id as string | undefined;
    const reason = String(body?.reason ?? "").trim();
    if (!paymentRecordId || reason.length < 5) {
      return jsonError(400, "missing_fields", "An order and a written reason are required.");
    }

    const { data: payment } = await admin.from("payment_records")
      .select("*").eq("id", paymentRecordId).maybeSingle();
    if (!payment) return jsonError(404, "not_found", "Order not found.");
    if (payment.payment_status === "refunded") {
      return jsonError(409, "already_refunded", "This order was already refunded in full.");
    }

    const { data: payable } = await admin.from("seller_payables")
      .select("id, status, release_state").eq("payment_record_id", paymentRecordId).maybeSingle();
    if (payable && ["payout_completed", "payout_processing"].includes(payable.status)) {
      return jsonError(409, "payout_in_flight", "The seller has already been paid on this order. Handle it as a reversal instead.");
    }

    // ---- Refund first. Nothing is marked cancelled unless PayPal refunds.
    const refundRes = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/paypal-refund`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
        apikey: Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      },
      body: JSON.stringify({ payment_record_id: paymentRecordId, reason: `Order cancelled — ${reason}` }),
    });
    const refundBody = await refundRes.json().catch(() => ({}));
    if (!refundRes.ok) {
      return jsonError(refundRes.status, refundBody?.code ?? "refund_failed",
        refundBody?.error ?? "PayPal could not refund this order, so nothing was cancelled.");
    }

    // ---- Now close the records out.
    if (payable?.id) {
      await admin.from("seller_payables").update({
        status: "cancelled",
        release_state: "auto_refunded",
        conditions_deadline_at: null,
        hold_reason: `Order cancelled by an administrator — ${reason}`,
      }).eq("id", payable.id);

      await admin.from("payout_actions").insert({
        payable_id: payable.id,
        action: "cancel_order_refund",
        actor_id: user.id,
        from_status: payable.status,
        to_status: "cancelled",
        note: reason,
      });
    }

    if (payment.sale_transaction_id) {
      await admin.from("sale_transactions")
        .update({ status: "cancelled", cancellation_reason: reason })
        .eq("id", payment.sale_transaction_id);
    }

    const { data: openCase } = await admin.from("dispute_cases")
      .select("id").eq("payment_record_id", paymentRecordId)
      .not("status", "in", "(resolved,closed)").maybeSingle();
    if (openCase?.id) {
      await admin.from("dispute_case_events").insert({
        case_id: openCase.id, seller_payable_id: payable?.id ?? null,
        event_type: "order_cancelled_and_refunded", actor_id: user.id, actor_role: "admin",
        from_state: payable?.release_state ?? null, to_state: "auto_refunded", reason,
      });
    }

    const { data: people } = await admin.from("profiles")
      .select("id, email, full_name").in("id", [payment.buyer_id, payment.seller_id].filter(Boolean));
    const buyer = (people ?? []).find((p: any) => p.id === payment.buyer_id);
    const seller = (people ?? []).find((p: any) => p.id === payment.seller_id);
    const link = `${SITE_URL}/orders/${payment.id}`;

    await send(buyer?.email, `order-cancelled-${payment.id}-buyer`, {
      kicker: `Order ${payment.reference}`,
      heading: "Your order was cancelled and refunded",
      paragraphs: [reason, "PayPal is returning the full amount to your original payment method. Banks usually post it within a few business days."],
      ctaLabel: "View your order", ctaUrl: link,
    });
    await send(seller?.email, `order-cancelled-${payment.id}-seller`, {
      kicker: `Order ${payment.reference}`,
      heading: "This order was cancelled and the buyer refunded",
      paragraphs: [reason, "No payment will be made to you on this order."],
      ctaLabel: "View the order", ctaUrl: link,
    });
    for (const person of [buyer, seller]) {
      await notifyUser(admin, {
        userId: person?.id, type: "order_cancelled",
        title: "Order cancelled and refunded",
        message: reason, link: `/orders/${payment.id}`,
        dedupeKey: `order-cancelled-${payment.id}-${person?.id}`,
      });
    }

    return jsonResponse(200, { success: true, refunded: true });
  } catch (err) {
    return unknownErrorResponse(err);
  }
});

async function send(to: string | null | undefined, idempotencyKey: string, data: Record<string, unknown>) {
  if (!to) return;
  try {
    await invokeTransactionalEmail({
      templateName: "generic-notice",
      recipientEmail: to,
      idempotencyKey,
      templateData: { preview: String(data.heading ?? "Vendibook order update"), ...data },
      metadata: { category: "order_cancelled" },
    });
  } catch (e) {
    console.error("[admin-cancel-order] email failed", (e as Error)?.message);
  }
}
