/**
 * PayPal dispute intake.
 *
 * PayPal tells us when a buyer files a claim or chargeback against a capture we
 * processed. Those claims must land in the same Vendibook case queue an admin
 * already watches, and must freeze the seller's money exactly like a case a
 * party opened.
 *
 * Rules:
 *  - never trust an unverified event (the webhook verifies before calling this)
 *  - one Vendibook case per PayPal dispute; an existing open case on the same
 *    order is linked rather than duplicated
 *  - freeze fails closed: if we cannot freeze, the case is still created and
 *    admins are told loudly, so the payout gate keeps blocking on the open case
 *  - PayPal resolving its own claim never releases money by itself; a Vendibook
 *    admin still resolves the case
 */
import {
  ADMIN_EMAIL, caseUrl, collectEvidenceLinks, fmt, hoursFromNow, ISSUE_LABEL,
  loadParties, logEvent, money, sendCaseEmail, SITE_URL,
} from "./disputeCaseCore.ts";
import { notifyUser } from "./notify.ts";

const RESPONSE_WINDOW_HOURS = 72;
/** PayPal claims get a tighter internal clock — PayPal's own deadline is short. */
const ADMIN_SLA_HOURS = 24;

const REASON_TO_ISSUE: Record<string, string> = {
  MERCHANDISE_OR_SERVICE_NOT_RECEIVED: "item_not_received",
  MERCHANDISE_OR_SERVICE_NOT_AS_DESCRIBED: "not_as_described",
  UNAUTHORISED: "other",
  UNAUTHORIZED: "other",
  CREDIT_NOT_PROCESSED: "other",
  DUPLICATE_TRANSACTION: "other",
  INCORRECT_AMOUNT: "other",
  PAYMENT_BY_OTHER_MEANS: "other",
  CANCELED_RECURRING_BILLING: "other",
  PROBLEM_WITH_REMITTANCE: "other",
  OTHER: "other",
};

const REASON_LABEL = (reason?: string | null) =>
  String(reason ?? "OTHER").replaceAll("_", " ").toLowerCase();

export type DisputeIntakeResult = {
  handled: boolean;
  reason?: string;
  case_id?: string;
  created?: boolean;
  frozen?: boolean;
};

/** Resolve the capture a PayPal dispute points at, then the payment record. */
async function findPaymentForDispute(admin: any, resource: any) {
  const txns: any[] = Array.isArray(resource?.disputed_transactions) ? resource.disputed_transactions : [];
  const captureIds = txns
    .flatMap((t) => [t?.seller_transaction_id, t?.buyer_transaction_id, t?.custom])
    .filter(Boolean)
    .map(String);

  for (const id of captureIds) {
    const { data } = await admin.from("payment_records").select("*")
      .or(`paypal_capture_id.eq.${id},paypal_order_id.eq.${id},reference.eq.${id}`)
      .maybeSingle();
    if (data) return data;
  }
  return null;
}

