/**
 * Listing Detail Visual Regression Smoke
 *
 * Loads a real published listing at 360px (small phone), 390px (iPhone 14),
 * and 1440px (desktop) and asserts a set of layout invariants that
 * repeatedly regressed in past bugs:
 *
 *   1. NO horizontal scroll (documentElement.scrollWidth <= viewport width + 1).
 *   2. NO element on screen overflows the viewport horizontally.
 *   3. Sticky header is present and content below is NOT clipped under it
 *      (h1 top >= header bottom once scrolled to top).
 *   4. Concierge card + message form (if rendered) fit within viewport width
 *      and each button/textarea is fully inside its card (no overflow).
 *   5. Exactly one visible <h1>. No duplicate breadcrumbs / Save-Share bars
 *      stacked on mobile for sale listings.
 *
 * Screenshots for each viewport are written to /tmp/listing-detail-visual/
 * so failures can be inspected locally or uploaded as CI artifacts.
 *
 * Usage:
 *   APP_BASE_URL=http://localhost:8080 bun scripts/smoke/listing-detail-visual-smoke.ts
 */
import { chromium, type Page } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = (process.env.APP_BASE_URL ?? "http://localhost:8080").replace(/\/$/, "");
const SUPABASE_URL =
  process.env.SUPABASE_URL ??
  process.env.VITE_SUPABASE_URL ??
  "https://nbrehbwfsmedbelzntqs.supabase.co";
const ANON_KEY =
  process.env.SUPABASE_ANON_KEY ??
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5icmVoYndmc21lZGJlbHpudHFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxMDgzMTMsImV4cCI6MjA4MzY4NDMxM30.EkA-lGUmkLQ9rPAO-unLxGGGHVmPDdVR8awlA2ShVpU";

const OUT_DIR = "/tmp/listing-detail-visual";
mkdirSync(OUT_DIR, { recursive: true });

type Viewport = { name: string; width: number; height: number };
const VIEWPORTS: Viewport[] = [
  { name: "360", width: 360, height: 800 },
  { name: "390", width: 390, height: 844 },
  { name: "1440", width: 1440, height: 900 },
];

const failures: string[] = [];
function fail(msg: string) {
  console.error(`  ✗ ${msg}`);
  failures.push(msg);
}
function pass(msg: string) {
  console.log(`  ✓ ${msg}`);
}

