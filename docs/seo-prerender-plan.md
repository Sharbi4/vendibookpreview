# Vendibook SEO Prerender / SSR Plan

## Current state (audit)

Vendibook is a Vite + React SPA hosted on Lovable's static CDN. There is **no Node/edge server in front of the static assets**, so the same `index.html` is served for every public route. Per-route `<title>`, `<meta>`, and JSON-LD are mounted client-side via the `SEO` and `JsonLd` components after React hydrates.

What that means for crawlers:

| Crawler | Sees per-route meta? | Notes |
|---|---|---|
| Googlebot (modern) | Yes — it executes JS and reads the hydrated head | First-render HTML is still preferred; faster + lower indexing budget |
| Bingbot | Partial — JS rendering is best-effort | First-render HTML strongly preferred |
| LinkedIn, Slack, Facebook, Twitter, Discord, WhatsApp, Pinterest | **No** — they only read static `<head>` from the first response | Per-listing share previews are currently generic until activation is wired |

### What already exists

`supabase/functions/seo-prerender/index.ts` is a deployed edge function that, given `?path=/listing/{uuid}`, returns a fully-rendered HTML document containing:

- Per-listing `<title>`, `<meta description>`, `<link rel=canonical>`
- Open Graph (`og:type=product`, `og:title`, `og:description`, `og:image`, `og:url`)
- Twitter card (summary_large_image with title/description/image)
- Product JSON-LD (price, currency, SKU, brand, availability, areaServed, aggregateRating + review nodes when reviews exist)
- LocalBusiness JSON-LD (address, geo, makesOffer) where applicable
- BreadcrumbList JSON-LD (Home → mode → category → listing)
- FAQPage JSON-LD
- Visible H1, category/mode/city line, price, truncated description, canonical anchor link
- `Cache-Control: public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800`

It also serves `410 Gone` for legacy URLs.

The category and city/category landing pages (added in `src/pages/CategoryIndex.tsx`) include all the same per-route meta + ItemList + Breadcrumb + FAQ JSON-LD client-side. Empty pages auto-`noindex`.

### What's missing

Crawler traffic that hits `https://vendibook.com/listing/{id}` directly is **not** routed to `seo-prerender`. Lovable's static hosting does not expose a rewrite/middleware hook, so the user needs one of the options below to flip the switch.

---

## Activation options (ranked by effort)

### Option A — Cloudflare Worker in front of vendibook.com (RECOMMENDED)

**Effort:** ~1 hour. **Cost:** free tier covers <100K requests/day.

1. Move the `vendibook.com` DNS to Cloudflare (or keep DNS where it is and proxy via a Cloudflare custom hostname).
2. Deploy a Worker on the `vendibook.com/*` route that:
   - Inspects `request.headers.get("user-agent")`.
   - If it matches a crawler regex (Googlebot, bingbot, Slurp, DuckDuckBot, Baiduspider, YandexBot, LinkedInBot, Twitterbot, facebookexternalhit, facebot, Slackbot, Discordbot, WhatsApp, TelegramBot, Pinterest, redditbot, Applebot), AND the path matches `^/listing/[0-9a-f-]{36}$`, fetch from the prerender function and return its response.
   - Otherwise, `fetch(request)` to pass through to the Lovable origin unchanged.
3. Optional: also route the category index paths (`/food-trucks`, `/{city}/{category}`, etc.) for higher-fidelity first-render HTML on those pages.

Worker sketch:

```ts
const CRAWLER_RE = /(googlebot|bingbot|slurp|duckduckbot|baiduspider|yandex|linkedinbot|twitterbot|facebookexternal|facebot|slackbot|discordbot|whatsapp|telegrambot|pinterest|redditbot|applebot)/i;
const LISTING_RE = /^\/listing\/[0-9a-f-]{36}$/i;
const PRERENDER = "https://nbrehbwfsmedbelzntqs.supabase.co/functions/v1/seo-prerender";

export default {
  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const ua = req.headers.get("user-agent") ?? "";
    if (CRAWLER_RE.test(ua) && LISTING_RE.test(url.pathname)) {
      const target = `${PRERENDER}?path=${encodeURIComponent(url.pathname)}`;
      return fetch(target, { cf: { cacheTtl: 86400, cacheEverything: true } });
    }
    return fetch(req);
  },
};
```

