const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
import { checkRateLimit, clientIp } from '../_shared/rateLimit.ts';
import { getCaller, isBackendCaller, serviceRoleClient } from '../_shared/callerGuard.ts';

const VAPI_PRIVATE_KEY = Deno.env.get('VAPI_PRIVATE_KEY');
const VAPI_PHONE_NUMBER_ID = Deno.env.get('VAPI_PHONE_NUMBER_ID');
const ASSISTANT_ID = 'a37b08b5-ddf7-473d-ac23-1cb49ea2c713';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!VAPI_PRIVATE_KEY || !VAPI_PHONE_NUMBER_ID) {
      return new Response(
        JSON.stringify({ error: 'Vapi outbound calling is not configured.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Members only (owner decision 2026-10-15): signed-in users, or other
    // backend functions that already gated their own callers.
    const backend = await isBackendCaller(req);
    const caller = backend ? null : await getCaller(req);
    if (!backend && !caller) {
      return new Response(JSON.stringify({ error: 'Please sign in to request a call.' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    const rawName = typeof body?.name === 'string' ? body.name.trim() : '';
    const rawPhone = typeof body?.phone === 'string' ? body.phone.trim() : '';

    if (!rawName || rawName.length < 2 || rawName.length > 100) {
      return new Response(JSON.stringify({ error: 'Please enter your name.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Normalize phone to E.164 (assume US if no country code)
    const digits = rawPhone.replace(/\D/g, '');
    if (digits.length < 10 || digits.length > 15) {
      return new Response(JSON.stringify({ error: 'Please enter a valid phone number.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const e164 = rawPhone.startsWith('+')
      ? `+${digits}`
      : digits.length === 10
        ? `+1${digits}`
        : `+${digits}`;

    // Members can only have Vendibook call a number they have verified on
    // their own account, so a session can't be used to dial someone else.
    if (caller) {
      const { data: verified, error: verifyErr } = await serviceRoleClient()
        .from('signup_phone_verifications')
        .select('phone_e164')
        .eq('user_id', caller.id)
        .eq('phone_e164', e164)
        .maybeSingle();
      if (verifyErr) {
        return new Response(JSON.stringify({ error: 'We could not check your phone number. Please call or text (866) 690-6227.' }), {
          status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (!verified) {
        return new Response(JSON.stringify({
          error: 'For your security, we can only call the verified phone number on your account. Call or text (866) 690-6227 instead.',
          code: 'phone_not_verified',
        }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    // Abuse protection: this endpoint is intentionally public (visitors can
    // request a call back), so cap attempts per phone number and per visitor.
    const withinPhoneLimit = await checkRateLimit('vapi_outbound_phone', e164, 3, 60);
    const withinIpLimit = await checkRateLimit('vapi_outbound_ip', clientIp(req), 5, 60);
    if (!withinPhoneLimit || !withinIpLimit) {
      return new Response(
        JSON.stringify({ error: 'Too many call requests. Please try again in a little while.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const res = await fetch('https://api.vapi.ai/call', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${VAPI_PRIVATE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        assistantId: ASSISTANT_ID,
        phoneNumberId: VAPI_PHONE_NUMBER_ID,
        customer: { number: e164, name: rawName },
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('Vapi outbound call error:', res.status, data);
      return new Response(
        JSON.stringify({ error: 'Could not place the call.' }),
        { status: res.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(JSON.stringify({ callId: data?.id, status: data?.status }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('vapi-outbound-call unhandled:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
