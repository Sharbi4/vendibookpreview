// Canonical internal sender for app (transactional) emails.
//
// Sends in-process through Lovable's managed email API via the scaffolded
// sendTemplateEmail helper — there is no queue, cron dispatcher, or HTTP hop
// anymore. Delivery, retries, rate limits, suppression, and unsubscribe
// handling are enforced by Lovable server-side.
//
// The exported call contracts intentionally mirror the legacy
// send-transactional-email function so existing feature senders convert
// without payload changes:
//   - sendTransactionalEmailInternal(payload) -> { ok, status, body: string }
//   - invokeTransactionalEmail(payload)       -> { data, error } (functions.invoke-shaped)
//   - queueTransactionalEmail(payload)        -> fire-and-forget via EdgeRuntime.waitUntil
//
// Preserved app behaviors:
//   - Template registry lookup with a template-level fixed recipient (`to`).
//   - EMAIL_TEST_MODE: when set to 'on', every send is redirected to
//     EMAIL_TEST_RECIPIENT and the subject gains a [TEST] prefix; the intended
//     recipient is recorded in email_send_log.metadata.
//   - Critical templates (payments, bookings, refunds, ...) must supply an
//     idempotencyKey — a random key provides no duplicate protection.
//   - email_send_log audit rows: 'sent' on success, 'suppressed' when the
//     recipient is suppressed, 'failed' on error. A unique-index violation on
//     the idempotency key means the logical email already exists — reported as
//     duplicate_suppressed instead of double-logging.

import { createClient } from 'npm:@supabase/supabase-js@2'
import { sendTemplateEmail } from './transactional-email-templates/send-email.ts'
import { TEMPLATES } from './transactional-email-templates/registry.ts'

export interface TransactionalEmailPayload {
  templateName?: string
  recipientEmail?: string
  idempotencyKey?: string
  templateData?: Record<string, unknown>
  metadata?: Record<string, unknown>
}

// ---------------------------------------------------------------------------
// EMAIL_TEST_MODE — safety rail for QA. Redirects every app email to the test
// inbox and prefixes subjects with [TEST] so a misconfigured environment can
// never email a real user. Auth emails go through the auth hook and are not
// affected by this redirect.
// ---------------------------------------------------------------------------
const EMAIL_TEST_MODE = (Deno.env.get('EMAIL_TEST_MODE') || '').trim().toLowerCase() === 'on'
const EMAIL_TEST_RECIPIENT = (Deno.env.get('EMAIL_TEST_RECIPIENT') || '').trim()

function wrapSubjectForTestMode(subject: unknown): unknown {
  if (typeof subject === 'string') return `[TEST] ${subject}`
  if (typeof subject === 'function') {
    return (data: Record<string, unknown>) => `[TEST] ${(subject as (d: Record<string, unknown>) => string)(data)}`
  }
  return subject
}

if (EMAIL_TEST_MODE && EMAIL_TEST_RECIPIENT) {
  for (const [name, entry] of Object.entries(TEMPLATES)) {
    TEMPLATES[name] = { ...entry, subject: wrapSubjectForTestMode(entry.subject) as never }
  }
}

// Templates that carry money, bookings, or legal consequences. They must pass
// an explicit idempotency key — a random key gives no duplicate protection.
const CRITICAL_TEMPLATE_EXACT = new Set([
  'booking-receipt',
  'guest-receipt',
  'order-receipt',
  'payment-confirmation',
  'payment-failed',
  'refund-processed',
  'refund-confirmation',
  'charge-receipt',
])
const CRITICAL_TEMPLATE_PREFIXES = [
  'booking-', 'order-', 'payment-', 'payout-', 'receipt', 'refund',
  'charge-', 'invoice', 'rental-agreement', 'rental-pdf', 'purchase-',
  'deposit-', 'cancellation-', 'chargeback',
]