Verify after deploy:
```
curl -A "facebookexternalhit/1.1" https://vendibook.com/listing/<id> | head -40
curl -A "Googlebot/2.1" https://vendibook.com/listing/<id> | grep og:title
```

### Option B — Move the apex to Vercel/Netlify and add a rewrite rule

**Effort:** ~half day. **Cost:** free tier of either.

Both providers support User-Agent-based rewrites via `vercel.json` / `netlify.toml`. This is functionally identical to Option A but uses the hosting provider's edge instead of a Worker. Worth doing if the team is already moving off Lovable hosting.

### Option C — Prerender.io / Rendertron / Browserless

**Effort:** low to set up, **paid**. Drop in their service via Cloudflare or a hosting-level integration. They auto-render any SPA route on demand and cache. Most expensive long-term; `seo-prerender` already does this for us, so this is only worth it if the team wants prerendering for *every* route (search results, blog posts, etc.) without writing per-route HTML.

### Option D — Migrate to Next.js (full SSR)

**Effort:** 2–4 weeks. **Outcome:** every route ships server-rendered HTML by default, no User-Agent shenanigans, perfect social previews.

Recommended only if:
- Marketing depends heavily on rich social previews across many route types, AND
- Listing prerender + category page work in Options A/B isn't enough.

The current Vite app structure ports cleanly: routes become `app/` segments, `react-helmet-async` becomes per-route `generateMetadata`, Supabase calls stay the same. Plan ~1 week for the routing port, ~1 week for SEO parity, ~1 week for QA.

---

## Current status (updated 2026-05-23)

### ✅ Activated: Social crawler prerendering via /share/listing/:id

The `_redirects` file now proxies `/share/listing/:id` to the `seo-prerender` edge function:
```
/share/listing/:id   https://nbrehbwfsmedbelzntqs.supabase.co/functions/v1/seo-prerender?path=/listing/:id   200
```

This means:
- When users share a listing (share button generates `https://vendibook.com/share/listing/{id}`), social crawlers (Facebook, Twitter, LinkedIn, Slack, Discord, WhatsApp) now receive full OG tags, JSON-LD, and per-listing metadata.
- Human visitors hitting `/share/listing/:id` are redirected to `/listing/:id` via the JS redirect in the prerendered HTML.

### ⏳ Remaining: Googlebot prerendering via Cloudflare Worker

For Googlebot hitting `/listing/:id` directly (from sitemaps or internal links), a Cloudflare Worker is needed. The Worker source is ready at `workers/seo-prerender-router.ts`.

## Recommended sequence

1. ~~**Now:** Verify `seo-prerender` works in production by hitting it directly~~ ✅ Done — social share route is wired.
2. **This week:** Deploy the Cloudflare Worker from `workers/seo-prerender-router.ts`. This activates the prerender for Googlebot on `/listing/:id` with zero further code changes.
3. **Within 30 days:** Watch Google Search Console URL Inspection for 3–5 listing URLs. Expect to see "Page is indexed" replace "Crawled — currently not indexed."
4. **Defer Option D** unless social previews remain a recurring complaint.

## Pages currently relying on client-side hydration for SEO

These render meta tags via `SEO`/`JsonLd` after JS executes. Googlebot handles them fine, but social previews fall back to the static `index.html`:

- `/listing/{id}` (ListingDetail) — covered by `seo-prerender` once activated
- `/food-trucks`, `/food-trucks-for-sale`, `/food-trucks-for-rent`, `/food-trailers`, `/food-trailers-for-sale`, `/food-trailers-for-rent`, `/shared-kitchens`, `/shared-kitchens-for-rent`, `/ghost-kitchens` (CategoryIndex)
- `/{city}/{category}` and `/{city}/{category}-for-sale|rent` (CategoryIndex with city filter)
- `/rent/{category}/{city-state}`, `/buy/{category}/{city-state}` (CategoryCityPage)
- `/{citySlug}` (DynamicCityPage / CitySupplyPage)

If we extend Option A's Worker, all of these can be added to the prerender path list — but listing pages are the highest priority because they carry the actual marketplace inventory and product schema.
