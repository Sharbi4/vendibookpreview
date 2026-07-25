// Ensures a Rental Agreement exists + is out for signature for a booking.
// Idempotent. Requires an authenticated caller who is host, renter, or admin —
// or a service-role invocation (fire-and-forget from trusted callers).

import { createClient } from 'npm:@supabase/supabase-js@2.45.0';
import { corsHeaders, jsonError, jsonResponse, unknownErrorResponse } from '../_shared/jsonError.ts';
import { ensureRentalAgreement } from '../_shared/signnowDocuments.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonError(405, 'method_not_allowed', 'POST only');

  try {
    const { booking_id } = await req.json().catch(() => ({}));
    if (!booking_id || typeof booking_id !== 'string') {
      return jsonError(400, 'invalid_request', 'booking_id required');
    }

    // Auth: require either a service-role bearer or a real user who is a party.
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
      const { data: b } = await svc.from('booking_requests').select('host_id,shopper_id').eq('id', booking_id).maybeSingle();
      if (!b) return jsonError(404, 'not_found', 'booking not found');
      if (b.host_id !== uid && b.shopper_id !== uid) {
        const { data: role } = await svc.rpc('has_role', { _user_id: uid, _role: 'admin' });
        if (!role) return jsonError(403, 'forbidden', 'not a participant');
      }
    }

    const result = await ensureRentalAgreement(booking_id);
    return jsonResponse(200, { ...result });
  } catch (e) {
    console.error('[signnow-ensure-rental-agreement]', e);
    return unknownErrorResponse(e);
  }
});
