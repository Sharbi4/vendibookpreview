/**
 * Plaid connectivity diagnostic.
 *
 * Backend-only (service-role bearer required). Performs a real, non-billable
 * Plaid API call so we can confirm the credentials, environment and IDV
 * template are actually wired — instead of guessing from config presence.
 */
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { isInternalCaller, internalOnlyResponse } from "../_shared/internalAuth.ts";
import {
  listIdentityVerifications,
  PlaidError,
  plaidConfigStatus,
  plaidTemplateId,
} from "../_shared/plaid.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const diagToken = Deno.env.get("PLAID_DIAG_TOKEN");
  const presented = req.headers.get("x-diag-token");
  const tokenOk = !!diagToken && presented === diagToken;
  if (!tokenOk && !isInternalCaller(req)) return internalOnlyResponse(corsHeaders);

  const config = plaidConfigStatus();
  const templateId = plaidTemplateId();

  let live: Record<string, unknown> = { attempted: false };
  if (config.client_id_configured && config.secret_configured && templateId) {
    try {
      const res = await listIdentityVerifications({
        clientUserId: "vendibook-diagnostic-probe",
        templateId,
      });
      live = { attempted: true, ok: true, sessions: res.identity_verifications?.length ?? 0 };
    } catch (err) {
      const e = err as PlaidError;
      live = {
        attempted: true,
        ok: false,
        http_status: e.status,
        error_code: e.errorCode ?? null,
        message: e.message,
      };
    }
  }

  return new Response(JSON.stringify({ config, live }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
