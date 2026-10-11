// Tawk.to webhook receiver — Phase 1
// - Verifies HMAC-SHA1 signature over raw body
// - Deduplicates by (source, external_event_id)
// - Creates ONE support_tickets row per Tawk ticket/transcript event
// - Writes an audit event
// - Sends a customer acknowledgment email (best-effort)
//
// Tawk config: Admin → Property → Webhooks
//   URL:  https://<project-ref>.supabase.co/functions/v1/tawk-webhook
//   Sig:  paste the value stored in TAWK_WEBHOOK_SECRET
//   Events: chat:start, chat:end, chat:transcript_created, ticket:create
//
// This function is deployed with verify_jwt = false so Tawk (an external
// service without a Supabase JWT) can call it. Authentication is enforced
// entirely by the HMAC signature check below.

import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { invokeTransactionalEmail } from '../_shared/invokeTransactionalEmail.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const TAWK_WEBHOOK_SECRET = Deno.env.get('TAWK_WEBHOOK_SECRET') || ''

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

// ---- signature ---------------------------------------------------------

async function hmacSha1Hex(secret: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body))
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function hexToBase64(hex: string): string {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16)
  }
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin)
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

// ---- event normalization -----------------------------------------------

type TawkEvent =
  | 'chat:start'
  | 'chat:end'
  | 'chat:transcript_created'
  | 'ticket:create'
  | 'agent:offline-msg'
  | string

interface NormalizedTicket {
  externalEventId: string
  tawkTicketId: string | null
  tawkChatId: string | null
  propertyId: string | null
  customerEmail: string | null
  customerName: string | null
  subject: string
  bodyText: string
  category: string
  priority: 'urgent' | 'high' | 'normal' | 'low'
  featureArea: string
  shouldCreateTicket: boolean
}

function normalize(payload: any): NormalizedTicket {
  const event: TawkEvent = payload?.event ?? 'unknown'
  const property = payload?.property?.id ?? payload?.propertyId ?? null
  const chatId = payload?.chatId ?? payload?.chat?.id ?? null
  const ticket = payload?.ticket ?? null

  const tawkTicketId = ticket?.id ?? ticket?.humanId ?? null
  const requester = ticket?.requester ?? payload?.visitor ?? {}
  const email = (requester?.email ?? null) || null
  const name = (requester?.name ?? null) || null

  const subject =
    ticket?.subject ||
    payload?.message?.text?.slice(0, 120) ||
    `Tawk.to ${event}`
  const bodyText =
    ticket?.message ||
    payload?.transcript?.content ||
    payload?.message?.text ||
    `Received via Tawk.to event: ${event}`

  // Composite dedup key — Tawk doesn't guarantee a single event-id header
  const time = payload?.time ?? new Date().toISOString()
  const externalEventId = [event, tawkTicketId ?? chatId ?? 'unknown', time].join('|')

  // Very rough priority heuristic; server-side classifier arrives in Phase 3
  const lower = `${subject} ${bodyText}`.toLowerCase()
  let priority: NormalizedTicket['priority'] = 'normal'
  if (/charge|duplicate|refund|unauthorized|fraud|urgent|payout stuck/.test(lower)) {
    priority = 'urgent'
  } else if (/cannot|can't|stuck|error|fail/.test(lower)) {
    priority = 'high'
  } else if (/how (do|to)|question|advice/.test(lower)) {
    priority = 'low'
  }

  return {
    externalEventId,
    tawkTicketId,
    tawkChatId: chatId,
    propertyId: property,
    customerEmail: email,
    customerName: name,
    subject: subject.slice(0, 250),
    bodyText: bodyText.slice(0, 8000),
    category: 'general',
    priority,
    featureArea: 'other',
    shouldCreateTicket:
      event === 'ticket:create' ||
      event === 'chat:transcript_created' ||
      event === 'agent:offline-msg',
  }
}

