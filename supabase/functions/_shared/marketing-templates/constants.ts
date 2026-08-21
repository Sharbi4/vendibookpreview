// Constants shared across marketing email edge functions.
// Everything visual/identity-related now derives from the master email
// design system via `./brand.ts` — do not fork values here.

import {
  LOGO_LIGHT_URL as BRAND_LOGO_LIGHT,
  LOGO_DARK_URL as BRAND_LOGO_DARK,
  MARKETING_FROM,
  REPORT_FROM,
  MARKETING_REPLY_TO,
  mailingAddress,
  SITE_URL,
} from "./brand.ts";

export const VENDIBOOK_BASE_URL = SITE_URL;

// Canonical email logos (master tokens).
//   LIGHT = dark wordmark, for light backgrounds (headers, body).
//   DARK  = white wordmark, for charcoal/dark backgrounds.
export const LOGO_LIGHT_URL = BRAND_LOGO_LIGHT;
export const LOGO_DARK_URL = BRAND_LOGO_DARK;

/** CAN-SPAM postal address — single source of truth (env-overridable). */
export const MAILING_ADDRESS = mailingAddress();

// ---- Sender convention -------------------------------------------------
// Verified domain: updates.vendibook.com
//   report@  → The Vendibook Report (recurring editorial)
//   hello@   → every other marketing campaign/digest/newsletter
// Reply-To is always support@vendibook.com.
export const FROM_NAME = "Vendibook";
export const FROM_EMAIL = "report@updates.vendibook.com";
export const MARKETING_FROM_EMAIL = "hello@updates.vendibook.com";
export const REPLY_TO_EMAIL = MARKETING_REPLY_TO;
export { MARKETING_FROM, REPORT_FROM };

export const FUNCTIONS_BASE = `${Deno.env.get("SUPABASE_URL") ?? ""}/functions/v1`;

export const FEEDBACK_REDIRECT_URL = `${FUNCTIONS_BASE}/marketing-feedback-redirect`;
export const UNSUBSCRIBE_URL_BASE = `${FUNCTIONS_BASE}/marketing-unsubscribe`;

export const ROTATIONS = ["purchase", "supply", "rental"] as const;
