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
//
// Guests are unverified, so this must not become a way around the member
// trust gate (phone + ID before contacting members):
// - The seller is always read from listings.host_id; the client-supplied
//   listing_leads.host_id is never trusted.
// - Questions containing contact details or links, flagged by
//   message-risk-scan, or unscannable are held: only the concierge inbox
//   hears about them. Over the rate limits, nobody is emailed.
// - Buyer confirmations go out at most once per email per day so the form
//   can't be used to mail-bomb someone else's address.
import { getCronSecret } from '../_shared/callerGuard.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { invokeTransactionalEmail } from '../_shared/invokeTransactionalEmail.ts'
import { notifyUser } from '../_shared/notify.ts'
import { hasContactDetails, maskContactDetails } from '../_shared/contactPatterns.ts'

const SUPPORT_INBOX = 'support@vendibook.com'
const SITE_URL = 'https://vendibook.com'
// Only act on fresh leads so old ids can't be replayed.
const MAX_LEAD_AGE_MS = 15 * 60 * 1000
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const DAY_MS = 24 * 60 * 60 * 1000
const HOUR_MS = 60 * 60 * 1000
// Abuse limits (guest_inquiry leads, counting this one).
const MAX_PER_EMAIL_PER_DAY = 3
const MAX_PER_EMAIL_LISTING_PER_DAY = 1
const MAX_PER_SELLER_PER_HOUR = 5

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
    .select('id, listing_id, host_id, email, name, phone, message, source, created_at, listing:listings(id, host_id, title, mode, price_sale, price_daily, city, state)')
    .eq('id', leadId)
    .maybeSingle()
  if (leadErr || !lead) return json({ error: 'Lead not found' }, 404)
  if (Date.now() - new Date(lead.created_at).getTime() > MAX_LEAD_AGE_MS) {
    return json({ skipped: true, reason: 'lead too old' })
  }

  const listing = (lead as any).listing ?? {}
  // Never trust the client-supplied host_id: anon inserts could point it at
  // any account. The seller is whoever owns the listing.
  const sellerId: string | null = listing.host_id ?? null
  const hostMismatch = !sellerId || sellerId !== lead.host_id
  const title: string = listing.title || 'your listing'
  const listingUrl = `${SITE_URL}/listing/${lead.listing_id}`
  const where = [listing.city, listing.state].filter(Boolean).join(', ')
  const price = listing.price_sale
    ? `$${Number(listing.price_sale).toLocaleString('en-US')}`
    : listing.price_daily ? `$${Number(listing.price_daily).toLocaleString('en-US')}/day` : ''
  const question = lead.message?.trim() || '(no message, buyer asked for more info)'
  const sellerQuestion = maskContactDetails(question)
  const buyerFirst = lead.name?.trim().split(/\s+/)[0] || undefined

  const { data: seller } = sellerId
    ? await supabase
      .from('profiles')
      .select('id, email, full_name, first_name')
      .eq('id', sellerId)
      .maybeSingle()
    : { data: null }

  // Abuse limits, counted over recent guest inquiries (this lead included).
  const email = lead.email.trim().toLowerCase()
  // Case-insensitive exact match: escape ilike wildcards in the address.
  const emailPattern = email.replace(/[\\%_]/g, (c: string) => `\\${c}`)
  const createdAt = new Date(lead.created_at).getTime()
  const dayAgo = new Date(createdAt - DAY_MS).toISOString()
  const hourAgo = new Date(createdAt - HOUR_MS).toISOString()
  const countLeads = async (by: { email?: boolean; listingId?: string; hostId?: string }, since: string) => {
    let q = supabase.from('listing_leads').select('id', { count: 'exact', head: true })
      .eq('source', 'guest_inquiry').gte('created_at', since).lte('created_at', lead.created_at)
    if (by.email) q = q.ilike('email', emailPattern)
    if (by.listingId) q = q.eq('listing_id', by.listingId)
    if (by.hostId) q = q.eq('host_id', by.hostId)
    const { count } = await q
    return count ?? 0
  }
  const [perEmail, perEmailListing, perSeller] = await Promise.all([
    countLeads({ email: true }, dayAgo),
    countLeads({ email: true, listingId: lead.listing_id }, dayAgo),
    sellerId ? countLeads({ hostId: sellerId }, hourAgo) : Promise.resolve(0),
  ])
  const rateLimited = perEmail > MAX_PER_EMAIL_PER_DAY
    || perEmailListing > MAX_PER_EMAIL_LISTING_PER_DAY
    || perSeller > MAX_PER_SELLER_PER_HOUR
  if (rateLimited) {
    // The lead stays saved for review; a burst sends no email to anyone, so
    // it can't flood sellers, the support inbox, or a victim's address.
    console.warn('[notify-listing-lead] rate limited', { leadId, perEmail, perEmailListing, perSeller })
    return json({ skipped: true, reason: 'rate limited' })
  }

  // Same AI review that chat messages and offers get. Fail closed: if the
  // scan can't run, the seller isn't notified and the concierge follows up.
  let risk: { flagged: boolean; score?: number; error?: string } = { flagged: false }
  if (lead.message?.trim()) {
    try {
      const res = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/message-risk-scan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-cron-secret': await getCronSecret(),
          Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        },
        body: JSON.stringify({ kind: 'listing_lead', id: lead.id }),
      })
      const body = await res.json().catch(() => ({}))
      risk = res.ok ? { flagged: !!body.flagged, score: body.score } : { flagged: false, error: `scan ${res.status}` }
    } catch (err) {
      risk = { flagged: false, error: String(err) }
    }
  }

  const contactDetails = hasContactDetails(question)
  const holdReasons = [
    hostMismatch && 'host_id does not match listing owner',
    contactDetails && 'question contains contact details or links',
    risk.flagged && `AI risk ${risk.score}/100`,
    risk.error && `risk scan unavailable (${risk.error})`,
  ].filter(Boolean) as string[]
  const held = holdReasons.length > 0

  // Once per email per day.
  const { count: priorBuyerLeads } = await supabase
    .from('listing_leads').select('id', { count: 'exact', head: true })
    .eq('source', 'guest_inquiry').ilike('email', emailPattern)
    .gte('created_at', dayAgo).lt('created_at', lead.created_at)
  const sendBuyerConfirmation = (priorBuyerLeads ?? 0) === 0

  const sends: Promise<{ error?: unknown } | unknown>[] = []

  // 1) Concierge inbox: full lead so the team can connect both sides.
  sends.push(invokeTransactionalEmail({
    templateName: 'support-reply',
    recipientEmail: SUPPORT_INBOX,
    idempotencyKey: `listing-lead-internal-${lead.id}`,
    templateData: {
      firstName: 'Vendibook Concierge',
      subject: `${held ? '[HELD] ' : ''}Guest inquiry: ${title}${price ? ` (${price})` : ''}`,
      bodyParagraphs: [
        ...(held ? [`HELD: the seller was NOT notified. Review before connecting. Reasons: ${holdReasons.join('; ')}.`] : []),
        `A logged-out buyer asked about ${title}${where ? ` in ${where}` : ''}: ${listingUrl}`,
        `Buyer: ${lead.name || '(no name)'} · ${lead.email} · ${lead.phone || '(no phone)'}`,
        `Question: ${question}`,
        `Seller: ${seller?.full_name || '(unknown)'} · ${seller?.email || '(no email)'}`,
        held ? 'Unverified guest: verify the buyer before passing anything to the seller.' : 'Connect both sides within 1 business hour.',
      ],
      signedBy: 'Vendibook Lead Router',
      signedTitle: 'Internal Notification',
    },
  }))

  // 2) Seller heads-up (question only, no buyer contact details).
  if (!held && seller?.email) {
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
            `"${sellerQuestion}"`,
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
  if (sendBuyerConfirmation) sends.push(invokeTransactionalEmail({
    templateName: 'support-reply',
    recipientEmail: lead.email,
    idempotencyKey: `listing-lead-buyer-${lead.id}`,
    templateData: {
      firstName: buyerFirst,
      subject: `We got your question about ${title}`,
      bodyParagraphs: [
        `Thanks for asking about ${title}. A Vendibook concierge will review your question and follow up within 1 business hour (Mon–Fri, 9am–5pm AZ time).`,
        `Your question: "${question}"`,
        `Want to chat with the seller directly and make offers? Create a free account: ${SITE_URL}/auth`,
      ],
      signedBy: 'Vendibook Concierge',
      signedTitle: 'Concierge Team',
    },
  }))

  // 4) In-app notification for the seller.
  if (!held && sellerId) await notifyUser(supabase, {
    userId: sellerId,
    type: 'listing_lead',
    title: 'New buyer question',
    message: `A buyer asked about ${title}: "${sellerQuestion.slice(0, 140)}"`,
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

  if (held) console.warn('[notify-listing-lead] held from seller', { leadId, holdReasons })
  return json({ success: true })
})
