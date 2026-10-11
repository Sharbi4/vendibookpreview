/**
 * Cloudflare Worker: SEO Prerender Router
 *
 * Deploy this Worker on vendibook.com/* to route crawler traffic
 * for listing, blog and buyer SEO pages to the seo-prerender edge function.
 * NOT DEPLOYED by this repo — see docs/seo-prerender-plan.md for the steps.
 *
 * Setup:
 * 1. Create a Cloudflare Worker via dashboard or Wrangler CLI
 * 2. Paste this code or deploy with `wrangler deploy`
 * 3. Attach it to the vendibook.com route pattern
 *
 * Verify after deploy:
 *   curl -A "facebookexternalhit/1.1" https://vendibook.com/listing/<id> | head -40
 *   curl -A "linkedinbot/1.0" https://vendibook.com/blog/rise-food-truck-fleet-owner | grep og:title
 */

const PRERENDER_URL =
  "https://nbrehbwfsmedbelzntqs.supabase.co/functions/v1/seo-prerender";

const CRAWLER_RE =
  /(googlebot|bingbot|slurp|duckduckbot|baiduspider|yandex|linkedinbot|twitterbot|facebookexternal|facebot|slackbot|discordbot|whatsapp|telegrambot|pinterest|redditbot|applebot|oai-searchbot|chatgpt-user|perplexitybot|perplexity-user)/i;

export const BUYER_SEO_PATHS = [
  "/food-trucks-for-sale",
  "/food-trailers-for-sale",
  "/used-food-trucks-for-sale",
  "/how-to-buy-a-food-truck",
  "/food-truck-prices",
  "/financing",
];

export const PRERENDER_PATHS = [
  /^\/listing\/[0-9a-f-]{36}$/i,
  /^\/share\/listing\/[0-9a-f-]{36}$/i,
  /^\/blog\/[a-z0-9-]+$/i,
];

export const isCrawler = (ua: string) => CRAWLER_RE.test(ua);

/** Returns the seo-prerender URL for a crawler request, or null to pass through. */
export function prerenderTarget(pathname: string, ua: string): string | null {
  if (!isCrawler(ua)) return null;
  // Exact match only (no trailing slash / query variants) to avoid duplicate URLs.
  const ok = BUYER_SEO_PATHS.includes(pathname) || PRERENDER_PATHS.some((re) => re.test(pathname));
  if (!ok) return null;
  // Pass the original path: the function only emits a human redirect for /share/ aliases.
  return `${PRERENDER_URL}?path=${encodeURIComponent(pathname)}`;
}

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const ua = request.headers.get("user-agent") ?? "";
    const target = prerenderTarget(url.pathname, ua);

    if (target && (request.method === 'GET' || request.method === 'HEAD')) {

      try {
        const response = await fetch(target, {
          // Respect the function's Cache-Control (short TTL on inventory errors).
          cf: { cacheEverything: true },
        } as any);

        // Non-200 from prerender (e.g. 404 listing, 5xx) → let the origin SPA answer.
        if (!response.ok) return fetch(request);
        const headers = new Headers(response.headers);
        // The origin returns a SPA to browsers. Never share bot HTML through
        // downstream caches that don't include User-Agent in their cache key.
        headers.set('Vary', 'Accept-Encoding, User-Agent');
        headers.set('Cache-Control', 'private, no-store');
        return new Response(request.method === 'HEAD' ? null : response.body, {
          status: response.status,
          headers,
        });
      } catch {
        // If prerender fails, fall through to origin
        return fetch(request);
      }
    }

    // All other requests pass through to origin unchanged
    return fetch(request);
  },
};
