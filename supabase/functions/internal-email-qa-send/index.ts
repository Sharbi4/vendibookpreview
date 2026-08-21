// TEMPORARY internal QA sender — sends a fixed set of [TEST] transactional
// emails to a single hardcoded test inbox using the service-role path.
// Gated by a one-off shared token; delete this function after the QA run.
import { createClient } from 'npm:@supabase/supabase-js@2'

const QA_TOKEN = 'vb-qa-9f3c1a77-2b64-4e0f-8f21-6d9a4c0e5b12'
const TEST_INBOX = 'atlasmom421@gmail.com'

const TEMPLATES = [
  'welcome',
  'booking-confirmation',
  'payment-receipt',
  'pro-membership-activated',
  'listing-published',
]

Deno.serve(async (req) => {
  if (req.headers.get('x-qa-token') !== QA_TOKEN) {
    return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 })
  }

  const url = Deno.env.get('SUPABASE_URL')!
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const admin = createClient(url, key)

  const stamp = Date.now()
  const results: unknown[] = []

  for (const templateName of TEMPLATES) {
    const idempotencyKey = `qa-test-${templateName}-${stamp}`
    const res = await fetch(`${url}/functions/v1/send-transactional-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        templateName,
        recipientEmail: TEST_INBOX,
        idempotencyKey,
        subjectPrefix: '[TEST] ',
        metadata: { qa_test_send: true, requested_to: TEST_INBOX },
      }),
    })
    const body = await res.json().catch(() => ({}))
    results.push({ templateName, status: res.status, ...body })
  }

  const { data: log } = await admin
    .from('email_send_log')
    .select('template_name, recipient_email, status, message_id, error_message')
    .like('idempotency_key', `qa-test-%-${stamp}`)

  return new Response(JSON.stringify({ results, log }, null, 2), {
    headers: { 'Content-Type': 'application/json' },
  })
})
