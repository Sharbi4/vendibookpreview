// Sends personalized referral invitations from an authenticated user to a small
// batch of email addresses. Uses the caller's existing referral code (creating
// one if missing) and dispatches via `send-transactional-email` with the
// generic-notice template. Rate-limited to 10 recipients per call.
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const APP_URL = 'https://vendibook.com'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    const authHeader = req.headers.get('Authorization') || ''
    const jwt = authHeader.replace(/^Bearer\s+/i, '')
    if (!jwt) return json({ error: 'Not authenticated' }, 401)

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    })
    const { data: userData, error: userErr } = await userClient.auth.getUser()
    if (userErr || !userData.user) return json({ error: 'Not authenticated' }, 401)
    const user = userData.user

    const body = await req.json().catch(() => ({}))
    const rawEmails: unknown = body.emails
    const note: string = typeof body.note === 'string' ? body.note.slice(0, 500) : ''

    if (!Array.isArray(rawEmails) || rawEmails.length === 0) {
      return json({ error: 'emails[] required' }, 400)
    }

    const emails = Array.from(
      new Set(
        (rawEmails as unknown[])
          .filter((e): e is string => typeof e === 'string')
          .map((e) => e.trim().toLowerCase())
          .filter((e) => EMAIL_RE.test(e)),
      ),
    ).slice(0, 10)

    if (emails.length === 0) return json({ error: 'No valid emails' }, 400)

    const admin = createClient(supabaseUrl, serviceKey)

    // Load or create referral code for caller
    let { data: rc } = await admin
      .from('referral_codes')
      .select('code')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!rc?.code) {
      const generated = (user.id.replace(/-/g, '').slice(0, 6) + Math.random().toString(36).slice(2, 5))
        .toUpperCase()
      const { data: inserted, error: insErr } = await admin
        .from('referral_codes')
        .insert({ user_id: user.id, code: generated })
        .select('code')
        .single()
      if (insErr || !inserted) return json({ error: 'Failed to create referral code' }, 500)
      rc = inserted
    }

    // Load referrer display name
    const { data: profile } = await admin
      .from('profiles')
      .select('first_name, display_name, full_name, email')
      .eq('id', user.id)
      .maybeSingle()
    const referrerName =
      profile?.first_name ||
      profile?.display_name ||
      profile?.full_name?.split(' ')[0] ||
      'A Vendibook host'

    const inviteUrl = `${APP_URL}/auth?ref=${encodeURIComponent(rc.code)}&utm_source=referral&utm_medium=invite&utm_campaign=host_invite`

    const results: Array<{ email: string; ok: boolean; error?: string }> = []

    for (const email of emails) {
      // Skip self-invite
      if (profile?.email && email === profile.email.toLowerCase()) {
        results.push({ email, ok: false, error: 'self' })
        continue
      }

      const paragraphs = [
        `${referrerName} invited you to join Vendibook — the marketplace for renting and selling food trucks and food trailers.`,
      ]
      if (note) paragraphs.push(`"${note}"`)
      paragraphs.push(
        'Create a free account with the link below and you will both earn a $50 credit toward Vendibook fees when you subscribe to Starter or higher.',
      )

      const { error: sendErr } = await admin.functions.invoke('send-transactional-email', {
        body: {
          templateName: 'generic-notice',
          recipientEmail: email,
          idempotencyKey: `referral-invite:${user.id}:${email}`,
          templateData: {
            preview: `${referrerName} invited you to Vendibook`,
            kicker: 'You have an invite',
            heading: `${referrerName} invited you to Vendibook`,
            paragraphs,
            ctaLabel: 'Accept your invite',
            ctaUrl: inviteUrl,
            footnote:
              'Credit issued after the referred host subscribes to Starter or higher. See vendibook.com/referral-terms.',
          },
        },
      })

      results.push({ email, ok: !sendErr, error: sendErr?.message })
    }

    const sent = results.filter((r) => r.ok).length
    return json({ ok: true, sent, results, code: rc.code })
  } catch (e) {
    return json({ error: (e as Error).message || 'Unexpected error' }, 500)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
