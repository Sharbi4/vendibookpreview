// Creates a two-party Transaction Amendment for an existing signed document.
//
// Amendments are NEVER generated automatically. They exist only when a party
// or an administrator explicitly requests a formal change to a material term.
// The original document is never altered — the amendment references it.

import { createClient } from 'npm:@supabase/supabase-js@2.45.0';
import { corsHeaders, jsonError, jsonResponse, unknownErrorResponse } from '../_shared/jsonError.ts';
import { createTransactionAmendment } from '../_shared/signnowDocuments.ts';

function svc() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  );
}

const trimmed = (v: unknown, max: number): string | null =>
  typeof v === 'string' && v.trim().length > 0 && v.trim().length <= max ? v.trim() : null;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonError(405, 'method_not_allowed', 'POST only');

  try {
    const body = await req.json().catch(() => ({}));
    const originalDocumentId = trimmed(body?.original_document_id, 64);
    const originalTerm = trimmed(body?.original_term, 4000);
    const replacementTerm = trimmed(body?.replacement_term, 4000);
    const reason = typeof body?.reason === 'string' ? body.reason.slice(0, 2000) : undefined;

    if (!originalDocumentId) return jsonError(400, 'invalid_request', 'original_document_id required');
    if (!originalTerm) return jsonError(400, 'invalid_request', 'original_term required (1-4000 chars)');
    if (!replacementTerm) return jsonError(400, 'invalid_request', 'replacement_term required (1-4000 chars)');

    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader.startsWith('Bearer ')) return jsonError(401, 'unauthorized', 'auth required');
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: claims } = await userClient.auth.getClaims(authHeader.replace('Bearer ', ''));
    const uid = claims?.claims?.sub;
    if (!uid) return jsonError(401, 'unauthorized', 'auth required');

    const admin = svc();
    const { data: original } = await admin
      .from('documents')
      .select('id,transaction_id,booking_id,status')
      .eq('id', originalDocumentId)
      .maybeSingle();
    if (!original) return jsonError(404, 'not_found', 'original document not found');

    let participants: (string | null)[] = [];
    if (original.transaction_id) {
      const { data } = await admin.from('sale_transactions').select('buyer_id,seller_id').eq('id', original.transaction_id).maybeSingle();
      participants = [data?.buyer_id ?? null, data?.seller_id ?? null];
    } else if (original.booking_id) {
      const { data } = await admin.from('booking_requests').select('shopper_id,host_id').eq('id', original.booking_id).maybeSingle();
      participants = [data?.shopper_id ?? null, data?.host_id ?? null];
    }
    if (!participants.includes(uid)) {
      const { data: isAdmin } = await admin.rpc('has_role', { _user_id: uid, _role: 'admin' });
      if (!isAdmin) return jsonError(403, 'forbidden', 'not a participant');
    }

    const parent = original.transaction_id
      ? { transaction_id: original.transaction_id as string }
      : { booking_id: original.booking_id as string };

    const result = await createTransactionAmendment({
      parent,
      originalDocumentId,
      originalTerm,
      replacementTerm,
      reason,
    });

    return jsonResponse(200, { ...result });
  } catch (e) {
    console.error('[signnow-create-amendment]', e);
    return unknownErrorResponse(e);
  }
});
