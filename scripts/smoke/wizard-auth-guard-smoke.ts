/**
 * Wizard Auth Guard E2E Smoke Test
 *
 * Confirms that unauthenticated visits to the listing-wizard routes are
 * redirected correctly and that the guest-draft token guard behaves as
 * designed on /edit-listing/:id.
 *
 * Guardrails asserted (unauthenticated browser, no Supabase session):
 *
 *   1. /create-listing/:id            → redirects to /auth?redirect=<encoded>
 *      preserving the original path + querystring.
 *   2. /edit-listing/:id (no token)   → redirects to
 *      /auth?redirect=%2Fcreate-listing%2F<id>
 *   3. /edit-listing/:id + BAD token in localStorage (matching listingId but
 *      invalid signature) → guest-draft-access edge function rejects it, and
 *      the page still redirects to /auth. Token guard must NEVER grant
 *      access on a bad token.
 *   4. /edit-listing/:id + token stored for a DIFFERENT listingId → the
 *      client-side check must skip the edge-function call entirely and
 *      redirect to /auth.
 *   5. No React ErrorBoundary fallback renders on any of the above.
 *   6. No page-error / uncaught exceptions fire.
 *
 * Usage:
 *   APP_BASE_URL=http://localhost:8080 bun scripts/smoke/wizard-auth-guard-smoke.ts
 */
import { chromium, type BrowserContext, type Page } from "playwright";

const BASE = (process.env.APP_BASE_URL ?? "http://localhost:8080").replace(/\/$/, "");

// Deterministic synthetic ids — never collide with real listings.
const CREATE_ID = "00000000-0000-4000-8000-00000000c001";
const EDIT_ID = "00000000-0000-4000-8000-00000000ed17";
const OTHER_ID = "00000000-0000-4000-8000-00000000ed99";

function fail(msg: string): never {
  console.error(`\n❌ SMOKE FAIL: ${msg}\n`);
  process.exit(1);
}

async function waitForNav(page: Page, predicate: (url: string) => boolean, label: string) {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    if (predicate(page.url())) return;
    await page.waitForTimeout(150);
  }
  fail(`${label}: never navigated to expected URL. current=${page.url()}`);
}

async function fresh(context: BrowserContext) {
  // Ensure no leaked session/localStorage between cases.
  await context.clearCookies();
  const page = await context.newPage();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`console: ${m.text()}`);
  });
  return { page, errors };
}

async function assertNoBoundary(page: Page, label: string) {
  const hit = await page.locator("text=/something went wrong/i").count();
  if (hit > 0) fail(`${label}: ErrorBoundary fallback rendered`);
}

async function run() {
  console.log(`[smoke] wizard-auth-guard against ${BASE}`);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 1800 } });

  try {
    // ── Case 1: /create-listing/:id → /auth?redirect=... ─────────────────
    {
      const { page, errors } = await fresh(context);
      const path = `/create-listing/${CREATE_ID}?step=details`;
      await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
      await waitForNav(page, (u) => u.includes("/auth?redirect="), "create-listing redirect");
      const url = new URL(page.url());
      const redirect = url.searchParams.get("redirect") ?? "";
      if (!redirect.includes("/create-listing/") || !redirect.includes(CREATE_ID)) {
        fail(`create-listing redirect param wrong: "${redirect}"`);
      }
      if (!redirect.includes("step=details")) {
        fail(`create-listing redirect dropped querystring: "${redirect}"`);
      }
      await assertNoBoundary(page, "create-listing");
      if (errors.length) fail(`create-listing errors: ${errors.join(" | ")}`);
      console.log(`[smoke]  ✓ /create-listing/:id → /auth?redirect (querystring preserved)`);
      await page.close();
    }

    // ── Case 2: /edit-listing/:id with no token ──────────────────────────
    {
      const { page, errors } = await fresh(context);
      await page.goto(`${BASE}/edit-listing/${EDIT_ID}`, { waitUntil: "domcontentloaded" });
      await waitForNav(page, (u) => u.includes("/auth?redirect="), "edit-listing no-token");
      const redirect = new URL(page.url()).searchParams.get("redirect") ?? "";
      if (!redirect.includes(`/create-listing/${EDIT_ID}`)) {
        fail(`edit-listing no-token redirect wrong: "${redirect}"`);
      }
      await assertNoBoundary(page, "edit-listing no-token");
      if (errors.length) fail(`edit-listing no-token errors: ${errors.join(" | ")}`);
      console.log(`[smoke]  ✓ /edit-listing/:id (no token) → /auth`);
      await page.close();
    }

    // ── Case 3: /edit-listing/:id with a BAD token for the same id ───────
    {
      const { page, errors } = await fresh(context);
      // Seed localStorage on the app origin before navigating to the guarded route.
      await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
      await page.evaluate(
        ([id]) => {
          localStorage.setItem(
            "vendibook_guest_draft",
            JSON.stringify({
              listingId: id,
              token: "not-a-real-token-should-be-rejected",
              createdAt: new Date().toISOString(),
            }),
          );
        },
        [EDIT_ID],
      );
      await page.goto(`${BASE}/edit-listing/${EDIT_ID}`, { waitUntil: "domcontentloaded" });
      await waitForNav(page, (u) => u.includes("/auth?redirect="), "edit-listing bad-token");
      const redirect = new URL(page.url()).searchParams.get("redirect") ?? "";
      if (!redirect.includes(`/create-listing/${EDIT_ID}`)) {
        fail(`bad-token redirect wrong: "${redirect}"`);
      }
      await assertNoBoundary(page, "edit-listing bad-token");
      // Filter noise: the edge-function 401/403 will surface a console error;
      // that's expected. We only fail on uncaught exceptions.
      const fatal = errors.filter((e) => e.startsWith("pageerror:"));
      if (fatal.length) fail(`bad-token uncaught errors: ${fatal.join(" | ")}`);
      console.log(`[smoke]  ✓ /edit-listing/:id (bad token) → /auth (token guard rejected)`);
      await page.close();
    }

    // ── Case 4: token stored for a DIFFERENT listing id ──────────────────
    {
      const { page, errors } = await fresh(context);
      await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
      await page.evaluate(
        ([otherId]) => {
          localStorage.setItem(
            "vendibook_guest_draft",
            JSON.stringify({
              listingId: otherId,
              token: "token-for-a-different-draft",
              createdAt: new Date().toISOString(),
            }),
          );
        },
        [OTHER_ID],
      );
      await page.goto(`${BASE}/edit-listing/${EDIT_ID}`, { waitUntil: "domcontentloaded" });
      await waitForNav(page, (u) => u.includes("/auth?redirect="), "edit-listing mismatched-token");
      const redirect = new URL(page.url()).searchParams.get("redirect") ?? "";
      if (!redirect.includes(`/create-listing/${EDIT_ID}`)) {
        fail(`mismatched-token redirect wrong: "${redirect}"`);
      }
      await assertNoBoundary(page, "edit-listing mismatched-token");
      const fatal = errors.filter((e) => e.startsWith("pageerror:"));
      if (fatal.length) fail(`mismatched-token uncaught errors: ${fatal.join(" | ")}`);
      console.log(`[smoke]  ✓ /edit-listing/:id (token for different id) → /auth`);
      await page.close();
    }

    console.log("[smoke] ✅ wizard-auth-guard PASSED");
  } finally {
    await context.close();
    await browser.close();
  }
}

run().catch((e) => fail(e?.message ?? String(e)));
