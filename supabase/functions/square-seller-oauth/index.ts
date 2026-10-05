/**
 * Hosts connect their own Square account so renters pay them directly
 * (Vendibook keeps its share as app_fee_money).
 *
 * Actions (host session required):
 *   start      -> one-time state + Square authorize URL
 *   complete   -> exchanges the code from /host/payments/square/callback,
 *                 stores encrypted tokens and the host's main location
 *   status     -> connection status, no token material
 *   disconnect -> revokes Vendibook's access at Square and marks it revoked
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { corsHeaders, jsonError, jsonResponse, unknownErrorResponse } from "../_shared/jsonError.ts";
import {
  authorizeUrl,
  decryptToken,
  encryptToken,
  exchangeCode,
  marketplaceEnv,
  primaryLocation,
  revokeSellerToken,
  squareApi,
  SquareApiError,
  SQUARE_SELLER_SCOPES,
} from "../_shared/squareMarketplace.ts";
import { safeLog } from "../_shared/paypal.ts";

const SAFE_RETURN = /^\/[A-Za-z0-9/_\-?=&.]*$/;

function oauthReady() {
  const env = marketplaceEnv();
  return Boolean(env.applicationId && env.applicationSecret && env.redirectUrl && env.encryptionKey);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonError(405, "method_not_allowed", "POST required.");
  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } });
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonError(401, "unauthenticated", "Please sign in to continue.");
    const { data: userData } = await admin.auth.getUser(authHeader.replace("Bearer ", ""));
    const user = userData?.user;
    if (!user) return jsonError(401, "unauthenticated", "Your session expired. Please sign in again.");

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action ?? "");
    const env = marketplaceEnv();

    if (action === "status") {
      const { data } = await admin.from("square_seller_accounts")
        .select("environment, status, merchant_id, location_name, business_name, connected_at")
        .eq("user_id", user.id).eq("environment", env.environment).maybeSingle();
      return jsonResponse(200, { available: oauthReady(), environment: env.environment, connection: data ?? null });
    }

    if (!oauthReady()) {
      return jsonError(503, "square_not_configured", "Square connections aren't available yet. Please check back soon.");
    }

    if (action === "start") {
      const returnPath = typeof body?.return_path === "string" && SAFE_RETURN.test(body.return_path) ? body.return_path : null;
      const state = Array.from(crypto.getRandomValues(new Uint8Array(24)), (b) => b.toString(16).padStart(2, "0")).join("");
      const { error } = await admin.from("square_oauth_states").insert({
        state, user_id: user.id, environment: env.environment, return_path: returnPath,
      });
      if (error) throw error;
      return jsonResponse(200, { url: authorizeUrl(state) });
    }

    if (action === "complete") {
      const code = String(body?.code ?? "");
      const state = String(body?.state ?? "");
      if (!code || !/^[0-9a-f]{48}$/.test(state)) return jsonError(400, "invalid_request", "This Square link is invalid. Start again from your payout settings.");
      // Single use, bound to the same signed-in host, short-lived.
      const { data: claimed } = await admin.from("square_oauth_states")
        .update({ used_at: new Date().toISOString() })
        .eq("state", state).eq("user_id", user.id).is("used_at", null).gt("expires_at", new Date().toISOString())
        .select("return_path, environment").maybeSingle();
      if (!claimed || claimed.environment !== env.environment) {
        return jsonError(400, "state_invalid", "This Square link expired. Start again from your payout settings.");
      }

      const tokens = await exchangeCode(code);
      const location = await primaryLocation(tokens.access_token);
      if (!location) {
        return jsonError(409, "no_location",
          "Your Square account has no active location that can take card payments. Activate one in Square, then connect again.");
      }
      let businessName: string | null = location.business_name ?? null;
      try {
        const { merchant } = await squareApi("/v2/merchants/me", { token: tokens.access_token });
        businessName = merchant?.business_name ?? businessName;
      } catch { /* optional */ }

      const now = new Date().toISOString();
      const { error } = await admin.from("square_seller_accounts").upsert({
        user_id: user.id,
        environment: env.environment,
        merchant_id: tokens.merchant_id,
        location_id: location.id,
        location_name: location.name ?? null,
        business_name: businessName,
        currency: location.currency ?? "USD",
        access_token_encrypted: await encryptToken(tokens.access_token),
        refresh_token_encrypted: tokens.refresh_token ? await encryptToken(tokens.refresh_token) : null,
        token_expires_at: tokens.expires_at ?? null,
        scopes: SQUARE_SELLER_SCOPES,
        status: "active",
        connected_at: now,
        revoked_at: null,
        last_error: null,
        updated_at: now,
      }, { onConflict: "user_id,environment" });
      if (error) throw error;
      safeLog("square_seller_connected", { userId: user.id, environment: env.environment });
      return jsonResponse(200, {
        connected: true,
        business_name: businessName,
        location_name: location.name ?? null,
        return_path: claimed.return_path ?? null,
      });
    }

    if (action === "disconnect") {
      const { data: account } = await admin.from("square_seller_accounts").select("*")
        .eq("user_id", user.id).eq("environment", env.environment).maybeSingle();
      if (!account) return jsonResponse(200, { disconnected: true });
      try {
        if (account.status !== "revoked") await revokeSellerToken(await decryptToken(account.access_token_encrypted));
      } catch (err) {
        safeLog("square_revoke_failed", { userId: user.id, code: err instanceof SquareApiError ? err.code : "error" });
      }
      await admin.from("square_seller_accounts").update({
        status: "revoked", revoked_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        access_token_encrypted: "revoked", refresh_token_encrypted: null,
      }).eq("id", account.id);
      return jsonResponse(200, { disconnected: true });
    }

    return jsonError(400, "invalid_action", "Unknown action.");
  } catch (err) {
    if (err instanceof SquareApiError) {
      return jsonError(502, "square_error", "Square couldn't complete the connection. Please try again.", { square_code: err.code });
    }
    return unknownErrorResponse(err);
  }
});
