import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const VAPI_PRIVATE_KEY = Deno.env.get('VAPI_PRIVATE_KEY');
const ASSISTANT_ID = '3896c198-a43b-4c5f-8f25-d3e77dc81dc6';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!VAPI_PRIVATE_KEY) {
      return new Response(JSON.stringify({ error: 'VAPI_PRIVATE_KEY not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    const input = typeof body?.input === 'string' ? body.input.trim() : '';
    const previousChatId = typeof body?.previousChatId === 'string' ? body.previousChatId : undefined;

    if (!input) {
      return new Response(JSON.stringify({ error: 'Missing input' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const payload: Record<string, unknown> = {
      assistantId: ASSISTANT_ID,
      input,
    };
    if (previousChatId) payload.previousChatId = previousChatId;

    const res = await fetch('https://api.vapi.ai/chat', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${VAPI_PRIVATE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('Vapi chat error:', res.status, data);
      return new Response(JSON.stringify({ error: data?.message || 'Vapi error', details: data }), {
        status: res.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Extract assistant reply text from output array
    const output = Array.isArray(data?.output) ? data.output : [];
    const reply = output
      .filter((m: any) => m?.role === 'assistant' && typeof m?.content === 'string')
      .map((m: any) => m.content)
      .join('\n\n');

    return new Response(
      JSON.stringify({
        chatId: data?.id,
        reply: reply || "I'm here — could you rephrase that?",
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('vapi-chat unhandled:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
