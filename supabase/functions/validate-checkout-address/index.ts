import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';
import { corsHeaders, jsonError, jsonResponse } from '../_shared/jsonError.ts';
import { checkRateLimit } from '../_shared/rateLimit.ts';
import { checkoutAddressResult } from '../_shared/checkoutAddress.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return jsonError(405, 'method_not_allowed', 'Use POST.');
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return jsonError(401, 'unauthorized', 'Sign in to check your address.');
  const client = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { auth: { persistSession: false } });
  const { data: { user }, error } = await client.auth.getUser(token);
  if (error || !user) return jsonError(401, 'unauthorized', 'Sign in to check your address.');
  if (!await checkRateLimit('checkout_address', user.id, 60, 60)) return jsonError(429, 'rate_limited', 'Too many address checks. Please try again later.');
  try {
    const body = await req.json();
    const value = body?.address;
    if (!value || !Array.isArray(value.addressLines) || value.addressLines.length < 1 || value.addressLines.length > 3 ||
      value.addressLines.some((s: unknown) => typeof s !== 'string' || s.length > 300) || !value.addressLines.some((s: string) => s.trim())) {
      return jsonError(400, 'invalid_address', 'Enter a street address.');
    }
    const address: Record<string, unknown> = { addressLines: value.addressLines.map((s: string) => s.trim()).filter(Boolean) };
    for (const field of ['locality', 'administrativeArea', 'postalCode', 'regionCode']) {
      if (value[field] !== undefined && (typeof value[field] !== 'string' || value[field].length > 100)) return jsonError(400, 'invalid_address', 'Check the address fields.');
      if (value[field]?.trim()) address[field] = value[field].trim();
    }
    if (address.regionCode && !/^[A-Z]{2}$/.test(String(address.regionCode))) return jsonError(400, 'invalid_country', 'Choose a country.');
    const key = Deno.env.get('GOOGLE_ADDRESS_VALIDATION_API_KEY') || Deno.env.get('GOOGLE_MAPS_API_KEY') || Deno.env.get('GOOGLE_API_KEY');
    if (!key) return jsonError(503, 'validation_unavailable', 'Address checking is temporarily unavailable.');
    const response = await fetch('https://addressvalidation.googleapis.com/v1:validateAddress', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': key },
      body: JSON.stringify({ address }), signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) {
      // Never log the submitted address, credentials or Google's echoed request.
      console.warn('Address validation provider status', response.status);
      return jsonError(503, 'validation_unavailable', 'Address checking is temporarily unavailable.');
    }
    return jsonResponse(200, checkoutAddressResult(await response.json()));
  } catch {
    return jsonError(503, 'validation_unavailable', 'Address checking is temporarily unavailable.');
  }
});
