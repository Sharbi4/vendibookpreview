// acknowledge-terms — records that a signed-in customer clicked
// "I reviewed the price and details" on the final review sheet. Writes to
// the transaction_terms row via a SECURITY DEFINER RPC scoped to the caller.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = (await req.json()) as { terms_id?: string };
    if (!body?.terms_id) {
      return new Response(JSON.stringify({ error: 'terms_id_required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const ip =
      (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || null;
    const ua = req.headers.get('user-agent') ?? '';

    const { error } = await supabase.rpc('acknowledge_transaction_terms', {
      _terms_id: body.terms_id,
      _ip: ip,
      _ua: ua,
    });
    if (error) throw error;

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('acknowledge-terms error', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'unknown_error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