function isCriticalTemplate(templateName: string): boolean {
  if (CRITICAL_TEMPLATE_EXACT.has(templateName)) return true
  const lower = templateName.toLowerCase()
  return CRITICAL_TEMPLATE_PREFIXES.some((p) => lower.startsWith(p))
}

interface SendOutcome {
  httpStatus: number
  body: Record<string, unknown>
}

let _logClient: ReturnType<typeof createClient> | null = null
function logClient() {
  if (!_logClient) {
    _logClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )
  }
  return _logClient
}

const isUniqueViolation = (e: { code?: string; message?: string } | null | undefined) =>
  !!e && (e.code === '23505' || /duplicate key value/i.test(e.message ?? ''))

async function writeSendLog(row: Record<string, unknown>): Promise<{ duplicate: boolean }> {
  try {
    const { error } = await logClient().from('email_send_log').insert(row)
    if (error) {
      if (isUniqueViolation(error)) return { duplicate: true }
      console.error('[email] email_send_log insert failed', { code: error.code, message: error.message })
    }
  } catch (e) {
    console.error('[email] email_send_log insert threw', (e as Error)?.message)
  }
  return { duplicate: false }
}

async function sendManagedTransactionalEmail(
  payload: TransactionalEmailPayload,
): Promise<SendOutcome> {
  const templateName = typeof payload?.templateName === 'string' ? payload.templateName.trim() : ''
  const recipientEmail =
    typeof payload?.recipientEmail === 'string' ? payload.recipientEmail.trim().toLowerCase() : ''

  if (!templateName || !recipientEmail) {
    return { httpStatus: 400, body: { error: 'templateName and recipientEmail are required' } }
  }

  const template = TEMPLATES[templateName]
  if (!template) {
    return { httpStatus: 400, body: { error: `Template not found: ${templateName}` } }
  }

  if (!payload.idempotencyKey && isCriticalTemplate(templateName)) {
    return {
      httpStatus: 400,
      body: { error: `idempotencyKey is required for critical template: ${templateName}` },
    }
  }

  const idempotencyKey = payload.idempotencyKey || crypto.randomUUID()

  // Template-level fixed recipients win over the caller's recipient.
  const intendedRecipient =
    typeof template.to === 'string' && template.to.trim() ? template.to.trim().toLowerCase() : recipientEmail

  const testModeRedirect = EMAIL_TEST_MODE && EMAIL_TEST_RECIPIENT
  const effectiveRecipient = testModeRedirect ? EMAIL_TEST_RECIPIENT : intendedRecipient

  const metadata = {
    ...(payload.metadata ?? {}),
    managed: true,
    ...(testModeRedirect ? { test_mode: true, intended_recipient: intendedRecipient } : {}),
  }

  const messageId = crypto.randomUUID()

  try {
    const result = await sendTemplateEmail(templateName, effectiveRecipient, {
      templateData: payload.templateData,
      idempotencyKey,
    })

    if (result.sent) {
      const { duplicate } = await writeSendLog({
        message_id: messageId,
        idempotency_key: idempotencyKey,
        template_name: templateName,
        recipient_email: intendedRecipient,
        status: 'sent',
        metadata,
      })
      if (duplicate) {
        console.log(
          `[email] Duplicate send suppressed idempotency_key=${idempotencyKey} template=${templateName}`,
        )
        return {
          httpStatus: 200,
          body: {
            success: true,
            sent: true,
            queued: false,
            already_sent: true,
            duplicate_suppressed: true,
            status: 'sent',
            message_id: messageId,
            idempotency_key: idempotencyKey,
          },
        }
      }
      return {
        httpStatus: 200,
        body: {
          success: true,
          sent: true,
          queued: false,
          already_sent: false,
          message_id: messageId,
          idempotency_key: idempotencyKey,
        },
      }
    }

    // Managed suppression (bounce / complaint / unsubscribe) — an expected
    // outcome, not an error. Never retried around.
    console.warn(
      `[email] Send suppressed recipient=${intendedRecipient} template=${templateName} reason=${result.reason ?? 'unknown'}`,
    )
    const { duplicate } = await writeSendLog({
      message_id: messageId,
      idempotency_key: idempotencyKey,
      template_name: templateName,
      recipient_email: intendedRecipient,
      status: 'suppressed',
      metadata,
    })
    return {
      httpStatus: 200,
      body: {
        success: false,
        reason: 'email_suppressed',
        already_sent: false,
        duplicate_suppressed: duplicate || undefined,
        idempotency_key: idempotencyKey,
      },
    }
  } catch (err) {
    const e = err as { code?: string; status?: number; message?: string; retryAfterSeconds?: number | null }
    const message = typeof e?.message === 'string' ? e.message : 'Email send failed'
    console.error('[email] Send failed', { code: e?.code, status: e?.status, message, template: templateName })

    await writeSendLog({
      message_id: messageId,
      idempotency_key: idempotencyKey,
      template_name: templateName,
      recipient_email: intendedRecipient,
      status: 'failed',
      error_message: message.slice(0, 500),
      metadata,
    })

    // Rate limited by the managed API — caller can back off and retry.
    if (e?.status === 429) {
      return {
        httpStatus: 429,
        body: {
          error: message,
          code: 'rate_limited',
          retry_after_seconds: typeof e?.retryAfterSeconds === 'number' ? e.retryAfterSeconds : 60,
          idempotency_key: idempotencyKey,
        },
      }
    }

    return { httpStatus: 500, body: { error: message, code: e?.code, idempotency_key: idempotencyKey } }
  }
}

