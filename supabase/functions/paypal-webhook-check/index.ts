import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { paypalRequest, paypalEnvironment, getPayPalAccessTokenForEnv } from '../_shared/paypal.ts'

// Temporary one-time diagnostic: confirms a PayPal webhook ID exists in the
// sandbox, reports its URL and subscribed event types, and can simulate an
// event to prove end-to-end signature verification. Deleted after use.

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  const token = req.headers.get('x-admin-ops-token') ?? ''
  const expected = Deno.env.get('ADMIN_OPS_TOKEN') ?? ''
  if (!expected || !safeEqual(token, expected)) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  let body: { webhook_id?: string; simulate?: boolean; event_type?: string; add_event_type?: string }
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'invalid_json' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
  const webhookId = (body.webhook_id ?? '').trim()
  if (!/^[A-Z0-9]{10,24}$/.test(webhookId)) {
    return new Response(JSON.stringify({ error: 'invalid_webhook_id' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  try {
    const webhook = await paypalRequest<{ id: string; url: string; event_types: { name: string; status: string }[] }>(
      `/v1/notifications/webhooks/${encodeURIComponent(webhookId)}`,
      { method: 'GET', retries: 1 },
    )

    const result: Record<string, unknown> = {
      environment: paypalEnvironment(),
      id: webhook.id,
      url: webhook.url,
      event_types: webhook.event_types.map((e) => e.name),
      disabled_event_types: webhook.event_types.filter((e) => e.status !== 'ENABLED').map((e) => e.name),
    }

    if (body.add_event_type) {
      try {
        const patchOp = [{ op: 'add', path: '/event_types', value: [{ name: body.add_event_type }] }]
        await paypalRequest(`/v1/notifications/webhooks/${encodeURIComponent(webhookId)}`, { method: 'PATCH', retries: 1, body: patchOp })
        result.added_event_type = body.add_event_type
      } catch (patchErr) {
        result.add_event_error = (patchErr as Error).message
      }
    }

    if (body.simulate) {
      const eventType = body.event_type ?? 'PAYMENT.CAPTURE.COMPLETED'
      try {
        const token = await getPayPalAccessTokenForEnv('sandbox')
        const resp = await fetch('https://api-m.sandbox.paypal.com/v1/notifications/simulate-event', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ webhook_id: webhookId, event_type: eventType }),
        })
        const text = await resp.text()
        result.simulate_status = resp.status
        result.simulate_response = text.slice(0, 800)
      } catch (simErr) {
        result.simulate_error = (simErr as Error).message
      }
    }

    return new Response(JSON.stringify(result), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
