/**
 * Persistent order timeline + checkout attempt recording.
 *
 * The order detail page reads its timeline exclusively from these rows —
 * never from browser state — so the same history is visible after a refresh,
 * a lost redirect, or a duplicated webhook.
 */

export type OrderEventCode =
  | 'order_created'
  | 'paypal_order_created'
  | 'buyer_approved_payment'
  | 'payment_captured'
  | 'capture_failed'
  | 'payment_retried'
  | 'refund_requested'
  | 'refund_completed'
  | 'agreement_signed'
  | 'verification_completed'
  | 'fulfillment_scheduled'
  | 'payout_queued'
  | 'payout_approved'
  | 'payout_recorded'
  | 'order_completed'
  | 'dispute_opened'
  | 'dispute_resolved'
  | 'receipt_sent'
  | 'order_reconciled';

interface RecordEventInput {
  paymentRecordId: string;
  code: OrderEventCode;
  title: string;
  description?: string;
  actorRole?: 'buyer' | 'seller' | 'admin' | 'system' | 'provider';
  visibility?: 'buyer' | 'seller' | 'both' | 'admin';
  /** When set, a repeat write with the same key is a silent no-op. */
  dedupeKey?: string;
  metadata?: Record<string, unknown>;
}

export async function recordOrderEvent(supabase: any, input: RecordEventInput) {
  try {
    await supabase.from('order_timeline_events').insert({
      payment_record_id: input.paymentRecordId,
      event_code: input.code,
      title: input.title,
      description: input.description ?? null,
      actor_role: input.actorRole ?? 'system',
      visibility: input.visibility ?? 'both',
      dedupe_key: input.dedupeKey ?? null,
      metadata: input.metadata ?? {},
    });
  } catch (_err) {
    // Unique violation on dedupe_key = already recorded. Timeline writes must
    // never break a payment path.
  }
}

// -------------------------------------------------------------- attempts

export type AttemptStatus =
  | 'created'
  | 'approval_pending'
  | 'approved'
  | 'capture_pending'
  | 'captured'
  | 'capture_failed_retryable'
  | 'capture_failed_terminal'
  | 'cancelled'
  | 'expired';

export async function openAttempt(supabase: any, input: {
  paymentRecordId: string;
  buyerId: string;
  providerOrderId?: string | null;
  status?: AttemptStatus;
  idempotencyKey?: string | null;
}) {
  const { data: last } = await supabase
    .from('payment_attempts')
    .select('attempt_number')
    .eq('payment_record_id', input.paymentRecordId)
    .order('attempt_number', { ascending: false })
    .limit(1)
    .maybeSingle();

  const attemptNumber = (last?.attempt_number ?? 0) + 1;
  const { data } = await supabase
    .from('payment_attempts')
    .insert({
      payment_record_id: input.paymentRecordId,
      buyer_id: input.buyerId,
      provider: 'paypal',
      provider_order_id: input.providerOrderId ?? null,
      attempt_number: attemptNumber,
      status: input.status ?? 'created',
      idempotency_key: input.idempotencyKey ?? null,
    })
    .select()
    .maybeSingle();
  return data;
}

export async function closeAttempt(supabase: any, attemptId: string | null | undefined, patch: {
  status: AttemptStatus;
  providerCaptureId?: string | null;
  failureCategory?: string | null;
  failureCode?: string | null;
  failureMessageSafe?: string | null;
  failureMessageInternal?: string | null;
}) {
  if (!attemptId) return;
  const terminalish = ['captured', 'cancelled', 'expired', 'capture_failed_terminal'];
  await supabase.from('payment_attempts').update({
    status: patch.status,
    provider_capture_id: patch.providerCaptureId ?? null,
    failure_category: patch.failureCategory ?? null,
    failure_code: patch.failureCode ?? null,
    failure_message_safe: patch.failureMessageSafe ?? null,
    failure_message_internal: patch.failureMessageInternal ?? null,
    completed_at: terminalish.includes(patch.status) ? new Date().toISOString() : null,
  }).eq('id', attemptId);
}

/** Most recent attempt for an order, used to drive retry UX. */
export async function latestAttempt(supabase: any, paymentRecordId: string) {
  const { data } = await supabase
    .from('payment_attempts')
    .select('*')
    .eq('payment_record_id', paymentRecordId)
    .order('attempt_number', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ?? null;
}