/**
 * Response-shaped sender: mirrors a fetch Response from the legacy
 * send-transactional-email function. Never rejects for send failures.
 */
export async function sendTransactionalEmailInternal(
  payload: TransactionalEmailPayload,
): Promise<{ ok: boolean; status: number; body: string }> {
  const outcome = await sendManagedTransactionalEmail(payload)
  return {
    ok: outcome.httpStatus >= 200 && outcome.httpStatus < 300,
    status: outcome.httpStatus,
    body: JSON.stringify(outcome.body),
  }
}

interface InvokeLikeError {
  message: string
  status?: number
  code?: string
}

/**
 * functions.invoke-shaped sender: resolves { data, error } exactly like
 * supabase.functions.invoke('send-transactional-email', ...) did. Only
 * configuration-level problems reject, matching the legacy behavior where a
 * network error was the only rejection path.
 */
export async function invokeTransactionalEmail(
  payload: TransactionalEmailPayload,
): Promise<{ data: Record<string, unknown> | null; error: InvokeLikeError | null }> {
  try {
    const outcome = await sendManagedTransactionalEmail(payload)
    if (outcome.httpStatus >= 200 && outcome.httpStatus < 300) {
      return { data: outcome.body, error: null }
    }
    const message =
      typeof outcome.body?.error === 'string'
        ? (outcome.body.error as string)
        : `Email send failed (${outcome.httpStatus})`
    return {
      data: outcome.body,
      error: { message, status: outcome.httpStatus, code: outcome.body?.code as string | undefined },
    }
  } catch (err) {
    return { data: null, error: { message: (err as Error)?.message ?? 'Email send failed' } }
  }
}

/**
 * Fire-and-forget sender for call sites that historically invoked the email
 * function without awaiting it. Uses EdgeRuntime.waitUntil so the send
 * survives the response lifecycle.
 */
export function queueTransactionalEmail(payload: TransactionalEmailPayload): void {
  const p = invokeTransactionalEmail(payload).then(() => undefined)
  const runtime = (
    globalThis as { EdgeRuntime?: { waitUntil?: (promise: Promise<unknown>) => void } }
  ).EdgeRuntime
  if (runtime?.waitUntil) {
    runtime.waitUntil(p)
  } else {
    p.catch((err) => console.error('[email] fire-and-forget send failed', (err as Error)?.message))
  }
}
