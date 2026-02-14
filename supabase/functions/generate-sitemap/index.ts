import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// All supported cities with state codes
const CITIES = [
  { slug: "houston", stateCode: "tx" },
  { slug: "los-angeles", stateCode: "ca" },
  { slug: "dallas", stateCode: "tx" },
  { slug: "phoenix", stateCode: "az" },
  { slug: "tampa", stateCode: "fl" },
  { slug: "portland", stateCode: "or" },
  { slug: "miami", stateCode: "fl" },
  { slug: "atlanta", stateCode: "ga" },
  { slug: "austin", stateCode: "tx" },
  { slug: "san-antonio", stateCode: "tx" },
  { slug: "chicago", stateCode: "il" },
];

const CATEGORY_SLUGS = ["food-trucks", "food-trailers", "commercial-kitchens", "vendor-spaces"];
const MODES = ["rent", "buy"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const type = url.searchParams.get("type") || "index";

    if (type === "index") {
      // Sitemap index
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>https://vendibook.com/sitemap_pages.xml</loc>
  </sitemap>
  <sitemap>
    <loc>https://vendibook.com/api/sitemap?type=listings</loc>
    <lastmod>${new Date().toISOString().split("T")[0]}</lastmod>
  </sitemap>
  <sitemap>
    <loc>https://vendibook.com/api/sitemap?type=locations</loc>
    <lastmod>${new Date().toISOString().split("T")[0]}</lastmod>
  </sitemap>
</sitemapindex>`;

      return new Response(xml, {
        headers: { ...corsHeaders, "Content-Type": "application/xml" },
      });
    }

    if (type === "listings") {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      const { data: listings } = await supabase
        .from("listings")
        .select("id, updated_at")
        .eq("status", "published")
        .order("updated_at", { ascending: false })
        .limit(1000);

      const urls = (listings || [])
        .map(
          (l) => `  <url>
    <loc>https://vendibook.com/listing/${l.id}</loc>
    <lastmod>${new Date(l.updated_at).toISOString().split("T")[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`
        )
        .join("\n");

      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

      return new Response(xml, {
        headers: { ...corsHeaders, "Content-Type": "application/xml" },
      });
    }

    if (type === "locations") {
      const today = new Date().toISOString().split("T")[0];
      const urls: string[] = [];

      for (const city of CITIES) {
        for (const cat of CATEGORY_SLUGS) {
          for (const mode of MODES) {
            urls.push(`  <url>
    <loc>https://vendibook.com/${mode}/${cat}/${city.slug}-${city.stateCode}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`);
          }
        }
      }

      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>`;

      return new Response(xml, {
        headers: { ...corsHeaders, "Content-Type": "application/xml" },
      });
    }

    return new Response("Unknown sitemap type", { status: 400, headers: corsHeaders });
  } catch (error) {
    console.error("Sitemap generation error:", error);
    return new Response("Internal server error", { status: 500, headers: corsHeaders });
  }
});
