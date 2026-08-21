import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveListingBrand } from "../_shared/resolveListingBrand.ts";

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

const BLOG_CATEGORY_LABELS: Record<string, string> = {
  "getting-started": "Getting Started",
  "industry-insights": "Industry Insights",
  "business-tips": "Business Tips",
  "success-stories": "Success Stories",
  "equipment-guides": "Equipment Guides",
  "permits-regulations": "Permits & Regulations",
  "selling-guide": "Selling Your Asset",
};

interface BlogPostMeta {
  slug: string;
  title: string;
  description: string;
  image: string;
  author: string;
  datePublished: string;
  category: string;
  readingTime: string;
}

const BLOG_POSTS: BlogPostMeta[] = [
  {
    slug: "texas-mobile-food-vendor-law-2026",
    title: "Texas Is Changing Food Truck Licensing: What the New Statewide Mobile Food Vendor Law Means for Owners, Renters, Sellers, and Operators",
    description: "Starting July 1, 2026, Texas mobile food vendors move to a statewide DSHS license. Here is what it means for food trailer rentals, fleet owners, sellers, operators, and event hosts.",
    image: "/images/blog/texas-mobile-food-vendor-law-cover.jpg",
    author: "Vendibook Editorial",
    datePublished: "2026-06-10",
    category: "permits-regulations",
    readingTime: "12",
  },
  {
    slug: "new-exit-plan-food-truck-after-layoffs",
    title: "The New Exit Plan: A Food Truck, a Recipe, and a Fresh Start After Layoffs",
    description: "As AI reshapes the workforce, more Americans are turning job loss into ownership through food trucks, trailers, shared kitchens, and mobile food businesses.",
    image: "/images/blog/new-exit-plan-food-truck.png",
    author: "Brad Pittman",
    datePublished: "2026-05-31",
    category: "industry-insights",
    readingTime: "9",
  },
  {
    slug: "restaurant-proof-of-concept-shared-kitchens",
    title: "The $250k Gamble: Why Smart Chefs Test Concepts in Shared Kitchens First",
    description: "Don't sign a lease until you've tested your menu. Learn why the \"Lean Startup\" method using shared kitchens and food trucks is the smartest financial move for new food entrepreneurs.",
    image: "/images/blog/restaurant-proof-of-concept-cover.png",
    author: "Brock De Santis",
    datePublished: "2026-02-07",
    category: "getting-started",
    readingTime: "8",
  },
  {
    slug: "sell-vs-rent-food-trailer-truck-ghost-kitchen",
    title: "Sell vs Rent Your Food Trailer, Truck, or Ghost Kitchen: Why the New Food Business Is Fluid",
    description: "The modern food entrepreneur doesn't just choose sell or rent—they stay flexible. Learn how to monetize your food trailer, truck, or ghost kitchen the smart way.",
    image: "/images/blog/sell-vs-rent-food-truck.jpg",
    author: "Vendibook Team",
    datePublished: "2026-01-27",
    category: "business-tips",
    readingTime: "10",
  },
  {
    slug: "rent-out-vendor-lot-commercial-property-host-guide",
    title: "How to Rent Out Your Vendor Space or Commercial Property: The Complete Host Guide",
    description: "Turn your empty lot, parking space, or commercial property into a recurring income stream by hosting food vendors. Learn how to become the kind of host vendors love.",
    image: "/images/blog/vendor-lot-hosting.webp",
    author: "Vendibook Team",
    datePublished: "2026-01-27",
    category: "business-tips",
    readingTime: "9",
  },
  {
    slug: "how-to-start-food-truck-business-2025",
    title: "How to Start a Food Truck Business in 2025: Complete Guide",
    description: "Everything you need to know about starting a food truck business in 2025, from initial planning to your first day of sales.",
    image: "/images/blog/food-truck-editorial-hero.jpg",
    author: "Vendibook Team",
    datePublished: "2025-01-15",
    category: "getting-started",
    readingTime: "8",
  },
  {
    slug: "food-truck-vs-food-trailer-which-is-right",
    title: "Food Truck vs Food Trailer: Which Is Right for Your Business?",
    description: "Compare food trucks and food trailers to determine which mobile kitchen option best fits your business model, budget, and goals.",
    image: "",
    author: "Vendibook Team",
    datePublished: "2025-01-10",
    category: "equipment-guides",
    readingTime: "6",
  },
  {
    slug: "ghost-kitchen-startup-guide",
    title: "Ghost Kitchen Startup Guide: Launch a Delivery-Only Restaurant",
    description: "Learn how to start a ghost kitchen business, from concept development to delivery platform optimization.",
    image: "",
    author: "Vendibook Team",
    datePublished: "2025-01-05",
    category: "getting-started",
    readingTime: "7",
  },
  {
    slug: "vendor-lot-location-tips",
    title: "10 Tips for Choosing the Perfect Vendor Space Location",
    description: "Location can make or break your food truck business. Learn how to evaluate and select the best Vendor Space for maximum sales.",
    image: "",
    author: "Vendibook Team",
    datePublished: "2024-12-20",
    category: "business-tips",
    readingTime: "5",
  },
  {
    slug: "food-truck-maintenance-checklist",
    title: "The Complete Food Truck Maintenance Checklist",
    description: "Keep your food truck running smoothly with this comprehensive maintenance checklist covering daily, weekly, and monthly tasks.",
    image: "",
    author: "Vendibook Team",
    datePublished: "2024-12-15",
    category: "equipment-guides",
    readingTime: "6",
  },
  {
    slug: "mobile-food-permit-guide-by-state",
    title: "Mobile Food Vendor Permits: A State-by-State Guide",
    description: "Navigate the complex world of mobile food vendor permits with our comprehensive state-by-state breakdown.",
    image: "",
    author: "Vendibook Team",
    datePublished: "2024-12-10",
    category: "permits-regulations",
    readingTime: "8",
  },
  {
    slug: "sell-my-food-truck-valuation-guide-2026",
    title: "How to Sell Your Food Truck in 2026: The Ultimate Valuation & Exit Guide",
    description: "Stop guessing your truck's value. Discover the 2026 resale market trends, calculate your truck's true worth, and learn why listing on specialized platforms like Vendibook gets you 20% higher offers.",
    image: "/images/blog/food-truck-editorial-hero.jpg",
    author: "Vendibook Team",
    datePublished: "2026-01-15",
    category: "equipment-guides",
    readingTime: "9",
  },
  {
    slug: "sell-my-food-trailer-vs-truck-resale-value",
    title: "Food Truck vs. Food Trailer: Which Sells Faster? (And How to Price Yours)",
    description: "Selling a food trailer? It might sell faster than a truck. Learn the pros/cons of selling trailers vs. trucks, specific resale tips for 2026, and how to list on Vendibook.",
    image: "/images/blog/food-truck-editorial-hero.jpg",
    author: "Vendibook Team",
    datePublished: "2026-01-18",
    category: "equipment-guides",
    readingTime: "7",
  },
  {
    slug: "stand-out-food-truck-marketplace-tools",
    title: "How to Stand Out in a Crowded Food Truck Marketplace (And Keep Your Truck Booked)",
    description: "Want to rent or sell your food truck faster? Learn how to optimize your marketplace listing using AI tools like PricePilot and Listing Studio to stand out on Vendibook.",
    image: "/images/food-truck-marketplace-analytics.jpg",
    author: "Vendibook Team",
    datePublished: "2026-01-21",
    category: "business-tips",
    readingTime: "6",
  },
  {
    slug: "parked-food-truck-losing-money-rent-it-out",
    title: "Your Parked Food Truck is Losing You Money. Here's How to Rent It Out Safely.",
    description: "Learn how to rent out your food truck or trailer on Vendibook. Discover best practices for daily vs. monthly rentals, meet your target renters, and turn your idle asset into significant monthly income—even while it's listed for sale.",
    image: "/images/blog/parked-food-truck-rental.png",
    author: "Brock De Santis",
    datePublished: "2026-02-14",
    category: "business-tips",
    readingTime: "8",
  },
  {
    slug: "modern-food-truck-marketplace-2026",
    title: "The Modern Food Truck Marketplace: How to Rent, Buy, or Launch a Mobile Food Business in 2026",
    description: "Discover how a dedicated food truck marketplace helps entrepreneurs rent, buy, or sell food trucks, lease commercial kitchens, and book vendor spaces — all with secure payments and identity verification.",
    image: "/images/blog/food-truck-marketplace-2026.png",
    author: "Vendibook Team",
    datePublished: "2026-02-16",
    category: "industry-insights",
    readingTime: "12",
  },
  {
    slug: "food-truck-financing-options",
    title: "Food Truck Financing in 2026: Loans, Leases & How to Qualify",
    description: "Complete 2026 guide to financing a food truck or trailer — SBA loans, equipment leases, in-house financing, and credit-score requirements. Real rates and lender options.",
    image: "/images/blog/food-truck-financing-options.png",
    author: "Vendibook Team",
    datePublished: "2026-04-15",
    category: "business-tips",
    readingTime: "9",
  },
  {
    slug: "rise-food-truck-fleet-owner",
    title: "The Rise of the Food Truck Fleet Owner",
    description: "Food trucks are becoming rentable mobile business infrastructure. Learn how fleet owners, remote access, tracking, maintenance workflows, and platforms like Vendibook are changing food entrepreneurship.",
    image: "/__l5e/assets-v1/361dd7e0-9a47-45ed-b87f-9578bf539ccb/rise-food-truck-fleet-owner.png",
    author: "Vendibook",
    datePublished: "2026-06-11",
    category: "industry-insights",
    readingTime: "11",
  },
];

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function generateProductSchema(listing: any, reviews: any[] = []) {
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

  const availability = listing.status === "published"
    ? "https://schema.org/InStock"
    : "https://schema.org/OutOfStock";
  const itemCondition = listing.condition === "new"
    ? "https://schema.org/NewCondition"
    : listing.condition === "refurbished"
    ? "https://schema.org/RefurbishedCondition"
    : "https://schema.org/UsedCondition";

  const offerBase: Record<string, any> = {
    "@type": "Offer",
    url: `${SITE_URL}/listing/${listing.id}`,
    priceCurrency: "USD",
    price: price.toString(),
    priceValidUntil: new Date(Date.now() + 90 * 86400000).toISOString().split("T")[0],
    availability,
    itemCondition,
    seller: { "@type": "Organization", name: "Vendibook Host" },
  };

  // Add return policy and shipping for sale listings
  if (!isRental) {
    offerBase.hasMerchantReturnPolicy = {
      "@type": "MerchantReturnPolicy",
      applicableCountry: "US",
      returnPolicyCategory: "https://schema.org/MerchantReturnNotPermitted",
      merchantReturnLink: `${SITE_URL}/terms`,
    };
    if (["food_truck", "food_trailer"].includes(listing.category)) {
      offerBase.shippingDetails = {
        "@type": "OfferShippingDetails",
        shippingDestination: { "@type": "DefinedRegion", addressCountry: "US" },
        deliveryTime: {
          "@type": "ShippingDeliveryTime",
          handlingTime: { "@type": "QuantitativeValue", minValue: 1, maxValue: 14, unitCode: "DAY" },
          transitTime: { "@type": "QuantitativeValue", minValue: 1, maxValue: 21, unitCode: "DAY" },
        },
      };
    }
  }

  const schema: Record<string, any> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: seoName,
    description: listing.description?.slice(0, 5000) || `${categoryLabel} ${modeLabel}`,
    url: `${SITE_URL}/listing/${listing.id}`,
    image: images,
    sku: listing.id,
    mpn: listing.id,
    brand: { "@type": "Brand", name: resolveListingBrand(listing) },
    category: `Commercial Kitchen Equipment > ${categoryLabel}`,
    offers: offerBase,
  };

  // Add aggregateRating if reviews exist
  if (reviews.length > 0) {
    const avg = reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviews.length;
    schema.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: (Math.round(avg * 10) / 10).toFixed(1),
      bestRating: "5",
      worstRating: "1",
      reviewCount: reviews.length.toString(),
    };

    // Add individual review objects (up to 5)
    schema.review = reviews.slice(0, 5).map((r: any) => ({
      "@type": "Review",
      author: { "@type": "Person", name: r.reviewer_display_name || "Vendibook User" },
      datePublished: r.created_at?.split("T")[0] || new Date().toISOString().split("T")[0],
      reviewRating: {
        "@type": "Rating",
        ratingValue: r.rating.toString(),
        bestRating: "5",
        worstRating: "1",
      },
      ...(r.review_text ? { reviewBody: r.review_text.slice(0, 500) } : {}),
    }));
  }

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

