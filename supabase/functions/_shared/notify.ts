/**
 * Thin wrapper over the existing `notifications` table so payment,
 * order and subscription events can raise in-app notifications without
 * every function re-implementing the insert.
 *
 * This is NOT a new notification system — it writes to the same table the
 * NotificationCenter already reads.
 */

export type PaymentNotificationCode =
  | "payment_completed"
  | "payment_pending"
  | "payment_failed"
  | "payment_retry_available"
  | "payment_recovered"
  | "receipt_sent"
  | "receipt_failed"
  | "refund_initiated"
  | "refund_completed"
  | "seller_action_required"
  | "buyer_action_required"
  | "subscription_activated"
  | "subscription_renewed"
  | "subscription_payment_failed"
  | "subscription_suspended"
  | "subscription_cancelled";

export interface NotifyInput {
  userId: string | null | undefined;
  type: PaymentNotificationCode | string;
  title: string;
  message: string;
  /** In-app route, e.g. `/orders/<id>`. */
  link?: string | null;
  /**
   * When set, the same (user, type, key) will only ever produce one row.
   * Used so a webhook replay cannot spam the buyer.
   */
  dedupeKey?: string | null;
}

/**
 * Inserts a notification. Never throws — a notification failure must not
 * roll back or block a financial write.
 */
export async function notifyUser(supabase: any, input: NotifyInput): Promise<boolean> {
  if (!input.userId) return false;
  try {
    if (input.dedupeKey) {
      const { data: existing } = await supabase
        .from("notifications")
        .select("id")
        .eq("user_id", input.userId)
        .eq("type", input.type)
        .ilike("link", input.link ?? "%")
        .gte("created_at", new Date(Date.now() - 7 * 24 * 3600_000).toISOString())
        .limit(50);
      // Dedupe on the marker embedded in the message so we don't need a new column.
      const marker = `\u200b${input.dedupeKey}`;
      if ((existing ?? []).length) {
        const { data: dupe } = await supabase
          .from("notifications")
          .select("id")
          .eq("user_id", input.userId)
          .eq("type", input.type)
          .like("message", `%${marker}%`)
          .limit(1)
          .maybeSingle();
        if (dupe) return false;
      }
      input = { ...input, message: `${input.message}${marker}` };
    }

    const { error } = await supabase.from("notifications").insert({
      user_id: input.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      link: input.link ?? null,
    });
    if (error) {
      console.log("[notify] insert_failed", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.log("[notify] threw", (err as Error).message);
    return false;
  }
}

/** Convenience: notify buyer and/or seller about an order event. */
export async function notifyOrderParties(
  supabase: any,
  record: { id: string; buyer_id?: string | null; seller_id?: string | null; reference?: string | null },
  opts: {
    type: PaymentNotificationCode;
    buyer?: { title: string; message: string };
    seller?: { title: string; message: string };
    dedupeKey?: string;
  },
) {
  const link = `/orders/${record.id}`;
  if (opts.buyer) {
    await notifyUser(supabase, {
      userId: record.buyer_id,
      type: opts.type,
      title: opts.buyer.title,
      message: opts.buyer.message,
      link,
      dedupeKey: opts.dedupeKey ? `${opts.dedupeKey}:buyer` : null,
    });
  }
  if (opts.seller) {
    await notifyUser(supabase, {
      userId: record.seller_id,
      type: opts.type,
      title: opts.seller.title,
      message: opts.seller.message,
      link,
      dedupeKey: opts.dedupeKey ? `${opts.dedupeKey}:seller` : null,
    });
  }
}
