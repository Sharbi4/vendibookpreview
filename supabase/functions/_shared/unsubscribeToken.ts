// Signed unsubscribe links: the token proves the link came from a Vendibook
// email sent to that address, so nobody can unsubscribe someone else.
import { createHmac, timingSafeEqual } from "node:crypto";

function key(): string {
  return `unsubscribe:${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""}`;
}

export function unsubToken(email: string): string {
  return createHmac("sha256", key()).update(String(email).trim().toLowerCase()).digest("hex").slice(0, 32);
}

export function verifyUnsubToken(email: string, token: string | null | undefined): boolean {
  if (!email || !token) return false;
  const a = new TextEncoder().encode(unsubToken(email));
  const b = new TextEncoder().encode(String(token));
  return a.length === b.length && timingSafeEqual(a, b);
}
