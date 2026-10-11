// Generic entry point for the Vendibook transaction-document package.
//
// Callable by a participant (buyer/seller/renter/host), an admin, or with the
// service-role bearer. Each document kind is only generated at the lifecycle
// stage it belongs to — that rule lives in signnowDocuments.ts and is enforced
// server-side regardless of what the caller asks for.
//
// Signing a document never moves money. Seller payouts stay a manual
// administrator action.

import { createClient } from 'npm:@supabase/supabase-js@2.45.0';
import { corsHeaders, jsonError, jsonResponse, unknownErrorResponse } from '../_shared/jsonError.ts';
import {
  ensurePurchaseSaleAgreement,
  ensureSaleHandoffAcknowledgment,
  ensureRentalAgreement,
  ensureRentalConditionReport,
} from '../_shared/signnowDocuments.ts';

type DocRequest =
  | 'purchase_sale_agreement'
  | 'sale_handoff'
  | 'rental_agreement'
  | 'rental_checkin'
  | 'rental_checkout';

const SALE_KINDS: DocRequest[] = ['purchase_sale_agreement', 'sale_handoff'];
const BOOKING_KINDS: DocRequest[] = ['rental_agreement', 'rental_checkin', 'rental_checkout'];
const ALL_KINDS = [...SALE_KINDS, ...BOOKING_KINDS];

function svc() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  );
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonError(405, 'method_not_allowed', 'POST only');

  try {
    const body = await req.json().catch(() => ({}));
    const kind = body?.kind as DocRequest | undefined;
    const transactionId = typeof body?.transaction_id === 'string' ? body.transaction_id : null;
    const bookingId = typeof body?.booking_id === 'string' ? body.booking_id : null;

    if (!kind || !ALL_KINDS.includes(kind)) {
      return jsonError(400, 'invalid_request', `kind must be one of: ${ALL_KINDS.join(', ')}`);
    }
    if (SALE_KINDS.includes(kind) && !transactionId) return jsonError(400, 'invalid_request', 'transaction_id required');
    if (BOOKING_KINDS.includes(kind) && !bookingId) return jsonError(400, 'invalid_request', 'booking_id required');

    const authHeader = req.headers.get('Authorization') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const isServiceCall = authHeader === `Bearer ${serviceKey}`;
    const admin = svc();

    if (!isServiceCall) {
      if (!authHeader.startsWith('Bearer ')) return jsonError(401, 'unauthorized', 'auth required');
      const userClient = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!,
        { global: { headers: { Authorization: authHeader } } },
      );
      const { data: authData, error: authError } = await userClient.auth.getUser(authHeader.replace('Bearer ', ''));
      const uid = authError ? undefined : authData?.user?.id;
      if (!uid) return jsonError(401, 'unauthorized', 'auth required');

      let participants: (string | null)[] = [];
      if (transactionId) {
        const { data } = await admin.from('sale_transactions').select('buyer_id,seller_id').eq('id', transactionId).maybeSingle();
        if (!data) return jsonError(404, 'not_found', 'transaction not found');
        participants = [data.buyer_id, data.seller_id];
      } else if (bookingId) {
        const { data } = await admin.from('booking_requests').select('shopper_id,host_id').eq('id', bookingId).maybeSingle();
        if (!data) return jsonError(404, 'not_found', 'booking not found');
        participants = [data.shopper_id, data.host_id];
      }

      if (!participants.includes(uid)) {
        const { data: isAdmin } = await admin.rpc('has_role', { _user_id: uid, _role: 'admin' });
        if (!isAdmin) return jsonError(403, 'forbidden', 'not a participant');
      }
    }

    let result;
    switch (kind) {
      case 'purchase_sale_agreement':
        result = await ensurePurchaseSaleAgreement(transactionId!);
        break;
      case 'sale_handoff':
        result = await ensureSaleHandoffAcknowledgment(transactionId!);
        break;
      case 'rental_agreement':
        result = await ensureRentalAgreement(bookingId!);
        break;
      case 'rental_checkin':
        result = await ensureRentalConditionReport(bookingId!, 'checkin');
        break;
      case 'rental_checkout':
        result = await ensureRentalConditionReport(bookingId!, 'checkout');
        break;
    }

    return jsonResponse(200, { ...result });
  } catch (e) {
    console.error('[signnow-ensure-document]', e);
    return unknownErrorResponse(e);
  }
});
