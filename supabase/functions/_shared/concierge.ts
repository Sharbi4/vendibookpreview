/**
 * Shared logic for the VendiBook Listing Concierge service-order workflow.
 *
 * All configuration (availability, price, turnaround, included revisions,
 * service copy, terms version) lives in `listing_concierge_config` so nothing
 * is hardcoded across surfaces. Every status change is written through
 * `transitionOrder` so the audit history is always complete.
 */

// deno-lint-ignore no-explicit-any
type Db = any;

export type ConciergeStatus =
  | "payment_required"
  | "intake_not_started"
  | "intake_in_progress"
  | "information_needed"
  | "listing_being_created"
  | "ready_for_seller_review"
  | "revision_requested"
  | "approved_for_publication"
  | "published"
  | "canceled"
  | "refunded";

export interface ConciergeConfigRow {
  is_available: boolean;
  price_cents: number;
  currency: string;
  turnaround_business_days: number;
  included_revisions: number;
  specialist_contact_enabled: boolean;
  terms_version: string;
  copy: Record<string, unknown>;
}

export const CONCIERGE_DEFAULTS: ConciergeConfigRow = {
  is_available: true,
  price_cents: 14_900,
  currency: "USD",
  turnaround_business_days: 2,
  included_revisions: 1,
  specialist_contact_enabled: false,
  terms_version: "concierge-terms-v1",
  copy: {},
};

export async function loadConciergeConfig(db: Db): Promise<ConciergeConfigRow> {
  const { data } = await db
    .from("listing_concierge_config")
    .select("*")
    .eq("id", true)
    .maybeSingle();
  return { ...CONCIERGE_DEFAULTS, ...(data ?? {}) } as ConciergeConfigRow;
}

/** Client IP for agreement records. */
export function requestIp(req: Request): string | null {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("cf-connecting-ip") ??
      null
  );
}

export async function logConciergeEvent(db: Db, opts: {
  orderId: string;
  code: string;
  actorId?: string | null;
  actorRole?: "seller" | "admin" | "system" | "provider";
  fromStatus?: ConciergeStatus | null;
  toStatus?: ConciergeStatus | null;
  metadata?: Record<string, unknown>;
}) {
  await db.from("listing_concierge_events").insert({
    order_id: opts.orderId,
    actor_id: opts.actorId ?? null,
    actor_role: opts.actorRole ?? "system",
    code: opts.code,
    from_status: opts.fromStatus ?? null,
    to_status: opts.toStatus ?? null,
    metadata: opts.metadata ?? {},
  });
}

/** Statuses a seller may move an order into, keyed by the current status. */
const SELLER_TRANSITIONS: Record<string, ConciergeStatus[]> = {
  intake_not_started: ["intake_in_progress"],
  intake_in_progress: ["listing_being_created"],
  information_needed: ["listing_being_created", "intake_in_progress"],
  ready_for_seller_review: ["revision_requested", "approved_for_publication"],
};

export function sellerMayTransition(from: ConciergeStatus, to: ConciergeStatus): boolean {
  return (SELLER_TRANSITIONS[from] ?? []).includes(to);
}

/** Applies a status change plus arbitrary column patch, and records history. */
export async function transitionOrder(db: Db, opts: {
  order: Record<string, unknown>;
  to?: ConciergeStatus;
  patch?: Record<string, unknown>;
  code: string;
  actorId?: string | null;
  actorRole?: "seller" | "admin" | "system" | "provider";
  metadata?: Record<string, unknown>;
}) {
  const from = opts.order.status as ConciergeStatus;
  const patch = { ...(opts.patch ?? {}) } as Record<string, unknown>;
  if (opts.to && opts.to !== from) patch.status = opts.to;

  const { data: updated } = await db
    .from("listing_concierge_orders")
    .update(patch)
    .eq("id", opts.order.id as string)
    .select("*")
    .maybeSingle();

  await logConciergeEvent(db, {
    orderId: opts.order.id as string,
    code: opts.code,
    actorId: opts.actorId,
    actorRole: opts.actorRole,
    fromStatus: from,
    toStatus: (patch.status as ConciergeStatus) ?? from,
    metadata: opts.metadata,
  });

  return updated ?? opts.order;
}

/**
 * Creates exactly one draft listing for a paid concierge order.
 * Safe to call repeatedly — a second call returns the existing listing id.
 */
export async function ensureConciergeDraftListing(
  db: Db,
  orderId: string,
): Promise<string | null> {
  const { data: order } = await db
    .from("listing_concierge_orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return null;
  if (order.listing_id) return order.listing_id as string;

  const intake = (order.intake ?? {}) as Record<string, unknown>;
  const mode = intake.mode === "rent" ? "rent" : "sale";
  const category = typeof intake.category === "string" && intake.category
    ? intake.category
    : "food_truck";

  const { data: listing, error } = await db
    .from("listings")
    .insert({
      host_id: order.user_id,
      title: "Concierge listing (in progress)",
      description:
        "This listing is being prepared by the VendiBook Listing Concierge. It is not visible to buyers until you approve it.",
      category,
      mode,
      fulfillment_type: "pickup",
      status: "draft",
    })
    .select("id")
    .maybeSingle();

  if (error || !listing) return null;

  await db
    .from("listing_concierge_orders")
    .update({ listing_id: listing.id })
    .eq("id", orderId)
    .is("listing_id", null);

  // Re-read: if a concurrent call won the race, keep the winner's listing.
  const { data: fresh } = await db
    .from("listing_concierge_orders")
    .select("listing_id")
    .eq("id", orderId)
    .maybeSingle();

  if (fresh?.listing_id && fresh.listing_id !== listing.id) {
    await db.from("listings").delete().eq("id", listing.id);
    return fresh.listing_id as string;
  }
  return listing.id as string;
}

/**
 * Marks a concierge order paid and provisions its single draft listing.
 * Called from the verified-capture path only. Idempotent.
 */
export async function fulfillConciergeOrder(db: Db, opts: {
  orderId: string;
  paypalOrderId?: string | null;
  captureId?: string | null;
  paymentRecordId?: string | null;
}): Promise<{ fulfilled: boolean; listingId: string | null }> {
  const { data: order } = await db
    .from("listing_concierge_orders")
    .select("*")
    .eq("id", opts.orderId)
    .maybeSingle();
  if (!order) return { fulfilled: false, listingId: null };

  if (order.payment_status !== "paid") {
    await transitionOrder(db, {
      order,
      to: "intake_not_started",
      code: "payment_captured",
      actorRole: "provider",
      patch: {
        payment_status: "paid",
        paid_at: new Date().toISOString(),
        paypal_order_id: opts.paypalOrderId ?? order.paypal_order_id,
        paypal_capture_id: opts.captureId ?? order.paypal_capture_id,
        payment_record_id: opts.paymentRecordId ?? order.payment_record_id,
      },
      metadata: { capture_id: opts.captureId ?? null },
    });
  }

  const listingId = await ensureConciergeDraftListing(db, opts.orderId);
  return { fulfilled: true, listingId };
}
