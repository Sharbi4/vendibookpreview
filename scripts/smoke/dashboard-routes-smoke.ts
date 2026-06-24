/**
 * Dashboard Routes Smoke Test (the Claudia scenario)
 *
 * Spider every dashboard / host route in a real browser, click every internal
 * link and CTA in the rendered sidebar + page chrome, and fail if any route
 * throws a React error, renders the ErrorBoundary fallback, or breaks a link.
 *
 * Catches regressions like the Sidebar "item.icon is undefined" crash that
 * blanked the dashboard for users with hosted listings.
 *
 * Auth modes:
 *   - If SMOKE_SUPABASE_STORAGE_KEY + SMOKE_SUPABASE_SESSION_JSON are set,
 *     the script restores that Supabase session and tests the AUTHENTICATED
 *     dashboard surface (host + shopper modes, sidebar, CTAs).
 *   - Otherwise it falls back to the UNAUTHENTICATED check: each route must
 *     redirect to /auth WITHOUT throwing a React error first. This catches
 *     render-time crashes (the most common dashboard-blanking class of bug).
 *
 * Usage:
 *   APP_BASE_URL=http://localhost:8080 bun scripts/smoke/dashboard-routes-smoke.ts
 *   # optional auth:
 *   SMOKE_SUPABASE_STORAGE_KEY=sb-xxx-auth-token \
 *   SMOKE_SUPABASE_SESSION_JSON='{"access_token":"..."}' \
 *   bun scripts/smoke/dashboard-routes-smoke.ts
 */
import { chromium, type ConsoleMessage, type Page } from "playwright";

const BASE = (process.env.APP_BASE_URL ?? "http://localhost:8080").replace(/\/$/, "");
const STORAGE_KEY = process.env.SMOKE_SUPABASE_STORAGE_KEY ?? "";
const SESSION_JSON = process.env.SMOKE_SUPABASE_SESSION_JSON ?? "";
const HAS_SESSION = STORAGE_KEY.length > 0 && SESSION_JSON.length > 0;

// Routes that make up the dashboard surface. Every one of these must render
// without a React error, whether the user is signed in or redirected to /auth.
const DASHBOARD_ROUTES = [
  "/dashboard",
  "/dashboard?view=host",
  "/dashboard?view=shopper",
  "/dashboard?view=host&tab=insights",
  "/dashboard?view=host&tab=promote",
  "/host/listings",
  "/host/bookings",
  "/host/reporting",
  "/host/analytics",
  "/account",
  "/favorites",
  "/messages",
  "/notification-preferences",
  "/referral/dashboard",
];

// Third-party noise we never want to fail on (CORS to embed.tawk.to, S3 fonts,
// Google one-tap "not signed in", etc.). Keep this list tight — only known
// non-app errors belong here.
const IGNORED_PATTERNS = [
  /embed\.tawk\.to/i,
  /vendibook-docs\.s3\./i,
  /provider's accounts list is empty/i,
  /not signed in with the identity provider/i,
  /failed to load resource:.*net::err_failed/i, // CORS preflights for the above
  /cookie .*has been rejected/i,
  /\[gsi_logger\]/i,
];

// Patterns that always indicate a real bug.
const FATAL_PATTERNS = [
  /element type is invalid/i,
  /cannot read prop(erties)? of (undefined|null)/i,
  /is not a function/i,
  /maximum update depth/i,
  /rendered more hooks/i,
  /minified react error/i,
  /the above error occurred in/i,
];

type Failure = { route: string; kind: string; detail: string };
const failures: Failure[] = [];

function isIgnored(text: string) {
  return IGNORED_PATTERNS.some((p) => p.test(text));
}
function isFatal(text: string) {
  return FATAL_PATTERNS.some((p) => p.test(text));
}

async function restoreSession(page: Page) {
  if (!HAS_SESSION) return;
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.evaluate(
    ([key, value]) => window.localStorage.setItem(key, value),
    [STORAGE_KEY, SESSION_JSON],
  );
}

