// Ensures a Bill of Sale exists + is out for signature for a paid sale
// transaction. Idempotent. Same auth model as the rental-agreement fn:
// service-role bearer OR a party (buyer/seller/admin).

import { createClient } from 'npm:@supabase/supabase-js@2.45.0';
import { corsHeaders, jsonError, jsonResponse, unknownErrorResponse } from '../_shared/jsonError.ts';
import { ensureBillOfSale } from '../_shared/signnowDocuments.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonError(405, 'method_not_allowed', 'POST only');

  try {
    const { transaction_id } = await req.json().catch(() => ({}));
    if (!transaction_id || typeof transaction_id !== 'string') {
      return jsonError(400, 'invalid_request', 'transaction_id required');
    }

    const authHeader = req.headers.get('Authorization') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const isServiceCall = authHeader === `Bearer ${serviceKey}`;

    if (!isServiceCall) {
      if (!authHeader.startsWith('Bearer ')) return jsonError(401, 'unauthorized', 'auth required');
      const userClient = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!,
        { global: { headers: { Authorization: authHeader } } },
      );
      const { data: claims } = await userClient.auth.getClaims(authHeader.replace('Bearer ', ''));
      const uid = claims?.claims?.sub;
      if (!uid) return jsonError(401, 'unauthorized', 'auth required');

      const svc = createClient(Deno.env.get('SUPABASE_URL')!, serviceKey, { auth: { persistSession: false } });
      const { data: t } = await svc.from('sale_transactions').select('buyer_id,seller_id').eq('id', transaction_id).maybeSingle();
      if (!t) return jsonError(404, 'not_found', 'transaction not found');
      if (t.buyer_id !== uid && t.seller_id !== uid) {
        const { data: role } = await svc.rpc('has_role', { _user_id: uid, _role: 'admin' });
        if (!role) return jsonError(403, 'forbidden', 'not a participant');
      }
    }

    const result = await ensureBillOfSale(transaction_id);
    return jsonResponse(200, { ...result });
  } catch (e) {
    console.error('[signnow-ensure-bill-of-sale]', e);
    return unknownErrorResponse(e);
  }
});
