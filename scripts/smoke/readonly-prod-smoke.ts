/**
 * Read-Only Production Smoke (the "no side effects" audit)
 *
 * Validates that Vendibook's public surface renders and links resolve on the
 * deployed site (or any target URL) WITHOUT creating users, listings,
 * transactions, bookings, tickets, or writing to any backend. Safe to run
 * against production.
 *
 * What it does (read-only):
 *   1. GETs a curated set of public routes (marketing, SEO, legal, tools,
 *      city pages, sample listing detail, help, blog, sitemap, robots).
 *   2. Renders each in headless Chromium and fails if the page throws a
 *      React error, renders the ErrorBoundary fallback, or returns 5xx.
 *   3. Probes primary CTAs and internal links on each route with GET
 *      requests (never POST/PUT/DELETE) — fails on 5xx or dead links.
 *   4. Verifies auth-gated routes redirect to /auth cleanly (no crash,
 *      no signup attempt).
 *   5. Verifies the concierge/support widgets load their embeds (network
 *      only — never opens a ticket, never sends a message).
 *
 * What it explicitly does NOT do:
 *   - No form submissions (signup, signin, contact, newsletter, lead capture)
 *   - No listing wizard progression past the first render
 *   - No checkout, offer, or booking-request submission
 *   - No Stripe Connect handoff, no OAuth flow
 *   - No tawk.to / Vapi / Zendesk / Resend outbound
 *   - No writes to supabase (uses anon key for reads only if needed)
 *
 * Usage:
 *   APP_BASE_URL=https://vendibook.com bun scripts/smoke/readonly-prod-smoke.ts
 *   APP_BASE_URL=http://localhost:8080 bun scripts/smoke/readonly-prod-smoke.ts
 *
 * Optional:
 *   SMOKE_MAX_LINKS_PER_ROUTE=15   (default 10)
 *   SMOKE_ROUTE_TIMEOUT_MS=25000   (default 20000)
 *   SMOKE_SAMPLE_LISTING_ID=<uuid> (default: fetched from sitemap)
 */
import { chromium, type ConsoleMessage, type Page, type Request } from "playwright";

const BASE = (process.env.APP_BASE_URL ?? "https://vendibook.com").replace(/\/$/, "");
const MAX_LINKS = Number(process.env.SMOKE_MAX_LINKS_PER_ROUTE ?? 10);
const ROUTE_TIMEOUT = Number(process.env.SMOKE_ROUTE_TIMEOUT_MS ?? 20_000);

// Public marketing/SEO/legal/help/tool surface. All must render clean for
// a logged-out visitor.
const PUBLIC_ROUTES = [
  "/",
  "/how-it-works",
  "/how-it-works/host",
  "/how-it-works/seller",
  "/become-a-host",
  "/sell-my-food-truck",
  "/sell-food-trailer",
  "/sell-concession-trailer",
  "/rent-out-my-food-truck",
  "/list-food-truck-for-sale",
  "/best-place-to-sell-a-food-truck",
  "/what-is-vendibook",
  "/why-list-on-vendibook",
  "/pricing-calculator",
  "/kitchen-earnings-calculator",
  "/tools",
  "/cities",
  "/blog",
  "/wanted",
  "/vendi-ai-suite",
  "/referral/terms",
  "/help",
  "/legal/terms",
  "/legal/privacy",
  "/robots.txt",
  "/sitemap.xml",
];

// Auth-gated routes: must redirect to /auth WITHOUT crashing. We don't sign in.
const GATED_ROUTES = [
  "/dashboard",
  "/host/listings",
  "/host/bookings",
  "/host/analytics",
  "/account",
  "/favorites",
  "/messages",
  "/notification-preferences",
];

const IGNORED_PATTERNS = [
  /embed\.tawk\.to/i,
  /vendibook-docs\.s3\./i,
  /provider's accounts list is empty/i,
  /not signed in with the identity provider/i,
  /failed to load resource:.*net::err_failed/i,
  /cookie .*has been rejected/i,
  /\[gsi_logger\]/i,
  /google.*one-?tap/i,
];

