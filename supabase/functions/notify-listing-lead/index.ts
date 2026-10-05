// Notifies everyone about a guest (logged-out) inquiry on a listing.
//
// The client inserts the lead into listing_leads (anon insert is allowed by
// RLS) and then calls this function with the lead id only. Everything sent
// is read from the database with the service role, so a caller cannot choose
// recipients or inject content. Idempotency keys are derived from the lead
// id, so repeat calls never double-send.
//
// Buyer contact details go to the concierge inbox only — the seller gets the
// question, not the buyer's email/phone — so the deal stays on Vendibook.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { invokeTransactionalEmail } from '../_shared/invokeTransactionalEmail.ts'
import { notifyUser } from '../_shared/notify.ts'

const SUPPORT_INBOX = 'support@vendibook.com'
const SITE_URL = 'https://vendibook.com'
// Only act on fresh leads so old ids can't be replayed.
const MAX_LEAD_AGE_MS = 15 * 60 * 1000
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function json(data: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  let leadId = ''
  try {
    const body = await req.json()
    leadId = typeof body?.lead_id === 'string' ? body.lead_id.trim() : ''
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }
  if (!UUID_RE.test(leadId)) return json({ error: 'lead_id is required' }, 400)

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  const { data: lead, error: leadErr } = await supabase
    .from('listing_leads')
    .select('id, listing_id, host_id, email, name, phone, message, source, created_at, listing:listings(id, title, mode, price_sale, price_daily, city, state)')
    .eq('id', leadId)
    .maybeSingle()
  if (leadErr || !lead) return json({ error: 'Lead not found' }, 404)
  if (Date.now() - new Date(lead.created_at).getTime() > MAX_LEAD_AGE_MS) {
    return json({ skipped: true, reason: 'lead too old' })
  }

  const listing = (lead as any).listing ?? {}
  const title: string = listing.title || 'your listing'
  const listingUrl = `${SITE_URL}/listing/${lead.listing_id}`
  const where = [listing.city, listing.state].filter(Boolean).join(', ')
  const price = listing.price_sale
    ? `$${Number(listing.price_sale).toLocaleString('en-US')}`
    : listing.price_daily ? `$${Number(listing.price_daily).toLocaleString('en-US')}/day` : ''
  const question = lead.message?.trim() || '(no message, buyer asked for more info)'
  const buyerFirst = lead.name?.trim().split(/\s+/)[0] || undefined

  const { data: seller } = await supabase
    .from('profiles')
    .select('id, email, full_name, first_name')
    .eq('id', lead.host_id)
    .maybeSingle()

  const sends: Promise<{ error?: unknown } | unknown>[] = []

  // 1) Concierge inbox: full lead so the team can connect both sides.
  sends.push(invokeTransactionalEmail({
    templateName: 'support-reply',
    recipientEmail: SUPPORT_INBOX,
    idempotencyKey: `listing-lead-internal-${lead.id}`,
    templateData: {
      firstName: 'Vendibook Concierge',
      subject: `Guest inquiry: ${title}${price ? ` (${price})` : ''}`,
      bodyParagraphs: [
        `A logged-out buyer asked about ${title}${where ? ` in ${where}` : ''}: ${listingUrl}`,
        `Buyer: ${lead.name || '(no name)'} · ${lead.email} · ${lead.phone || '(no phone)'}`,
        `Question: ${question}`,
        `Seller: ${seller?.full_name || '(unknown)'} · ${seller?.email || '(no email)'}`,
        'Connect both sides within 1 business hour.',
      ],
      signedBy: 'Vendibook Lead Router',
      signedTitle: 'Internal Notification',
    },
  }))

  // 2) Seller heads-up (question only, no buyer contact details).
  if (seller?.email) {
    const { data: prefs } = await supabase
      .from('notification_preferences')
      .select('sale_email')
      .eq('user_id', seller.id)
      .maybeSingle()
    if (prefs?.sale_email !== false) {
      sends.push(invokeTransactionalEmail({
        templateName: 'support-reply',
        recipientEmail: seller.email,
        idempotencyKey: `listing-lead-seller-${lead.id}`,
        templateData: {
          firstName: seller.first_name || seller.full_name?.split(' ')[0] || undefined,
          subject: `A buyer is asking about ${title}`,
          bodyParagraphs: [
            `${buyerFirst ? `${buyerFirst}, a buyer,` : 'A buyer'} just asked about ${title}:`,
            `"${question}"`,
            'Our concierge team is connecting you with them now. Sellers who reply fast sell faster, so keep an eye on your Vendibook messages and phone today.',
            `Your listing: ${listingUrl}`,
          ],
          signedBy: 'Vendibook Concierge',
          signedTitle: 'Concierge Team',
        },
      }))
    }
  }

  // 3) Buyer confirmation.
  sends.push(invokeTransactionalEmail({
    templateName: 'support-reply',
    recipientEmail: lead.email,
    idempotencyKey: `listing-lead-buyer-${lead.id}`,
    templateData: {
      firstName: buyerFirst,
      subject: `We sent your question about ${title}`,
      bodyParagraphs: [
        `Thanks for asking about ${title}. We've passed your question to the seller, and a Vendibook concierge will follow up within 1 business hour (Mon–Fri, 9am–5pm AZ time).`,
        `Your question: "${question}"`,
        `Want to chat with the seller directly and make offers? Create a free account: ${SITE_URL}/auth`,
      ],
      signedBy: 'Vendibook Concierge',
      signedTitle: 'Concierge Team',
    },
  }))

  // 4) In-app notification for the seller.
  await notifyUser(supabase, {
    userId: lead.host_id,
    type: 'listing_lead',
    title: 'New buyer question',
    message: `A buyer asked about ${title}: "${question.slice(0, 140)}"`,
    link: `/listing/${lead.listing_id}`,
    dedupeKey: `listing-lead-${lead.id}`,
  })

  const results = await Promise.all(sends)
  const failed = results.filter((r) => (r as { error?: unknown })?.error)
  if (failed.length === results.length) {
    console.error('[notify-listing-lead] all sends failed', { leadId })
    return json({ error: 'Failed to send notifications' }, 500)
  }
  if (failed.length) console.warn('[notify-listing-lead] some sends failed', { leadId, failed: failed.length })

  return json({ success: true })
})