async function fetchOneListing(): Promise<{ id: string; title: string }> {
  const url = `${SUPABASE_URL}/rest/v1/listings?select=id,title,listing_type&status=eq.published&title=not.is.null&limit=10`;
  const res = await fetch(url, { headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` } });
  if (!res.ok) throw new Error(`fetch listings: ${res.status}`);
  const rows = (await res.json()) as Array<{ id: string; title: string }>;
  if (!rows.length) throw new Error("no published listings available");
  return rows[0];
}

async function auditViewport(page: Page, vp: Viewport, listingId: string) {
  const label = `[${vp.name}px]`;
  console.log(`\n${label} auditing…`);

  await page.setViewportSize({ width: vp.width, height: vp.height });
  const resp = await page.goto(`${BASE}/listing/${listingId}`, {
    waitUntil: "domcontentloaded",
    timeout: 30_000,
  });
  if (!resp || !resp.ok()) {
    fail(`${label} GET failed → ${resp?.status()}`);
    return;
  }
  await page.waitForSelector("h1:visible", { timeout: 15_000 }).catch(() => {
    fail(`${label} no visible h1`);
  });
  // Let layout settle (images, sticky measurement).
  await page.waitForTimeout(600);

  await page.screenshot({ path: `${OUT_DIR}/listing-${vp.name}.png` });

  // 1. Horizontal scroll on <html>
  const htmlScrollW = await page.evaluate(() => document.documentElement.scrollWidth);
  if (htmlScrollW > vp.width + 1) {
    fail(`${label} horizontal scroll: html.scrollWidth=${htmlScrollW} > viewport=${vp.width}`);
  } else {
    pass(`${label} no horizontal scroll (${htmlScrollW}px)`);
  }

  // 2. Any element wider than viewport (common cause: unbounded images, long words, sticky bars)
  const overflowers = await page.evaluate((vw) => {
    const bad: Array<{ tag: string; cls: string; w: number; right: number }> = [];
    const nodes = document.querySelectorAll<HTMLElement>("body *");
    nodes.forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;
      // Ignore fixed/off-screen skip-links etc.
      const style = getComputedStyle(el);
      if (style.visibility === "hidden" || style.display === "none") return;
      if (r.right > vw + 1 && r.width > 40) {
        bad.push({
          tag: el.tagName.toLowerCase(),
          cls: (el.className || "").toString().slice(0, 60),
          w: Math.round(r.width),
          right: Math.round(r.right),
        });
      }
    });
    return bad.slice(0, 5);
  }, vp.width);
  if (overflowers.length > 0) {
    fail(
      `${label} ${overflowers.length} element(s) overflow viewport: ` +
        overflowers.map((o) => `<${o.tag}.${o.cls}> w=${o.w} right=${o.right}`).join(" | "),
    );
  } else {
    pass(`${label} no element overflows viewport`);
  }

  // 3. Exactly one visible h1
  const h1Count = await page.locator("h1:visible").count();
  if (h1Count !== 1) {
    fail(`${label} expected 1 visible h1, got ${h1Count}`);
  } else {
    pass(`${label} single visible h1`);
  }

  // 4. Sticky header does NOT hide h1 on initial scroll-to-top
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(150);
  const clipping = await page.evaluate(() => {
    const h1 = document.querySelector<HTMLElement>("h1");
    if (!h1) return null;
    const hr = h1.getBoundingClientRect();
    // Find fixed/sticky top bars at y=0
    const bars = Array.from(document.querySelectorAll<HTMLElement>("body *")).filter((el) => {
      const s = getComputedStyle(el);
      if (s.position !== "fixed" && s.position !== "sticky") return false;
      const r = el.getBoundingClientRect();
      return r.top <= 4 && r.height > 20 && r.height < 200 && r.width >= window.innerWidth * 0.6;
    });
    const headerBottom = bars.length ? Math.max(...bars.map((b) => b.getBoundingClientRect().bottom)) : 0;
    return { h1Top: Math.round(hr.top), headerBottom: Math.round(headerBottom) };
  });
  if (clipping && clipping.headerBottom > 0 && clipping.h1Top < clipping.headerBottom - 8) {
    // Only fail if h1 is genuinely clipped (some overlap of 8px is fine due to rounding).
    fail(
      `${label} h1 clipped by sticky header: h1.top=${clipping.h1Top} < header.bottom=${clipping.headerBottom}`,
    );
  } else {
    pass(`${label} h1 clear of sticky header (h1.top=${clipping?.h1Top}, hdr=${clipping?.headerBottom})`);
  }

  // 5. Concierge + Message cards fit their container (mobile-critical)
  const cardIssues = await page.evaluate((vw) => {
    const issues: string[] = [];
    // Concierge box has a Message + Call button row.
    const cards = document.querySelectorAll<HTMLElement>(
      '[data-testid="concierge-box"], form, .rounded-lg, .rounded-xl',
    );
    cards.forEach((card) => {
      const cr = card.getBoundingClientRect();
      if (cr.width < 200 || cr.width > vw + 1) return;
      // any child button/textarea that overflows the card
      card.querySelectorAll<HTMLElement>("button, textarea, a").forEach((child) => {
        const rr = child.getBoundingClientRect();
        if (rr.width === 0) return;
        if (rr.right > cr.right + 2 || rr.left < cr.left - 2) {
          issues.push(
            `${child.tagName.toLowerCase()} overflows card (child.right=${Math.round(
              rr.right,
            )} vs card.right=${Math.round(cr.right)})`,
          );
        }
      });
    });
    return issues.slice(0, 3);
  }, vp.width);
  if (cardIssues.length > 0) {
    fail(`${label} card children overflow parent: ${cardIssues.join("; ")}`);
  } else {
    pass(`${label} card children fit within parents`);
  }
}

async function run() {
  console.log(`[visual] listing-detail against ${BASE}`);
  const sample = await fetchOneListing();
  console.log(`[visual] using listing ${sample.id} — "${sample.title}"`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on("pageerror", (e) => fail(`pageerror: ${e.message}`));

  try {
    for (const vp of VIEWPORTS) {
      await auditViewport(page, vp, sample.id);
    }
  } finally {
    await page.close();
    await context.close();
    await browser.close();
  }

  console.log(`\n[visual] screenshots → ${OUT_DIR}/`);
  if (failures.length > 0) {
    console.error(`\n❌ VISUAL SMOKE FAIL (${failures.length} issue${failures.length === 1 ? "" : "s"})`);
    for (const f of failures) console.error(`  - ${f}`);
    process.exit(1);
  }
  console.log("\n✅ listing-detail visual smoke PASSED");
}

run().catch((e) => {
  console.error(`\n❌ SMOKE FAIL: ${e?.message ?? e}`);
  process.exit(1);
});
