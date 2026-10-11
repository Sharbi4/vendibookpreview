/**
 * HMAC verification for Daily webhook deliveries.
 *
 * Daily signs `<X-Webhook-Timestamp>.<raw body>` with the base64 HMAC secret it
 * returned when the webhook was created, and sends the base64 signature in
 * `X-Webhook-Signature`. Comparison is constant time.
 */
const decodeBase64 = (value: string) => Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
const encodeBase64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));

/**
 * Daily stores the HMAC secret as base64. Vendibook's stored secret may be a
 * plain random string, so it is canonicalised the same way in both the webhook
 * bootstrap (what we send to Daily) and verification (what we check against).
 */
export function toBase64Secret(secret: string) {
  const looksBase64 = /^[A-Za-z0-9+/]+={0,2}$/.test(secret) && secret.length % 4 === 0;
  return looksBase64 ? secret : btoa(secret);
}

export function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function signPayload(rawBody: string, timestamp: string, secret: string) {
  const key = await crypto.subtle.importKey('raw', decodeBase64(toBase64Secret(secret)), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${timestamp}.${rawBody}`));
  return encodeBase64(new Uint8Array(mac));
}

export async function verifyDailySignature(
  rawBody: string,
  timestamp: string,
  signature: string,
  secretBase64: string,
): Promise<boolean> {
  if (!rawBody || !timestamp || !signature || !secretBase64) return false;
  try {
    return timingSafeEqual(await signPayload(rawBody, timestamp, secretBase64), signature.trim());
  } catch {
    return false;
  }
}
