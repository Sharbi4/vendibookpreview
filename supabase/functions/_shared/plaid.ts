/**
 * Plaid Identity Verification service layer.
 *
 * The ONLY place Plaid REST is called from. Secrets never leave the server:
 *   PLAID_CLIENT_ID
 *   PLAID_SECRET            (production secret)
 *   PLAID_SANDBOX_SECRET    (used only when PLAID_ENV is not production)
 *   PLAID_ENV               'production' | 'sandbox'
 *   PLAID_IDV_TEMPLATE_ID   production Identity Verification template
 */

import { isFreshPlaidIat } from "./verifiedSellerLogic.ts";

export type PlaidEnvironment = "production" | "sandbox";

export function plaidEnvironment(): PlaidEnvironment {
  const raw = (Deno.env.get("PLAID_ENV") ?? "sandbox").toLowerCase();
  return raw === "production" || raw === "live" ? "production" : "sandbox";
}

export function plaidApiBase(): string {
  return plaidEnvironment() === "production"
    ? "https://production.plaid.com"
    : "https://sandbox.plaid.com";
}

function plaidSecret(): string | null {
  return plaidEnvironment() === "production"
    ? Deno.env.get("PLAID_SECRET") ?? null
    : Deno.env.get("PLAID_SANDBOX_SECRET") ?? Deno.env.get("PLAID_SECRET") ?? null;
}

export function plaidTemplateId(): string | null {
  return Deno.env.get("PLAID_IDV_TEMPLATE_ID") ?? null;
}

export function plaidConfigStatus() {
  return {
    environment: plaidEnvironment(),
    client_id_configured: !!Deno.env.get("PLAID_CLIENT_ID"),
    secret_configured: !!plaidSecret(),
    template_configured: !!plaidTemplateId(),
  };
}

export class PlaidError extends Error {
  status: number;
  errorCode?: string;
  requestId?: string;
  constructor(message: string, status: number, errorCode?: string, requestId?: string) {
    super(message);
    this.name = "PlaidError";
    this.status = status;
    this.errorCode = errorCode;
    this.requestId = requestId;
  }
}

/** Logs operational metadata only — never PII, documents or secrets. */
export function plaidLog(step: string, details?: Record<string, unknown>) {
  const clean = details
    ? Object.fromEntries(
      Object.entries(details).filter(([k]) =>
        !/secret|token|ssn|dob|birth|email|phone|address|name|document|image/i.test(k)
      ),
    )
    : undefined;
  console.log(`[PLAID-IDV] ${step}${clean ? ` - ${JSON.stringify(clean)}` : ""}`);
}

