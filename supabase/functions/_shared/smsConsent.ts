/**
 * Shared SMS consent constants and helpers for edge functions.
 * Kept in sync with src/lib/sms/consent.ts.
 */
export const SMS_POLICY_VERSION = 'v1.2026-07-27';

export const SMS_TRANSACTIONAL_CATEGORIES = [
  'account',
  'booking',
  'payment',
  'documents',
  'pickup_delivery',
  'listing',
  'seller_inquiry',
  'customer_care',
  'security',
  'verification',
  'help_reply',
  'opt_out_confirmation',
  'enrollment_confirmation',
] as const;

export type SmsTransactionalCategory =
  (typeof SMS_TRANSACTIONAL_CATEGORIES)[number];

export function normalizeNanpToE164(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = String(raw).replace(/[^\d]/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  const trimmed = String(raw).trim();
  if (/^\+1\d{10}$/.test(trimmed)) return trimmed;
  return null;
}

/** Approved system message templates. Kept centralized so wording stays consistent. */
export const SMS_TEMPLATES = {
  enrollment_confirmation:
    "Vendibook: You're enrolled in account and booking text updates. Message frequency varies. Message and data rates may apply. Reply HELP for help or STOP to opt out.",
  opt_out_confirmation:
    "Vendibook: You're unsubscribed and will receive no further texts. Reply START to re-enroll or email support@vendibook.com.",
  help_reply:
    'Vendibook Support: Email support@vendibook.com or visit vendibook.com/support. Message and data rates may apply. Reply STOP to opt out.',
} as const;

export const OPT_OUT_KEYWORDS = new Set([
  'STOP','UNSUBSCRIBE','END','QUIT','CANCEL','HALT','REVOKE','OPTOUT','OPT-OUT','OPT OUT',
]);
export const OPT_IN_KEYWORDS = new Set([
  'START','YES','UNSTOP','OPTIN','OPT-IN','OPT IN',
]);
export const HELP_KEYWORDS = new Set(['HELP','INFO','SUPPORT']);

export function classifyKeyword(body: string): 'opt_out' | 'opt_in' | 'help' | 'other' {
  const u = body.trim().toUpperCase();
  if (OPT_OUT_KEYWORDS.has(u)) return 'opt_out';
  if (OPT_IN_KEYWORDS.has(u)) return 'opt_in';
  if (HELP_KEYWORDS.has(u)) return 'help';
  return 'other';
}
