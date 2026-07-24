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
