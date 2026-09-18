/**
 * Shared primitives for the Vendibook case flow.
 *
 * Used by dispute-case-ops (party/admin actions) and by the PayPal dispute
 * intake path (claims PayPal tells us about). Keeping them here means a case
 * opened by a person and a case opened by a PayPal claim carry the same
 * evidence links, the same audit events and the same email voice.
 */
import { invokeTransactionalEmail } from "./invokeTransactionalEmail.ts";

export const SITE_URL = "https://vendibook.com";
export const ADMIN_EMAIL = "support@vendibook.com";

export const ISSUE_LABEL: Record<string, string> = {
  item_not_received: "Item not received",
  not_as_described: "Not as described",
  damaged_in_transit: "Damaged on delivery or in transit",
  seller_unresponsive: "Seller unresponsive",
  buyer_unresponsive: "Buyer unresponsive",
  walkthrough_never_happened: "Walkthrough never happened",
  agreement_not_signed: "Agreement not signed",
  other: "Other",
};

export const OUTCOME_LABEL: Record<string, string> = {
  resolved_between_parties: "Resolved between the parties",
  refunded_full: "Refunded in full",
  refunded_partial: "Refunded in part",
  released_to_seller: "Released to the seller",
  closed_no_action: "Closed with no action",
};

export const caseUrl = (id: string) => `${SITE_URL}/cases/${id}`;
export const hoursFromNow = (h: number) => new Date(Date.now() + h * 3_600_000).toISOString();

export const fmt = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString("en-US", { timeZone: "America/Phoenix" }) : "—";

export const money = (cents: number, currency = "USD") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency }).format((cents ?? 0) / 100);

/** Everything an evidence package needs, linked at case creation. */
export async function collectEvidenceLinks(admin: any, payment: any) {
  const links: Record<string, unknown> = {
    payment_record_id: payment.id,
    sale_transaction_id: payment.sale_transaction_id ?? null,
    booking_request_id: payment.booking_request_id ?? null,
    listing_id: payment.listing_id ?? null,
    paypal_order_id: payment.paypal_order_id ?? null,
    paypal_capture_id: payment.paypal_capture_id ?? null,
  };
  let listingSnapshot: Record<string, unknown> | null = null;

  try {
    if (payment.listing_id) {
      const { data: listing } = await admin.from("listings")
        .select("id, title, category, listing_mode, price, city, state, fulfillment_type, description")
        .eq("id", payment.listing_id).maybeSingle();
      listingSnapshot = listing ?? null;
    }
    if (payment.sale_transaction_id) {
      const [{ data: walkthroughs }, { data: docs }, { data: handoffs }, { data: fulfillment }, { data: consents }] =
        await Promise.all([
          admin.from("video_walkthroughs").select("id, status, scheduled_at")
            .eq("sale_transaction_id", payment.sale_transaction_id),
          admin.from("documents").select("id, document_type, status, signnow_document_id")
            .eq("transaction_id", payment.sale_transaction_id),
          admin.from("handoff_sessions").select("id, status")
            .eq("sale_transaction_id", payment.sale_transaction_id),
          admin.from("fulfillment_sessions").select("id, status")
            .eq("sale_transaction_id", payment.sale_transaction_id),
          admin.from("legal_acceptances").select("id, document_slug, document_version, accepted_at")
            .eq("related_entity_id", payment.sale_transaction_id),
        ]);
      links.video_walkthroughs = walkthroughs ?? [];
      links.documents = docs ?? [];
      links.handoff_sessions = handoffs ?? [];
      links.fulfillment_sessions = fulfillment ?? [];
      links.legal_acceptances = consents ?? [];
    }
  } catch (e) {
    links.collection_error = (e as Error)?.message ?? "partial";
  }
  return { links, listingSnapshot };
}

export async function loadParties(admin: any, payment: { buyer_id: string; seller_id: string }) {
  const { data } = await admin.from("profiles")
    .select("id, email, full_name")
    .in("id", [payment.buyer_id, payment.seller_id].filter(Boolean));
  const list = data ?? [];
  return {
    buyer: list.find((p: any) => p.id === payment.buyer_id) ?? null,
    seller: list.find((p: any) => p.id === payment.seller_id) ?? null,
  };
}

export async function logEvent(
  admin: any, caseId: string, payableId: string | null, eventType: string,
  actorId: string | null, actorRole: string | null,
  fromState: string | null, toState: string | null, reason: string | null,
) {
  try {
    await admin.from("dispute_case_events").insert({
      case_id: caseId, seller_payable_id: payableId, event_type: eventType,
      actor_id: actorId, actor_role: actorRole, from_state: fromState,
      to_state: toState, reason,
    });
  } catch (e) {
    console.error("[dispute-case] audit write failed", (e as Error)?.message);
  }
}

export async function sendCaseEmail(
  _admin: any, to: string | null | undefined, idempotencyKey: string,
  data: Record<string, unknown>,
) {
  if (!to) return;
  try {
    await invokeTransactionalEmail({
      templateName: "generic-notice",
      recipientEmail: to,
      idempotencyKey,
      templateData: { preview: String(data.heading ?? "Vendibook case update"), ...data },
      metadata: { category: "dispute_case" },
    });
  } catch (e) {
    console.error("[dispute-case] email failed", (e as Error)?.message);
  }
}