function buildListingHTML(listing: any, reviews: any[] = []): string {
  const isPhysical = PHYSICAL_CATEGORIES.includes(listing.category);
  const isRental = listing.mode === "rent";

  const schemas: object[] = [];
  if (isPhysical) schemas.push(generateLocalBusinessSchema(listing));
  else schemas.push(generateProductSchema(listing, reviews));
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
  const imageUrl = listing.cover_image_url || `${SITE_URL}/images/social/vendibook-og-default.jpg`;
  const imageAlt = `${listing.title} — ${categoryLabel} ${modeLabel} on Vendibook`;

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
  <meta property="og:image" content="${escapeHtml(imageUrl)}" />
  <meta property="og:image:secure_url" content="${escapeHtml(imageUrl)}" />
  <meta property="og:image:alt" content="${escapeHtml(imageAlt)}" />
  <meta property="og:site_name" content="Vendibook" />
  <meta property="og:locale" content="en_US" />
  ${!isPhysical && priceText ? `
  <meta property="product:price:amount" content="${String(listing.price_sale || listing.price_daily || listing.price_weekly || 0)}" />
  <meta property="product:price:currency" content="USD" />
  <meta property="product:availability" content="${listing.status === "published" ? "in_stock" : "out_of_stock"}" />
  <meta property="product:condition" content="${listing.condition === "new" ? "new" : listing.condition === "refurbished" ? "refurbished" : "used"}" />
  <meta property="product:brand" content="${escapeHtml(resolveListingBrand(listing))}" />
  <meta property="product:retailer_item_id" content="${listing.id}" />` : ""}

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${escapeHtml(imageUrl)}" />
  <meta name="twitter:image:alt" content="${escapeHtml(imageAlt)}" />
  <meta name="twitter:site" content="@vendibook" />

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
  <p>Brand: ${escapeHtml(resolveListingBrand(listing))}</p>
  ${!isRental ? `<p>Condition: ${escapeHtml(listing.condition || "Used")}</p>` : ""}
  ${!isRental ? `<p>Return Policy: All asset sales are final. Review listing details and confirm terms with the seller before purchase.</p>` : ""}
  ${!isRental && ["food_truck", "food_trailer"].includes(listing.category) ? `<p>Pickup &amp; Transfer: Coordinated directly with the seller.</p>` : ""}
  <p>${escapeHtml((listing.description || "").slice(0, 500))}</p>
  <p><a href="${canonicalUrl}">View on Vendibook</a></p>
</body>
</html>`;
}

function buildBlogHTML(post: BlogPostMeta): string {
  const categoryLabel = BLOG_CATEGORY_LABELS[post.category] || post.category;
  const canonicalUrl = `${SITE_URL}/blog/${post.slug}`;
  const imageUrl = post.image.startsWith("http")
    ? post.image
    : post.image
    ? `${SITE_URL}${post.image}`
    : `${SITE_URL}/images/social/vendibook-og-default.jpg`;

  const schema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    url: canonicalUrl,
    image: imageUrl,
    author: {
      "@type": post.author === "Vendibook" || post.author === "Vendibook Team" || post.author === "Vendibook Editorial"
        ? "Organization"
        : "Person",
      name: post.author,
    },
    publisher: {
      "@type": "Organization",
      name: "Vendibook",
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/images/vendibook-logo.png`,
      },
    },
    datePublished: post.datePublished,
    dateModified: post.datePublished,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": canonicalUrl,
    },
    articleSection: categoryLabel,
  };

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />

  <title>${escapeHtml(post.title)} | Vendibook</title>
  <meta name="description" content="${escapeHtml(post.description)}" />
  <link rel="canonical" href="${canonicalUrl}" />

  <!-- Open Graph -->
  <meta property="og:type" content="article" />
  <meta property="og:title" content="${escapeHtml(post.title)}" />
  <meta property="og:description" content="${escapeHtml(post.description)}" />
  <meta property="og:url" content="${canonicalUrl}" />
  <meta property="og:image" content="${escapeHtml(imageUrl)}" />
  <meta property="og:image:secure_url" content="${escapeHtml(imageUrl)}" />
  <meta property="og:image:alt" content="${escapeHtml(imageAlt)}" />
  <meta property="og:site_name" content="Vendibook" />
  <meta property="og:locale" content="en_US" />
  <meta property="og:locale" content="en_US" />
  <meta property="article:published_time" content="${post.datePublished}" />
  <meta property="article:author" content="${escapeHtml(post.author)}" />
  <meta property="article:section" content="${escapeHtml(categoryLabel)}" />

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(post.title)}" />
  <meta name="twitter:description" content="${escapeHtml(post.description)}" />
  <meta name="twitter:image" content="${escapeHtml(imageUrl)}" />
  <meta name="twitter:image:alt" content="${escapeHtml(imageAlt)}" />
  <meta name="twitter:site" content="@vendibook" />

  <!-- JSON-LD -->
  <script type="application/ld+json">${JSON.stringify(schema)}</script>

  <!-- Redirect humans to SPA -->
  <script>window.location.replace(${JSON.stringify(canonicalUrl)});</script>
  <noscript>
    <meta http-equiv="refresh" content="0; url=${canonicalUrl}" />
  </noscript>
