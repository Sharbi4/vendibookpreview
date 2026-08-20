// Constants shared across marketing email edge functions.

export const VENDIBOOK_BASE_URL = "https://vendibook.com";
// Canonical email logos — served from Supabase storage (CDN-cached, ~160KB each)
// rather than /images/vendibook-logo.png, which is a 2.1MB app asset that many
// mail clients refuse to load.
//   LIGHT = dark wordmark, for light backgrounds (headers, body).
//   DARK  = white wordmark, for charcoal/dark backgrounds (footers).
const EMAIL_ASSETS = "https://nbrehbwfsmedbelzntqs.supabase.co/storage/v1/object/public/email-assets";
export const LOGO_LIGHT_URL = `${EMAIL_ASSETS}/vendibook-hero-logo.png?v=2026-08`;
export const LOGO_DARK_URL = `${EMAIL_ASSETS}/vendibook-hero-logo-dark.png?v=2026-08`;

export const MAILING_ADDRESS = "Vendibook · 1 S Church St, Tucson, AZ";
export const FROM_NAME = "Vendibook";
export const FROM_EMAIL = "report@updates.vendibook.com";
export const REPLY_TO_EMAIL = "support@vendibook.com";

export const FUNCTIONS_BASE = `${Deno.env.get("SUPABASE_URL") ?? ""}/functions/v1`;

export const FEEDBACK_REDIRECT_URL = `${FUNCTIONS_BASE}/marketing-feedback-redirect`;
export const UNSUBSCRIBE_URL_BASE = `${FUNCTIONS_BASE}/marketing-unsubscribe`;

export const ROTATIONS = ["purchase", "supply", "rental"] as const;
