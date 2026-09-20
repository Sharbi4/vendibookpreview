// Square is used only for Vendibook-owned subscriptions and add-ons.
export function squareConfig() {
  const environment = Deno.env.get('SQUARE_ENVIRONMENT') || 'sandbox';
  if (!['sandbox', 'production'].includes(environment)) throw new Error('Invalid Square environment');
  const applicationId = Deno.env.get('SQUARE_APPLICATION_ID') || '';
  const locationId = Deno.env.get('SQUARE_LOCATION_ID') || '';
  const token = Deno.env.get('SQUARE_ACCESS_TOKEN') || '';
  const enabled = Deno.env.get('SQUARE_MONETIZATION_ENABLED') === 'true';
  if (!applicationId || !locationId || !token) throw new Error('Square billing is not available yet. Please try again later.');
  return { enabled, environment, applicationId, locationId, token,
    base: environment === 'production' ? 'https://connect.squareup.com' : 'https://connect.squareupsandbox.com' };
}
export async function squareRequest(path: string, body?: unknown, method = body ? 'POST' : 'GET') {
  const config = squareConfig();
  const response = await fetch(config.base + path, {
    method, headers: { Authorization: `Bearer ${config.token}`, 'Content-Type': 'application/json', 'Square-Version': '2026-09-16' },
    ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(25000),
  });
  const data = await response.json();
  if (!response.ok || data.errors?.length) {
    // Do not expose tokens, card tokens, provider payloads or buyer data in logs.
    const code = data.errors?.[0]?.code || 'SQUARE_UNAVAILABLE';
    throw new Error(`Square could not complete this request (${code}).`);
  }
  return data;
}
export async function verifySquareSignature(raw: string, signature: string, key: string, url: string) {
  if (!signature || !key || !url) return false;
  try {
    const cryptoKey = await crypto.subtle.importKey('raw', new TextEncoder().encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
    const bytes = Uint8Array.from(atob(signature), c => c.charCodeAt(0));
    return await crypto.subtle.verify('HMAC', cryptoKey, bytes, new TextEncoder().encode(url + raw));
  } catch { return false; }
}
export function catalogPrice(product: any, now = Date.now()) {
  const promo = product.promo_price_cents != null &&
    (!product.promo_starts_at || Date.parse(product.promo_starts_at) <= now) &&
    (!product.promo_ends_at || Date.parse(product.promo_ends_at) >= now);
  const cents = Number(promo ? product.promo_price_cents : product.price_cents);
  if (!Number.isSafeInteger(cents) || cents <= 0) throw new Error('This product has no valid price.');
  return cents;
}
