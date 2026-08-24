import { createClient } from 'npm:@supabase/supabase-js@2'
import { createEmailWebhookHandler } from 'npm:@lovable.dev/email-js@0.1.0'

// Reacts to terminal email delivery events. This is a notification-only copy
// for the app's own records — Lovable already enforces suppression at send
// time, so nothing here gates future sends.
//
// Ported behavior from the legacy suppression pipeline:
//   - bounce / complaint -> suppressed_emails { reason, scope: 'all' }
//   - unsubscribe        -> suppressed_emails { reason: 'unsubscribe', scope: 'marketing' }
//   - every event appends an email_send_log row with template_name 'system'
//     and the same human-readable error_message strings as before.

function db() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )
}

type EventData = { event: string; recipient: string; message_id?: string }

async function recordSuppression(
  data: EventData,
  reason: 'bounce' | 'complaint' | 'unsubscribe',
  scope: 'all' | 'marketing',
  logStatus: 'bounced' | 'complained' | 'suppressed',
  logMessage: string,
  eventId: string,
) {
  const supabase = db()
  const email = data.recipient.toLowerCase()

  // Upsert is idempotent on email — safe for redeliveries.
  const { error: suppressError } = await supabase
    .from('suppressed_emails')
    .upsert(
      { email, reason, scope, metadata: null },
      { onConflict: 'email' },
    )
  if (suppressError) {
    console.error('Failed to upsert suppressed email', {
      code: suppressError.code,
      message: suppressError.message,
      event_id: eventId,
    })
    throw new Error(`suppressed_emails upsert failed: ${suppressError.message}`)
  }

  // Append-only audit log. Best-effort dedupe on redelivery when a
  // message_id is available.
  if (data.message_id) {
    const { data: existing, error: lookupError } = await supabase
      .from('email_send_log')
      .select('id')
      .eq('template_name', 'system')
      .eq('recipient_email', email)
      .eq('status', logStatus)
      .eq('message_id', data.message_id)
      .limit(1)
    if (lookupError) {
      console.error('Failed to check email_send_log for duplicate', {
        code: lookupError.code,
        message: lookupError.message,
        event_id: eventId,
      })
      throw new Error(`email_send_log lookup failed: ${lookupError.message}`)
    }
    if (existing && existing.length > 0) return
  }

  const { error: insertError } = await supabase.from('email_send_log').insert({
    message_id: data.message_id ?? null,
    template_name: 'system',
    recipient_email: email,
    status: logStatus,
    error_message: logMessage,
    metadata: null,
  })
  if (insertError) {
    console.error('Failed to insert email_send_log', {
      code: insertError.code,
      message: insertError.message,
      event_id: eventId,
    })
    throw new Error(`email_send_log insert failed: ${insertError.message}`)
  }
}

const handler = createEmailWebhookHandler({
  apiKey: Deno.env.get('LOVABLE_API_KEY')!,
  on: {
    'email.bounced': async (event) => {
      await recordSuppression(
        event.data,
        'bounce',
        'all',
        'bounced',
        'Permanent bounce — email address is invalid or rejected',
        event.event_id,
      )
    },
    'email.complaint': async (event) => {
      await recordSuppression(
        event.data,
        'complaint',
        'all',
        'complained',
        'Spam complaint — recipient marked email as spam',
        event.event_id,
      )
    },
    'email.unsubscribed': async (event) => {
      await recordSuppression(
        event.data,
        'unsubscribe',
        'marketing',
        'suppressed',
        'Recipient unsubscribed',
        event.event_id,
      )
    },
  },
})

Deno.serve((req) => handler(req))
