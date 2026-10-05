import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { invokeTransactionalEmail } from '../_shared/invokeTransactionalEmail.ts'
import { leadListingFilter, leadMatchLine, rankLeadMatches, type MatchableListing } from '../_shared/leadMatches.ts'

// Public trigger for the concierge lead form: sends the requester a
// confirmation and notifies the support inbox. Template structure and copy
// are fixed here — the client only supplies the lead's own details.
// Buyer/renter requests also get up to 3 matching live listings, so the
// requester sees real options immediately and the concierge sees what to
// send (or that supply is missing).

const SUPPORT_INBOX = 'support@vendibook.com'
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const SITE_URL = 'https://vendibook.com'
const MATCH_UTM = 'utm_source=email&utm_medium=concierge&utm_campaign=lead-confirmation'

async function findMatches(req: { intent: string; category: string; city: string; budget: string }): Promise<MatchableListing[]> {
  const filter = leadListingFilter(req)
  if (!filter || !req.city) return []
  try {
    const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    // Same visibility rules as search-listings.
    let q = db
      .from('listings')
      .select('id, title, mode, category, city, state, price_sale, price_daily, price_weekly, price_monthly, vendibook_freight_enabled')
      .eq('status', 'published').not('published_at', 'is', null).is('deleted_at', null).eq('moderation_status', 'clear')
      .eq('mode', filter.mode)
    if (filter.categories) q = q.in('category', filter.categories)
    const { data, error } = await q.limit(500)
    if (error) throw error
    return rankLeadMatches(req, (data ?? []) as MatchableListing[])
  } catch (err) {
    // Matches are a bonus; never block the confirmation on them.
    console.warn('lead match lookup failed', err)
    return []
  }
}

function json(data: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function str(v: unknown, max: number): string {
  if (typeof v !== 'string') return ''
  return v.trim().slice(0, max)
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

  const leadKey = str(body.leadKey, 200)
  if (!leadKey) return json({ error: 'leadKey is required' }, 400)

  const firstName = str(body.firstName, 60) || undefined
  const name = str(body.name, 120)
  const email = str(body.email, 200)
  const phone = str(body.phone, 40)
  const intentLabel = str(body.intentLabel, 60) || 'General inquiry'
  const categoryLabel = str(body.categoryLabel, 80) || 'Any asset'
  const city = str(body.city, 120)
  const timeline = str(body.timeline, 60)
  const budget = str(body.budget, 60)
  const notes = str(body.notes, 2000)
  const listingId = str(body.listingId, 60)
  const sourcePage = str(body.sourcePage, 200) || 'site'
  const intent = str(body.intent, 20)
  const category = str(body.category, 40)

  const matches = await findMatches({ intent, category, city, budget })
  const matchLines = matches.map((m) => leadMatchLine(m, SITE_URL, MATCH_UTM))
  const isBuyerRequest = !!leadListingFilter({ intent })

  const sends: Promise<unknown>[] = []

  // 1) Confirmation to the requester (only when they gave a valid email)
  if (email && EMAIL_RE.test(email)) {
    sends.push(
      invokeTransactionalEmail({
        templateName: 'support-reply',
        recipientEmail: email,
        idempotencyKey: `lead-confirm-${leadKey}`,
        templateData: {
          firstName,
          subject: 'We got your Vendibook concierge request',
          bodyParagraphs: [
            `Thanks for reaching out — a Vendibook concierge will follow up within 1 business hour (Mon–Fri, 9am–5pm AZ time).`,
            `Here's what we have on file: ${intentLabel} · ${categoryLabel} · ${city}${timeline ? ` · ${timeline.replace(/_/g, ' ')}` : ''}${budget ? ` · ${budget.replace(/_/g, ' ')}` : ''}.`,
            ...(matchLines.length
              ? [`While you wait, here ${matchLines.length === 1 ? 'is a live listing that matches' : 'are live listings that match'} what you asked for:`, ...matchLines]
              : []),
            `We'll confirm availability, pricing, and next steps before you commit to anything. Outside business hours? We'll reach out first thing the next business day.`,
          ],
          signedBy: 'Vendibook Concierge',
          signedTitle: 'Concierge Team',
        },
      }),
    )
  }

  // 2) Internal notification to support
  sends.push(
    invokeTransactionalEmail({
      templateName: 'support-reply',
      recipientEmail: SUPPORT_INBOX,
      idempotencyKey: `lead-internal-${leadKey}`,
      templateData: {
        firstName: 'Vendibook Support',
        subject: `New concierge request: ${intentLabel} · ${categoryLabel} · ${city}`,
        bodyParagraphs: [
          `New lead from ${sourcePage}.`,
          `Contact: ${name || '(no name)'} · ${email || '(no email)'} · ${phone || '(no phone)'}`,
          `Intent: ${intentLabel} · Category: ${categoryLabel} · City: ${city}${timeline ? ` · Timeline: ${timeline}` : ''}${budget ? ` · Budget: ${budget}` : ''}${listingId ? ` · Listing: ${listingId}` : ''}`,
          notes ? `Notes: ${notes}` : 'No notes provided.',
          ...(isBuyerRequest
            ? matchLines.length
              ? [email && EMAIL_RE.test(email) ? 'Matches also emailed to the requester:' : 'Suggested matches (requester gave no email):', ...matchLines]
              : ['No live listing matches: send this to Supply Desk as a sourcing need.']
            : []),
        ],
        signedBy: 'Vendibook Lead Router',
        signedTitle: 'Internal Notification',
      },
    }),
  )

  const results = await Promise.all(sends)
  const failed = results.filter(
    (r) => (r as { error?: { message?: string } | null })?.error,
  )
  if (failed.length === results.length) {
    console.error('lead confirmation sends all failed', { leadKey })
    return json({ error: 'Failed to send notifications' }, 500)
  }
  if (failed.length > 0) {
    console.warn('some lead confirmation sends failed', { leadKey, failed: failed.length })
  }

  return json({ success: true })
})
