// Server-issued Equinox Funding apply link.
//
// The apply URL is never hardcoded into a client-rendered anchor that can be
// clicked on a listing without financing enabled: the client asks for it here
// and the server re-verifies the launch flag + per-listing opt-in first.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { corsHeaders, jsonError, jsonResponse, unknownErrorResponse } from '../_shared/jsonError.ts';
import {
  EQUINOX_APPLY_URL,
  checkFinancingEligibility,
  resolveViewerId,
} from '../_shared/financingEligibility.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    if (req.method !== 'POST') {
      return jsonError(405, 'method_not_allowed', 'Use POST.');
    }

    const body = await req.json().catch(() => ({}));
    const listingId = String(body?.listingId ?? '').trim();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } },
    );

    const viewerId = await resolveViewerId(supabase, req);
    const gate = await checkFinancingEligibility(supabase, listingId, viewerId);
    if (!gate.ok) return gate.response;

    return jsonResponse(200, { applyUrl: EQUINOX_APPLY_URL, listingId });
  } catch (err) {
    return unknownErrorResponse(err);
  }
});
