import { createClient } from 'npm:@supabase/supabase-js@2'
import { invokeTransactionalEmail } from '../_shared/invokeTransactionalEmail.ts'
import { adminAlertEmails, adminNoticeKey } from '../_shared/adminRecipients.ts'
import { bookingUrlFromEnv, isValidLeadEmail } from './validation.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

// Public trigger for the "Apply for financing" CTA: saves the lead server-side
// (so a browser hiccup can never silently drop it), emails the applicant a
// follow-up with next steps and a link to book a free 30-minute customer
// success call, and notifies the team. Template structure and copy are fixed
// here — the client only supplies the lead's own details.

const EQUINOX_APPLY_URL = 'https://equinox-funding.com/efapplication/'

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

export function bookingUrl(): string {
  const raw = (Deno.env.get('CALENDLY_CUSTOMER_SUCCESS_URL') ?? '').trim()
  return /^https:\/\/calendly\.com\/[\w./-]+$/.test(raw) ? raw : CONTACT_URL
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

  const email = str(body.email, 200).toLowerCase()
  if (!email || !EMAIL_RE.test(email)) return json({ error: 'A valid email is required' }, 400)

  const name = str(body.name, 120)
  const firstName = name.split(/\s+/)[0] || undefined
  const listingId = str(body.listingId, 60) || null
  const source = str(body.source, 60) || 'unknown'
  const userId = /^[0-9a-f-]{36}$/i.test(str(body.userId, 40)) ? str(body.userId, 40) : null

  const db = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  )

  // 1) Save the lead first — notifications never gate persistence.
  const { error: insertError } = await db.from('financing_leads').insert({
    listing_id: listingId,
    user_id: userId,
    name: name || null,
    email,
    source,
  })
  if (insertError) {
    console.error('financing lead insert failed', insertError)
    return json({ error: 'Could not save your details. Please try again.' }, 500)
  }

  // 2) Personalize with the listing title when there is one.
  let listingTitle: string | undefined
  if (listingId) {
    const { data: listing } = await db
      .from('listings')
      .select('title')
      .eq('id', listingId)
      .maybeSingle()
    listingTitle = (listing as { title?: string } | null)?.title || undefined
  }

  // 3) Follow-up email to the applicant. Idempotency key means repeat clicks
  //    on the same listing never re-send.
  const leadKey = `financing-followup-${email}-${listingId ?? 'general'}`
  try {
    await invokeTransactionalEmail({
      templateName: 'financing-followup',
      recipientEmail: email,
      idempotencyKey: leadKey,
      templateData: {
        firstName,
        listingTitle,
        bookingUrl: bookingUrl(),
        applyUrl: EQUINOX_APPLY_URL,
      },
    })
  } catch (err) {
    console.warn('financing follow-up email failed', err)
  }

  // 4) Team notice so a human can reach out while the lead is warm.
  const details = [
    `Name: ${name || '(not given)'}`,
    `Email: ${email}`,
    listingTitle ? `Listing: ${listingTitle}` : null,
    `Source: ${source}`,
  ].filter(Boolean) as string[]
  for (const admin of adminAlertEmails()) {
    try {
      await invokeTransactionalEmail({
        templateName: 'support-reply',
        recipientEmail: admin,
        idempotencyKey: adminNoticeKey(leadKey, admin),
        templateData: {
          subject: `New financing lead: ${name || email}`,
          bodyParagraphs: [
            'Someone just clicked "Apply for financing" on Vendibook and left their details:',
            details.join('\n'),
            'They were sent the follow-up email with the link to book a 30-minute customer success call. A quick personal reply while they are warm is worth it.',
          ],
          signedBy: 'Vendibook',
          signedTitle: 'Financing lead alert',
        },
      })
    } catch (err) {
      console.warn('financing lead admin notice failed', err)
    }
  }

  return json({ ok: true })
})
