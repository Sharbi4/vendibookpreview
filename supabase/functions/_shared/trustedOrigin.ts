// Returns a site origin that is safe to embed in navigation URLs handed back
// to the browser. The request Origin header is caller-controlled, so only
// Vendibook's own domains and Lovable preview hosts are accepted; anything
// else falls back to the canonical production origin.
export const CANONICAL_SITE_ORIGIN = "https://vendibook.com";

const TRUSTED_HOST = /^(?:www\.)?vendibook\.com$|^[a-z0-9-]+(?:--[a-z0-9-]+)*\.lovable\.app$|^[a-z0-9-]+\.lovableproject\.com$/i;

export function trustedSiteOrigin(req: Request): string {
  const raw = req.headers.get("origin") ?? "";
  try {
    const u = new URL(raw);
    if (u.protocol === "https:" && !u.port && TRUSTED_HOST.test(u.hostname)) return u.origin;
    if (u.protocol === "http:" && (u.hostname === "localhost" || u.hostname === "127.0.0.1")) return u.origin;
  } catch {
    /* fall through */
  }
  return CANONICAL_SITE_ORIGIN;
}
