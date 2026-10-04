// Admin-only: tells the author of a moderated offer note that it was removed
// for containing personal contact information. Recipient is resolved
// server-side from the offer; copy is fixed. POST { "offer_id": "<uuid>" }
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { sendTransactionalEmailInternal } from '../_shared/invokeTransactionalEmail.ts'

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const url = Deno.env.get('SUPABASE_URL')!
    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })
    const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
    if (!token) return json(401, { error: 'unauthorized' })
    const { data: u } = await admin.auth.getUser(token)
    if (!u?.user) return json(401, { error: 'unauthorized' })
    const { data: isAdmin } = await admin.rpc('has_role', { _user_id: u.user.id, _role: 'admin' })
    if (!isAdmin) return json(403, { error: 'forbidden' })

    const body = await req.json().catch(() => ({}))
    const offerId = String(body?.offer_id ?? '')
    if (!/^[0-9a-f-]{36}$/i.test(offerId)) return json(400, { error: 'offer_id required' })

    const { data: offer } = await admin.from('offers').select('id, buyer_id, listing_id').eq('id', offerId).maybeSingle()
    if (!offer) return json(404, { error: 'offer not found' })
    const [{ data: profile }, { data: listing }] = await Promise.all([
      admin.from('profiles').select('email, full_name').eq('id', offer.buyer_id).maybeSingle(),
      admin.from('listings').select('title').eq('id', offer.listing_id).maybeSingle(),
    ])
    if (!profile?.email) return json(404, { error: 'recipient not found' })
    const first = String(profile.full_name ?? '').trim().split(/\s+/)[0]

    const res = await sendTransactionalEmailInternal({
      templateName: 'generic-notice',
      recipientEmail: profile.email,
      idempotencyKey: `message-removed-${offerId}`,
      templateData: {
        preview: 'Your message on Vendibook was removed',
        kicker: 'Community safety',
        heading: 'Your message was removed',
        greeting: first ? `Hi ${first},` : 'Hi there,',
        paragraphs: [
          `The note you included with your offer${listing?.title ? ` on "${listing.title}"` : ''} was removed because it contained personal contact information, such as an email address.`,
          'To keep buyers and sellers safe, all conversations and payments must stay on Vendibook. Sharing emails, phone numbers or other off-platform contact details is not allowed.',
        ],
        alert: { tone: 'warning', title: 'Please note', body: 'Messages like this in the future could result in removal from the platform.' },
        ctaLabel: 'Go to your messages',
        ctaUrl: 'https://vendibook.com/dashboard/messages',
      },
      metadata: { reason: 'message_removed_personal_info', offer_id: offerId },
    })
    return json(res.ok ? 200 : 502, { ok: res.ok, status: res.status })
  } catch (e) {
    console.error('send-message-removed-notice failed', (e as Error).message)
    return json(500, { error: 'failed' })
  }
})
