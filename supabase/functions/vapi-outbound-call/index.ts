import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

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
        JSON.stringify({ error: data?.message || 'Could not place the call.', details: data }),
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
