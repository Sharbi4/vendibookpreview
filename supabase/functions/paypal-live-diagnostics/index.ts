/**
 * paypal-live-diagnostics — safe, secret-free readiness probe for the LIVE
 * PayPal Business REST app behind Vendibook memberships.
 *
 * Returns ONLY booleans, enums, HTTP status codes and PayPal debug ids.
 * It never returns (or logs) the client id, client secret, access token,
 * webhook id value, or any approval URL.
 *
 * Public on purpose: the response carries no secret material and it must stay
 * reachable when credentials are misconfigured (that is exactly the failure it
 * is meant to diagnose).
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const LIVE_BASE = "https://api-m.paypal.com";
const SANDBOX_BASE = "https://api-m.sandbox.paypal.com";

async function probe(base: string, clientId: string, clientSecret: string) {
  try {
    const res = await fetch(`${base}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });
    const debugId = res.headers.get("paypal-debug-id");
    if (!res.ok) {
      let issue = "AUTH_FAILED";
      try {
        const body = await res.json();
        issue = String(body?.error ?? body?.name ?? issue);
      } catch { /* non-JSON */ }
      return { ok: false, http_status: res.status, issue, paypal_debug_id: debugId };
    }
    const json = await res.json();
    return {
      ok: true,
      http_status: 200,
      // Safe metadata only — no token value.
      app_id: typeof json?.app_id === "string" ? json.app_id : null,
      scope_count: String(json?.scope ?? "").split(/\s+/).filter(Boolean).length,
      expires_in: Number(json?.expires_in ?? 0),
      paypal_debug_id: debugId,
    };
  } catch (err) {
    return { ok: false, http_status: 0, issue: "NETWORK_ERROR", message: (err as Error).message };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const rawEnv = Deno.env.get("PAYPAL_ENVIRONMENT") ?? null;
  const resolved = (rawEnv ?? "sandbox").toLowerCase();
  const environment = resolved === "live" || resolved === "production" ? "live" : "sandbox";

  const clientId = Deno.env.get("PAYPAL_CLIENT_ID") ?? "";
  const clientSecret = Deno.env.get("PAYPAL_CLIENT_SECRET") ?? "";

  const config = {
    environment,
    environment_secret_present: !!rawEnv,
    environment_resolves_live: environment === "live",
    client_id_configured: !!clientId,
    client_secret_configured: !!clientSecret,
    webhook_id_configured: !!Deno.env.get("PAYPAL_WEBHOOK_ID"),
    webhook_id_live_configured: !!Deno.env.get("PAYPAL_WEBHOOK_ID_LIVE"),
    configured: !!clientId && !!clientSecret,
  };

  if (!config.configured) {
    return new Response(
      JSON.stringify({ ...config, diagnostic: "live_credentials_missing" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Probe BOTH hosts so we can say definitively which environment the stored
  // credentials belong to. Sandbox keys authenticate only against sandbox.
  const [live, sandbox] = await Promise.all([
    probe(LIVE_BASE, clientId, clientSecret),
    probe(SANDBOX_BASE, clientId, clientSecret),
  ]);

  const credentialEnvironment = live.ok ? "live" : sandbox.ok ? "sandbox" : "unknown";
  const diagnostic = live.ok
    ? "ok_live"
    : sandbox.ok
    ? "sandbox_credentials_in_use"
    : "oauth_authentication_failed";

  return new Response(
    JSON.stringify({
      ...config,
      credential_environment: credentialEnvironment,
      environment_matches_credentials: credentialEnvironment === environment,
      live_oauth: live,
      sandbox_oauth: { ok: sandbox.ok, http_status: sandbox.http_status },
      diagnostic,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