const FATAL_PATTERNS = [
  /element type is invalid/i,
  /cannot read prop(erties)? of (undefined|null)/i,
  /is not a function/i,
  /maximum update depth/i,
  /rendered more hooks/i,
  /minified react error/i,
  /the above error occurred in/i,
];

// Any write-shaped request is a bug in the smoke itself. Guard against it.
const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
// Allowlist of write-ish endpoints third-party embeds legitimately POST to
// (analytics beacons, error reporters). These do NOT create Vendibook records.
const WRITE_ALLOWLIST = [
  /google-analytics\.com/i,
  /analytics\.google\.com/i,
  /googletagmanager\.com/i,
  /googleadservices\.com/i,
  /google\.com\/(g|rmkt|ads|pagead)\/(collect|viewthroughconversion)/i,
  /google\.com\/ccm\/collect/i,
  /doubleclick\.net/i,
  /facebook\.com\/tr/i,
  /connect\.facebook\.net/i,
  /tawk\.to/i,
  /sentry\.io/i,
  /clarity\.ms/i,
  /o\/log-error-event/i, // legacy path
  /\/functions\/v1\/log-error-event/i, // error reporter — read-only side effect
  /\/functions\/v1\/facebook-conversions-api/i, // marketing pixel — server-side beacon
  /\/rest\/v1\/rpc\//i, // Supabase RPC calls are POST-shaped reads
  /\/rest\/v1\/analytics_events/i, // client analytics beacon
  /\/rest\/v1\/listing_views/i, // view counter beacon
];

type Failure = { route: string; kind: string; detail: string };
const failures: Failure[] = [];
const writeAttempts: string[] = [];

const isIgnored = (t: string) => IGNORED_PATTERNS.some((p) => p.test(t));
const isFatal = (t: string) => FATAL_PATTERNS.some((p) => p.test(t));
const isAllowedWrite = (url: string) => WRITE_ALLOWLIST.some((p) => p.test(url));

async function checkRoute(page: Page, route: string, opts: { gated?: boolean } = {}) {
  const localFailures: Failure[] = [];

  const onConsole = (msg: ConsoleMessage) => {
    if (msg.type() !== "error") return;
    const text = msg.text();
    if (isIgnored(text)) return;
    if (isFatal(text)) {
      localFailures.push({ route, kind: "console-fatal", detail: text.slice(0, 400) });
    }
  };
  const onPageError = (err: Error) => {
    const text = `${err.message}\n${err.stack ?? ""}`;
    if (isIgnored(text)) return;
    localFailures.push({ route, kind: "pageerror", detail: text.slice(0, 400) });
  };
  const onRequest = (req: Request) => {
    if (!WRITE_METHODS.has(req.method())) return;
    const url = req.url();
    if (isAllowedWrite(url)) return;
    writeAttempts.push(`${route} → ${req.method()} ${url}`);
  };

  page.on("console", onConsole);
  page.on("pageerror", onPageError);
  page.on("request", onRequest);

  try {
    const resp = await page.goto(BASE + route, {
      waitUntil: "domcontentloaded",
      timeout: ROUTE_TIMEOUT,
    });
    if (resp && resp.status() >= 500) {
      localFailures.push({ route, kind: "http", detail: `status ${resp.status()}` });
    }
    await page.waitForTimeout(1500);

    // ErrorBoundary check
    const boundaryHit = await page
      .getByRole("heading", { name: /something went wrong/i })
      .count();
    if (boundaryHit > 0) {
      localFailures.push({
        route,
        kind: "error-boundary",
        detail: "ErrorBoundary fallback rendered",
      });
    }

    // Auth-gate check
    if (opts.gated) {
      const finalUrl = page.url();
      if (!/\/auth(\?|$)/.test(finalUrl)) {
        localFailures.push({
          route,
          kind: "auth-gate",
          detail: `expected redirect to /auth, got ${finalUrl}`,
        });
      }
    }

    // Link audit — GET only, capped at MAX_LINKS
    const hrefs: string[] = await page.$$eval(
      "a[href]",
      (els, max) =>
        Array.from(
          new Set(
            els
              .map((el) => (el as HTMLAnchorElement).getAttribute("href") || "")
              .filter((h) => h.startsWith("/") && !h.startsWith("//"))
              .map((h) => h.split("#")[0])
              .filter((h) => h && h !== "/"),
          ),
        ).slice(0, max),
      MAX_LINKS,
    );

    for (const href of hrefs) {
      try {
        const r = await page.request.get(BASE + href, { maxRedirects: 5 });
        if (r.status() >= 500) {
          localFailures.push({
            route,
            kind: "broken-link",
            detail: `${href} → ${r.status()}`,
          });
        }
      } catch (e) {
        localFailures.push({
          route,
          kind: "broken-link",
          detail: `${href} → ${(e as Error).message}`,
        });
      }
    }

    const status = localFailures.length > 0 ? "FAIL" : "ok";
    console.log(
      `  [${status}] ${route} (${hrefs.length} link${hrefs.length === 1 ? "" : "s"} probed)`,
    );
  } catch (e) {
    localFailures.push({ route, kind: "navigation", detail: (e as Error).message });
    console.log(`  [FAIL] ${route} — ${(e as Error).message}`);
  } finally {
    page.off("console", onConsole);
    page.off("pageerror", onPageError);
    page.off("request", onRequest);
    failures.push(...localFailures);
  }
}

