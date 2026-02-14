import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

/**
 * Vapi Custom Tool Endpoint for Bappie
 * 
 * Vapi calls this as a "server URL" tool. It sends:
 * {
 *   "message": {
 *     "type": "tool-calls",
 *     "toolCallList": [{ "function": { "name": "search_listings", "arguments": {...} } }]
 *   }
 * }
 * 
 * We respond with results that Vapi feeds back to the voice agent.
 */

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const body = await req.json();
    
    // Handle Vapi tool-calls format
    const message = body.message;
    if (!message || message.type !== 'tool-calls') {
      return new Response(
        JSON.stringify({ error: 'Expected tool-calls message type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results = [];

    for (const toolCall of message.toolCallList || []) {
      const fnName = toolCall.function?.name;
      const args = toolCall.function?.arguments || {};
      let result: any;

      switch (fnName) {
        case 'search_listings':
          result = await searchListings(supabase, args);
          break;
        case 'get_listing_details':
          result = await getListingDetails(supabase, args);
          break;
        case 'get_categories':
          result = getCategories();
          break;
        case 'check_availability':
          result = await checkAvailability(supabase, args);
          break;
        default:
          result = { error: `Unknown function: ${fnName}` };
      }

      results.push({
        toolCallId: toolCall.id,
        result: JSON.stringify(result),
      });
    }

    return new Response(
      JSON.stringify({ results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Vapi lookup error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// --- Tool implementations ---

async function searchListings(supabase: any, args: any) {
  const {
    query,
    category,
    mode, // 'rent' or 'sale'
    city,
    max_price,
    min_price,
    limit = 5,
  } = args;

  let qb = supabase
    .from('listings')
    .select('id, title, description, category, mode, address, city, state, price_daily, price_hourly, price_sale, price_weekly, price_monthly, cover_image_url, instant_book, fulfillment_type, amenities, highlights')
    .eq('status', 'published')
    .not('title', 'ilike', 'Demo %')
    .limit(Math.min(limit, 10));

  if (mode) qb = qb.eq('mode', mode);
  if (category) qb = qb.eq('category', category);
  if (city) qb = qb.ilike('city', `%${city}%`);

  if (query && query.trim()) {
    const term = `%${query.trim()}%`;
    qb = qb.or(`title.ilike.${term},description.ilike.${term},address.ilike.${term}`);
  }

  if (mode === 'sale') {
    if (min_price) qb = qb.gte('price_sale', min_price);
    if (max_price) qb = qb.lte('price_sale', max_price);
  }

  const { data, error } = await qb.order('published_at', { ascending: false });
  if (error) throw error;

  // Format for voice-friendly response
  return {
    count: data?.length ?? 0,
    listings: (data || []).map((l: any) => ({
      id: l.id,
      title: l.title,
      description: l.description?.substring(0, 200),
      category: l.category,
      mode: l.mode,
      location: [l.city, l.state].filter(Boolean).join(', ') || l.address,
      pricing: formatPricing(l),
      instant_book: l.instant_book,
      fulfillment: l.fulfillment_type,
      amenities: l.amenities?.slice(0, 5),
      highlights: l.highlights?.slice(0, 3),
      url: `https://vendibookpreview.lovable.app/listing/${l.id}`,
    })),
  };
}

async function getListingDetails(supabase: any, args: any) {
  const { listing_id } = args;
  if (!listing_id) return { error: 'listing_id required' };

  const { data, error } = await supabase
    .from('listings')
    .select('*')
    .eq('id', listing_id)
    .eq('status', 'published')
    .maybeSingle();

  if (error) throw error;
  if (!data) return { error: 'Listing not found' };

  // Get reviews
  const { data: reviews } = await supabase
    .rpc('get_listing_reviews_safe', { p_listing_id: listing_id });

  const avgRating = reviews?.length
    ? (reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  return {
    id: data.id,
    title: data.title,
    description: data.description,
    category: data.category,
    mode: data.mode,
    location: data.address,
    city: data.city,
    state: data.state,
    pricing: formatPricing(data),
    amenities: data.amenities,
    highlights: data.highlights,
    instant_book: data.instant_book,
    fulfillment: data.fulfillment_type,
    delivery_radius: data.delivery_radius_miles,
    deposit: data.deposit_amount,
    min_rental_days: data.rental_min_days,
    dimensions: data.length_inches || data.width_inches ? {
      length: data.length_inches,
      width: data.width_inches,
      height: data.height_inches,
      weight_lbs: data.weight_lbs,
    } : null,
    reviews: {
      count: reviews?.length ?? 0,
      average_rating: avgRating,
      recent: reviews?.slice(0, 3).map((r: any) => ({
        rating: r.rating,
        text: r.review_text?.substring(0, 100),
        reviewer: r.reviewer_display_name,
      })),
    },
    url: `https://vendibookpreview.lovable.app/listing/${data.id}`,
  };
}

function getCategories() {
  return {
    categories: [
      { value: 'food_truck', label: 'Food Trucks' },
      { value: 'food_trailer', label: 'Food Trailers' },
      { value: 'ghost_kitchen', label: 'Ghost Kitchens / Shared Kitchens' },
      { value: 'vendor_space', label: 'Vendor Spaces & Lots' },
    ],
    modes: [
      { value: 'rent', label: 'For Rent' },
      { value: 'sale', label: 'For Sale' },
    ],
  };
}

async function checkAvailability(supabase: any, args: any) {
  const { listing_id, start_date, end_date } = args;
  if (!listing_id || !start_date || !end_date) {
    return { error: 'listing_id, start_date, and end_date are required' };
  }

  const { data, error } = await supabase.rpc('check_booking_availability', {
    p_listing_id: listing_id,
    p_start_date: start_date,
    p_end_date: end_date,
  });

  if (error) throw error;
  return data;
}

function formatPricing(listing: any) {
  const prices: string[] = [];
  if (listing.price_hourly) prices.push(`$${listing.price_hourly}/hr`);
  if (listing.price_daily) prices.push(`$${listing.price_daily}/day`);
  if (listing.price_weekly) prices.push(`$${listing.price_weekly}/wk`);
  if (listing.price_monthly) prices.push(`$${listing.price_monthly}/mo`);
  if (listing.price_sale) prices.push(`$${listing.price_sale.toLocaleString()} (sale)`);
  return prices.join(' | ') || 'Contact for pricing';
}
