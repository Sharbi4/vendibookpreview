// Pure, testable rules for the admin-only human browser callback dialer.
// Web Crypto only, so it runs in Deno (edge) and Node (vitest).

export const BUSINESS_CALLER_ID = "+18666906227";
export const BUSINESS_CALLER_LABEL = "Vendibook (866) 690-6227";
export const INTENT_TTL_SECONDS = 120;
export const ACCESS_TOKEN_TTL_SECONDS = 600;
export const MAX_INTENTS_PER_HOUR = 10;
export const MAX_CALL_SECONDS = 3600;
export const IDENTITY_PREFIX = "vb_admin_";

const enc = new TextEncoder();

/** US/Canada E.164 only; blocks premium, toll-free-to-self, N11/emergency and our own line. */
export function validateDestination(raw: unknown): { ok: true; number: string } | { ok: false; reason: string } {
  if (typeof raw !== "string") return { ok: false, reason: "Enter a phone number." };
  const n = raw.trim();
  if (!/^\+1[2-9]\d{2}[2-9]\d{6}$/.test(n)) {
    return { ok: false, reason: "Use a US or Canada number in +1XXXXXXXXXX format." };
  }
  const area = n.slice(2, 5), exch = n.slice(5, 8);
  if (["900", "976"].includes(area) || exch === "976") return { ok: false, reason: "Premium-rate numbers are not allowed." };
  if (/^[2-9]11$/.test(area) || /^[2-9]11$/.test(exch)) return { ok: false, reason: "Service and emergency codes are not allowed." };
  if (area === "555" || (exch === "555" && n.slice(8, 10) === "01")) return { ok: false, reason: "That number is not dialable." };
  if (n === BUSINESS_CALLER_ID) return { ok: false, reason: "You can't call the Vendibook line itself." };
  return { ok: true, number: n };
}

export function identityForUser(userId: string): string {
  return IDENTITY_PREFIX + userId.replace(/-/g, "").toLowerCase();
}
export function userIdFromClient(from: string | null | undefined): string | null {
  const m = /^client:vb_admin_([0-9a-f]{32})$/.exec(from ?? "");
  if (!m) return null;
  const h = m[1];
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

function b64url(bytes: Uint8Array | string): string {
  const b = typeof bytes === "string" ? enc.encode(bytes) : bytes;
  let s = ""; for (const x of b) s += String.fromCharCode(x);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64urlDecode(s: string): string {
  const p = s.replace(/-/g, "+").replace(/_/g, "/");
  return atob(p + "===".slice((p.length + 3) % 4));
}
async function hmac(alg: "SHA-1" | "SHA-256", key: string, data: string): Promise<Uint8Array> {
  const k = await crypto.subtle.importKey("raw", enc.encode(key), { name: "HMAC", hash: alg }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", k, enc.encode(data)));
}
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export type CallIntent = { id: string; uid: string; to: string; exp: number };

export async function signIntent(intent: CallIntent, secret: string): Promise<string> {
  if (!secret || secret.length < 16) throw new Error("Intent signing secret unavailable");
  const body = b64url(JSON.stringify(intent));
  return `${body}.${b64url(await hmac("SHA-256", secret, "callback-dialer:" + body))}`;
}

export async function verifyIntent(token: unknown, secret: string, nowSec = Math.floor(Date.now() / 1000)):
  Promise<{ ok: true; intent: CallIntent } | { ok: false; reason: string }> {
  if (typeof token !== "string" || !secret || token.length > 1000) return { ok: false, reason: "missing" };
  const [body, sig, extra] = token.split(".");
  if (!body || !sig || extra !== undefined) return { ok: false, reason: "malformed" };
  const expected = b64url(await hmac("SHA-256", secret, "callback-dialer:" + body));
  if (!safeEqual(sig, expected)) return { ok: false, reason: "bad_signature" };
  let i: CallIntent;
  try { i = JSON.parse(b64urlDecode(body)); } catch { return { ok: false, reason: "malformed" }; }
  if (typeof i?.id !== "string" || typeof i.uid !== "string" || typeof i.exp !== "number") return { ok: false, reason: "malformed" };
  if (!validateDestination(i.to).ok) return { ok: false, reason: "bad_destination" };
  if (i.exp < nowSec) return { ok: false, reason: "expired" };
  return { ok: true, intent: i };
}

/** Twilio request signature: base64(HMAC-SHA1(authToken, url + sorted key/value pairs)). */
export async function twilioSignature(authToken: string, url: string, params: Record<string, string>): Promise<string> {
  const data = url + Object.keys(params).sort().map((k) => k + params[k]).join("");
  let s = ""; for (const x of await hmac("SHA-1", authToken, data)) s += String.fromCharCode(x);
  return btoa(s);
}
export async function verifyTwilioSignature(authToken: string, url: string, params: Record<string, string>, header: string | null): Promise<boolean> {
  if (!authToken || !header) return false;
  return safeEqual(await twilioSignature(authToken, url, params), header);
}

const xml = (s: string) => s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c]!));

