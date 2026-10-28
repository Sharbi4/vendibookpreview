// Pure validation helpers for send-financing-followup — no Deno APIs here so
// the rules can be unit-tested with vitest from src/test.

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const CONTACT_URL = 'https://vendibook.com/contact'

export function isValidLeadEmail(email: string): boolean {
  const e = email.trim().toLowerCase()
  return e.length > 0 && e.length <= 200 && EMAIL_RE.test(e)
}

/** Calendly link when configured, otherwise the Contact page meeting booking. */
export function bookingUrlFromEnv(raw: string | undefined | null): string {
  const v = (raw ?? '').trim()
  return /^https:\/\/calendly\.com\/[\w./-]+$/.test(v) ? v : CONTACT_URL
}
