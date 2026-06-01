import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const VAPI_PRIVATE_KEY = Deno.env.get('VAPI_PRIVATE_KEY');
const ASSISTANT_ID = '9dfe0a24-ce82-4e32-8889-3fc6a4afca89';

const CUSTOMER_SUPPORT_GUARDRAILS = `
Vendibook support guardrails for this chat:
- Use plain, empathetic customer support language. Do not use developer jargon.
- Never say "non-2xx", "HTTP status", "status code", "backend error", "API error", or "Slow Network" to a normal customer.
- Translate technical failures into: "something didn't complete correctly".
- Do not send raw markdown emphasis like **text**.
- If the customer reports an error, first apologize, say support is looking into it, and ask what they were trying to do when it appeared: editing a listing, uploading photos, boosting, checking out, or viewing the listing.
- If the customer is Stephanie Lentz or mentions a boost/refund/listing issue, treat it as urgent and do not give generic troubleshooting steps.
`;

function sanitizeReply(reply: string): string {
  return reply
    .replace(/\*\*/g, '')
    .replace(/non[-\s]?2xx(?:\s+HTTP)?(?:\s+status(?:\s+code)?)?/gi, "something didn't complete correctly")
    .replace(/HTTP\s+status(?:\s+code)?/gi, 'completion status')
    .replace(/backend\s+error/gi, "something didn't complete correctly")
    .replace(/API\s+error/gi, "something didn't complete correctly")
    .replace(/Slow\s+Network/gi, 'Connection issue')
    .trim();
}

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
      input: `${CUSTOMER_SUPPORT_GUARDRAILS}\n\nCustomer message: ${input}`,
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
        reply: sanitizeReply(reply || "I'm here — could you rephrase that?"),
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
