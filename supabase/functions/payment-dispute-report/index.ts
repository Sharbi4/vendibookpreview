import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders, jsonError, jsonResponse, unknownErrorResponse } from '../_shared/jsonError.ts';
import { recordOrderEvent } from '../_shared/orders/orderEvents.ts';
import { notifyUser } from '../_shared/notify.ts';

/**
 * payment-dispute-report
 *
 * Lets a buyer or seller raise a dispute on one of their own PayPal payment
 * records. It never moves money: it flags `payment_records.dispute_status`,
 * writes an immutable order timeline event, notifies both participants and
 * emails Vendibook support for manual mediation.
 */

const SUPPORT_EMAIL = 'support@vendibook.com';

const REASONS: Record<string, string> = {
  not_received: 'Item or booking not received',
  not_as_described: 'Not as described',
  cancelled_by_other_party: 'Cancelled by the other party',
  duplicate_charge: 'Duplicate or unexpected charge',
  refund_not_received: 'Refund not received',
  other: 'Other issue',
};

const OPEN_STATUSES = ['open', 'buyer_reported', 'seller_reported', 'under_review'];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader.startsWith('Bearer ')) {
      return jsonError(401, 'unauthorized', 'Sign in to report a problem with a payment.');
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const { data: userData, error: userError } = await admin.auth.getUser(
      authHeader.replace('Bearer ', ''),
    );
    const user = userData?.user;
    if (userError || !user) {
      return jsonError(401, 'unauthorized', 'Sign in to report a problem with a payment.');
    }

    let body: { payment_record_id?: string; reason?: string; details?: string };
    try {
      body = await req.json();
    } catch {
      return jsonError(400, 'invalid_body', 'Could not read your dispute details.');
    }

    const paymentRecordId = String(body.payment_record_id ?? '').trim();
    const reason = String(body.reason ?? '').trim();
    const details = String(body.details ?? '').trim().slice(0, 2000);

    if (!paymentRecordId) return jsonError(400, 'missing_payment_record', 'Select a transaction to dispute.');
    if (!REASONS[reason]) return jsonError(400, 'invalid_reason', 'Choose a reason for the dispute.');
    if (details.length < 20) {
      return jsonError(400, 'details_too_short', 'Please describe the problem in at least a couple of sentences.');
    }

    const { data: record } = await admin
      .from('payment_records')
      .select('id, buyer_id, seller_id, reference, dispute_status, payment_status, listing_id, gross_amount_cents, currency, paypal_order_id, paypal_capture_id')
      .eq('id', paymentRecordId)
      .maybeSingle();

    if (!record) return jsonError(404, 'not_found', 'We could not find that transaction.');

    const isBuyer = record.buyer_id === user.id;
    const isSeller = record.seller_id === user.id;
    if (!isBuyer && !isSeller) {
      return jsonError(403, 'forbidden', 'You can only dispute your own transactions.');
    }
    if (record.payment_status !== 'completed') {
      return jsonError(409, 'not_disputable', 'Only completed payments can be disputed.');
    }
    if (record.dispute_status && OPEN_STATUSES.includes(record.dispute_status)) {
      return jsonResponse(200, { ok: true, already_open: true, dispute_status: record.dispute_status });
    }

    const disputeStatus = isBuyer ? 'buyer_reported' : 'seller_reported';
    const { error: updateError } = await admin
      .from('payment_records')
      .update({
        dispute_status: disputeStatus,
        metadata: {
          ...(record as any).metadata,
          dispute: {
            reason,
            reason_label: REASONS[reason],
            details,
            reported_by: user.id,
            reported_role: isBuyer ? 'buyer' : 'seller',
            reported_at: new Date().toISOString(),
          },
        },
      })
      .eq('id', record.id);
    if (updateError) return jsonError(500, 'update_failed', 'We could not open the dispute. Please try again.');

    await recordOrderEvent(admin, {
      paymentRecordId: record.id,
      code: 'dispute_opened',
      title: 'Dispute opened',
      description: `${REASONS[reason]} — reported by the ${isBuyer ? 'buyer' : 'seller'}. Vendibook support is reviewing.`,
      actorRole: isBuyer ? 'buyer' : 'seller',
      visibility: 'both',
      dedupeKey: `dispute:${record.id}`,
      metadata: { reason },
    });

    for (const [uid, role] of [[record.buyer_id, 'buyer'], [record.seller_id, 'seller']] as const) {
      await notifyUser(admin, {
        userId: uid,
        type: 'buyer_action_required',
        title: 'Dispute opened on a transaction',
        message: `${REASONS[reason]} was reported on order ${record.reference ?? record.id.slice(0, 8).toUpperCase()}. Our team is reviewing and will contact you.`,
        link: `/orders/${record.id}`,
        dedupeKey: `dispute-${record.id}-${role}`,
      });
    }

    try {
      await admin.functions.invoke('send-transactional-email', {
        body: {
          templateName: 'generic-notice',
          recipientEmail: SUPPORT_EMAIL,
          idempotencyKey: `dispute-${record.id}`,
          templateData: {
            subject: `Dispute opened — order ${record.reference ?? record.id.slice(0, 8).toUpperCase()}`,
            heading: 'A payment dispute was opened',
            body: [
              `Reason: ${REASONS[reason]}`,
              `Reported by: ${isBuyer ? 'buyer' : 'seller'} (${user.id})`,
              `PayPal order: ${record.paypal_order_id ?? '—'}`,
              `PayPal transaction: ${record.paypal_capture_id ?? '—'}`,
              `Details: ${details}`,
            ].join('\n'),
          },
        },
      });
    } catch (_err) {
      // Support email is best-effort — the dispute is already recorded.
    }

    return jsonResponse(200, { ok: true, dispute_status: disputeStatus });
  } catch (err) {
    return unknownErrorResponse(err);
  }
});
