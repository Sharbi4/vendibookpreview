/** Vendibook's support line: the AI phone agent answers calls and texts 24/7 and can reach a person. */
export const SUPPORT_PHONE_DISPLAY = '(866) 690-6227';
export const SUPPORT_PHONE_E164 = '+18666906227';

/**
 * Calendly scheduling link for the 30-minute Customer Success Meeting.
 * Set VITE_CALENDLY_CUSTOMER_SUCCESS_URL (https://calendly.com/…). When it is
 * empty the Contact page offers booking through Allison, whose Calendly tools
 * find real availability.
 */
export const CUSTOMER_SUCCESS_MEETING_URL = (() => {
  const raw = String(import.meta.env.VITE_CALENDLY_CUSTOMER_SUCCESS_URL ?? '').trim();
  return /^https:\/\/calendly\.com\/[\w./-]+$/.test(raw) ? raw : '';
})();
