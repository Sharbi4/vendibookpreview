/**
 * Square webhooks for rental payments made on hosts' Square accounts.
 *
 * Subscribe this URL (SQUARE_RENTAL_WEBHOOK_URL) to payment.updated,
 * refund.created, refund.updated and oauth.authorization.revoked. The
 * signature key is SQUARE_RENTAL_WEBHOOK_SIGNATURE_KEY.
 *
 * Event bodies are never trusted for money: payments and refunds are
 * re-fetched from Square with the host's token before anything is written.
 * Events that don't belong to a Vendibook rental are acknowledged and ignored.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { verifySquareSignature } from "../_shared/square.ts";
import { recordSquareContext, squareApi } from "../_shared/squareMarketplace.ts";
import { safeLog } from "../_shared/paypal.ts";
import { applySquareRefund } from "../_shared/squareRentalRefund.ts";
import { CaptureRejectedError, finalizeCapture } from "../_shared/paypalFinalize.ts";
import { squarePaymentFacts } from "../_shared/squareRentalMath.ts";

const ok = (text = "ok") => new Response(text, { status: 200 });

/** Token + API base for the Square account the payment was taken on. */
async function squareAccess(admin: any, record: any) {
  const ctx = await recordSquareContext(admin, record);
  return ctx ? { token: await ctx.token(), base: ctx.base } : null;
}

async function handlePayment(admin: any, paymentId: string) {
  const { data: record } = await admin.from("payment_records").select("*")
    .eq("square_payment_id", paymentId).maybeSingle();
  if (!record) return "ignored_unknown_payment";
  const access = await squareAccess(admin, record);
  if (!access) return "square_account_unavailable";
  const { payment } = await squareApi(`/v2/payments/${encodeURIComponent(paymentId)}`, access);
  if (!payment || payment.location_id !== record.square_location_id) return "ignored_location";
  try {
    const updated = await finalizeCapture(admin, record, squarePaymentFacts(payment), "webhook");
    if (["failed", "cancelled", "declined"].includes(String(updated?.payment_status))) {
      await admin.from("booking_requests").update({ payment_status: "unpaid", payment_lock_record_id: null })
        .eq("id", record.booking_request_id).eq("payment_lock_record_id", record.id).neq("payment_status", "paid");
    }
    return `payment_${String(updated?.payment_status ?? "unknown")}`;
  } catch (err) {
    if (err instanceof CaptureRejectedError) return `rejected_${err.reason}`;
    throw err;
  }
}

async function handleRefund(admin: any, refundId: string, paymentId: string | undefined) {
  if (!paymentId) return "ignored_no_payment";
  const { data: record } = await admin.from("payment_records").select("*")
    .eq("square_payment_id", paymentId).maybeSingle();
  if (!record) return "ignored_unknown_payment";
  const access = await squareAccess(admin, record);
  if (!access) return "square_account_unavailable";
  const { refund } = await squareApi(`/v2/refunds/${encodeURIComponent(refundId)}`, access);
  if (!refund || refund.payment_id !== paymentId) return "ignored_mismatch";
  return await applySquareRefund(admin, record, refund);
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("POST required", { status: 405 });
  const raw = await req.text();
  const valid = await verifySquareSignature(
    raw,
    req.headers.get("x-square-hmacsha256-signature") || "",
    Deno.env.get("SQUARE_RENTAL_WEBHOOK_SIGNATURE_KEY") || "",
    Deno.env.get("SQUARE_RENTAL_WEBHOOK_URL") || "",
  );
  if (!valid) return new Response("Invalid signature", { status: 403 });

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } });
  let event: any;
  try { event = JSON.parse(raw); } catch { return new Response("Invalid JSON", { status: 400 }); }
  const eventId = String(event?.event_id ?? "");
  const type = String(event?.type ?? "");
  if (!eventId || !type) return new Response("Invalid event", { status: 400 });

  // Idempotency: a processed event is acknowledged without re-running.
  const { data: seen } = await admin.from("square_webhook_events").select("processed_at").eq("event_id", eventId).maybeSingle();
  if (seen?.processed_at) return ok("duplicate");
  if (!seen) {
    await admin.from("square_webhook_events").insert({
      event_id: eventId, event_type: type, merchant_id: event.merchant_id ?? null, object_id: event.data?.id ?? null,
    });
  }

  try {
    let outcome = "ignored_type";
    const object = event.data?.object ?? {};
    if (type.startsWith("payment.") && object.payment?.id) {
      outcome = await handlePayment(admin, String(object.payment.id));
    } else if (type.startsWith("refund.") && object.refund?.id) {
      outcome = await handleRefund(admin, String(object.refund.id), object.refund.payment_id);
    } else if (type === "oauth.authorization.revoked" && event.merchant_id) {
      await admin.from("square_seller_accounts").update({
        status: "revoked", revoked_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      }).eq("merchant_id", event.merchant_id);
      outcome = "seller_revoked";
    }
    await admin.from("square_webhook_events").update({ processed_at: new Date().toISOString(), outcome, error: null })
      .eq("event_id", eventId);
    return ok(outcome);
  } catch (err) {
    const message = (err as Error).message?.slice(0, 300) ?? "error";
    safeLog("square_rental_webhook_failed", { eventId, type, message });
    await admin.from("square_webhook_events").update({ error: message }).eq("event_id", eventId);
    // 500 makes Square retry with backoff.
    return new Response("Retry", { status: 500 });
  }
});
