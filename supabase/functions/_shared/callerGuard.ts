// Shared caller checks for edge functions.
//
// - Backend callers: other edge functions (service-role bearer/apikey) or
//   scheduled jobs / DB triggers presenting the x-cron-secret held in the
//   database (public.internal_cron_secret(), service_role only). The secret
//   is never committed to source.
// - Users: verified from the Authorization bearer via auth.getUser().
// - Admins: users holding the 'admin' role in user_roles.
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { isInternalCaller } from "./internalAuth.ts";

const guardCors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

let serviceClient: SupabaseClient | null = null;
export function serviceRoleClient(): SupabaseClient {
  if (!serviceClient) {
    serviceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );
  }
  return serviceClient;
}

let cachedSecret: { value: string; at: number } | null = null;
export async function getCronSecret(): Promise<string> {
  if (cachedSecret && Date.now() - cachedSecret.at < 5 * 60_000) return cachedSecret.value;
  try {
    const { data, error } = await serviceRoleClient().rpc("internal_cron_secret");
    if (error || typeof data !== "string" || data.length < 32) return "";
    cachedSecret = { value: data, at: Date.now() };
    return data;
  } catch {
    return "";
  }
}

export async function isCronCaller(req: Request): Promise<boolean> {
  const provided = (req.headers.get("x-cron-secret") ?? "").trim();
  if (!provided) return false;
  const secret = await getCronSecret();
  return !!secret && provided === secret;
}

export async function isBackendCaller(req: Request): Promise<boolean> {
  return isInternalCaller(req) || (await isCronCaller(req));
}

export interface Caller {
  id: string;
  email: string | null;
}

export async function getCaller(req: Request): Promise<Caller | null> {
  const authHeader = req.headers.get("Authorization") ?? req.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;
  try {
    const { data, error } = await serviceRoleClient().auth.getUser(token);
    if (error || !data?.user) return null;
    return { id: data.user.id, email: data.user.email ?? null };
  } catch {
    return null;
  }
}

export async function isAdminUser(userId: string): Promise<boolean> {
  try {
    const { data } = await serviceRoleClient().rpc("has_role", { _user_id: userId, _role: "admin" });
    return !!data;
  } catch {
    return false;
  }
}

export async function isAdminOrBackendCaller(req: Request): Promise<boolean> {
  if (await isBackendCaller(req)) return true;
  const caller = await getCaller(req);
  return !!caller && (await isAdminUser(caller.id));
}

export function forbiddenResponse(headers: Record<string, string> = guardCors): Response {
  return new Response(JSON.stringify({ error: "Forbidden" }), {
    status: 403,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}

export function unauthorizedResponse(headers: Record<string, string> = guardCors): Response {
  return new Response(JSON.stringify({ error: "Please sign in to continue." }), {
    status: 401,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}

export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Masks an email for logs: "jo***@example.com". */
export function maskEmail(email: unknown): string {
  const s = String(email ?? "");
  const at = s.indexOf("@");
  if (at < 1) return "***";
  return `${s.slice(0, Math.min(2, at))}***${s.slice(at)}`;
}

/**
 * Returns null when the request comes from a signed-in user or a backend
 * caller; otherwise a 401 response. Used by paid features (AI, voice, maps).
 */
export async function requireSignedInOrBackend(
  req: Request,
  headers: Record<string, string> = guardCors,
): Promise<Response | null> {
  if (await isBackendCaller(req)) return null;
  const caller = await getCaller(req);
  return caller ? null : unauthorizedResponse(headers);
}

/** Returns null for admins / backend callers; otherwise a 403 response. */
export async function requireAdminOrBackend(
  req: Request,
  headers: Record<string, string> = guardCors,
): Promise<Response | null> {
  return (await isAdminOrBackendCaller(req)) ? null : forbiddenResponse(headers);
}
