/**
 * Listing Detail E2E Smoke Test
 *
 * Fetches real published listing IDs from the live database (via the anon
 * REST endpoint — no service role needed) and loads each one in a real
 * browser at /listing/:id. Fails if:
 *   • the page throws a React error / renders the ErrorBoundary fallback
 *   • the "Listing not found" state renders for a known-valid ID
 *   • the <h1> does not contain the listing's title
 *   • the <title> tag is missing or still the default
 *   • critical console errors fire during load
 *
 * A bogus UUID is also loaded as a negative control — the page must render
 * the "Listing not found" state without crashing.
 *
 * Usage:
 *   APP_BASE_URL=http://localhost:8080 bun scripts/smoke/listing-detail-smoke.ts
 */
import { chromium, type ConsoleMessage } from "playwright";

const BASE = (process.env.APP_BASE_URL ?? "http://localhost:8080").replace(/\/$/, "");
const SUPABASE_URL =
  process.env.SUPABASE_URL ??
  process.env.VITE_SUPABASE_URL ??
  "https://nbrehbwfsmedbelzntqs.supabase.co";
const ANON_KEY =
  process.env.SUPABASE_ANON_KEY ??
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5icmVoYndmc21lZGJlbHpudHFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxMDgzMTMsImV4cCI6MjA4MzY4NDMxM30.EkA-lGUmkLQ9rPAO-unLxGGGHVmPDdVR8awlA2ShVpU";

const BOGUS_ID = "00000000-0000-4000-8000-0000000dead0";

type Sample = { id: string; title: string };

function fail(msg: string): never {
  console.error(`\n❌ SMOKE FAIL: ${msg}\n`);
  process.exit(1);
}

// Console error patterns we ignore (third-party noise, network flakes, etc.)
const IGNORED_CONSOLE = [
  /favicon/i,
  /google.*maps/i,
  /Failed to load resource.*4\d\d/i,
  /net::ERR_/i,
  /ResizeObserver/i,
  /Non-Error promise rejection/i,
];

async function fetchSamples(): Promise<Sample[]> {
  const url = `${SUPABASE_URL}/rest/v1/listings?select=id,title&status=eq.published&title=not.is.null&limit=5`;
  const res = await fetch(url, { headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` } });
  if (!res.ok) fail(`could not fetch listings: ${res.status} ${await res.text()}`);
  const rows = (await res.json()) as Sample[];
  if (!Array.isArray(rows) || rows.length === 0) fail("no published listings available to sample");
  return rows.filter((r) => r.id && r.title);
}

async function run() {
  console.log(`[smoke] listing-detail against ${BASE}`);
  const samples = await fetchSamples();
  console.log(`[smoke] sampled ${samples.length} real listings`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.new_context?.({ viewport: { width: 1280, height: 1800 } })
    ?? await browser.newContext({ viewport: { width: 1280, height: 1800 } });

  try {
    for (const sample of samples) {
      const page = await context.newPage();
      const consoleErrors: string[] = [];
      page.on("console", (msg: ConsoleMessage) => {
        if (msg.type() !== "error") return;
        const text = msg.text();
        if (IGNORED_CONSOLE.some((re) => re.test(text))) return;
        consoleErrors.push(text);
      });
      page.on("pageerror", (err) => consoleErrors.push(`pageerror: ${err.message}`));

      const url = `${BASE}/listing/${sample.id}`;
      const resp = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
      if (!resp || !resp.ok()) fail(`GET ${url} → ${resp?.status()}`);

      // Wait for h1 (rendered by ListingDetail once data loads)
      await page.waitForSelector("h1", { timeout: 15_000 }).catch(() => {
        fail(`no <h1> rendered on ${url} within 15s`);
      });

      const h1Text = (await page.locator("h1").first().innerText()).trim();
      const docTitle = await page.title();

      // Guardrails
      if (/error|not found/i.test(h1Text)) {
        fail(`real listing ${sample.id} rendered "${h1Text}" (expected the listing title)`);
      }
      // ErrorBoundary fallback
      const boundaryHit = await page.locator("text=/something went wrong/i").count();
      if (boundaryHit > 0) fail(`ErrorBoundary fallback rendered for ${sample.id}`);

      // Title match — normalise whitespace, allow partial match either way
      const norm = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();
      const nH1 = norm(h1Text);
      const nTitle = norm(sample.title);
      if (!nH1.includes(nTitle) && !nTitle.includes(nH1)) {
        fail(`h1 mismatch for ${sample.id}: expected ~"${sample.title}", got "${h1Text}"`);
      }

      if (!docTitle || /^lovable/i.test(docTitle) || docTitle.trim() === "") {
        fail(`document.title missing/default for ${sample.id}: "${docTitle}"`);
      }

      if (consoleErrors.length > 0) {
        fail(`console errors on ${url}:\n  - ${consoleErrors.slice(0, 5).join("\n  - ")}`);
      }

      console.log(`[smoke]  ✓ ${sample.id}  h1="${h1Text.slice(0, 60)}"`);
      await page.close();
    }

    // Negative control: bogus UUID must render "not found" gracefully.
    const neg = await context.newPage();
    const negErrs: string[] = [];
    neg.on("pageerror", (e) => negErrs.push(e.message));
    await neg.goto(`${BASE}/listing/${BOGUS_ID}`, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await neg.waitForSelector("h1", { timeout: 15_000 });
    const negH1 = (await neg.locator("h1").first().innerText()).trim();
    if (!/not found/i.test(negH1)) {
      fail(`bogus id did not render "Listing Not Found" — got h1="${negH1}"`);
    }
    if (negErrs.length > 0) fail(`bogus id threw runtime errors: ${negErrs.join("; ")}`);
    console.log(`[smoke]  ✓ bogus id → "${negH1}"`);
    await neg.close();

    console.log("[smoke] ✅ listing-detail PASSED");
  } finally {
    await context.close();
    await browser.close();
  }
}

run().catch((e) => fail(e?.message ?? String(e)));