</head>
<body>
  <h1>${escapeHtml(post.title)}</h1>
  <p>${escapeHtml(post.description)}</p>
  <p><a href="${canonicalUrl}">Read the full article on Vendibook</a></p>
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

    // Return 410 Gone for legacy URLs that no longer exist
    const legacyPatterns = [
      /^\/ListingDetail/i,
      /^\/listingdetail/i,
      /^\/searchresults/i,
      /^\/SearchResults/i,
      /^\/sign-up$/i,
      /^\/features$/i,
      /^\/safety$/i,
      /^\/create$/i,
      /^\/OrganizerDashboard/i,
    ];
    if (legacyPatterns.some((re) => re.test(path))) {
      return new Response("Gone – this page has been permanently removed.", {
        status: 410,
        headers: { ...corsHeaders, "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    // Handle listing detail pages: /listing/UUID (and the /share/listing/UUID alias
    // so social crawlers scraping the pretty share URL still get per-listing OG tags).
    const listingMatch = path.match(/^\/(?:share\/)?listing\/([a-f0-9-]{36})$/i);
    if (listingMatch) {
      const listingId = listingMatch[1];
      
      // Fetch listing and reviews in parallel
      const [listingResult, reviewsResult] = await Promise.all([
        supabase
          .from("listings")
          .select("*")
          .eq("id", listingId)
          .eq("status", "published").not("published_at", "is", null).is("deleted_at", null).eq("moderation_status", "clear")
          .single(),
        supabase
          .rpc("get_listing_reviews_safe", { p_listing_id: listingId }),
      ]);

      if (listingResult.error || !listingResult.data) {
        return new Response("Not Found", { status: 404, headers: corsHeaders });
      }

      const reviews = reviewsResult.data || [];
      const html = buildListingHTML(listingResult.data, reviews);
      return new Response(html, {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/html; charset=utf-8",
          // Aggressive edge caching: 1h browser, 24h CDN, 7d stale-while-revalidate.
          // Sub-100ms TTFB after first warm hit.
          "Cache-Control":
            "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
          "CDN-Cache-Control": "public, max-age=86400",
          "Vercel-CDN-Cache-Control": "public, max-age=86400",
          "Surrogate-Control": "public, max-age=86400",
          Vary: "Accept-Encoding",
        },
      });
    }

    // Handle blog posts: /blog/:slug
    const blogMatch = path.match(/^\/blog\/([a-z0-9-]+)$/i);
    if (blogMatch) {
      const blogSlug = blogMatch[1];
      const post = BLOG_POSTS.find((p) => p.slug === blogSlug);
      if (!post) {
        return new Response("Not Found", { status: 404, headers: corsHeaders });
      }
      const html = buildBlogHTML(post);
      return new Response(html, {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control":
            "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
          "CDN-Cache-Control": "public, max-age=86400",
          "Vercel-CDN-Cache-Control": "public, max-age=86400",
          "Surrogate-Control": "public, max-age=86400",
          Vary: "Accept-Encoding",
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
