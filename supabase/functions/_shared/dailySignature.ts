/**
 * HMAC verification for Daily webhook deliveries.
 *
 * Daily signs `<X-Webhook-Timestamp>.<raw body>` with the base64 HMAC secret it
 * returned when the webhook was created, and sends the base64 signature in
 * `X-Webhook-Signature`. Comparison is constant time.
 */
const decodeBase64 = (value: string) => Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
const encodeBase64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));

export function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function signPayload(rawBody: string, timestamp: string, secretBase64: string) {
  const key = await crypto.subtle.importKey('raw', decodeBase64(secretBase64), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
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
