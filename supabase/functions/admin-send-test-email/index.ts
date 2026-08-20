// Admin-only test harness for every registered transactional template.
//
// Safety design:
//  - Requires a valid user JWT AND the 'admin' role.
//  - Defaults the recipient to the designated test inbox.
//  - Sending to ANY other address requires an explicit `confirm: true`.
//  - Uses the template's own previewData as the default payload, so a template
//    can be exercised without hand-crafting templateData.
//
//  - `mode: 'preview'` renders the template to HTML and returns it WITHOUT
//    sending anything, so the whole catalog can be reviewed with zero delivery.
//
// GET  /admin-send-test-email            -> list all registered templates
// POST /admin-send-test-email  { templateName, mode?: 'preview'|'send', to?, templateData?, confirm? }

import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { TEMPLATES } from '../_shared/transactional-email-templates/registry.ts'

const DEFAULT_TEST_RECIPIENT = 'atlasmom421@gmail.com'

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceKey) return json({ error: 'Server configuration error' }, 500)

  const admin = createClient(supabaseUrl, serviceKey)

  // ---- admin gate ----
  const bearer = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '').trim()
  if (!bearer) return json({ error: 'Unauthorized' }, 401)

  const { data: userData } = await admin.auth.getUser(bearer)
  const userId = userData?.user?.id
  if (!userId) return json({ error: 'Unauthorized' }, 401)

  const { data: isAdmin, error: roleError } = await admin.rpc('has_role', {
    _user_id: userId,
    _role: 'admin',
  })
  if (roleError) {
    console.error('[admin-send-test-email] role check failed', roleError)
    return json({ error: 'Failed to verify permissions' }, 500)
  }
  if (!isAdmin) return json({ error: 'Forbidden' }, 403)

  // ---- list mode ----
  if (req.method === 'GET') {
    const templates = Object.entries(TEMPLATES).map(([name, entry]) => ({
      templateName: name,
      displayName: (entry as any).displayName || name,
      hasPreviewData: Boolean((entry as any).previewData),
      fixedRecipient: (entry as any).to || null,
    }))
    return json({ count: templates.length, defaultRecipient: DEFAULT_TEST_RECIPIENT, templates })
  }

  // ---- send mode ----
  let body: Record<string, any>
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON in request body' }, 400)
  }

  const templateName: string = body.templateName || body.template_name
  if (!templateName) return json({ error: 'templateName is required' }, 400)

  const entry = (TEMPLATES as Record<string, any>)[templateName]
  if (!entry) {
    return json(
      { error: `Unknown template "${templateName}"`, available: Object.keys(TEMPLATES) },
      400,
    )
  }

  const templateDataPreview =
    body.templateData && typeof body.templateData === 'object'
      ? { ...((entry.previewData as Record<string, unknown>) ?? {}), ...body.templateData }
      : ((entry.previewData as Record<string, unknown>) ?? {})

  // ---- PREVIEW-ONLY MODE: render, never send ----
  if ((body.mode || 'send') === 'preview') {
    try {
      const html = await renderAsync(React.createElement(entry.component, templateDataPreview))
      const subject =
        typeof entry.subject === 'function' ? entry.subject(templateDataPreview) : entry.subject
      return json({ preview: true, sent: false, templateName, subject, html })
    } catch (err) {
      console.error('[admin-send-test-email] preview render failed', { templateName, err })
      return json(
        { error: 'render_failed', templateName, details: err instanceof Error ? err.message : String(err) },
        422,
      )
    }
  }

  const to: string = (body.to || DEFAULT_TEST_RECIPIENT).trim().toLowerCase()
  if (to !== DEFAULT_TEST_RECIPIENT && body.confirm !== true) {
    return json(
      {
        error:
          `Refusing to send to ${to}. Test sends default to ${DEFAULT_TEST_RECIPIENT}; ` +
          'pass confirm: true to target a different address.',
      },
      400,
    )
  }

  // Warn (do not block) if the test inbox is suppressed — the send would no-op.
  const { data: suppressed } = await admin
    .from('suppressed_emails')
    .select('id, reason, scope')
    .eq('email', to)
    .in('scope', ['all', 'transactional'])
    .maybeSingle()

  if (suppressed) {
    return json(
      {
        error: `${to} is on the suppression list (reason: ${suppressed.reason}, scope: ${suppressed.scope}). The send would be silently dropped — clear the suppression first.`,
      },
      409,
    )
  }

  const templateData = templateDataPreview

  // Unique per test run so repeated tests are never deduped away.
  const idempotencyKey = `admin-test-${templateName}-${to}-${Date.now()}`

  const { data, error } = await admin.functions.invoke('send-transactional-email', {
    body: { templateName, recipientEmail: to, idempotencyKey, templateData },
  })

  if (error) {
    console.error('[admin-send-test-email] send failed', { templateName, to, error })
    return json({ error: (error as any)?.message || String(error) }, 500)
  }

  // Tag the send as an admin test in the structured log so test traffic is
  // never mistaken for production delivery.
  await admin
    .from('email_send_log')
    .update({ metadata: { admin_test_send: true, requested_by: userId, requested_to: to } })
    .eq('idempotency_key', idempotencyKey)

  return json({ success: true, templateName, sentTo: to, testSend: true, result: data })
})