async function plaidRequest<T = any>(path: string, body: Record<string, unknown>): Promise<T> {
  const clientId = Deno.env.get("PLAID_CLIENT_ID");
  const secret = plaidSecret();
  if (!clientId || !secret) {
    throw new PlaidError("Identity verification is not configured.", 503, "NOT_CONFIGURED");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const res = await fetch(`${plaidApiBase()}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "PLAID-CLIENT-ID": clientId,
        "PLAID-SECRET": secret,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const text = await res.text();
    const json = text ? JSON.parse(text) : {};
    if (!res.ok) {
      plaidLog("api_error", {
        path,
        http_status: res.status,
        error_code: json?.error_code,
        request_id: json?.request_id,
      });
      throw new PlaidError(
        json?.error_message ?? "Plaid rejected the request.",
        res.status,
        json?.error_code,
        json?.request_id,
      );
    }
    return json as T;
  } catch (err) {
    if (err instanceof PlaidError) throw err;
    throw new PlaidError("Plaid did not respond in time. Please try again.", 504, "TIMEOUT");
  } finally {
    clearTimeout(timer);
  }
}

// ------------------------------------------------------- identity verification
export interface PlaidIdvSession {
  id: string;
  status: string;
  client_user_id?: string;
  template?: { id: string; version?: number };
  previous_attempt_id?: string | null;
  shareable_url?: string | null;
  request_id?: string;
  steps?: Record<string, string>;
}

/**
 * Idempotent create. Plaid returns the EXISTING incomplete session for the
 * same (client_user_id, template) pair when `is_idempotent` is true, so
 * reopening Link resumes instead of buying another billable session.
 *
 * `gave_consent` is always false — the configured Plaid flow presents its own
 * required consent screen. Vendibook never consents on the user's behalf.
 */
export async function createIdentityVerification(opts: {
  clientUserId: string;
  templateId: string;
}): Promise<PlaidIdvSession> {
  return await plaidRequest<PlaidIdvSession>("/identity_verification/create", {
    // Plaid's current IDV contract puts client_user_id at the ROOT of the
    // request. The nested `user.client_user_id` field is deprecated here and
    // is sent ONLY to /link/token/create, where it still belongs.
    client_user_id: opts.clientUserId,
    is_shareable: false,
    template_id: opts.templateId,
    gave_consent: false,
    is_idempotent: true,
  });
}

export async function getIdentityVerification(id: string): Promise<PlaidIdvSession> {
  return await plaidRequest<PlaidIdvSession>("/identity_verification/get", {
    identity_verification_id: id,
  });
}

export async function listIdentityVerifications(opts: {
  clientUserId: string;
  templateId: string;
}): Promise<{ identity_verifications: PlaidIdvSession[] }> {
  return await plaidRequest("/identity_verification/list", {
    client_user_id: opts.clientUserId,
    template_id: opts.templateId,
  });
}

/**
 * Plaid's dedicated retry endpoint. NEVER use `create` for a retry — that
 * would start a second billable session.
 */
export async function retryIdentityVerification(opts: {
  clientUserId: string;
  templateId: string;
  strategy?: "reset" | "incomplete" | "infer";
}): Promise<PlaidIdvSession> {
  return await plaidRequest<PlaidIdvSession>("/identity_verification/retry", {
    client_user_id: opts.clientUserId,
    template_id: opts.templateId,
    strategy: opts.strategy ?? "reset",
  });
}

/** Link token scoped to the identity_verification product. */
export async function createIdvLinkToken(opts: {
  clientUserId: string;
  templateId: string;
  webhook?: string;
}): Promise<{ link_token: string; expiration: string; request_id?: string }> {
  return await plaidRequest("/link/token/create", {
    user: { client_user_id: opts.clientUserId },
    client_name: "Vendibook",
    products: ["identity_verification"],
    country_codes: ["US"],
    language: "en",
    identity_verification: { template_id: opts.templateId },
    ...(opts.webhook ? { webhook: opts.webhook } : {}),
  });
}

// ------------------------------------------------------------------ webhooks
const jwkCache = new Map<string, CryptoKey>();

async function getWebhookVerificationKey(keyId: string): Promise<CryptoKey | null> {
  const cached = jwkCache.get(keyId);
  if (cached) return cached;

  try {
    const res = await plaidRequest<{ key: JsonWebKey & { kid: string } }>(
      "/webhook_verification_key/get",
      { key_id: keyId },
    );
    const jwk = res.key;
    if (!jwk || (jwk as any).alg !== "ES256") return null;
    const key = await crypto.subtle.importKey(
      "jwk",
      { kty: jwk.kty, crv: (jwk as any).crv, x: (jwk as any).x, y: (jwk as any).y, ext: true },
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["verify"],
    );
    jwkCache.set(keyId, key);
    return key;
  } catch (err) {
    plaidLog("jwk_fetch_failed", { key_id: keyId, message: (err as Error).message });
    return null;
  }
}

const b64urlToBytes = (input: string): Uint8Array => {
  const pad = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = pad + "=".repeat((4 - (pad.length % 4)) % 4);
  const bin = atob(padded);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
};

const sha256Hex = async (value: string): Promise<string> => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
};

/**
 * Verifies a Plaid webhook using the official JWT + JWK process:
 *   1. read the `plaid-verification` ES256 JWT header for its `kid`
 *   2. fetch (and cache) the matching public key
 *   3. verify the signature
 *   4. confirm the token is fresh and its `request_body_sha256` claim
 *      matches the SHA-256 of the raw body
 *
 * Returns false for anything unsigned, stale or mismatched.
 */
export async function verifyPlaidWebhook(
  headers: Headers,
  rawBody: string,
): Promise<boolean> {
  const jwt = headers.get("plaid-verification");
  if (!jwt) {
    plaidLog("webhook_missing_signature");
    return false;
  }

  const parts = jwt.split(".");
  if (parts.length !== 3) return false;

  let header: { alg?: string; kid?: string };
  let payload: { iat?: number; request_body_sha256?: string };
  try {
    header = JSON.parse(new TextDecoder().decode(b64urlToBytes(parts[0])));
    payload = JSON.parse(new TextDecoder().decode(b64urlToBytes(parts[1])));
  } catch {
    return false;
  }

  if (header.alg !== "ES256" || !header.kid) {
    plaidLog("webhook_bad_alg", { alg: header.alg });
    return false;
  }

  const key = await getWebhookVerificationKey(header.kid);
  if (!key) return false;

  const ok = await crypto.subtle.verify(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    b64urlToBytes(parts[2]),
    new TextEncoder().encode(`${parts[0]}.${parts[1]}`),
  );
  if (!ok) {
    plaidLog("webhook_signature_invalid");
    return false;
  }

  // Replay window: reject tokens older than five minutes, and reject tokens
  // materially in the future (only a small clock-skew allowance).
  const iat = Number(payload.iat ?? 0);
  if (!isFreshPlaidIat(iat)) {
    plaidLog("webhook_stale", { age_seconds: Math.round(Date.now() / 1000 - iat) });
    return false;
  }



  const bodyHash = await sha256Hex(rawBody);
  if (bodyHash !== payload.request_body_sha256) {
    plaidLog("webhook_body_mismatch");
    return false;
  }

  return true;
}
