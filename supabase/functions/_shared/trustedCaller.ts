// Shared caller verification for edge functions.
//
// - Scheduled jobs and database triggers send the `x-cron-secret` header.
// - Other edge functions call with the service-role key (see internalAuth.ts).
// - Administrators may call admin/maintenance endpoints with their session.
// - Signed-in users are resolved with `getAuthedUser` for user-scoped checks.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { isInternalCaller } from "./internalAuth.ts";

function cronSecrets(): string[] {
  return [Deno.env.get("INTERNAL_CRON_SECRET"), Deno.env.get("RELEASE_SWEEP_SECRET")]
    .map((v) => (v ?? "").trim())
    .filter((v) => v.length >= 16);
}

export function hasCronSecret(req: Request): boolean {
  const provided = (req.headers.get("x-cron-secret") ?? "").trim();
  if (!provided) return false;
  return cronSecrets().includes(provided);
}

/** Scheduled job, database trigger, or another edge function (service role). */
export function isTrustedInternal(req: Request): boolean {
  return hasCronSecret(req) || isInternalCaller(req);
}

export interface AuthedUser {
  id: string;
  email: string | null;
}

export async function getAuthedUser(req: Request): Promise<AuthedUser | null> {
  const header = req.headers.get("Authorization") ?? req.headers.get("authorization") ?? "";
  const token = header.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;
  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  if (!url || !anonKey) return null;
  try {
    const client = createClient(url, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false },
    });
    const { data, error } = await client.auth.getUser(token);
    if (error || !data?.user) return null;
    return { id: data.user.id, email: data.user.email ?? null };
  } catch {
    return null;
  }
}

export async function isAdminUser(userId: string): Promise<boolean> {
  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!url || !serviceKey) return false;
  try {
    const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
    const { data } = await admin.rpc("has_role", { _user_id: userId, _role: "admin" });
    return !!data;
  } catch {
    return false;
  }
}

/** Trusted internal caller OR a signed-in administrator. */
export async function isTrustedOrAdmin(req: Request): Promise<boolean> {
  if (isTrustedInternal(req)) return true;
  const user = await getAuthedUser(req);
  return !!user && (await isAdminUser(user.id));
}

export function forbiddenResponse(corsHeaders: Record<string, string>, status = 403): Response {
  return new Response(JSON.stringify({ error: status === 401 ? "Unauthorized" : "Forbidden" }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
