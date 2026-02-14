import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SITE_URL = "https://vendibook.com";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const CATEGORY_LABELS: Record<string, string> = {
  food_truck: "Food Truck",
  food_trailer: "Food Trailer",
  ghost_kitchen: "Shared Kitchen",
  vendor_lot: "Vendor Space",
  vendor_space: "Vendor Space",
};

const PHYSICAL_CATEGORIES = ["ghost_kitchen", "vendor_lot", "vendor_space"];

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function generateProductSchema(listing: any) {
  const categoryLabel = CATEGORY_LABELS[listing.category] || "Mobile Food Asset";
  const isRental = listing.mode === "rent";
  const modeLabel = isRental ? "for Rent" : "for Sale";

  const city = listing.city || "";
  const state = listing.state || "";
  const locationShort = city && state ? `${city}, ${state}` : city;
  const seoName = locationShort
    ? `${categoryLabel} ${modeLabel} in ${locationShort} - ${listing.title}`
    : `${categoryLabel} ${modeLabel} - ${listing.title}`;

  const price = isRental
    ? listing.price_daily || listing.price_weekly || 0
    : listing.price_sale || 0;

  const images = listing.image_urls?.length
    ? listing.image_urls
    : listing.cover_image_url
    ? [listing.cover_image_url]
    : [`${SITE_URL}/placeholder.svg`];

  const schema: Record<string, any> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: seoName,
    description: listing.description?.slice(0, 5000) || `${categoryLabel} ${modeLabel}`,
    url: `${SITE_URL}/listing/${listing.id}`,
    image: images,
    sku: listing.id,
    mpn: listing.id,
    brand: { "@type": "Brand", name: "Vendibook" },
    category: `Commercial Kitchen Equipment > ${categoryLabel}`,
    offers: {
      "@type": "Offer",
      url: `${SITE_URL}/listing/${listing.id}`,
      priceCurrency: "USD",
      price: price.toString(),
      priceValidUntil: new Date(Date.now() + 90 * 86400000).toISOString().split("T")[0],
      availability: listing.status === "published"
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/UsedCondition",
      seller: { "@type": "Organization", name: "Vendibook Host" },
    },
  };

  if (isRental) {
    schema.offers.priceSpecification = {
      "@type": "UnitPriceSpecification",
      price: price.toString(),
      priceCurrency: "USD",
      unitCode: listing.price_daily ? "DAY" : "WK",
      unitText: listing.price_daily ? "per day" : "per week",
    };
  }

  if (city && state) {
    schema.offers.areaServed = {
      "@type": "City",
      name: city,
      containedInPlace: { "@type": "State", name: state },
    };
  }

  return schema;
}

function generateLocalBusinessSchema(listing: any) {
  const categoryLabel = CATEGORY_LABELS[listing.category] || "Commercial Kitchen";
  const city = listing.city || "";
  const state = listing.state || "";
  const price = listing.mode === "rent"
    ? listing.price_daily || listing.price_weekly || 0
    : listing.price_sale || 0;

  const schema: Record<string, any> = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: listing.title,
    description: listing.description?.slice(0, 500) || `${categoryLabel} available on Vendibook`,
    url: `${SITE_URL}/listing/${listing.id}`,
    "@id": `${SITE_URL}/listing/${listing.id}#business`,
  };

  if (listing.address) {
    schema.address = {
      "@type": "PostalAddress",
      addressLocality: city || undefined,
      addressRegion: state || undefined,
      postalCode: listing.postal_code || undefined,
      addressCountry: "US",
    };
  }

  if (listing.latitude && listing.longitude) {
    schema.geo = {
      "@type": "GeoCoordinates",
      latitude: listing.latitude,
      longitude: listing.longitude,
    };
  }

  schema.makesOffer = {
    "@type": "Offer",
    url: `${SITE_URL}/listing/${listing.id}`,
    priceCurrency: "USD",
    price: price.toString(),
    availability: "https://schema.org/InStock",
  };

  return schema;
}

function generateBreadcrumbSchema(listing: any) {
  const categoryLabels: Record<string, string> = {
    food_truck: "Food Trucks",
    food_trailer: "Food Trailers",
    ghost_kitchen: "Shared Kitchens",
    vendor_lot: "Vendor Spaces",
    vendor_space: "Vendor Spaces",
  };
  const modeLabel = listing.mode === "rent" ? "For Rent" : "For Sale";
  const categoryLabel = categoryLabels[listing.category] || "Listings";

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: modeLabel, item: `${SITE_URL}/search?mode=${listing.mode}` },
      { "@type": "ListItem", position: 3, name: categoryLabel, item: `${SITE_URL}/search?mode=${listing.mode}&category=${listing.category}` },
      { "@type": "ListItem", position: 4, name: listing.title, item: `${SITE_URL}/listing/${listing.id}` },
    ],
  };
}

