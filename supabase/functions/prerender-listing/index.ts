// Prerender edge function for Vendibook listings.
//
// Given a listing ID, returns a fully-rendered HTML document with:
//   - Per-listing <title>, <meta description>, canonical
//   - Open Graph + Twitter card tags (title, description, image)
//   - Product + BreadcrumbList JSON-LD
//   - Visible H1, price, category, city/state, primary image, description
//   - Crawlable internal links (back to category/city pages)
//
// This is a SNAPSHOT endpoint intended to be served to crawlers
// (Googlebot, bingbot, LinkedInBot, Twitterbot, facebookexternalhit,
// Slackbot, Discordbot, Pinterestbot, WhatsApp, etc.) via a reverse
// proxy / CDN rule that rewrites /listing/{id} to this function when
// the User-Agent matches a known crawler. See the SSR plan in
// docs/seo-prerender-plan.md for activation steps.
//
// Status: published, non-draft listings only. Inactive/draft listings
// return a noindex HTML snapshot.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "https://nbrehbwfsmedbelzntqs.supabase.co";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SITE_URL = "https://vendibook.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const CATEGORY_LABEL: Record<string, string> = {
  food_truck: "Food Truck",
  food_trailer: "Food Trailer",
  ghost_kitchen: "Shared Commercial Kitchen",
  vendor_space: "Vendor Space",
  vendor_lot: "Vendor Space",
};

const CATEGORY_SLUG: Record<string, string> = {
  food_truck: "food-trucks",
  food_trailer: "food-trailers",
  ghost_kitchen: "shared-kitchens",
  vendor_space: "vendor-spaces",
  vendor_lot: "vendor-spaces",
};

interface Listing {
  id: string;
  title: string | null;
  description: string | null;
  category: string | null;
  mode: string | null;
  status: string | null;
  published_at: string | null;
  cover_image_url: string | null;
  price_daily: number | null;
  price_weekly: number | null;
  price_sale: number | null;
  city: string | null;
  state: string | null;
}

async function fetchListing(id: string): Promise<Listing | null> {
  const url = `${SUPABASE_URL}/rest/v1/listings?id=eq.${id}&select=id,title,description,category,mode,status,published_at,cover_image_url,price_daily,price_weekly,price_sale,city,state&limit=1`;
  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });
  if (!res.ok) return null;
  const arr = (await res.json()) as Listing[];
  return arr[0] ?? null;
}

function formatPrice(l: Listing): string {
  if (l.mode === "sale" && l.price_sale) return `$${Number(l.price_sale).toLocaleString()}`;
  if (l.price_daily) return `$${Number(l.price_daily).toLocaleString()}/day`;
  if (l.price_weekly) return `$${Number(l.price_weekly).toLocaleString()}/week`;
  return "Contact for price";
}

function buildHtml(l: Listing): string {
  const isPublic =
    l.status === "published" && l.published_at && !(l.title ?? "").toLowerCase().startsWith("demo");
  const noindex = !isPublic;

  const title = l.title ?? "Vendibook listing";
  const catLabel = CATEGORY_LABEL[l.category ?? ""] ?? "Listing";
  const catSlug = CATEGORY_SLUG[l.category ?? ""] ?? "search";
  const cityState = [l.city, l.state].filter(Boolean).join(", ");
  const modeLabel = l.mode === "sale" ? "for Sale" : "for Rent";
  const price = formatPrice(l);
  const desc =
    (l.description ?? "").replace(/\s+/g, " ").trim().slice(0, 300) ||
    `${catLabel} ${modeLabel.toLowerCase()}${cityState ? ` in ${cityState}` : ""} on Vendibook.`;

  const seoTitle = `${title} — ${catLabel} ${modeLabel}${cityState ? ` in ${cityState}` : ""} | Vendibook`;
  const metaDesc =
    `${price}. ${catLabel} ${modeLabel.toLowerCase()}${cityState ? ` in ${cityState}` : ""}. ${desc}`.slice(0, 300);
  const canonical = `${SITE_URL}/listing/${l.id}`;
  const image =
    l.cover_image_url && /^https?:\/\//i.test(l.cover_image_url)
      ? l.cover_image_url
      : `${SITE_URL}/images/vendibook-og-image.jpg`;

  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: title,
    description: desc,
    image: [image],
    sku: l.id,
    category: catLabel,
    offers: {
      "@type": "Offer",
      url: canonical,
      priceCurrency: "USD",
      price:
        l.mode === "sale"
          ? l.price_sale ?? undefined
          : l.price_daily ?? l.price_weekly ?? undefined,
      availability: "https://schema.org/InStock",
    },
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
      {
        "@type": "ListItem",
        position: 2,
        name: catLabel + "s",
        item: `${SITE_URL}/${catSlug}`,
      },
      { "@type": "ListItem", position: 3, name: title, item: canonical },
    ],
  };

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${esc(seoTitle)}</title>
  <meta name="description" content="${esc(metaDesc)}" />
  <link rel="canonical" href="${esc(canonical)}" />
  ${noindex ? '<meta name="robots" content="noindex,nofollow" />' : '<meta name="robots" content="index,follow" />'}

  <!-- Open Graph -->
  <meta property="og:type" content="product" />
  <meta property="og:site_name" content="Vendibook" />
  <meta property="og:url" content="${esc(canonical)}" />
  <meta property="og:title" content="${esc(seoTitle)}" />
  <meta property="og:description" content="${esc(metaDesc)}" />
  <meta property="og:image" content="${esc(image)}" />

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:url" content="${esc(canonical)}" />
  <meta name="twitter:title" content="${esc(seoTitle)}" />
  <meta name="twitter:description" content="${esc(metaDesc)}" />
  <meta name="twitter:image" content="${esc(image)}" />

  <script type="application/ld+json">${JSON.stringify(productSchema)}</script>
  <script type="application/ld+json">${JSON.stringify(breadcrumbSchema)}</script>
