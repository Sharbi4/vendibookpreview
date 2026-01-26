import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[FACEBOOK-CATALOG-FEED] ${step}${detailsStr}`);
};

// Map listing categories to Facebook product categories
const getCategoryMapping = (category: string): string => {
  const mappings: Record<string, string> = {
    'food_truck': 'Vehicles & Parts > Vehicles > Motor Vehicles > Cars, Trucks & Vans',
    'food_trailer': 'Vehicles & Parts > Vehicles > Motor Vehicles > Recreational Vehicles',
    'ghost_kitchen': 'Business & Industrial > Food Service > Commercial Kitchen Equipment',
    'vendor_lot': 'Business & Industrial > Real Estate',
  };
  return mappings[category] || 'Business & Industrial';
};

// Escape XML special characters
const escapeXml = (text: string): string => {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
};

// Clean description for feed (remove HTML, limit length)
const cleanDescription = (text: string): string => {
  if (!text) return '';
  // Remove HTML tags and limit to 5000 chars (Facebook limit)
  return text.replace(/<[^>]*>/g, '').substring(0, 5000);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Generating Facebook Catalog feed");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Fetch all published sale listings
    const { data: listings, error } = await supabaseClient
      .from("listings")
      .select("*")
      .eq("status", "published")
      .eq("mode", "sale")
      .not("price_sale", "is", null);

    if (error) {
      logStep("Database error", { error: error.message });
      throw new Error(error.message);
    }

    logStep("Fetched listings", { count: listings?.length || 0 });

    const siteUrl = "https://vendibook.com";
    const currentDate = new Date().toISOString();

    // Generate XML feed in Facebook/Google Merchant format
    let xmlItems = '';
    
    for (const listing of listings || []) {
      const price = listing.price_sale ? `${listing.price_sale.toFixed(2)} USD` : '';
      const imageUrl = listing.cover_image_url || listing.image_urls?.[0] || '';
      const productUrl = `${siteUrl}/listing/${listing.id}`;
      const condition = 'used'; // Most food trucks/trailers are used
      
      // Determine availability
      const availability = 'in stock';

      xmlItems += `
    <item>
      <g:id>${escapeXml(listing.id)}</g:id>
      <g:title>${escapeXml(listing.title.substring(0, 150))}</g:title>
      <g:description>${escapeXml(cleanDescription(listing.description))}</g:description>
      <g:link>${escapeXml(productUrl)}</g:link>
      <g:image_link>${escapeXml(imageUrl)}</g:image_link>
      <g:availability>${availability}</g:availability>
      <g:price>${escapeXml(price)}</g:price>
      <g:condition>${condition}</g:condition>
      <g:brand>Vendibook</g:brand>
      <g:google_product_category>${escapeXml(getCategoryMapping(listing.category))}</g:google_product_category>
      <g:product_type>${escapeXml(listing.category?.replace(/_/g, ' ') || 'Food Truck')}</g:product_type>
      ${listing.address ? `<g:location>${escapeXml(listing.address)}</g:location>` : ''}
      ${listing.image_urls?.slice(1, 10).map((img: string, idx: number) => 
        `<g:additional_image_link>${escapeXml(img)}</g:additional_image_link>`
      ).join('\n      ') || ''}
    </item>`;
    }

    const xmlFeed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>Vendibook - Food Trucks &amp; Mobile Vendor Marketplace</title>
    <link>${siteUrl}</link>
    <description>Buy food trucks, food trailers, ghost kitchens, and vendor lots on Vendibook.</description>
    <lastBuildDate>${currentDate}</lastBuildDate>${xmlItems}
  </channel>
</rss>`;

    logStep("Feed generated successfully", { itemCount: listings?.length || 0 });

    return new Response(xmlFeed, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600", // Cache for 1 hour
      },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(`<?xml version="1.0" encoding="UTF-8"?><error>${errorMessage}</error>`, {
      headers: { ...corsHeaders, "Content-Type": "application/xml" },
      status: 500,
    });
  }
});
