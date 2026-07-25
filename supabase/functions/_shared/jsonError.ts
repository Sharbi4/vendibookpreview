// Shared JSON response + structured error helpers for payment/checkout
// edge functions. Every response — success OR error — carries CORS headers
// and a stable JSON shape so the frontend can branch on `code` without
// parsing free-form message strings.

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

export function jsonResponse(
  status: number,
  body: Record<string, unknown>,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * Structured, user-facing error response. `code` is a stable machine token
 * the frontend switches on; `message` is safe to render directly.
 */
export function jsonError(
  status: number,
  code: string,
  message: string,
  extra?: Record<string, unknown>,
): Response {
  return jsonResponse(status, { error: message, code, ...(extra ?? {}) });
}

/**
 * Fallback for unexpected server-side failures. Always 500 with the
 * `unknown_error` code so clients can render a generic retry message.
 */
export function unknownErrorResponse(err: unknown): Response {
  const message = err instanceof Error ? err.message : String(err);
  return jsonError(500, "unknown_error", message);
}

/**
 * Unified permission-denied response for any paid capability the caller
 * does not have. Every gate helper (tier + tool) should route through this
 * so clients can switch on one shape: `code === 'entitlement_required'`.
 * `legacy_code: 'tool_locked'` keeps older handlers matching until migrated.
 */
export function entitlementError(opts: {
  requires?: string;
  current?: string;
  tool?: string;
  feature?: string;
  message?: string;
  status?: number;
  extra?: Record<string, unknown>;
} = {}): Response {
  const label = opts.requires === "premium"
    ? "Operator"
    : opts.requires === "pro"
      ? "Growth"
      : opts.requires === "starter"
        ? "Starter"
        : "Vendibook Pro";
  const message = opts.message
    ?? (opts.tool
      ? `This tool is included with ${label} — upgrade to unlock.`
      : `This feature is included with ${label} — upgrade to unlock.`);
  return jsonResponse(opts.status ?? 403, {
    error: message,
    code: "entitlement_required",
    legacy_code: "tool_locked",
    ...(opts.requires ? { requires: opts.requires } : {}),
    ...(opts.current ? { current: opts.current } : {}),
    ...(opts.tool ? { tool: opts.tool } : {}),
    ...(opts.feature ? { feature: opts.feature } : {}),
    upgrade_url: "/pricing",
    ...(opts.extra ?? {}),
  });
}

/**
 * The caller already has equal-or-better access than what they're trying
 * to buy. 409 so the frontend can show a "you already own this" message
 * rather than an upsell.
 */
export function alreadyEntitledError(opts: {
  current?: string;
  message?: string;
  extra?: Record<string, unknown>;
} = {}): Response {
  return jsonResponse(409, {
    error: opts.message
      ?? "You already have access to this — no need to purchase again.",
    code: "already_entitled",
    ...(opts.current ? { current: opts.current } : {}),
    upgrade_url: "/pricing",
    ...(opts.extra ?? {}),
  });
}
