// E2E tests for tawk-webhook signature validation and dedup.
//
// These tests hit the *deployed* edge function over HTTPS. To avoid sending
// real customer acknowledgment emails or creating support tickets, every
// signed payload uses event = "chat:start", for which `shouldCreateTicket`
// is false. Only rows in support_ticket_webhook_events (idempotency ledger)
// are written, tagged with an "e2e-test-" chat id + unique timestamps so
// they are trivially identifiable.
//
// Run with: supabase--test_edge_functions { functions: ["tawk-webhook"] }

import "https://deno.land/std@0.224.0/dotenv/load.ts";
import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;
const TAWK_WEBHOOK_SECRET = Deno.env.get("TAWK_WEBHOOK_SECRET") || "";

const ENDPOINT = `${SUPABASE_URL}/functions/v1/tawk-webhook`;

// ---- helpers -----------------------------------------------------------

async function hmacSha1Hex(secret: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(body),
  );
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function hexToBase64(hex: string): string {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function safeChatEvent(chatId: string, timeIso: string) {
  // event=chat:start ⇒ shouldCreateTicket=false ⇒ no ticket row, no ack email.
  return {
    event: "chat:start",
    chatId,
    time: timeIso,
    property: { id: "e2e-test-property" },
    visitor: { name: "E2E Test", email: null },
  };
}

async function post(body: string, headers: Record<string, string>) {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: ANON_KEY,
      Authorization: `Bearer ${ANON_KEY}`,
      ...headers,
    },
    body,
  });
  const text = await res.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch { /* keep null */ }
  return { status: res.status, text, json };
}

// ---- tests -------------------------------------------------------------

Deno.test("tawk-webhook rejects missing signature with 401", async () => {
  const body = JSON.stringify(
    safeChatEvent("e2e-test-missing-sig", new Date().toISOString()),
  );
  const r = await post(body, {}); // no X-Tawk-Signature
  assertEquals(r.status, 401, `expected 401, got ${r.status} ${r.text}`);
  assertEquals(r.json?.error, "invalid signature");
});

Deno.test("tawk-webhook rejects wrong signature with 401", async () => {
  const body = JSON.stringify(
    safeChatEvent("e2e-test-wrong-sig", new Date().toISOString()),
  );
  const r = await post(body, {
    "X-Tawk-Signature": "deadbeef".repeat(5), // not a valid HMAC of body
  });
  assertEquals(r.status, 401, `expected 401, got ${r.status} ${r.text}`);
  assertEquals(r.json?.error, "invalid signature");
});

Deno.test("tawk-webhook rejects tampered body with 401", async () => {
  if (!TAWK_WEBHOOK_SECRET) {
    console.warn("skip: TAWK_WEBHOOK_SECRET not set in local env");
    return;
  }
  const original = JSON.stringify(
    safeChatEvent("e2e-test-tamper", new Date().toISOString()),
  );
  const sigForOriginal = await hmacSha1Hex(TAWK_WEBHOOK_SECRET, original);

  // Send different body under signature computed for the original body.
  const tampered = JSON.stringify(
    safeChatEvent("e2e-test-tamper-DIFFERENT", new Date().toISOString()),
  );
  const r = await post(tampered, { "X-Tawk-Signature": sigForOriginal });
  assertEquals(r.status, 401, `expected 401, got ${r.status} ${r.text}`);
});

Deno.test("tawk-webhook accepts valid hex signature (200)", async () => {
  if (!TAWK_WEBHOOK_SECRET) {
    console.warn("skip: TAWK_WEBHOOK_SECRET not set in local env");
    return;
  }
  const body = JSON.stringify(
    safeChatEvent(`e2e-test-hex-${crypto.randomUUID()}`, new Date().toISOString()),
  );
  const hex = await hmacSha1Hex(TAWK_WEBHOOK_SECRET, body);
  const r = await post(body, { "X-Tawk-Signature": hex });
  assertEquals(r.status, 200, `expected 200, got ${r.status} ${r.text}`);
  assertEquals(r.json?.ok, true);
  // chat:start does not create a ticket
  assertEquals(r.json?.ticket_id ?? null, null);
});

Deno.test("tawk-webhook accepts valid base64 signature (200)", async () => {
  if (!TAWK_WEBHOOK_SECRET) {
    console.warn("skip: TAWK_WEBHOOK_SECRET not set in local env");
    return;
  }
  const body = JSON.stringify(
    safeChatEvent(`e2e-test-b64-${crypto.randomUUID()}`, new Date().toISOString()),
  );
  const b64 = hexToBase64(await hmacSha1Hex(TAWK_WEBHOOK_SECRET, body));
  const r = await post(body, { "X-Tawk-Signature": b64 });
  assertEquals(r.status, 200, `expected 200, got ${r.status} ${r.text}`);
  assertEquals(r.json?.ok, true);
});

Deno.test("tawk-webhook deduplicates identical delivery", async () => {
  if (!TAWK_WEBHOOK_SECRET) {
    console.warn("skip: TAWK_WEBHOOK_SECRET not set in local env");
    return;
  }
  // Same body twice ⇒ same externalEventId ⇒ ledger unique-violation ⇒
  // second delivery returns { ok: true, deduplicated: true } and creates
  // no additional rows.
  const body = JSON.stringify(
    safeChatEvent(`e2e-test-dedup-${crypto.randomUUID()}`, new Date().toISOString()),
  );
  const sig = await hmacSha1Hex(TAWK_WEBHOOK_SECRET, body);

  const first = await post(body, { "X-Tawk-Signature": sig });
  assertEquals(first.status, 200, `first: ${first.status} ${first.text}`);
  assertEquals(first.json?.ok, true);
  assert(
    !first.json?.deduplicated,
    `first delivery must not be flagged deduplicated: ${first.text}`,
  );

  const second = await post(body, { "X-Tawk-Signature": sig });
  assertEquals(second.status, 200, `second: ${second.status} ${second.text}`);
  assertEquals(second.json?.ok, true);
  assertEquals(
    second.json?.deduplicated,
    true,
    `second delivery must be deduplicated: ${second.text}`,
  );
});

Deno.test("tawk-webhook treats distinct events as non-duplicates", async () => {
  if (!TAWK_WEBHOOK_SECRET) {
    console.warn("skip: TAWK_WEBHOOK_SECRET not set in local env");
    return;
  }
  // Different `time` ⇒ different externalEventId ⇒ both accepted, neither
  // flagged deduplicated.
  const chatId = `e2e-test-distinct-${crypto.randomUUID()}`;
  const b1 = JSON.stringify(safeChatEvent(chatId, new Date().toISOString()));
  await new Promise((r) => setTimeout(r, 10));
  const b2 = JSON.stringify(safeChatEvent(chatId, new Date().toISOString()));

  const s1 = await hmacSha1Hex(TAWK_WEBHOOK_SECRET, b1);
  const s2 = await hmacSha1Hex(TAWK_WEBHOOK_SECRET, b2);

  const r1 = await post(b1, { "X-Tawk-Signature": s1 });
  const r2 = await post(b2, { "X-Tawk-Signature": s2 });

  assertEquals(r1.status, 200);
  assertEquals(r2.status, 200);
  assert(!r1.json?.deduplicated);
  assert(!r2.json?.deduplicated);
});

Deno.test("tawk-webhook rejects non-POST with 405", async () => {
  const res = await fetch(ENDPOINT, {
    method: "GET",
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
  });
  await res.text();
  assertEquals(res.status, 405);
});
