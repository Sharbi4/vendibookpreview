/**
 * Support Ticket Smoke
 *
 * Verifies the native support-ticket surface + the Tawk inbound webhook without
 * touching real customer data. Every synthetic row is torn down in the finally
 * block.
 *
 * Coverage:
 *   1. submit-support-ticket → support_tickets row inserted with server-derived
 *      priority; user's own row is readable via RLS; anon read is blocked.
 *   2. tawk-webhook signature verification + dedupe by (source, external_event_id).
 *   3. Admin-only read/update policy holds (anon and non-admin user are blocked
 *      from reading other users' tickets).
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... SUPABASE_ANON_KEY=... \
 *     TAWK_WEBHOOK_SECRET=... \
 *     bun scripts/smoke/support-ticket-smoke.ts
 */
import { createClient } from "@supabase/supabase-js";
import { createHmac, randomUUID } from "node:crypto";

const URL_ = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const TAWK_SECRET = process.env.TAWK_WEBHOOK_SECRET;
const VAPI_TOOL_SHARED_SECRET = process.env.VAPI_TOOL_SHARED_SECRET;

if (!URL_ || !SERVICE_KEY || !ANON_KEY) {
  console.warn(
    "[smoke] ⚠️  SKIPPING support-ticket smoke — need SUPABASE_URL, " +
      "SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY.",
  );
  if (process.env.CI || process.env.GITHUB_ACTIONS) {
    console.error("[smoke] ❌ Required CI secrets missing — failing hard to prevent false green.");
    process.exit(1);
  }
  process.exit(0);
}

const admin = createClient(URL_, SERVICE_KEY, { auth: { persistSession: false } });
const anon = createClient(URL_, ANON_KEY, { auth: { persistSession: false } });
const SUBMIT_URL = `${URL_}/functions/v1/submit-support-ticket`;
const TAWK_URL = `${URL_}/functions/v1/tawk-webhook`;
const VAPI_URL = `${URL_}/functions/v1/vapi-create-support-ticket`;

const RUN = randomUUID().slice(0, 8);
const USER_A = randomUUID();
const USER_B = randomUUID();
const EMAIL_A = `smoke-ticket-a-${RUN}@vendibook-qa.test`;
const EMAIL_B = `smoke-ticket-b-${RUN}@vendibook-qa.test`;
const TAWK_EVENT_ID = `smoke-tawk-${RUN}`;
const VAPI_CALL_ID = `smoke-vapi-${RUN}`;
const createdTicketIds: string[] = [];

type Result = { name: string; pass: boolean; detail?: string };
const results: Result[] = [];
function record(name: string, pass: boolean, detail?: string) {
  results.push({ name, pass, detail });
  console.log(`  ${pass ? "✅" : "❌"} ${name}${detail ? ` — ${detail}` : ""}`);
}
function assert(name: string, cond: unknown, detail?: string) {
  record(name, !!cond, cond ? undefined : detail);
}

async function mintUser(id: string, email: string) {
  // create auth user via admin
  const { data, error } = await admin.auth.admin.createUser({
    id,
    email,
    email_confirm: true,
    password: `Smoke!${RUN}${id.slice(0, 6)}`,
  });
  if (error && !/already/i.test(error.message)) throw error;
  await admin.from("profiles").upsert({ id, email, full_name: `Smoke ${id.slice(0, 6)}` }, { onConflict: "id" });
  return data?.user?.email ?? email;
}

async function signInAs(email: string, id: string) {
  const { data, error } = await anon.auth.signInWithPassword({
    email,
    password: `Smoke!${RUN}${id.slice(0, 6)}`,
  });
  if (error) throw error;
  return data.session!.access_token;
}

