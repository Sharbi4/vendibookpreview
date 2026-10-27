/**
 * Google Maps server calls.
 *
 * Preferred: the owner's own unrestricted server key (GOOGLE_API_KEY), called
 * directly against Google. Fallback: the Lovable connector gateway, where
 * GOOGLE_MAPS_API_KEY is a gateway connection key (never a Google key).
 */
const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_maps";

const env = (key: string): string | undefined =>
  (globalThis as { Deno?: { env: { get(k: string): string | undefined } } }).Deno?.env.get(key);

const serverKey = () => env("GOOGLE_API_KEY");
const gatewayReady = () => !!env("LOVABLE_API_KEY") && !!env("GOOGLE_MAPS_API_KEY");

export function googleGatewayConfigured(): boolean {
  return !!serverKey() || gatewayReady();
}

type Init = { method?: string; body?: unknown; fieldMask?: string };

/** Map a gateway-style path to Google's real host. */
function directUrl(path: string, key: string): string {
  if (path.startsWith("/places/")) return `https://places.googleapis.com${path.slice("/places".length)}`;
  const sep = path.includes("?") ? "&" : "?";
  return `https://maps.googleapis.com${path}${sep}key=${encodeURIComponent(key)}`;
}

async function send(url: string, headers: Record<string, string>, init: Init): Promise<any> {
  if (init.body !== undefined) headers["Content-Type"] = "application/json";
  if (init.fieldMask) headers["X-Goog-FieldMask"] = init.fieldMask;
  const res = await fetch(url, {
    method: init.method ?? (init.body !== undefined ? "POST" : "GET"),
    headers,
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`[${res.status}]: ${text.slice(0, 500)}`);
  const data = JSON.parse(text);
  // Legacy Geocoding reports key problems inside a 200 body.
  if (data?.status === "REQUEST_DENIED") throw new Error(`[200 REQUEST_DENIED]: ${String(data.error_message ?? "").slice(0, 300)}`);
  return data;
}

/** Fetch a Google path (e.g. "/maps/api/geocode/json?address=..." or "/places/v1/places:autocomplete"). */
export async function googleGatewayFetch(path: string, init: Init = {}): Promise<any> {
  const key = serverKey();
  let directError: unknown = null;
  if (key) {
    try {
      const headers: Record<string, string> = path.startsWith("/places/") ? { "X-Goog-Api-Key": key } : {};
      return await send(directUrl(path, key), headers, init);
    } catch (e) {
      directError = e;
      console.error("Google server key request failed:", e instanceof Error ? e.message : e);
    }
  }
  if (!gatewayReady()) {
    if (directError) throw directError;
    throw new Error("Google Maps is not configured");
  }
  return await send(`${GATEWAY_URL}${path}`, {
    Authorization: `Bearer ${env("LOVABLE_API_KEY")}`,
    "X-Connection-Api-Key": env("GOOGLE_MAPS_API_KEY")!,
  }, init);
}

/** Geocoding API (legacy JSON shape). */
export function googleGeocode(params: Record<string, string>): Promise<any> {
  return googleGatewayFetch(`/maps/api/geocode/json?${new URLSearchParams(params).toString()}`);
}
