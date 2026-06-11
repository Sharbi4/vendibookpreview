/**
 * Cloudflare Worker: SEO Prerender Router
 *
 * Deploy this Worker on vendibook.com/* to route crawler traffic
 * for listing pages to the seo-prerender edge function.
 *
 * Setup:
 * 1. Create a Cloudflare Worker via dashboard or Wrangler CLI
 * 2. Paste this code or deploy with `wrangler deploy`
 * 3. Attach it to the vendibook.com route pattern
 *
 * Verify after deploy:
 *   curl -A "facebookexternalhit/1.1" https://vendibook.com/listing/<id> | head -40
 *   curl -A "Googlebot/2.1" https://vendibook.com/listing/<id> | grep og:title
 */

const CRAWLER_RE =
  /(googlebot|bingbot|slurp|duckduckbot|baiduspider|yandex|linkedinbot|twitterbot|facebookexternal|facebot|slackbot|discordbot|whatsapp|telegrambot|pinterest|redditbot|applebot)/i;

const PRERENDER_PATHS = [
  /^\/listing\/[0-9a-f-]{36}$/i,
  /^\/share\/listing\/[0-9a-f-]{36}$/i,
  /^\/blog\/[a-z0-9-]+$/i,
];

const PRERENDER_URL =
  "https://nbrehbwfsmedbelzntqs.supabase.co/functions/v1/seo-prerender";

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const ua = request.headers.get("user-agent") ?? "";

    // Only intercept if crawler UA AND the path is a listing page
    const isCrawler = CRAWLER_RE.test(ua);
    const isListingPath = PRERENDER_PATHS.some((re) => re.test(url.pathname));

    if (isCrawler && isListingPath) {
      // Normalize /share/listing/:id → /listing/:id for the prerender function
      const prerenderPath = url.pathname.replace(/^\/share\/listing\//, "/listing/");
      const target = `${PRERENDER_URL}?path=${encodeURIComponent(prerenderPath)}`;

      try {
        const response = await fetch(target, {
          cf: { cacheTtl: 86400, cacheEverything: true },
        } as any);

        // Return prerendered HTML with the same headers
        return new Response(response.body, {
          status: response.status,
          headers: response.headers,
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
