// Shared guard for edge functions that must only be invoked by trusted
// backend callers (other edge functions, database triggers, cron jobs).
// Accepts the service-role key as a bearer token. Anon-key or end-user JWT
// callers are rejected so public traffic cannot drive notifications/SMS.

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
