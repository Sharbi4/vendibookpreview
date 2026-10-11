/**
 * PayPal-Auth-Assertion construction, kept free of any runtime globals so the
 * same logic can be unit-tested outside Deno.
 *
 * PayPal requires the assertion's `iss` to be the PLATFORM client id belonging
 * to the SAME environment whose access token is being used. Sending a live
 * client id alongside a sandbox token (or vice versa) is rejected.
 */
export type PayPalEnv = "sandbox" | "live";

/**
 * Picks the platform client id that matches the environment of the access
 * token. Sandbox falls back to the shared client id when no dedicated sandbox
 * client id is configured.
 */
export function assertionIssuerClientId(
  environment: PayPalEnv,
  ids: { sandboxClientId?: string | null; liveClientId?: string | null },
): string | null {
  if (environment === "sandbox") {
    return ids.sandboxClientId || ids.liveClientId || null;
  }
  return ids.liveClientId || null;
}

/**
 * Unsigned JWT (alg none). PayPal authenticates the partner via the access
 * token; the assertion only names the merchant being acted for.
 * The returned value is a credential-adjacent header and must never be logged.
 */
export function buildAuthAssertionToken(
  clientId: string | null | undefined,
  merchantId: string | null | undefined,
): string | null {
  if (!clientId || !merchantId) return null;
  const b64 = (obj: unknown) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `${b64({ alg: "none" })}.${b64({ iss: clientId, payer_id: merchantId })}.`;
}
