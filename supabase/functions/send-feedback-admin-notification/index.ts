const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
import { invokeTransactionalEmail } from '../_shared/invokeTransactionalEmail.ts'
import { adminAlertEmails, adminNoticeKey } from '../_shared/adminRecipients.ts'

// Public trigger for the feedback form: validates input and emails the
// admin team. The recipient is fixed — nothing from the client can steer
// where this goes.

function json(data: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function str(v: unknown, max: number): string | undefined {
  if (typeof v !== 'string') return undefined
  const t = v.trim()
  return t ? t.slice(0, max) : undefined
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  const recordId = str(body.recordId, 100)
  const message = str(body.message, 4000)
  const rating = typeof body.rating === 'number' && Number.isInteger(body.rating) && body.rating >= 1 && body.rating <= 5
    ? body.rating
    : null
  const nps = typeof body.nps === 'number' && Number.isInteger(body.nps) && body.nps >= 0 && body.nps <= 10
    ? body.nps
    : null

  if (!recordId) return json({ error: 'recordId is required' }, 400)
  if (!rating) return json({ error: 'rating must be an integer from 1 to 5' }, 400)
  if (!message) return json({ error: 'message is required' }, 400)

  const results = await Promise.all(adminAlertEmails().map((recipient) => invokeTransactionalEmail({
    templateName: 'feedback-received-admin',
    recipientEmail: recipient,
    idempotencyKey: adminNoticeKey(`feedback-admin-${recordId}`, recipient),
    templateData: {
      fromEmail: str(body.fromEmail, 200),
      fromName: str(body.fromName, 120),
      rating,
      nps,
      message,
      contextType: str(body.contextType, 60),
      contextLabel: str(body.contextLabel, 200),
      businessType: str(body.businessType, 120),
      canShare: body.canShare === true,
    },
  })))
  const error = results.every((r) => r.error) ? results[0]?.error : null

  if (error) {
    console.error('feedback admin notification failed', { message: error.message })
    return json({ error: 'Failed to send notification' }, 500)
  }

  return json({ success: true })
})
