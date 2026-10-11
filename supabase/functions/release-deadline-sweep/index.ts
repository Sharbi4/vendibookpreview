/**
 * Daily sweep of the 10-day payment-condition countdown.
 *
 * Runs once a day. For every sale where the buyer has paid and the conditions
 * (saved walkthrough video + both agreement signatures) are not complete yet:
 *   - reminds the buyer and the seller how many days are left and what is missing
 *   - tells both parties when the deadline has passed and an administrator will review
 *   - sends administrators one digest: imminent deadlines, overdue orders,
 *     cases past SLA, and cases sitting on an order with an imminent deadline
 *
 * Orders frozen by an open Vendibook case are skipped — their clock is paused,
 * so a countdown reminder would be wrong. No money moves in this function.
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { corsHeaders, jsonError, jsonResponse, unknownErrorResponse } from "../_shared/jsonError.ts";
import { invokeTransactionalEmail } from "../_shared/invokeTransactionalEmail.ts";
import { notifyUser } from "../_shared/notify.ts";

const SITE_URL = "https://vendibook.com";
const ADMIN_EMAIL = "support@vendibook.com";
const IMMINENT_DAYS = 3;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    // Either the scheduled job (shared secret) or a signed-in administrator.
    const sweepSecret = Deno.env.get("RELEASE_SWEEP_SECRET") ?? "";
    const provided = req.headers.get("x-cron-secret") ?? "";
    let authorized = !!sweepSecret && provided === sweepSecret;

    if (!authorized) {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) return jsonError(401, "unauthenticated", "Please sign in.");
      const { data: userData } = await admin.auth.getUser(authHeader.replace("Bearer ", ""));
      if (!userData?.user) return jsonError(401, "unauthenticated", "Your session expired.");
      const { data: isAdmin } = await admin.rpc("has_role", { _user_id: userData.user.id, _role: "admin" });
      if (!isAdmin) return jsonError(403, "forbidden", "Administrator access required.");
      authorized = true;
    }

    const today = new Date().toISOString().slice(0, 10);

    const { data: payables } = await admin.from("seller_payables")
      .select("id, payment_record_id, release_state, conditions_deadline_at, conditions_completed_at, walkthrough_media_id, agreement_completed_at, signnow_document_id, dispute_frozen_at, net_payout_cents, currency")
      .in("release_state", ["awaiting_walkthrough", "awaiting_signatures", "pending_release"])
      .is("conditions_completed_at", null)
      .not("conditions_deadline_at", "is", null);

    const rows = (payables ?? []).filter((p: any) => !p.dispute_frozen_at);
    const imminent: any[] = [];
    const overdue: any[] = [];
    let remindersSent = 0;

    for (const p of rows) {
      const deadline = new Date(p.conditions_deadline_at);
      const msLeft = deadline.getTime() - Date.now();
      const daysLeft = Math.ceil(msLeft / 86_400_000);
      const isOverdue = msLeft <= 0;

      const { data: payment } = await admin.from("payment_records")
        .select("id, reference, buyer_id, seller_id, listing_id").eq("id", p.payment_record_id).maybeSingle();
      if (!payment) continue;

      const { data: people } = await admin.from("profiles")
        .select("id, email, full_name").in("id", [payment.buyer_id, payment.seller_id].filter(Boolean));
      const buyer = (people ?? []).find((x: any) => x.id === payment.buyer_id);
      const seller = (people ?? []).find((x: any) => x.id === payment.seller_id);

      const missing: string[] = [];
      if (!p.walkthrough_media_id) missing.push("a saved walkthrough video");
      if (!p.agreement_completed_at || !p.signnow_document_id) missing.push("both signatures on the purchase agreement");
      const missingText = missing.join(" and ");

      const deadlineText = deadline.toLocaleString("en-US", { timeZone: "America/Phoenix" });
      const orderLink = `${SITE_URL}/orders/${payment.id}`;

      if (isOverdue) {
        overdue.push({ payment, payable: p, daysLeft });
        await email(buyer?.email, `release-overdue-${p.id}-${today}-buyer`, {
          kicker: `Order ${payment.reference}`,
          heading: "The deadline on your order has passed",
          alert: { tone: "warning", title: "Under review", body: `Still outstanding: ${missingText}.` },
          paragraphs: [
            `The ${deadlineText} deadline for completing the payment conditions has passed and ${missingText} is still outstanding.`,
            "A Vendibook administrator will review this order and can cancel it and refund you in full.",
          ],
          ctaLabel: "View your order", ctaUrl: orderLink,
        });
        await email(seller?.email, `release-overdue-${p.id}-${today}-seller`, {
          kicker: `Order ${payment.reference}`,
          heading: "The deadline on this sale has passed",
          alert: { tone: "warning", title: "Payment at risk", body: `Still outstanding: ${missingText}.` },
          paragraphs: [
            `The ${deadlineText} deadline has passed and ${missingText} is still outstanding, so your payment on this sale cannot be approved.`,
            "A Vendibook administrator will review this order and may cancel it and refund the buyer in full.",
          ],
          ctaLabel: "View the order", ctaUrl: orderLink,
        });
      } else {
        if (daysLeft <= IMMINENT_DAYS) imminent.push({ payment, payable: p, daysLeft });
        const dayWord = `${daysLeft} day${daysLeft === 1 ? "" : "s"}`;
        await email(buyer?.email, `release-reminder-${p.id}-${today}-buyer`, {
          kicker: `Order ${payment.reference}`,
          heading: `${dayWord} left to complete your purchase conditions`,
          paragraphs: [
            `Still outstanding: ${missingText}.`,
            `The deadline is ${deadlineText}. If the conditions are not complete by then, a Vendibook administrator can cancel the order and refund you in full.`,
          ],
          ctaLabel: "View your order", ctaUrl: orderLink,
        });
        await email(seller?.email, `release-reminder-${p.id}-${today}-seller`, {
          kicker: `Order ${payment.reference}`,
          heading: `${dayWord} left before your payment review`,
          paragraphs: [
            `Still outstanding: ${missingText}.`,
            `Your payment on this sale can be approved once these are complete. The deadline is ${deadlineText}; after it passes, an administrator may cancel the order and refund the buyer.`,
          ],
          ctaLabel: "View the order", ctaUrl: orderLink,
        });
        await notifyUser(admin, {
          userId: seller?.id, type: "release_deadline_reminder",
          title: `${dayWord} left on order ${payment.reference}`,
          message: `Outstanding: ${missingText}.`,
          link: `/orders/${payment.id}`, dedupeKey: `release-reminder-${p.id}-${today}`,
        });
      }
      remindersSent += 2;
    }

    // ---- Administrator digest
    const { data: openCases } = await admin.from("dispute_cases")
      .select("id, case_number, status, sla_due_at, created_at, amount_held_cents, currency, payment_record_id")
      .not("status", "in", "(resolved,closed)");
    const pastSla = (openCases ?? []).filter((c: any) => c.sla_due_at && new Date(c.sla_due_at).getTime() < Date.now());

    if (imminent.length || overdue.length || pastSla.length) {
      await email(ADMIN_EMAIL, `release-digest-${today}`, {
        kicker: "Daily review",
        heading: "Orders and cases needing attention",
        details: [
          { label: "Deadline within 3 days", value: String(imminent.length) },
          { label: "Past deadline", value: String(overdue.length) },
          { label: "Open cases", value: String((openCases ?? []).length) },
          { label: "Cases past SLA", value: String(pastSla.length) },
        ],
        paragraphs: [
          overdue.length
            ? `${overdue.length} order(s) are past the condition deadline and can be cancelled and refunded.`
            : "No orders are past the condition deadline.",
          pastSla.length
            ? `${pastSla.length} case(s) are past their response SLA. Payment on those orders stays frozen until they are resolved.`
            : "No cases are past their SLA.",
        ],
        ctaLabel: "Review payouts", ctaUrl: `${SITE_URL}/admin/payouts`,
        secondaryCtaLabel: "Review cases", secondaryCtaUrl: `${SITE_URL}/admin/disputes`,
      });
    }

    return jsonResponse(200, {
      success: true,
      checked: rows.length,
      reminders_sent: remindersSent,
      imminent: imminent.length,
      overdue: overdue.length,
      cases_past_sla: pastSla.length,
    });
  } catch (err) {
    return unknownErrorResponse(err);
  }
});

async function email(to: string | null | undefined, idempotencyKey: string, data: Record<string, unknown>) {
  if (!to) return;
  try {
    await invokeTransactionalEmail({
      templateName: "generic-notice",
      recipientEmail: to,
      idempotencyKey,
      templateData: { preview: String(data.heading ?? "Vendibook order update"), ...data },
      metadata: { category: "release_deadline" },
    });
  } catch (e) {
    console.error("[release-deadline-sweep] email failed", (e as Error)?.message);
  }
}