/** The only dial instruction this feature emits: one number, fixed caller ID, recording off. */
export function dialTwiml(to: string, statusUrl?: string): string {
  const v = validateDestination(to);
  if (!v.ok) return rejectTwiml();
  const cb = statusUrl ? ` statusCallback="${xml(statusUrl)}" statusCallbackEvent="initiated ringing answered completed"` : "";
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Dial callerId="${BUSINESS_CALLER_ID}" record="do-not-record" answerOnBridge="true" timeLimit="${MAX_CALL_SECONDS}" timeout="30"><Number${cb}>${xml(v.number)}</Number></Dial></Response>`;
}
export function rejectTwiml(): string {
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Say>This call could not be authorized.</Say><Hangup/></Response>`;
}

/** Twilio Access Token (HS256 JWT) with an outgoing-only Voice grant. */
export async function voiceAccessToken(o: { accountSid: string; apiKeySid: string; apiKeySecret: string; appSid: string; identity: string; nowSec?: number; ttl?: number }): Promise<string> {
  const now = o.nowSec ?? Math.floor(Date.now() / 1000);
  const header = { typ: "JWT", alg: "HS256", cty: "twilio-fpa;v=1" };
  const payload = {
    jti: `${o.apiKeySid}-${now}`, iss: o.apiKeySid, sub: o.accountSid, iat: now, nbf: now,
    exp: now + Math.min(o.ttl ?? ACCESS_TOKEN_TTL_SECONDS, ACCESS_TOKEN_TTL_SECONDS),
    grants: { identity: o.identity, voice: { incoming: { allow: false }, outgoing: { application_sid: o.appSid } } },
  };
  const unsigned = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
  return `${unsigned}.${b64url(await hmac("SHA-256", o.apiKeySecret, unsigned))}`;
}

export type VoiceConfig = { accountSid: string; apiKeySid: string; apiKeySecret: string; authToken: string; appSid: string };

/** Parses the single TWILIO_VOICE_CONFIG secret (JSON). Returns which pieces are missing, never values. */
export function parseVoiceConfig(raw: string | undefined | null): { config: VoiceConfig | null; missing: string[] } {
  let j: Record<string, unknown> = {};
  try { j = raw ? JSON.parse(raw) : {}; } catch { j = {}; }
  const pick = (k: string, re: RegExp) => (typeof j[k] === "string" && re.test(j[k] as string) ? (j[k] as string) : "");
  const c = {
    accountSid: pick("account_sid", /^AC[0-9a-f]{32}$/),
    apiKeySid: pick("api_key_sid", /^SK[0-9a-f]{32}$/),
    apiKeySecret: pick("api_key_secret", /^.{16,}$/),
    authToken: pick("auth_token", /^[0-9a-f]{32}$/),
    appSid: pick("twiml_app_sid", /^AP[0-9a-f]{32}$/),
  };
  const missing = Object.entries({ account_sid: c.accountSid, api_key_sid: c.apiKeySid, api_key_secret: c.apiKeySecret, auth_token: c.authToken, twiml_app_sid: c.appSid })
    .filter(([, v]) => !v).map(([k]) => k);
  return { config: missing.length ? null : c, missing };
}