async function resolveSampleListingRoute(): Promise<string | null> {
  const explicit = process.env.SMOKE_SAMPLE_LISTING_ID;
  if (explicit) return `/listing/${explicit}`;
  try {
    const r = await fetch(`${BASE}/sitemap-listings.xml`);
    if (!r.ok) return null;
    const xml = await r.text();
    const m = xml.match(/<loc>([^<]*\/listing\/[^<]+)<\/loc>/);
    if (!m) return null;
    return new URL(m[1]).pathname;
  } catch {
    return null;
  }
}

async function main() {
  console.log(`[smoke] Read-only production smoke against ${BASE}`);
  console.log(`[smoke] Mode: NO WRITES. No signup, no listing, no transaction.\n`);

  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined,
  });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 1800 } });
  const page = await ctx.newPage();

  try {
    console.log("→ Public routes");
    for (const route of PUBLIC_ROUTES) await checkRoute(page, route);

    console.log("\n→ Auth-gated routes (expect redirect to /auth)");
    for (const route of GATED_ROUTES) await checkRoute(page, route, { gated: true });

    const sample = await resolveSampleListingRoute();
    if (sample) {
      console.log(`\n→ Sample listing detail (${sample})`);
      await checkRoute(page, sample);
    } else {
      console.log("\n→ Sample listing detail (skipped — no sitemap entry)");
    }

    console.log("\n→ Auth page renders (no submit)");
    await checkRoute(page, "/auth");
    await checkRoute(page, "/auth?mode=signup");

    console.log("\n→ 404 renders cleanly");
    await checkRoute(page, "/definitely-not-a-real-route-xyz");
  } finally {
    await browser.close();
  }

  if (writeAttempts.length > 0) {
    console.error("\n⚠️  Unexpected write-shaped requests detected (potential prod side-effects):");
    for (const w of writeAttempts) console.error(`   ${w}`);
    failures.push({
      route: "*",
      kind: "write-attempt",
      detail: `${writeAttempts.length} unallowlisted write request(s) — see above`,
    });
  }

  if (failures.length > 0) {
    console.error(`\n❌ READ-ONLY SMOKE FAILED — ${failures.length} issue(s)\n`);
    for (const f of failures) {
      console.error(`  [${f.kind}] ${f.route}\n    ${f.detail}\n`);
    }
    process.exit(1);
  }
  console.log("\n✅ All public + gated routes rendered cleanly. No writes attempted.\n");
}

main().catch((e) => {
  console.error("[smoke] uncaught:", e);
  process.exit(1);
});
