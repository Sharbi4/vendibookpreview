/**
 * Canonical SMS consent metadata. Shared between client + server so consent
 * events always store the exact policy version presented to the user.
 */
export const SMS_POLICY_VERSION = 'v1.2026-07-27';
export const SMS_TERMS_URL = '/legal/sms';
export const SMS_PRIVACY_URL = '/privacy';

export const SMS_CONSENT_DISCLOSURE = [
  'Yes, send me text messages from Vendibook about my account, bookings,',
  'payments, required documents, listing activity, pickup or delivery',
  'coordination, and customer support. Message frequency varies. Message and',
  'data rates may apply. Reply STOP to opt out or HELP for help. Consent is',
  'not a condition of creating an account, making a purchase, or using',
  'Vendibook.',
].join(' ');

/**
 * Allowlist of transactional categories the server-side sending guard will
 * accept. Anything outside this list is programmatically blocked — marketing
 * SMS is not part of this program.
 */
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

export const SMS_CONSENT_SOURCES = [
  'signup',
  'booking',
  'listing',
  'settings',
  'sms_page',
  'keyword',
  'support',
  'provider_webhook',
  'system',
] as const;

export type SmsConsentSource = (typeof SMS_CONSENT_SOURCES)[number];

/** Recent-dismissal cookie/localStorage key for contextual invites. */
export const SMS_PROMPT_DISMISS_KEY = 'vb.sms.prompt.dismissed';
export const SMS_PROMPT_DISMISS_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days
