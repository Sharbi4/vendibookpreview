// Fail-closed rate limiting for public Atlas token issuance.
// Unlike _shared/rateLimit.ts (fail-open, trusts x-forwarded-for), a token is
// minted only after every limit check AND counter write is confirmed.

export type LimitDb = {
  count(scope: string, key: string, sinceIso: string): Promise<number | null>;
  insert(scope: string, key: string): Promise<boolean>;
};

/**
 * Client IP as set by the platform's Cloudflare edge. Cloudflare overwrites
 * any caller-supplied cf-connecting-ip, unlike x-forwarded-for whose first
 * entry is caller-controlled. Returns null when absent so callers fail safely.
 */
export function trustedClientIp(req: Request): string | null {
  const ip = req.headers.get("cf-connecting-ip")?.trim();
  return ip && ip.length <= 64 && /^[0-9a-fA-F:.]+$/.test(ip) ? ip : null;
}

export type LimitResult = "allowed" | "limited" | "unavailable";

/** Checks all windows, then records the attempt in each. Any datastore error => "unavailable". */
export async function checkAtlasLimits(
  db: LimitDb,
  key: string,
  windows: { scope: string; limit: number; minutes: number }[],
  now = Date.now(),
): Promise<LimitResult> {
  try {
    for (const w of windows) {
      const n = await db.count(w.scope, key, new Date(now - w.minutes * 60_000).toISOString());
      if (n === null) return "unavailable";
      if (n >= w.limit) return "limited";
    }
    for (const w of windows) {
      if (!(await db.insert(w.scope, key))) return "unavailable";
    }
    return "allowed";
  } catch {
    return "unavailable";
  }
}
