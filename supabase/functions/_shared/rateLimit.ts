// Lightweight backend rate limiter for publicly callable edge functions.
// Uses the service-role client so counters cannot be tampered with by clients.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export function clientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("cf-connecting-ip") ||
    "unknown"
  );
}

/**
 * Records an attempt and returns false when the caller exceeded `limit`
 * attempts for `scope`/`key` within the trailing `windowMinutes`.
 * Fails open (returns true) if the datastore is unreachable.
 */
export async function checkRateLimit(
  scope: string,
  key: string,
  limit: number,
  windowMinutes: number,
): Promise<boolean> {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const since = new Date(Date.now() - windowMinutes * 60_000).toISOString();

    const { count, error } = await supabase
      .from("rate_limit_events")
      .select("id", { count: "exact", head: true })
      .eq("scope", scope)
      .eq("key", key)
      .gte("created_at", since);

    if (error) return true;
    if ((count ?? 0) >= limit) return false;

    await supabase.from("rate_limit_events").insert({ scope, key });
    return true;
  } catch (_e) {
    return true;
  }
}
