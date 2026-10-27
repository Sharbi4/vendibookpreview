/**
 * Google Maps server calls through the Lovable connector gateway.
 * GOOGLE_MAPS_API_KEY is a gateway connection key, not a Google key: calling
 * maps.googleapis.com with it directly is rejected (REQUEST_DENIED).
 */
const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_maps";

const env = (key: string): string | undefined =>
  (globalThis as { Deno?: { env: { get(k: string): string | undefined } } }).Deno?.env.get(key);

export function googleGatewayConfigured(): boolean {
  return !!env("LOVABLE_API_KEY") && !!env("GOOGLE_MAPS_API_KEY");
}

/** Fetch a gateway path (e.g. "/maps/api/geocode/json?address=..."). Throws `[status]: body` on non-OK. */
export async function googleGatewayFetch(
  path: string,
  init: { method?: string; body?: unknown; fieldMask?: string } = {},
): Promise<any> {
  const lovable = env("LOVABLE_API_KEY");
  const conn = env("GOOGLE_MAPS_API_KEY");
  if (!lovable || !conn) throw new Error("Google Maps connector is not configured");
  const headers: Record<string, string> = {
    Authorization: `Bearer ${lovable}`,
    "X-Connection-Api-Key": conn,
  };
  if (init.body !== undefined) headers["Content-Type"] = "application/json";
  if (init.fieldMask) headers["X-Goog-FieldMask"] = init.fieldMask;
  const res = await fetch(`${GATEWAY_URL}${path}`, {
    method: init.method ?? (init.body !== undefined ? "POST" : "GET"),
    headers,
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`[${res.status}]: ${text.slice(0, 500)}`);
  }
  return await res.json();
}

/** Geocoding API (legacy JSON shape) via the gateway. */
export function googleGeocode(params: Record<string, string>): Promise<any> {
  return googleGatewayFetch(`/maps/api/geocode/json?${new URLSearchParams(params).toString()}`);
}
