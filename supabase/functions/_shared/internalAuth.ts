// Shared guard for edge functions that must only be invoked by trusted
// backend callers (other edge functions, database triggers, cron jobs).
// Accepts the service-role key as a bearer token. Anon-key or end-user JWT
// callers are rejected so public traffic cannot drive notifications/SMS.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export function isInternalCaller(req: Request): boolean {
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!serviceKey) return false;

  const header = req.headers.get("Authorization") ?? req.headers.get("authorization") ?? "";
  const token = header.replace(/^Bearer\s+/i, "").trim();
  if (token && token === serviceKey) return true;

  // Some internal callers pass the key via apikey instead.
  const apiKey = (req.headers.get("apikey") ?? "").trim();
  return !!apiKey && apiKey === serviceKey;
}

export function internalOnlyResponse(corsHeaders: Record<string, string>): Response {
  return new Response(
    JSON.stringify({ error: "Forbidden" }),
    { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}

// Allows a call when it comes from a trusted backend caller (service-role
// bearer / apikey) OR from a signed-in user holding the admin role.
// Use for admin-only maintenance, backfill, sync, and payout-sweep functions.
export async function isAdminOrInternalCaller(req: Request): Promise<boolean> {
  if (isInternalCaller(req)) return true;

  const authHeader = req.headers.get("Authorization") ?? req.headers.get("authorization");
  if (!authHeader) return false;

  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!url || !anonKey || !serviceKey) return false;

  try {
    const userClient = createClient(url, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return false;

    const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
    const { data: isAdmin } = await admin.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });
    return !!isAdmin;
  } catch {
    return false;
  }
}
