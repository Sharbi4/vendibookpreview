// Returns a short-lived signed URL to download the completed PDF for a
// document. Re-checks participation server-side; does NOT rely solely on
// storage RLS (belt + suspenders).

import { createClient } from 'npm:@supabase/supabase-js@2.45.0';
import { corsHeaders, jsonError, jsonResponse, unknownErrorResponse } from '../_shared/jsonError.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonError(405, 'method_not_allowed', 'POST only');

  try {
    const { document_id } = await req.json().catch(() => ({}));
    if (!document_id) return jsonError(400, 'invalid_request', 'document_id required');

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

    const svc = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } },
    );
    const { data: doc } = await svc
      .from('documents')
      .select('id,transaction_id,booking_id,status,signed_pdf_path')
      .eq('id', document_id)
      .maybeSingle();
    if (!doc) return jsonError(404, 'not_found', 'document not found');
    if (doc.status !== 'completed' || !doc.signed_pdf_path) {
      return jsonError(409, 'not_completed', 'document is not fully signed yet');
    }

    // Participant check.
    let isParticipant = false;
    if (doc.booking_id) {
      const { data: b } = await svc.from('booking_requests').select('host_id,shopper_id').eq('id', doc.booking_id).maybeSingle();
      isParticipant = !!b && (b.host_id === uid || b.shopper_id === uid);
    } else if (doc.transaction_id) {
      const { data: t } = await svc.from('sale_transactions').select('buyer_id,seller_id').eq('id', doc.transaction_id).maybeSingle();
      isParticipant = !!t && (t.buyer_id === uid || t.seller_id === uid);
    }
    if (!isParticipant) {
      const { data: role } = await svc.rpc('has_role', { _user_id: uid, _role: 'admin' });
      if (!role) return jsonError(403, 'forbidden', 'not a participant');
    }

    const { data: signed, error: sErr } = await svc.storage
      .from('signed-documents')
      .createSignedUrl(doc.signed_pdf_path, 300);
    if (sErr || !signed) return jsonError(500, 'signed_url_failed', sErr?.message ?? 'unknown');

    return jsonResponse(200, { url: signed.signedUrl, expires_in: 300 });
  } catch (e) {
    console.error('[signnow-download-signed]', e);
    return unknownErrorResponse(e);
  }
});