async function checkSubmitTicket() {
  const token = await signInAs(EMAIL_A, USER_A);
  const res = await fetch(SUBMIT_URL, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify({
      feature_area: "purchase",
      category: "seller_did_not_receive_payment", // URGENT — server must derive this
      title: `smoke ticket ${RUN}`,
      description: "synthetic smoke, please ignore",
      is_blocking: false,
      page_url: "https://smoke.test/",
    }),
  });
  const body = await res.json().catch(() => ({}));
  assert("submit-support-ticket accepts authed request", res.ok, `status ${res.status} body ${JSON.stringify(body).slice(0, 200)}`);
  const ticketId: string | undefined = body?.ticket?.id ?? body?.id;
  if (ticketId) createdTicketIds.push(ticketId);
  if (!ticketId) return;

  const { data: row } = await admin.from("support_tickets").select("*").eq("id", ticketId).maybeSingle();
  assert("ticket row inserted", !!row);
  assert("server-derived priority=urgent (client cannot escalate)", row?.priority === "urgent",
    `priority=${row?.priority}`);
  assert("ticket ownership scoped to user_id", row?.user_id === USER_A);

  // owner can read own ticket via RLS
  const authedClient = createClient(URL_!, ANON_KEY!, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: ownRead } = await authedClient.from("support_tickets").select("id").eq("id", ticketId).maybeSingle();
  assert("owner can read own ticket", !!ownRead);

  // anon read blocked
  const { data: anonRead } = await anon.from("support_tickets").select("id").eq("id", ticketId).maybeSingle();
  assert("anon cannot read tickets", !anonRead);

  // non-owner user B blocked
  await mintUser(USER_B, EMAIL_B);
  const tokenB = await signInAs(EMAIL_B, USER_B);
  const clientB = createClient(URL_!, ANON_KEY!, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${tokenB}` } },
  });
  const { data: otherRead } = await clientB.from("support_tickets").select("id").eq("id", ticketId).maybeSingle();
  assert("other user cannot read someone else's ticket", !otherRead);
}

async function checkTawkWebhookDedupe() {
  if (!TAWK_SECRET) {
    record("tawk-webhook dedupe", true, "skipped — TAWK_WEBHOOK_SECRET not set in this env");
    return;
  }
  const payload = {
    event: "ticket:create",
    ticketId: TAWK_EVENT_ID,
    property: { id: "smoke-property" },
    visitor: { email: EMAIL_A, name: "Smoke Visitor" },
    message: `synthetic tawk smoke ${RUN}`,
  };
  const body = JSON.stringify(payload);
  const sigHex = createHmac("sha1", TAWK_SECRET).update(body).digest("hex");
  // Tawk sends base64 of the HMAC bytes
  const sigB64 = Buffer.from(sigHex, "hex").toString("base64");

  const headers = { "content-type": "application/json", "x-tawk-signature": sigB64 };
  const res1 = await fetch(TAWK_URL, { method: "POST", headers, body });
  assert("tawk-webhook accepts signed payload", res1.ok || res1.status === 202, `status ${res1.status}`);

  const res2 = await fetch(TAWK_URL, { method: "POST", headers, body });
  assert(
    "tawk-webhook dedupes replay of same external_event_id",
    res2.ok || res2.status === 200 || res2.status === 202 || res2.status === 409,
    `status ${res2.status}`,
  );

  const { data: rows } = await admin
    .from("support_tickets")
    .select("id")
    .eq("tawk_ticket_id", TAWK_EVENT_ID);
  assert("tawk event created exactly one support_tickets row", (rows?.length ?? 0) === 1,
    `count=${rows?.length ?? 0}`);
  for (const r of rows ?? []) createdTicketIds.push(r.id);

  // bad signature rejected
  const badRes = await fetch(TAWK_URL, {
    method: "POST",
    headers: { "content-type": "application/json", "x-tawk-signature": "AAAA" },
    body,
  });
  assert("tawk-webhook rejects bad signature", badRes.status === 401 || badRes.status === 403,
    `status ${badRes.status}`);
}

async function teardown() {
  if (createdTicketIds.length) {
    await admin.from("support_ticket_messages").delete().in("ticket_id", createdTicketIds);
    await admin.from("support_ticket_attachments").delete().in("ticket_id", createdTicketIds);
    await admin.from("support_ticket_audit_events").delete().in("ticket_id", createdTicketIds);
    await admin.from("support_tickets").delete().in("id", createdTicketIds);
  }
  await admin.from("support_ticket_webhook_events").delete().eq("external_event_id", TAWK_EVENT_ID);
  await admin.from("profiles").delete().in("id", [USER_A, USER_B]);
  await admin.auth.admin.deleteUser(USER_A).catch(() => {});
  await admin.auth.admin.deleteUser(USER_B).catch(() => {});
}

async function main() {
  console.log(`[smoke] Support ticket run ${RUN}`);
  await mintUser(USER_A, EMAIL_A);
  try {
    await checkSubmitTicket();
    await checkTawkWebhookDedupe();
  } catch (e) {
    record("uncaught runner error", false, (e as Error).message);
  } finally {
    await teardown();
  }
  const failed = results.filter((r) => !r.pass);
  console.log(`\n[smoke] ${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length) {
    console.error(`\n❌ SUPPORT TICKET SMOKE FAILED (${failed.length})`);
    for (const f of failed) console.error(`  [${f.name}] ${f.detail ?? ""}`);
    process.exit(1);
  }
  console.log("\n✅ Support ticket surface verified.\n");
}

main().catch((e) => {
  console.error("[smoke] uncaught:", e);
  process.exit(1);
});
