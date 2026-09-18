/**
 * Durable PayPal API call log.
 *
 * Every REST call Vendibook makes to PayPal is written here so that:
 *   - the Integration Walkthrough samples can be generated from real traffic
 *     (/admin/paypal/api-samples),
 *   - a paypal-debug-id can be traced back to the exact request that produced
 *     it when PayPal support or a dispute needs it.
 *
 * PCI / PII rules enforced here, never at the call site:
 *   - Authorization and auth-assertion headers are redacted.
 *   - Card number, CVV, expiry and any raw payment credential are removed from
 *     both request and response before the row is written.
 *   - Payer contact details are reduced to a masked form.
 * The table itself is admin-read-only and purged after 90 days.
 */
// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

let client: any = null;
function admin() {
  if (client) return client;
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return null;
  client = createClient(url, key, { auth: { persistSession: false } });
  return client;
}

/** Header names whose values must never be stored. */
const REDACTED_HEADERS = /^(authorization|paypal-auth-assertion|cookie|set-cookie)$/i;

/** Object keys that must never be stored, at any depth. */
const FORBIDDEN_KEYS =
  /^(number|card_number|pan|security_code|cvv|cvc|expiry|expiration_date|access_token|refresh_token|client_secret|password|assertion|nonce|payment_token|attributes\.verification)$/i;

/** Keys whose values are masked rather than dropped, so samples stay readable. */
const MASKED_KEYS = /^(email_address|primary_email|payer_email|phone_number|national_number|full_name|given_name|surname)$/i;

function mask(value: unknown): string {
  const text = String(value ?? "");
  if (text.includes("@")) {
    const [local, domain] = text.split("@");
    return `${local.slice(0, 2)}***@${domain ?? ""}`;
  }
  if (text.length <= 4) return "***";
  return `${text.slice(0, 2)}***${text.slice(-2)}`;
}

/** Recursively strips forbidden keys and masks contact details. */
export function scrubForLog(value: unknown, depth = 0): unknown {
  if (depth > 8) return "[depth-limited]";
  if (Array.isArray(value)) return value.map((v) => scrubForLog(v, depth + 1));
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (FORBIDDEN_KEYS.test(k)) {
        out[k] = "[redacted]";
        continue;
      }
      if (MASKED_KEYS.test(k) && typeof v === "string") {
        out[k] = mask(v);
        continue;
      }
      out[k] = scrubForLog(v, depth + 1);
    }
    return out;
  }
  return value;
}

export function scrubHeaders(headers: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) {
    out[k] = REDACTED_HEADERS.test(k) ? "[redacted]" : v;
  }
  return out;
}

/**
 * Human-readable call name used to group samples for certification, derived
 * from the endpoint path so it stays correct without a call-site argument.
 */
export function callNameForPath(path: string, method: string): string {
  const p = path.split("?")[0];
  if (p === "/v1/oauth2/token") return "Get access token";
  if (p === "/v2/customer/partner-referrals") return "Create partner referral";
  if (/\/merchant-integrations\/?$/.test(p) || p.includes("merchant-integrations?")) {
    return "Show seller status (by tracking id)";
  }
  if (p.includes("/merchant-integrations/")) return "Show seller status (by merchant id)";
  if (p === "/v2/checkout/orders" && method === "POST") return "Create order";
  if (/\/v2\/checkout\/orders\/[^/]+\/capture$/.test(p)) return "Capture order";
  if (/\/v2\/checkout\/orders\/[^/]+\/authorize$/.test(p)) return "Authorize order";
  if (/\/v2\/checkout\/orders\/[^/]+\/track$/.test(p)) return "Add tracking";
  if (/\/v2\/checkout\/orders\/[^/]+$/.test(p) && method === "PATCH") return "Update order";
  if (/\/v2\/checkout\/orders\/[^/]+$/.test(p)) return "Show order details";
  if (/\/v2\/payments\/captures\/[^/]+\/refund$/.test(p)) return "Refund captured payment";
  if (/\/v2\/payments\/authorizations\/[^/]+\/capture$/.test(p)) return "Capture authorization";
  if (/\/v2\/payments\/authorizations\/[^/]+\/void$/.test(p)) return "Void authorization";
  if (p === "/v1/notifications/verify-webhook-signature") return "Verify webhook signature";
  if (p.startsWith("/v1/billing/subscriptions")) return "Subscription call";
  return `${method} ${p}`;
}

export interface PayPalLogEntry {
  path: string;
  method: string;
  environment: string;
  requestHeaders: Record<string, string>;
  requestBody?: unknown;
  responseStatus?: number;
  responseBody?: unknown;
  debugId?: string | null;
  latencyMs?: number;
  sellerId?: string | null;
  orderId?: string | null;
  reference?: string | null;
}

/**
 * Fire-and-forget. A logging failure must never break a payment, so every
 * error here is swallowed after a console note.
 */
export function logPayPalApiCall(entry: PayPalLogEntry): void {
  const db = admin();
  if (!db) return;
  const row = {
    call_name: callNameForPath(entry.path, entry.method),
    endpoint: entry.path,
    method: entry.method,
    environment: entry.environment,
    request_headers: scrubHeaders(entry.requestHeaders),
    request_body: entry.requestBody === undefined ? null : scrubForLog(entry.requestBody),
    response_status: entry.responseStatus ?? null,
    response_body: entry.responseBody === undefined ? null : scrubForLog(entry.responseBody),
    paypal_debug_id: entry.debugId ?? null,
    latency_ms: entry.latencyMs ?? null,
    seller_id: entry.sellerId ?? null,
    order_id: entry.orderId ?? null,
    reference: entry.reference ?? null,
  };
  try {
    const result = db.from("paypal_api_logs").insert(row);
    // supabase-js returns a thenable builder; attach a no-op catch.
    Promise.resolve(result).catch(() => {
      console.log("[PAYPAL] api_log_insert_failed");
    });
  } catch {
    console.log("[PAYPAL] api_log_insert_threw");
  }
}
