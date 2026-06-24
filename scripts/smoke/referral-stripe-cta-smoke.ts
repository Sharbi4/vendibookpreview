/**
 * Referral Dashboard — Connect Stripe CTA Smoke Test
 *
 * Verifies the Connect Stripe flow on /referral/dashboard end-to-end:
 *   1. Anonymous visitors are redirected to /auth (no render crash).
 *   2. Signed-in users see EITHER the "Connect Stripe" banner (unconnected)
 *      OR the connected state (banner absent).
 *   3. Clicking "Connect Stripe" invokes the create-stripe-connect edge
 *      function and opens a Stripe-hosted onboarding URL in a new tab.
 *   4. No React errors / ErrorBoundary fallbacks fire during the flow.
 *
 * Auth mode is identical to dashboard-routes-smoke.ts:
 *   SMOKE_SUPABASE_STORAGE_KEY=sb-xxx-auth-token \
 *   SMOKE_SUPABASE_SESSION_JSON='{"access_token":"..."}' \
 *   APP_BASE_URL=http://localhost:8080 \
 *   bun scripts/smoke/referral-stripe-cta-smoke.ts
 */
import { chromium, type ConsoleMessage, type Page, type BrowserContext } from "playwright";

const BASE = (process.env.APP_BASE_URL ?? "http://localhost:8080").replace(/\/$/, "");
const STORAGE_KEY = process.env.SMOKE_SUPABASE_STORAGE_KEY ?? "";
const SESSION_JSON = process.env.SMOKE_SUPABASE_SESSION_JSON ?? "";
const HAS_SESSION = STORAGE_KEY.length > 0 && SESSION_JSON.length > 0;

const ROUTE = "/referral/dashboard";

const IGNORED = [
  /embed\.tawk\.to/i,
  /vendibook-docs\.s3\./i,
  /provider's accounts list is empty/i,
  /not signed in with the identity provider/i,
  /failed to load resource:.*net::err_failed/i,
  /cookie .*has been rejected/i,
  /\[gsi_logger\]/i,
];
const FATAL = [
  /element type is invalid/i,
  /cannot read prop(erties)? of (undefined|null)/i,
  /maximum update depth/i,
  /rendered more hooks/i,
  /minified react error/i,
  /the above error occurred in/i,
];

type Failure = { step: string; detail: string };
const failures: Failure[] = [];
function fail(step: string, detail: string) {
  failures.push({ step, detail });
  console.error(`  [FAIL] ${step}: ${detail}`);
}

function wireErrorListeners(page: Page, step: () => string) {
  page.on("console", (msg: ConsoleMessage) => {
    if (msg.type() !== "error") return;
    const t = msg.text();
    if (IGNORED.some((p) => p.test(t))) return;
    if (FATAL.some((p) => p.test(t))) fail(step(), `console: ${t.slice(0, 300)}`);
  });
  page.on("pageerror", (err) => {
    const t = `${err.message}\n${err.stack ?? ""}`;
    if (IGNORED.some((p) => p.test(t))) return;
    fail(step(), `pageerror: ${t.slice(0, 300)}`);
  });
}

async function ensureNoBoundary(page: Page, step: string) {
  const hit = await page.getByRole("heading", { name: /something went wrong/i }).count();
  if (hit > 0) fail(step, "ErrorBoundary fallback rendered");
}

async function anonymous(ctx: BrowserContext) {
  console.log("\n[anonymous] visiting /referral/dashboard without a session…");
  const page = await ctx.newPage();
  let current = "anonymous-load";
  wireErrorListeners(page, () => current);

  await page.goto(BASE + ROUTE, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  await ensureNoBoundary(page, current);

  current = "anonymous-redirect";
  const url = page.url();
  if (!/\/auth(\?|$)/.test(url)) {
    fail(current, `expected redirect to /auth, got ${url}`);
  } else {
    console.log(`  [ok] redirected to ${url.replace(BASE, "")}`);
  }
  await page.close();
}

async function authenticated(ctx: BrowserContext) {
  console.log("\n[authenticated] restoring session and exercising CTA…");
  const page = await ctx.newPage();
  let current = "auth-bootstrap";
  wireErrorListeners(page, () => current);

  // Seed the Supabase session on the app origin before navigating to the route.
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.evaluate(
    ([k, v]) => window.localStorage.setItem(k, v),
    [STORAGE_KEY, SESSION_JSON],
  );

  current = "auth-load";
  await page.goto(BASE + ROUTE, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  await ensureNoBoundary(page, current);

  if (/\/auth(\?|$)/.test(page.url())) {
    fail(current, `session did not restore — landed on ${page.url()}`);
    await page.close();
    return;
  }

  // The page renders EITHER the Connect Stripe banner (unconnected) or
  // omits it entirely (connected). Both are valid; we just need to know which.
  current = "auth-state-detect";
  const connectBtn = page.getByRole("button", { name: /^connect stripe$/i });
  const hasButton = (await connectBtn.count()) > 0;
  console.log(`  [ok] dashboard rendered — state: ${hasButton ? "UNCONNECTED" : "CONNECTED"}`);

  if (!hasButton) {
    // Connected state: verify the banner copy is genuinely absent (sanity).
    const bannerCopy = await page.getByText(/connect your bank to receive payouts/i).count();
    if (bannerCopy > 0) fail("auth-state-detect", "connected state but banner copy still present");
    await page.close();
    return;
  }

  // Unconnected: click CTA and capture the popup that the hook opens via
  // window.open('about:blank', '_blank') → newWindow.location.href = stripeUrl.
  current = "auth-cta-click";
  const popupPromise = ctx.waitForEvent("page", { timeout: 15_000 });
  await connectBtn.click();

  let popup: Page | null = null;
  try {
    popup = await popupPromise;
  } catch {
    fail(current, "no popup opened within 15s after Connect Stripe click");
    await page.close();
    return;
  }

  // The popup starts at about:blank then gets navigated to the Stripe URL
  // returned by the create-stripe-connect edge function. Wait for that nav.
  current = "auth-cta-stripe-url";
  try {
    await popup.waitForURL(/stripe\.com|connect\.stripe\.com/i, { timeout: 20_000 });
    console.log(`  [ok] popup navigated to Stripe: ${popup.url().slice(0, 80)}…`);
  } catch {
    fail(current, `popup never reached stripe.com — last url: ${popup.url()}`);
  }

  await popup.close().catch(() => {});
  await ensureNoBoundary(page, "auth-post-click");
  await page.close();
}

async function main() {
  console.log(`[smoke] Referral Stripe CTA against ${BASE}`);
  console.log(`[smoke] Auth mode: ${HAS_SESSION ? "signed-in" : "anonymous-only"}`);

  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined,
  });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 1800 } });

  try {
    await anonymous(ctx);
    if (HAS_SESSION) await authenticated(ctx);
    else console.log("\n[skip] authenticated pass — no SMOKE_SUPABASE_* env vars set");
  } finally {
    await browser.close();
  }

  if (failures.length > 0) {
    console.error(`\n❌ REFERRAL STRIPE CTA SMOKE FAILED (${failures.length})\n`);
    for (const f of failures) console.error(`  [${f.step}] ${f.detail}`);
    process.exit(1);
  }
  console.log("\n✅ Referral Stripe CTA flow verified.\n");
}

main().catch((e) => {
  console.error("[smoke] uncaught:", e);
  process.exit(1);
});
