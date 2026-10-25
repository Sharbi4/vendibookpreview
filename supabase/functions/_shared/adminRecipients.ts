/**
 * Server-only list of the people who receive internal notices: admin alerts,
 * the guest-inquiry and concierge lead router, buyer-waiting escalations and
 * feedback. Override with the ADMIN_ALERT_EMAILS secret (comma separated).
 * Never expose these addresses to the browser.
 *
 * Internal notices must never go to support@ alone: that inbox has been on the
 * managed suppression list since a bounce on 2026-08-04, so every lead routed
 * only there was silently dropped while buyers were promised a reply within
 * one business hour.
 */
const DEFAULT_ADMIN_EMAILS = [
  'support@vendibook.com',
  'shawnnaharbin@vendibook.com',
  'atlasmom421@gmail.com',
]

export const adminAlertEmails = (): string[] => {
  const raw = Deno.env.get('ADMIN_ALERT_EMAILS') ?? ''
  const list = raw.split(',').map((e) => e.trim()).filter(Boolean)
  return [...new Set(list.length ? list : DEFAULT_ADMIN_EMAILS)]
}

/** Idempotency key for one recipient's copy of an internal notice. */
export const adminNoticeKey = (base: string, recipient: string): string =>
  `${base}:${recipient.trim().toLowerCase()}`
