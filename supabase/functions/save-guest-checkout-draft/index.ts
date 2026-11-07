// Public: a guest at the first checkout step leaves just an email so the
// abandonment sweep can send them a link back to finish (2h / 24h).
// Saves only email + listing + checkout context. Rate-limited; never
// reveals whether a listing or email exists beyond a generic result.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { checkRateLimit, clientIp } from '../_shared/rateLimit.ts'
import {
  type GuestCheckoutFlow,
  listingAcceptsGuestDraft,
  normalizeGuestEmail,
  safeGuestResumePath,
  safeIsoDate,
} from '../_shared/guestCheckoutDraft.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

const json = (data: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return json({ error: 'invalid_body' }, 400)
  }

  const flow = body.flow === 'sale' || body.flow === 'rental' ? (body.flow as GuestCheckoutFlow) : null
  const email = normalizeGuestEmail(body.email)
  const listingId = typeof body.listingId === 'string' && /^[0-9a-f-]{36}$/i.test(body.listingId) ? body.listingId : null
  if (!flow || !listingId) return json({ error: 'invalid_request' }, 400)
  if (!email) return json({ error: 'invalid_email', message: 'Please enter a valid email address.' }, 400)

  const ip = clientIp(req)
  const ipOk = await checkRateLimit('guest_checkout_draft_ip', ip, 20, 60)
  const emailOk = await checkRateLimit('guest_checkout_draft_email', email, 6, 60)
  if (!ipOk || !emailOk) return json({ error: 'rate_limited', message: 'Too many attempts. Please try again later.' }, 429)

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  })

  const { data: listing, error: listingError } = await db
    .from('listings').select('id, status, mode').eq('id', listingId).maybeSingle()
  if (listingError) {
    console.error('guest draft listing lookup failed', listingError.message)
    return json({ error: 'unavailable', message: 'Could not save right now. Please try again.' }, 503)
  }
  if (!listingAcceptsGuestDraft(flow, listing)) return json({ error: 'invalid_request' }, 400)

  const total = typeof body.totalPrice === 'number' && Number.isFinite(body.totalPrice) && body.totalPrice > 0
    ? Math.round(body.totalPrice * 100) / 100 : null

  const { error } = await db.from('guest_checkout_drafts').upsert({
    flow,
    listing_id: listingId,
    email,
    total_price: total,
    request_only: flow === 'sale' && body.requestOnly === true,
    start_date: flow === 'rental' ? safeIsoDate(body.startDate) : null,
    end_date: flow === 'rental' ? safeIsoDate(body.endDate) : null,
    resume_path: safeGuestResumePath(flow, body.resumePath),
    // A fresh attempt re-arms recovery.
    completed_at: null,
    email_2h_sent_at: null,
    email_24h_sent_at: null,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'email,listing_id,flow' })

  if (error) {
    console.error('guest draft save failed', error.message)
    return json({ error: 'unavailable', message: 'Could not save right now. Please try again.' }, 503)
  }
  return json({ ok: true })
})