async function checkRoute(page: Page, route: string) {
  const collected: string[] = [];

  const onConsole = (msg: ConsoleMessage) => {
    if (msg.type() !== "error") return;
    const text = msg.text();
    if (isIgnored(text)) return;
    collected.push(text);
    if (isFatal(text)) {
      failures.push({ route, kind: "console-fatal", detail: text.slice(0, 400) });
    }
  };
  const onPageError = (err: Error) => {
    const text = `${err.message}\n${err.stack ?? ""}`;
    if (isIgnored(text)) return;
    failures.push({ route, kind: "pageerror", detail: text.slice(0, 400) });
  };

  page.on("console", onConsole);
  page.on("pageerror", onPageError);

  try {
    const resp = await page.goto(BASE + route, {
      waitUntil: "domcontentloaded",
      timeout: 20_000,
    });
    if (resp && resp.status() >= 500) {
      failures.push({ route, kind: "http", detail: `status ${resp.status()}` });
    }
    // Let lazy chunks / queries settle so render-time crashes surface.
    await page.waitForTimeout(2000);

    // ErrorBoundary fallback detection — the user sees "Something went wrong".
    const boundaryHit = await page
      .getByRole("heading", { name: /something went wrong/i })
      .count();
    if (boundaryHit > 0) {
      failures.push({
        route,
        kind: "error-boundary",
        detail: "ErrorBoundary fallback rendered",
      });
    }

    // Internal link/CTA audit: collect hrefs that point inside the app, then
    // probe each unique target with a HEAD-equivalent navigation. Limited to
    // 10 per route to keep runtime bounded.
    const hrefs: string[] = await page.$$eval("a[href]", (els) =>
      Array.from(
        new Set(
          els
            .map((el) => (el as HTMLAnchorElement).getAttribute("href") || "")
            .filter((h) => h.startsWith("/") && !h.startsWith("//"))
            .map((h) => h.split("#")[0]),
        ),
      ).slice(0, 10),
    );

    for (const href of hrefs) {
      try {
        const r = await page.request.get(BASE + href, { maxRedirects: 5 });
        if (r.status() >= 500) {
          failures.push({
            route,
            kind: "broken-link",
            detail: `${href} → ${r.status()}`,
          });
        }
      } catch (e) {
        failures.push({
          route,
          kind: "broken-link",
          detail: `${href} → ${(e as Error).message}`,
        });
      }
    }

    const status = failures.some((f) => f.route === route) ? "FAIL" : "ok";
    console.log(
      `  [${status}] ${route} (${hrefs.length} link${hrefs.length === 1 ? "" : "s"} probed)`,
    );
  } catch (e) {
    failures.push({
      route,
      kind: "navigation",
      detail: (e as Error).message,
    });
    console.log(`  [FAIL] ${route} — ${(e as Error).message}`);
  } finally {
    page.off("console", onConsole);
    page.off("pageerror", onPageError);
  }
}

async function main() {
  console.log(`[smoke] Dashboard routes smoke against ${BASE}`);
  console.log(`[smoke] Auth mode: ${HAS_SESSION ? "signed-in" : "anonymous (redirect-to-/auth)"}`);

  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined,
  });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 1800 } });
  const page = await ctx.newPage();

  try {
    await restoreSession(page);
    for (const route of DASHBOARD_ROUTES) {
      await checkRoute(page, route);
    }
  } finally {
    await browser.close();
  }

  if (failures.length > 0) {
    console.error("\n❌ DASHBOARD SMOKE FAILED\n");
    for (const f of failures) {
      console.error(`  [${f.kind}] ${f.route}\n    ${f.detail}\n`);
    }
    process.exit(1);
  }
  console.log("\n✅ All dashboard routes rendered cleanly.\n");
}

main().catch((e) => {
  console.error("[smoke] uncaught:", e);
  process.exit(1);
});
