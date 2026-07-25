/**
 * Entitlement Gate E2E Smoke
 *
 * For every monetize-gated server action, prove that a signed-in FREE user
 * (no host_subscriptions, no active pass) is denied with the unified
 * 403 `entitlement_required` contract before any paid work runs.
 *
 * Covered edge functions:
 *   Tool-gated (gateToolAccess → resolveToolAccess):
 *     - ai-tools           tool=pricing        → pricepilot
 *     - ai-tools           tool=description    → listing-studio
 *     - ai-tools           tool=business-idea  → concept-lab
 *     - ai-web-research                        → market-radar
 *     - ai-equipment-guide                     → buildkit
 *     - ai-marketing-creator                   → marketing-studio
 *   Tier-gated (resolveHostTier + tierRequiredBody):
 *     - ai-listing-creator      requires starter
 *     - ai-negotiation-coach    requires pro
 *     - suggest-pricing         requires pro
 *     - generate-ad-copy        requires pro
 *     - generate-listing-insights requires pro
 *     - generate-ai-insights    requires pro
 *
 * Contract asserted for every call:
 *   status === 403
 *   body.code === 'entitlement_required'
 *   body.upgrade_url === '/pricing'
 *
 * The auth user is cleaned up in a finally block.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... SUPABASE_ANON_KEY=... \
 *     bun scripts/smoke/entitlement-gate-smoke.ts
 */
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

const URL_ = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!URL_ || !SERVICE_KEY || !ANON_KEY) {
  console.warn(
    "[smoke] ⚠️  SKIPPING entitlement-gate smoke — need SUPABASE_URL, " +
      "SUPABASE_SERVICE_ROLE_KEY, and SUPABASE_ANON_KEY.",
  );
  if (process.env.CI || process.env.GITHUB_ACTIONS) { console.error("[smoke] ❌ Required CI secrets missing — failing hard to prevent false green."); process.exit(1); }
  process.exit(0);
}

const admin = createClient(URL_, SERVICE_KEY, { auth: { persistSession: false } });

// ---------- result plumbing --------------------------------------------------

const results: Array<{ name: string; pass: boolean; detail?: string }> = [];
function record(name: string, pass: boolean, detail?: string) {
  results.push({ name, pass, detail });
  console.log(`  ${pass ? "✅" : "❌"} ${name}${detail && !pass ? ` — ${detail}` : ""}`);
}

// ---------- helpers ----------------------------------------------------------

const RUN = randomUUID().slice(0, 8);
const EMAIL = `smoke+gate-${RUN}@vendibook.com`;
const PASSWORD = `Vendi-Smoke-${RUN}!AA1`;
const FAKE_UUID = "00000000-0000-0000-0000-000000000000";

async function callFn(
  slug: string,
  token: string,
  body: Record<string, unknown>,
): Promise<{ status: number; body: any }> {
  const res = await fetch(`${URL_}/functions/v1/${slug}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      apikey: ANON_KEY!,
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  let json: any = null;
  try {
    json = await res.json();
  } catch {
    /* ignore */
  }
  return { status: res.status, body: json };
}

interface GateCase {
  label: string;
  fn: string;
  body: Record<string, unknown>;
}

const CASES: GateCase[] = [
  // Tool-gated (gateToolAccess)
  { label: "ai-tools · pricing (pricepilot)", fn: "ai-tools", body: { tool: "pricing", data: {} } },
  { label: "ai-tools · description (listing-studio)", fn: "ai-tools", body: { tool: "description", data: {} } },
  { label: "ai-tools · business-idea (concept-lab)", fn: "ai-tools", body: { tool: "business-idea", data: {} } },
  { label: "ai-web-research (market-radar)", fn: "ai-web-research", body: { query: "smoke", category: "test" } },
  { label: "ai-equipment-guide (buildkit)", fn: "ai-equipment-guide", body: { equipment: "x", issue: "y", maintenanceType: "z" } },
  { label: "ai-marketing-creator (marketing-studio)", fn: "ai-marketing-creator", body: { type: "tagline", data: {} } },
  // Tier-gated (resolveHostTier)
  { label: "ai-listing-creator (requires starter)", fn: "ai-listing-creator", body: { messages: [], imageUrls: [] } },
  { label: "ai-negotiation-coach (requires pro)", fn: "ai-negotiation-coach", body: { offerId: FAKE_UUID } },
  { label: "suggest-pricing (requires pro)", fn: "suggest-pricing", body: { category: "test" } },
  { label: "generate-ad-copy (requires pro)", fn: "generate-ad-copy", body: { listing_id: FAKE_UUID } },
  { label: "generate-listing-insights (requires pro)", fn: "generate-listing-insights", body: { listing_id: FAKE_UUID } },
  { label: "generate-ai-insights (requires pro)", fn: "generate-ai-insights", body: {} },
];

async function assertEntitlementDenied(label: string, res: { status: number; body: any }) {
  const ok403 = res.status === 403;
  const okCode = res.body?.code === "entitlement_required";
  const okUpgrade = res.body?.upgrade_url === "/pricing";
  const detail = `status=${res.status} code=${res.body?.code ?? "null"} upgrade_url=${res.body?.upgrade_url ?? "null"}`;
  record(`${label} → 403`, ok403, detail);
  record(`${label} → code=entitlement_required`, okCode, detail);
  record(`${label} → upgrade_url=/pricing`, okUpgrade, detail);
}

async function teardown(userId: string | null) {
  if (!userId) return;
  await admin.from("host_subscriptions").delete().eq("user_id", userId);
  await admin.from("monetization_purchases").delete().eq("user_id", userId);
  await admin.from("profiles").delete().eq("id", userId);
  await admin.auth.admin.deleteUser(userId).catch(() => undefined);
}

async function run() {
  console.log(`[smoke] entitlement-gate against ${URL_}`);
  console.log(`[smoke] run=${RUN} user=${EMAIL}`);

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
  });
  if (createErr || !created.user) {
    console.error(`❌ could not create smoke user: ${createErr?.message}`);
    process.exit(1);
  }
  const userId = created.user.id;

  const anonClient = createClient(URL_!, ANON_KEY!, { auth: { persistSession: false } });
  const { data: signed, error: signErr } = await anonClient.auth.signInWithPassword({
    email: EMAIL,
    password: PASSWORD,
  });
  if (signErr || !signed.session) {
    await teardown(userId);
    console.error(`❌ sign-in failed: ${signErr?.message}`);
    process.exit(1);
  }
  const token = signed.session.access_token;

  try {
    // Sanity: confirm the user really has no entitlements before the sweep.
    const { count: subCount } = await admin
      .from("host_subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);
    record("baseline: user has 0 host_subscriptions", (subCount ?? 0) === 0, `count=${subCount}`);

    for (const c of CASES) {
      console.log(`\n[gate] ${c.label}`);
      const res = await callFn(c.fn, token, c.body);
      await assertEntitlementDenied(c.label, res);
    }
  } finally {
    await teardown(userId);
  }

  const failed = results.filter((r) => !r.pass);
  console.log(`\n[smoke] ${results.length - failed.length}/${results.length} passed`);
  if (failed.length > 0) {
    console.error(`\n❌ entitlement-gate smoke FAIL (${failed.length} check${failed.length === 1 ? "" : "s"})`);
    for (const f of failed) console.error(`  - ${f.name}${f.detail ? ` — ${f.detail}` : ""}`);
    process.exit(1);
  }
  console.log("\n✅ entitlement-gate smoke PASSED");
}

run().catch((e) => {
  console.error(`\n❌ SMOKE FAIL: ${e?.message ?? e}`);
  process.exit(1);
});
