// Signed tokens for one-click email links (unsubscribe, feedback).
// A link only acts on the address it was generated for, so nobody can
// unsubscribe or log feedback for someone else's email by editing the URL.
import { createHmac, timingSafeEqual } from "node:crypto";
import { Buffer } from "node:buffer";

function key(): string {
  return Deno.env.get("EMAIL_LINK_SECRET") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
}

export function emailLinkToken(value: string, purpose = "unsub"): string {
  return createHmac("sha256", key())
    .update(`${purpose}:${value.trim().toLowerCase()}`)
    .digest("base64url")
    .slice(0, 32);
}

export function verifyEmailLinkToken(value: string, token: string | null, purpose = "unsub"): boolean {
  if (!token || !key()) return false;
  const expected = Buffer.from(emailLinkToken(value, purpose));
  const got = Buffer.from(token);
  return expected.length === got.length && timingSafeEqual(expected, got);
}

/** Full unsubscribe URL with a signed token for this address. */
export function signedUnsubscribeUrl(base: string, email: string): string {
  return `${base}?e=${encodeURIComponent(email)}&t=${emailLinkToken(email)}`;
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!)
  );
}