export async function ingestPayPalDispute(
  admin: any,
  eventType: string,
  resource: any,
): Promise<DisputeIntakeResult> {
  const disputeId: string | null = resource?.dispute_id ?? resource?.id ?? null;
  if (!disputeId) return { handled: false, reason: "no_dispute_id" };

  const payment = await findPaymentForDispute(admin, resource);
  if (!payment) {
    // Unknown capture: still tell admins — silence here would hide a real claim.
    await sendCaseEmail(admin, ADMIN_EMAIL, `pp-dispute-unmatched-${disputeId}`, {
      kicker: "PayPal dispute",
      heading: "A PayPal claim did not match any Vendibook order",
      details: [
        { label: "PayPal dispute", value: disputeId },
        { label: "Reason", value: REASON_LABEL(resource?.reason) },
        { label: "Status", value: String(resource?.status ?? "—") },
      ],
      paragraphs: ["Review this claim in the PayPal Resolution Center — we could not link it to a payment record."],
    });
    return { handled: false, reason: "payment_not_found" };
  }

  const ppStatus = String(resource?.status ?? "OPEN");
  const ppOutcome = resource?.dispute_outcome?.outcome_code ?? null;
  const reasonCode = String(resource?.reason ?? "OTHER").toUpperCase();
  const issueType = REASON_TO_ISSUE[reasonCode] ?? "other";
  const resolved = eventType === "CUSTOMER.DISPUTE.RESOLVED" ||
    ["RESOLVED", "CLOSED"].includes(ppStatus.toUpperCase());

  await admin.from("payment_records")
    .update({ dispute_status: resolved ? "resolved" : ppStatus.toLowerCase() })
    .eq("id", payment.id);

  // ------------------------------------------------------------- find/link case
  const { data: byDispute } = await admin.from("dispute_cases").select("*")
    .eq("paypal_dispute_id", disputeId).maybeSingle();

  let theCase = byDispute ?? null;
  let created = false;

  if (!theCase) {
    const { data: openOnOrder } = await admin.from("dispute_cases").select("*")
      .eq("payment_record_id", payment.id)
      .not("status", "in", "(resolved,closed)")
      .is("paypal_dispute_id", null)
      .order("created_at", { ascending: false })
      .maybeSingle();

    if (openOnOrder) {
      // A party already reported this order — attach PayPal's claim to that case.
      const { data: linked } = await admin.from("dispute_cases").update({
        paypal_dispute_id: disputeId,
        paypal_dispute_reason: reasonCode,
        paypal_dispute_status: ppStatus,
        paypal_dispute_outcome: ppOutcome,
        paypal_dispute_updated_at: new Date().toISOString(),
        status: "awaiting_admin",
        last_activity_at: new Date().toISOString(),
      }).eq("id", openOnOrder.id).select().maybeSingle();
      theCase = linked ?? openOnOrder;
      await logEvent(admin, theCase.id, theCase.seller_payable_id, "paypal_dispute_linked",
        null, "system", openOnOrder.status, "awaiting_admin",
        `PayPal claim ${disputeId} (${REASON_LABEL(reasonCode)}) attached to this case.`);
    }
  }

  const { data: payable } = await admin.from("seller_payables")
    .select("id, net_payout_cents, currency, status")
    .eq("payment_record_id", payment.id)
    .maybeSingle();

  if (!theCase) {
    const evidence = await collectEvidenceLinks(admin, payment);
    const caseNumber = `VB-CASE-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    const { data: newCase, error: createErr } = await admin.from("dispute_cases").insert({
      case_number: caseNumber,
      source: "paypal",
      paypal_dispute_id: disputeId,
      paypal_dispute_reason: reasonCode,
      paypal_dispute_status: ppStatus,
      paypal_dispute_outcome: ppOutcome,
      paypal_dispute_updated_at: new Date().toISOString(),
      payment_record_id: payment.id,
      seller_payable_id: payable?.id ?? null,
      sale_transaction_id: payment.sale_transaction_id ?? null,
      booking_request_id: payment.booking_request_id ?? null,
      listing_id: payment.listing_id ?? null,
      buyer_id: payment.buyer_id,
      seller_id: payment.seller_id,
      opened_by: null,
      opened_by_role: "system",
      issue_type: issueType,
      description:
        `The buyer filed a claim with PayPal on this order (PayPal reason: ${REASON_LABEL(reasonCode)}). ` +
        `Opened automatically from PayPal dispute ${disputeId}.`,
      status: "awaiting_admin",
      response_deadline_at: hoursFromNow(RESPONSE_WINDOW_HOURS),
      sla_due_at: hoursFromNow(ADMIN_SLA_HOURS),
      amount_held_cents: payable?.net_payout_cents ?? 0,
      currency: payable?.currency ?? payment.currency ?? "USD",
      evidence_links: evidence.links,
      listing_snapshot: evidence.listingSnapshot,
    }).select().maybeSingle();

    if (createErr && createErr.code === "23505") {
      // Concurrent delivery of the same claim — re-read and continue.
      const { data: again } = await admin.from("dispute_cases").select("*")
        .eq("paypal_dispute_id", disputeId).maybeSingle();
      theCase = again ?? null;
    } else if (createErr || !newCase) {
      throw new Error(`Could not open a case for PayPal dispute ${disputeId}: ${createErr?.message ?? "unknown"}`);
    } else {
      theCase = newCase;
      created = true;
    }
  }

  if (!theCase) return { handled: false, reason: "case_unavailable" };

  // ------------------------------------------------------------------- freeze
  // Fail closed: a claim must stop the money even if the freeze RPC errors.
  let frozen = !!theCase.disbursement_frozen;
  if (!resolved && payable?.id && !frozen) {
    const { error: freezeErr } = await admin.rpc("freeze_payable_for_case", {
      _payable_id: payable.id, _case_id: theCase.id,
    });
    frozen = !freezeErr;
    await logEvent(admin, theCase.id, payable.id,
      freezeErr ? "freeze_failed" : "disbursement_frozen", null, "system",
      "clock_running", freezeErr ? "clock_running" : "clock_paused",
      freezeErr
        ? `PayPal claim ${disputeId}: freeze failed — ${freezeErr.message}`
        : `PayPal claim ${disputeId} — seller payment and the 10-day clock are paused.`);
    if (!freezeErr) {
      await admin.from("dispute_cases")
        .update({ disbursement_frozen: true, seller_payable_id: payable.id })
        .eq("id", theCase.id);
    }
  }

  // --------------------------------------------------------------- thread entry
  const threadBody = resolved
    ? `PayPal closed claim ${disputeId}. PayPal status: ${ppStatus}${ppOutcome ? ` (${REASON_LABEL(ppOutcome)})` : ""}. ` +
      `A Vendibook administrator still has to resolve this case before any seller payment is released.`
    : created
    ? `A PayPal claim was filed on this order. PayPal reason: ${REASON_LABEL(reasonCode)}. PayPal status: ${ppStatus}. ` +
      `Seller payment on this order is paused while the claim and this case are open.`
    : `PayPal updated claim ${disputeId}. PayPal status: ${ppStatus}${ppOutcome ? ` (${REASON_LABEL(ppOutcome)})` : ""}.`;

  await admin.from("dispute_case_messages").insert({
    case_id: theCase.id,
    author_id: null,
    author_role: "system",
    body: threadBody,
    attachments: [],
  });

  await admin.from("dispute_cases").update({
    paypal_dispute_id: disputeId,
    paypal_dispute_reason: reasonCode,
    paypal_dispute_status: ppStatus,
    paypal_dispute_outcome: ppOutcome,
    paypal_dispute_updated_at: new Date().toISOString(),
    last_activity_at: new Date().toISOString(),
  }).eq("id", theCase.id);

  await logEvent(admin, theCase.id, payable?.id ?? null,
    resolved ? "paypal_dispute_resolved" : created ? "paypal_dispute_opened" : "paypal_dispute_updated",
    null, "system", null, theCase.status,
    `PayPal ${disputeId}: ${ppStatus}${ppOutcome ? ` / ${ppOutcome}` : ""}`);

  // -------------------------------------------------------------------- notify
  const parties = await loadParties(admin, payment);
  const link = caseUrl(theCase.id);
  const stage = resolved ? "resolved" : created ? "opened" : `update-${ppStatus.toLowerCase()}`;

  await sendCaseEmail(admin, ADMIN_EMAIL, `pp-dispute-${disputeId}-${stage}-admin`, {
    kicker: "PayPal claim",
    heading: resolved
      ? `PayPal closed a claim — ${theCase.case_number}`
      : created
      ? `PayPal claim filed — ${theCase.case_number}`
      : `PayPal claim updated — ${theCase.case_number}`,
    alert: frozen || resolved ? undefined : {
      tone: "warning",
      title: "Disbursement freeze could not be confirmed",
      body: "Check this order before any payout is approved.",
    },
    details: [
      { label: "Order", value: payment.reference ?? payment.id },
      { label: "PayPal dispute", value: disputeId },
      { label: "PayPal reason", value: REASON_LABEL(reasonCode) },
      { label: "PayPal status", value: ppStatus },
      { label: "Amount held", value: money(theCase.amount_held_cents, theCase.currency) },
      { label: "Seller payment", value: frozen ? "Frozen" : resolved ? "Still held pending review" : "FREEZE UNCONFIRMED" },
      { label: "SLA due", value: fmt(theCase.sla_due_at) },
    ],
    paragraphs: resolved
      ? ["PayPal has closed its claim. The Vendibook case stays open until an administrator records an outcome."]
      : ["Respond to PayPal in the Resolution Center as well — a Vendibook case does not replace PayPal's own deadlines."],
    ctaLabel: "Review case", ctaUrl: `${SITE_URL}/admin/disputes`,
  });

  if (!resolved) {
    await sendCaseEmail(admin, parties.seller?.email, `pp-dispute-${disputeId}-${stage}-seller`, {
      kicker: `Case ${theCase.case_number}`,
      heading: "A PayPal claim was filed on your order",
      alert: {
        tone: "warning",
        title: "Your payout is paused",
        body: `Payment on order ${payment.reference} is on hold while this claim is open.`,
      },
      paragraphs: [
        `The buyer filed a claim with PayPal (${REASON_LABEL(reasonCode)}) on order ${payment.reference}. We've opened a Vendibook case so everything is in one place.`,
        "Add your side and any evidence to the case thread. Vendibook responds to PayPal using the walkthrough, signed agreement and handoff records on this order.",
        "A Vendibook administrator decides the outcome here. PayPal decides its own claim separately, on its own deadlines.",
      ],
      ctaLabel: "Open the case", ctaUrl: link,
    });

    await sendCaseEmail(admin, parties.buyer?.email, `pp-dispute-${disputeId}-${stage}-buyer`, {
      kicker: `Case ${theCase.case_number}`,
      heading: "We've received your PayPal claim",
      paragraphs: [
        `PayPal told us about the claim you filed on order ${payment.reference}. We've opened a Vendibook case and paused the seller's payment while it's reviewed.`,
        "Use the case thread for anything you want on the record. Keep working with PayPal too — this case does not extend or replace PayPal's deadlines, or your card issuer's.",
      ],
      ctaLabel: "View your case", ctaUrl: link,
    });
  } else {
    await sendCaseEmail(admin, parties.seller?.email, `pp-dispute-${disputeId}-resolved-seller`, {
      kicker: `Case ${theCase.case_number}`,
      heading: "PayPal closed the claim on your order",
      paragraphs: [
        `PayPal has closed its claim on order ${payment.reference} (status: ${ppStatus}).`,
        "Your payment stays held until a Vendibook administrator records the outcome on the case and releases it.",
      ],
      ctaLabel: "Open the case", ctaUrl: link,
    });
  }

  for (const party of [parties.buyer, parties.seller]) {
    await notifyUser(admin, {
      userId: party?.id,
      type: "case_paypal_dispute",
      title: resolved ? "PayPal closed the claim on your order" : "A PayPal claim was filed on your order",
      message: resolved
        ? `Case ${theCase.case_number} stays open until Vendibook records the outcome.`
        : `Case ${theCase.case_number} — seller payment is paused while it's reviewed.`,
      link: `/cases/${theCase.id}`,
      dedupeKey: `pp-dispute-${disputeId}-${stage}-${party?.id ?? "x"}`,
    });
  }

  return { handled: true, case_id: theCase.id, created, frozen };
}
