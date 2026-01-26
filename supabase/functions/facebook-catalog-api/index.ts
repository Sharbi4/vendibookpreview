import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[FACEBOOK-CATALOG-API] ${step}${detailsStr}`);
};

interface ProductData {
  id: string;
  title: string;
  description: string;
  availability: string;
  condition: string;
  price_cents: number;
  link: string;
  image_link: string;
  brand: string;
  category: string;
  additional_image_link?: string[];
}

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

// Create or update a product in Facebook Catalog
async function upsertProduct(catalogId: string, accessToken: string, product: ProductData): Promise<Response> {
  const url = `https://graph.facebook.com/v18.0/${catalogId}/products`;
  
  const requestData = {
    retailer_id: product.id,
    data: {
      name: product.title,
      description: product.description,
      availability: product.availability,
      condition: product.condition,
      price: Math.round(product.price_cents),
      currency: "USD",
      url: product.link,
      image_url: product.image_link,
      brand: product.brand,
      category: product.category,
      additional_image_urls: product.additional_image_link || [],
    }
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      access_token: accessToken,
      requests: [requestData],
    }),
  });

  return response;
}

// Delete a product from Facebook Catalog
async function deleteProduct(catalogId: string, accessToken: string, retailerId: string): Promise<Response> {
  const url = `https://graph.facebook.com/v18.0/${catalogId}/products`;
  
  const response = await fetch(url, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      access_token: accessToken,
      requests: [{ retailer_id: retailerId }],
    }),
  });

  return response;
}

// Batch update products in Facebook Catalog
async function batchUpdateProducts(catalogId: string, accessToken: string, products: ProductData[]): Promise<Response> {
  const url = `https://graph.facebook.com/v18.0/${catalogId}/batch`;
  
  const requests = products.map(product => ({
    method: "UPDATE",
    retailer_id: product.id,
    data: {
      name: product.title,
      description: product.description,
      availability: product.availability,
      condition: product.condition,
      price: Math.round(product.price_cents),
      currency: "USD",
      url: product.link,
      image_url: product.image_link,
      brand: product.brand,
      category: product.category,
      additional_image_urls: product.additional_image_link || [],
    }
  }));

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      access_token: accessToken,
      allow_upsert: true,
      requests: requests,
    }),
  });

  return response;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const accessToken = Deno.env.get("FB_CONVERSIONS_API_TOKEN");
    const catalogId = Deno.env.get("FB_CATALOG_ID");
    
    if (!accessToken) {
      throw new Error("FB_CONVERSIONS_API_TOKEN not configured");
    }
    
    if (!catalogId) {
      throw new Error("FB_CATALOG_ID not configured");
    }

    const { action, listingId } = await req.json();
    logStep("Processing request", { action, listingId });

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const siteUrl = "https://vendibook.com";

    if (action === "sync_all") {
      // Fetch all published sale listings
      const { data: listings, error } = await supabaseClient
        .from("listings")
        .select("*")
        .eq("status", "published")
        .eq("mode", "sale")
        .not("price_sale", "is", null);

      if (error) {
        throw new Error(error.message);
      }

      logStep("Fetched listings for sync", { count: listings?.length || 0 });

      const products: ProductData[] = (listings || []).map(listing => ({
        id: listing.id,
        title: listing.title.substring(0, 150),
        description: (listing.description || '').replace(/<[^>]*>/g, '').substring(0, 5000),
        availability: 'in stock',
        condition: 'used',
        price_cents: Math.round((listing.price_sale || 0) * 100),
        link: `${siteUrl}/listing/${listing.id}`,
        image_link: listing.cover_image_url || listing.image_urls?.[0] || '',
        brand: 'Vendibook',
        category: getCategoryMapping(listing.category),
        additional_image_link: listing.image_urls?.slice(1, 10) || [],
      }));

      if (products.length > 0) {
        const fbResponse = await batchUpdateProducts(catalogId, accessToken, products);
        const fbResult = await fbResponse.json();
        
        logStep("Batch sync completed", { 
          status: fbResponse.status,
          result: fbResult 
        });

        return new Response(JSON.stringify({
          success: true,
          synced: products.length,
          result: fbResult,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      return new Response(JSON.stringify({
        success: true,
        synced: 0,
        message: "No products to sync",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });

    } else if (action === "upsert" && listingId) {
      // Fetch single listing
      const { data: listing, error } = await supabaseClient
        .from("listings")
        .select("*")
        .eq("id", listingId)
        .single();

      if (error) {
        throw new Error(error.message);
      }

      if (!listing || listing.status !== 'published' || listing.mode !== 'sale' || !listing.price_sale) {
        return new Response(JSON.stringify({
          success: false,
          message: "Listing not eligible for catalog (must be published sale listing with price)",
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }

      const product: ProductData = {
        id: listing.id,
        title: listing.title.substring(0, 150),
        description: (listing.description || '').replace(/<[^>]*>/g, '').substring(0, 5000),
        availability: 'in stock',
        condition: 'used',
        price_cents: Math.round((listing.price_sale || 0) * 100),
        link: `${siteUrl}/listing/${listing.id}`,
        image_link: listing.cover_image_url || listing.image_urls?.[0] || '',
        brand: 'Vendibook',
        category: getCategoryMapping(listing.category),
        additional_image_link: listing.image_urls?.slice(1, 10) || [],
      };

      const fbResponse = await upsertProduct(catalogId, accessToken, product);
      const fbResult = await fbResponse.json();

      logStep("Product upserted", { 
        listingId,
        status: fbResponse.status,
        result: fbResult 
      });

      return new Response(JSON.stringify({
        success: fbResponse.ok,
        result: fbResult,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: fbResponse.ok ? 200 : 400,
      });

    } else if (action === "delete" && listingId) {
      const fbResponse = await deleteProduct(catalogId, accessToken, listingId);
      const fbResult = await fbResponse.json();

      logStep("Product deleted", { 
        listingId,
        status: fbResponse.status,
        result: fbResult 
      });

      return new Response(JSON.stringify({
        success: fbResponse.ok,
        result: fbResult,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: fbResponse.ok ? 200 : 400,
      });

    } else {
      return new Response(JSON.stringify({
        error: "Invalid action. Use 'sync_all', 'upsert', or 'delete'",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