</head>
<body>
  <nav aria-label="breadcrumb">
    <a href="${SITE_URL}/">Home</a> &rsaquo;
    <a href="${SITE_URL}/${catSlug}">${esc(catLabel)}s</a> &rsaquo;
    <span>${esc(title)}</span>
  </nav>
  <main>
    <h1>${esc(title)}</h1>
    <p><strong>${esc(price)}</strong> · ${esc(catLabel)} ${esc(modeLabel)}${cityState ? ` · ${esc(cityState)}` : ""}</p>
    ${l.cover_image_url ? `<img src="${esc(image)}" alt="${esc(`${title}${cityState ? ` in ${cityState}` : ""} on Vendibook`)}" />` : ""}
    <section>
      <h2>About this ${esc(catLabel.toLowerCase())}</h2>
      <p>${esc(l.description ?? desc)}</p>
    </section>
    <section>
      <h2>Continue browsing</h2>
      <ul>
        <li><a href="${SITE_URL}/${catSlug}">All ${esc(catLabel.toLowerCase())}s on Vendibook</a></li>
        ${cityState ? `<li><a href="${SITE_URL}/${esc((l.city ?? "").toLowerCase().replace(/\s+/g, "-"))}/${catSlug}">${esc(catLabel)}s in ${esc(cityState)}</a></li>` : ""}
        <li><a href="${SITE_URL}/search?category=${esc(l.category ?? "")}">Open advanced search</a></li>
      </ul>
    </section>
    <p><a href="${esc(canonical)}">View the full interactive listing on Vendibook</a></p>
  </main>
</body>
</html>`;
}

function notFoundHtml(id: string): string {
  return `<!doctype html>
<html lang="en"><head>
<meta charset="UTF-8" />
<title>Listing not found | Vendibook</title>
<meta name="robots" content="noindex,nofollow" />
<link rel="canonical" href="${SITE_URL}/listing/${esc(id)}" />
</head><body><h1>Listing not found</h1><p><a href="${SITE_URL}/">Return to Vendibook</a></p></body></html>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    // Support both /functions/v1/prerender-listing/{id} and ?id={id}
    const pathParts = url.pathname.split("/").filter(Boolean);
    const idFromPath = pathParts[pathParts.length - 1];
    const id = url.searchParams.get("id") ?? (idFromPath && idFromPath !== "prerender-listing" ? idFromPath : null);

    if (!id) {
      return new Response("Missing listing id", { status: 400, headers: corsHeaders });
    }

    const listing = await fetchListing(id);
    const body = listing ? buildHtml(listing) : notFoundHtml(id);

    return new Response(body, {
      status: listing ? 200 : 404,
      headers: {
        ...corsHeaders,
        "Content-Type": "text/html; charset=utf-8",
        // Crawlers cache this; tune as needed
        "Cache-Control": "public, max-age=300, s-maxage=900, stale-while-revalidate=3600",
        "X-Robots-Tag": listing ? "index, follow" : "noindex, nofollow",
      },
    });
  } catch (err) {
    return new Response(`Prerender error: ${(err as Error).message}`, {
      status: 500,
      headers: corsHeaders,
    });
  }
});
