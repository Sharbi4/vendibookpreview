/**
 * Generates sitemap-listings.xml and sitemap-locations.xml from live Supabase data.
 * Runs at predev + prebuild. Uses the public anon key (data is already public).
 *
 * Output:
 *   public/sitemap-listings.xml  — one <url> per active published listing, with <image:image>
 *   public/sitemap-locations.xml — city + category/city combo pages derived from real listing inventory
 */
import { writeFileSync, mkdirSync } from "fs";
import { resolve } from "path";

const BASE_URL = "https://vendibook.com";
const SUPABASE_URL = "https://nbrehbwfsmedbelzntqs.supabase.co";
const ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5icmVoYndmc21lZGJlbHpudHFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxMDgzMTMsImV4cCI6MjA4MzY4NDMxM30.EkA-lGUmkLQ9rPAO-unLxGGGHVmPDdVR8awlA2ShVpU";

const CATEGORY_SLUGS: Record<string, string> = {
  food_truck: "food-truck",
  food_trailer: "food-trailer",
  ghost_kitchen: "shared-kitchen",
  vendor_space: "vendor-space",
};

interface Listing {
  id: string;
  title: string | null;
  category: string | null;
  city: string | null;
  state: string | null;
  cover_image_url: string | null;
  updated_at: string | null;
}

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function fetchListings(): Promise<Listing[]> {
  const url = `${SUPABASE_URL}/rest/v1/listings?select=id,title,category,city,state,cover_image_url,updated_at&status=eq.published&published_at=not.is.null&title=not.ilike.demo*&limit=10000`;
  const res = await fetch(url, {
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${ANON_KEY}`,
    },
  });
  if (!res.ok) {
    throw new Error(`Supabase fetch failed: ${res.status} ${await res.text()}`);
  }
  return (await res.json()) as Listing[];
}

function buildListingsSitemap(listings: Listing[]): string {
  const today = new Date().toISOString().slice(0, 10);
  const urls = listings.map((l) => {
    const loc = `${BASE_URL}/listing/${l.id}`;
    const lastmod = (l.updated_at || today).slice(0, 10);
    const lines: string[] = [];
    lines.push("  <url>");
    lines.push(`    <loc>${loc}</loc>`);
    lines.push(`    <lastmod>${lastmod}</lastmod>`);
    lines.push("    <changefreq>weekly</changefreq>");
    lines.push("    <priority>0.8</priority>");
    if (l.cover_image_url && /^https?:\/\//i.test(l.cover_image_url)) {
      const title = l.title ? xmlEscape(l.title) : "Vendibook listing";
      const cityState = [l.city, l.state].filter(Boolean).join(", ");
      const caption = xmlEscape(
        `${l.title || "Listing"}${cityState ? ` in ${cityState}` : ""} on Vendibook`,
      );
      lines.push("    <image:image>");
      lines.push(`      <image:loc>${xmlEscape(l.cover_image_url)}</image:loc>`);
      lines.push(`      <image:title>${title}</image:title>`);
      lines.push(`      <image:caption>${caption}</image:caption>`);
      lines.push("    </image:image>");
    }
    lines.push("  </url>");
    return lines.join("\n");
  });

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">`,
    ...urls,
    `</urlset>`,
    "",
  ].join("\n");
}

function buildLocationsSitemap(listings: Listing[]): string {
  const today = new Date().toISOString().slice(0, 10);
  const citySlugs = new Set<string>();
  const cityStateCategory = new Set<string>(); // `${categorySlug}|${cityStateSlug}`

  for (const l of listings) {
    if (!l.city || !l.state) continue;
    const citySlug = slugify(l.city);
    const stateSlug = slugify(l.state);
    if (!citySlug || !stateSlug) continue;
    citySlugs.add(citySlug);
    const cityStateSlug = `${citySlug}-${stateSlug}`;
    const cat = l.category ? CATEGORY_SLUGS[l.category] : null;
    if (cat) cityStateCategory.add(`${cat}|${cityStateSlug}`);
  }

  const entries: string[] = [];
  for (const slug of [...citySlugs].sort()) {
    entries.push(
      `  <url><loc>${BASE_URL}/${slug}</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>`,
    );
  }
  for (const combo of [...cityStateCategory].sort()) {
    const [cat, cityState] = combo.split("|");
    entries.push(
      `  <url><loc>${BASE_URL}/rent/${cat}/${cityState}</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>0.75</priority></url>`,
    );
    entries.push(
      `  <url><loc>${BASE_URL}/buy/${cat}/${cityState}</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>0.75</priority></url>`,
    );
  }

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...entries,
    `</urlset>`,
    "",
  ].join("\n");
}

async function main() {
  try {
    const listings = await fetchListings();
    const listingsXml = buildListingsSitemap(listings);
    const locationsXml = buildLocationsSitemap(listings);

    mkdirSync(resolve("public"), { recursive: true });
    writeFileSync(resolve("public/sitemap-listings.xml"), listingsXml);
    writeFileSync(resolve("public/sitemap-locations.xml"), locationsXml);

    console.log(
      `[sitemaps] wrote sitemap-listings.xml (${listings.length} listings) + sitemap-locations.xml`,
    );
  } catch (err) {
    // Never fail the build/dev start over sitemap generation — write empty valid files
    console.warn(`[sitemaps] generation failed, writing empty sitemaps: ${(err as Error).message}`);
    const empty = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>\n`;
    try {
      mkdirSync(resolve("public"), { recursive: true });
      writeFileSync(resolve("public/sitemap-listings.xml"), empty);
      writeFileSync(resolve("public/sitemap-locations.xml"), empty);
    } catch {
      /* ignore */
    }
  }
}

main();
