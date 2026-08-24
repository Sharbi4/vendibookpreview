import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { invokeTransactionalEmail } from '../_shared/invokeTransactionalEmail.ts'
import { isAdminOrInternalCaller } from '../_shared/internalAuth.ts'

// Admin-only trigger: emails a support-ticket reply to the ticket's
// reply_email. The recipient always comes from the ticket record — never
// from the request body.

function json(data: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  if (!(await isAdminOrInternalCaller(req))) {
    return json({ error: 'Forbidden' }, 403)
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  const ticketId = typeof body.ticketId === 'string' ? body.ticketId.trim() : ''
  const reply = typeof body.reply === 'string' ? body.reply.trim().slice(0, 4000) : ''
  if (!ticketId) return json({ error: 'ticketId is required' }, 400)
  if (!reply) return json({ error: 'reply is required' }, 400)

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const { data: ticket, error: lookupError } = await supabase
    .from('support_tickets')
    .select('id, reference_code, title, reply_email')
    .eq('id', ticketId)
    .maybeSingle()

  if (lookupError) {
    console.error('ticket lookup failed', { code: lookupError.code, message: lookupError.message })
    return json({ error: 'Failed to load ticket' }, 500)
  }
  if (!ticket) return json({ error: 'Ticket not found' }, 404)
  if (!ticket.reply_email) return json({ sent: false, reason: 'no_reply_email' })

  const { error } = await invokeTransactionalEmail({
    templateName: 'generic-notice',
    recipientEmail: ticket.reply_email,
    idempotencyKey: `support-reply-${ticket.id}-${Date.now()}`,
    templateData: {
      subject: `Update on your report — ${ticket.reference_code}`,
      kicker: 'Customer Success',
      heading: 'New update from Vendibook Customer Success',
      paragraphs: [reply],
      details: [
        { label: 'Reference', value: ticket.reference_code, mono: true },
        { label: 'Your report', value: ticket.title },
      ],
      ctaLabel: 'Reply from your dashboard',
      ctaUrl: 'https://vendibook.com/dashboard',
    },
  })

  if (error) {
    console.error('support ticket reply email failed', { message: error.message })
    return json({ error: 'Failed to send reply email' }, 500)
  }

  return json({ sent: true })
})
