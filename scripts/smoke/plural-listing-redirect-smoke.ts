/**
 * Plural Listing Alias Redirect Smoke Test
 *
 * Regression guard for the `ListingPluralRedirect` fix. Confirms that the
 * mistyped/shared plural URL `/listings/:id` correctly forwards to the
 * canonical `/listing/:id` detail page — instead of silently falling through
 * to the catch-all and landing on home ("/") or a 404.
 *
 * Guardrails asserted (unauthenticated browser, no session needed):
 *
 *   1. GET /listings/<real-id>?utm=x
 *        → final URL path is /listing/<real-id>
 *        → querystring is preserved end-to-end
 *        → an <h1> renders (i.e. the detail page actually mounted)
 *        → NOT sitting on "/" (home) and NOT on a "not found" state
 *   2. GET /listings/<bogus-id>
 *        → still redirects to /listing/<bogus-id> (route handles the alias
 *          regardless of DB match) and the detail page renders its
 *          "Listing not found" state gracefully — not the home page.
 *   3. No ErrorBoundary fallback, no uncaught page errors on either case.
 *
 * Real listing IDs are pulled live from the public REST endpoint so the
 * test always exercises current production data.
 *
 * Usage:
 *   APP_BASE_URL=http://localhost:8080 bun scripts/smoke/plural-listing-redirect-smoke.ts
 */
import { chromium, type Page } from "playwright";

const BASE = (process.env.APP_BASE_URL ?? "http://localhost:8080").replace(/\/$/, "");
const SUPABASE_URL =
  process.env.SUPABASE_URL ??
  process.env.VITE_SUPABASE_URL ??
  "https://nbrehbwfsmedbelzntqs.supabase.co";
const ANON_KEY =
  process.env.SUPABASE_ANON_KEY ??
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5icmVoYndmc21lZGJlbHpudHFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxMDgzMTMsImV4cCI6MjA4MzY4NDMxM30.EkA-lGUmkLQ9rPAO-unLxGGGHVmPDdVR8awlA2ShVpU";

const BOGUS_ID = "00000000-0000-4000-8000-0000000dead1";

function fail(msg: string): never {
  console.error(`\n❌ SMOKE FAIL: ${msg}\n`);
  process.exit(1);
}

async function fetchRealId(): Promise<string> {
  const url = `${SUPABASE_URL}/rest/v1/listings?select=id&status=eq.published&limit=1`;
  const res = await fetch(url, {
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
  });
  if (!res.ok) fail(`could not fetch a real listing id: ${res.status}`);
  const rows = (await res.json()) as Array<{ id: string }>;
  if (!rows?.length) fail("no published listings available");
  return rows[0].id;
}

async function waitForPath(page: Page, expected: string, label: string) {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    if (new URL(page.url()).pathname === expected) return;
    await page.waitForTimeout(150);
  }
  fail(`${label}: expected pathname "${expected}", got "${new URL(page.url()).pathname}"`);
}

async function run() {
  console.log(`[smoke] plural-listing-redirect against ${BASE}`);
  const realId = await fetchRealId();
  console.log(`[smoke] using real id ${realId}`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 1800 } });

  try {
    // ── Case 1: /listings/<real-id>?utm=x → /listing/<real-id>?utm=x ─────
    {
      const page = await context.newPage();
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));

      const from = `/listings/${realId}?utm=alias-smoke`;
      await page.goto(`${BASE}${from}`, { waitUntil: "domcontentloaded" });
      await waitForPath(page, `/listing/${realId}`, "real-id plural alias");

      const finalUrl = new URL(page.url());
      if (finalUrl.pathname === "/") fail(`plural alias fell back to home: ${page.url()}`);
      if (finalUrl.searchParams.get("utm") !== "alias-smoke") {
        fail(`querystring dropped through redirect: ${page.url()}`);
      }

      // Detail page must actually mount and NOT show "not found" for a real id.
      // Detail page must actually mount and NOT show "not found" for a real id.
      // Use :visible — the sale detail renders duplicate mobile/desktop h1s,
      // one hidden via responsive utility classes.
      await page.waitForSelector("h1:visible", { timeout: 15_000 });
      const h1 = (await page.locator("h1:visible").first().innerText()).trim();
      if (/not found/i.test(h1)) fail(`real id showed "not found" state: "${h1}"`);

      const boundary = await page.locator("text=/something went wrong/i").count();
      if (boundary > 0) fail("ErrorBoundary fallback rendered on real-id alias");
      if (errors.length) fail(`real-id alias uncaught errors: ${errors.join(" | ")}`);

      console.log(`[smoke]  ✓ /listings/${realId}?utm=… → /listing/${realId}?utm=… (h1="${h1.slice(0, 40)}")`);
      await page.close();
    }

    // ── Case 2: /listings/<bogus-id> → /listing/<bogus-id> (graceful) ────
    {
      const page = await context.newPage();
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));

      await page.goto(`${BASE}/listings/${BOGUS_ID}`, { waitUntil: "domcontentloaded" });
      await waitForPath(page, `/listing/${BOGUS_ID}`, "bogus-id plural alias");

      // Must not have fallen back to home
      if (new URL(page.url()).pathname === "/") fail("bogus alias fell back to home");

      await page.waitForSelector("h1:visible", { timeout: 15_000 });
      const h1 = (await page.locator("h1:visible").first().innerText()).trim();
      if (!/not found/i.test(h1)) fail(`bogus id did not render "not found" — got "${h1}"`);

      const boundary = await page.locator("text=/something went wrong/i").count();
      if (boundary > 0) fail("ErrorBoundary fallback rendered on bogus-id alias");
      if (errors.length) fail(`bogus-id alias uncaught errors: ${errors.join(" | ")}`);

      console.log(`[smoke]  ✓ /listings/<bogus> → /listing/<bogus> (graceful not-found)`);
      await page.close();
    }

    console.log("[smoke] ✅ plural-listing-redirect PASSED");
  } finally {
    await context.close();
    await browser.close();
  }
}

run().catch((e) => fail(e?.message ?? String(e)));