function generateFAQSchema(listing: any) {
  const cat = CATEGORY_LABELS[listing.category]?.toLowerCase() || "listing";
  const isRental = listing.mode === "rent";
  const city = listing.city;
  const faqs: Array<{ question: string; answer: string }> = [];

  faqs.push({
    question: `Is this ${cat} available ${isRental ? "for rent" : "for sale"}?`,
    answer: listing.status === "published"
      ? `Yes, this ${cat} is currently available ${isRental ? "for rent" : "for purchase"} on Vendibook.`
      : `This ${cat} is not currently available.`,
  });

  if (isRental && (listing.price_daily || listing.price_weekly)) {
    const priceInfo = listing.price_daily ? `$${listing.price_daily}/day` : `$${listing.price_weekly}/week`;
    faqs.push({
      question: `How much does it cost to rent this ${cat}?`,
      answer: `Rental pricing starts at ${priceInfo}. Contact the host for custom quotes.`,
    });
  } else if (!isRental && listing.price_sale) {
    faqs.push({
      question: `What is the price of this ${cat}?`,
      answer: `This ${cat} is listed at $${listing.price_sale.toLocaleString()}.`,
    });
  }

  if (city) {
    faqs.push({
      question: `Where is this ${cat} located?`,
      answer: `This ${cat} is located in ${city}${listing.state ? `, ${listing.state}` : ""}.`,
    });
  }

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };
}

function buildListingHTML(listing: any): string {
  const isPhysical = PHYSICAL_CATEGORIES.includes(listing.category);

  const schemas: object[] = [];
  if (isPhysical) schemas.push(generateLocalBusinessSchema(listing));
  else schemas.push(generateProductSchema(listing));
  schemas.push(generateBreadcrumbSchema(listing));
  schemas.push(generateFAQSchema(listing));

  const categoryLabel = CATEGORY_LABELS[listing.category] || "Listing";
  const modeLabel = listing.mode === "rent" ? "for Rent" : "for Sale";
  const city = listing.city || "";
  const state = listing.state || "";
  const locationShort = city && state ? `${city}, ${state}` : city;

  const priceText = listing.mode === "rent"
    ? listing.price_daily ? `$${listing.price_daily}/day`
      : listing.price_weekly ? `$${listing.price_weekly}/week`
      : ""
    : listing.price_sale ? `$${Number(listing.price_sale).toLocaleString()}`
      : "";

  const title = [listing.title, `${categoryLabel} ${modeLabel}`, locationShort ? `in ${locationShort}` : ""]
    .filter(Boolean)
    .join(" ");

  const description = [
    `${listing.mode === "rent" ? "Rent" : "Buy"} this ${categoryLabel.toLowerCase()}`,
    locationShort ? `in ${locationShort}` : "",
    priceText ? `starting at ${priceText}` : "",
    "— on Vendibook.",
  ].filter(Boolean).join(" ").slice(0, 160);

  const canonicalUrl = `${SITE_URL}/listing/${listing.id}`;
  const imageUrl = listing.cover_image_url || `${SITE_URL}/placeholder.svg`;

  // IMPORTANT: JSON-LD is in its own <script> tag with pure JSON only.
  // Redirect is in a SEPARATE <script> tag.
  // escapeHtml is NOT applied to JSON-LD content (it's already inside a script tag).
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />

  <title>${escapeHtml(title)} | Vendibook</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <link rel="canonical" href="${canonicalUrl}" />

  <!-- Open Graph -->
  <meta property="og:type" content="${isPhysical ? "website" : "product"}" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:url" content="${canonicalUrl}" />
  <meta property="og:image" content="${imageUrl}" />
  <meta property="og:site_name" content="Vendibook" />
  ${!isPhysical && priceText ? `
  <meta property="product:price:amount" content="${String(listing.price_sale || listing.price_daily || listing.price_weekly || 0)}" />
  <meta property="product:price:currency" content="USD" />` : ""}

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${imageUrl}" />

  <!-- JSON-LD (pure JSON, no other content) -->
  <script type="application/ld+json">${JSON.stringify(schemas)}</script>

  <!-- Redirect humans to SPA (separate script tag) -->
  <script>window.location.replace(${JSON.stringify(canonicalUrl)});</script>
  <noscript>
    <meta http-equiv="refresh" content="0; url=${canonicalUrl}" />
  </noscript>
</head>
<body>
  <h1>${escapeHtml(listing.title)}</h1>
  <p>${escapeHtml(`${categoryLabel} ${modeLabel}${locationShort ? ` in ${locationShort}` : ""}`)}</p>
  ${priceText ? `<p>Price: ${escapeHtml(priceText)}</p>` : ""}
  <p>${escapeHtml((listing.description || "").slice(0, 500))}</p>
  <p><a href="${canonicalUrl}">View on Vendibook</a></p>
</body>
</html>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.searchParams.get("path");

    if (!path) {
      return new Response(JSON.stringify({ error: "Missing path parameter" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle listing detail pages: /listing/UUID
    const listingMatch = path.match(/^\/listing\/([a-f0-9-]{36})$/i);
    if (listingMatch) {
      const listingId = listingMatch[1];
      const { data: listing, error } = await supabase
        .from("listings")
        .select("*")
        .eq("id", listingId)
        .eq("status", "published")
        .single();

      if (error || !listing) {
        return new Response("Not Found", { status: 404, headers: corsHeaders });
      }

      const html = buildListingHTML(listing);
      return new Response(html, {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "public, max-age=3600, s-maxage=86400",
        },
      });
    }

    // Default: return 404 for unsupported paths
    return new Response("Not Found", { status: 404, headers: corsHeaders });
  } catch (e) {
    console.error("seo-prerender error:", e);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
