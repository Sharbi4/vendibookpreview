// Constants shared across marketing email edge functions.

export const VENDIBOOK_BASE_URL = "https://vendibook.com";
export const LOGO_LIGHT_URL = `${VENDIBOOK_BASE_URL}/images/vendibook-email-logo.png`;
export const LOGO_DARK_URL = `${VENDIBOOK_BASE_URL}/images/vendibook-logo.png`;
export const MAILING_ADDRESS = "Vendibook · 1 S Church St, Tucson, AZ";
export const FROM_NAME = "Vendibook";
export const FROM_EMAIL = "report@updates.vendibook.com";
export const REPLY_TO_EMAIL = "support@vendibook.com";

export const FUNCTIONS_BASE = `${Deno.env.get("SUPABASE_URL") ?? ""}/functions/v1`;

export const FEEDBACK_REDIRECT_URL = `${FUNCTIONS_BASE}/marketing-feedback-redirect`;
export const UNSUBSCRIBE_URL_BASE = `${FUNCTIONS_BASE}/marketing-unsubscribe`;

export const ROTATIONS = ["purchase", "supply", "rental"] as const;