// ---- handler -----------------------------------------------------------

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (!TAWK_WEBHOOK_SECRET) {
    console.error('TAWK_WEBHOOK_SECRET not configured')
    return new Response(JSON.stringify({ error: 'server not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const rawBody = await req.text()

  // Tawk sends the header as base64(hmac-sha1(secret, body)) per its current docs.
  // Some older docs describe hex. Compute both and accept either.
  const providedSig = (req.headers.get('X-Tawk-Signature') || '').trim()
  const expectedHex = await hmacSha1Hex(TAWK_WEBHOOK_SECRET, rawBody)
  const expectedB64 = hexToBase64(expectedHex)

  if (
    !providedSig ||
    (!timingSafeEqual(providedSig, expectedHex) &&
      !timingSafeEqual(providedSig, expectedB64))
  ) {
    console.warn('tawk-webhook: invalid signature')
    return new Response(JSON.stringify({ error: 'invalid signature' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  let payload: any
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return new Response(JSON.stringify({ error: 'malformed json' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const n = normalize(payload)

  // 1) Idempotency ledger
  const { data: ledgerRow, error: ledgerErr } = await admin
    .from('support_ticket_webhook_events')
    .insert({
      source: 'tawkto',
      external_event_id: n.externalEventId,
      event_type: payload?.event ?? 'unknown',
      property_id: n.propertyId,
      payload,
    })
    .select('id, ticket_id, processed_at')
    .single()

  // Duplicate delivery → ack quickly, do nothing else
  if (ledgerErr) {
    const msg = String((ledgerErr as any).message || '')
    if ((ledgerErr as any).code === '23505' || /duplicate key/i.test(msg)) {
      return new Response(
        JSON.stringify({ ok: true, deduplicated: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }
    console.error('ledger insert failed', ledgerErr)
    return new Response(
      JSON.stringify({ error: 'ledger write failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  // 2) Create ticket (only for ticket-creating events)
  let ticketId: string | null = null
  if (n.shouldCreateTicket) {
    // Attempt to match a Vendibook user by email
    let userId: string | null = null
    if (n.customerEmail) {
      const { data: prof } = await admin
        .from('profiles')
        .select('id')
        .ilike('email', n.customerEmail)
        .limit(1)
        .maybeSingle()
      userId = prof?.id ?? null
    }

    // Upsert on tawk_ticket_id to survive retries even if the ledger row
    // was rolled back for some reason.
    const insertRow: Record<string, unknown> = {
      source: 'tawkto',
      tawk_ticket_id: n.tawkTicketId,
      tawk_chat_id: n.tawkChatId,
      tawk_property_id: n.propertyId,
      user_id: userId,
      customer_email: n.customerEmail,
      customer_name: n.customerName,
      feature_area: n.featureArea,
      category: n.category,
      priority: n.priority,
      title: n.subject,
      description: n.bodyText,
      reply_email: n.customerEmail,
      status: 'new',
    }

    let insertedTicket: { id: string; reference_code: string; user_id: string | null } | null =
      null
    if (n.tawkTicketId) {
      const { data, error } = await admin
        .from('support_tickets')
        .upsert(insertRow, { onConflict: 'tawk_ticket_id' })
        .select('id, reference_code, user_id')
        .single()
      if (error) console.error('ticket upsert failed', error)
      else insertedTicket = data
    } else {
      const { data, error } = await admin
        .from('support_tickets')
        .insert(insertRow)
        .select('id, reference_code, user_id')
        .single()
      if (error) console.error('ticket insert failed', error)
      else insertedTicket = data
    }

    if (insertedTicket) {
      ticketId = insertedTicket.id

      // Link back to ledger row
      await admin
        .from('support_ticket_webhook_events')
        .update({ ticket_id: ticketId, processed_at: new Date().toISOString() })
        .eq('id', ledgerRow.id)

      // Audit event
      await admin.from('support_ticket_audit_events').insert({
        ticket_id: ticketId,
        event_type: 'ticket_created_from_tawk',
        actor_type: 'system',
        new_status: 'new',
        external_ref: n.tawkTicketId ?? n.tawkChatId,
        details: { event: payload?.event, priority: n.priority },
      })

      // Best-effort customer acknowledgment
      if (n.customerEmail) {
        try {
          await invokeTransactionalEmail({
              templateName: 'support-reply',
              recipientEmail: n.customerEmail,
              idempotencyKey: `tawk-ack-${ticketId}`,
              templateData: {
                firstName: n.customerName?.split(' ')[0],
                subject: `We received your request — ${insertedTicket.reference_code}`,
                bodyParagraphs: [
                  `Thanks for contacting Vendibook Customer Success. Your request has been received and is being reviewed.`,
                  `Your support reference is ${insertedTicket.reference_code}. Please include it in any follow-up so we can find your case quickly.`,
                  n.priority === 'urgent'
                    ? `If your message involves a payment or activation issue, please do not submit another payment while we review this issue.`
                    : `A member of our team will follow up during support hours (Mon–Fri, 9am–5pm Arizona time).`,
                ],
                signedBy: 'The Vendibook Team',
                signedTitle: 'Customer Support',
              },
            })
        } catch (e) {
          console.error('ack email invoke failed', e)
        }
      }
    } else {
      await admin
        .from('support_ticket_webhook_events')
        .update({
          processed_at: new Date().toISOString(),
          processing_error: 'ticket_insert_failed',
        })
        .eq('id', ledgerRow.id)
    }
  } else {
    await admin
      .from('support_ticket_webhook_events')
      .update({ processed_at: new Date().toISOString() })
      .eq('id', ledgerRow.id)
  }

  return new Response(
    JSON.stringify({ ok: true, ticket_id: ticketId }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  )
})
