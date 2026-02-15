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

  // Health check for GET requests
  if (req.method === 'GET') {
    return new Response(
      JSON.stringify({ status: 'ok', service: 'vapi-listings-lookup' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const body = await req.json();
    console.log('Vapi request:', JSON.stringify(body).substring(0, 500));
    
    // Handle Vapi tool-calls format
    const message = body.message;
    if (!message || message.type !== 'tool-calls') {
      // Fallback: maybe it's a direct call with tool name/arguments at top level
      if (body.tool_name || body.function_name) {
        const fnName = body.tool_name || body.function_name;
        const args = body.arguments || body.parameters || {};
        const result = await handleToolCall(supabase, fnName, args);
        return new Response(
          JSON.stringify({ results: [{ result: JSON.stringify(result) }] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      return new Response(
        JSON.stringify({ error: 'Expected tool-calls message type', received: message?.type || 'none' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results = [];

    for (const toolCall of message.toolCallList || []) {
      // Vapi sends name/arguments directly on toolCall, not nested under .function
      const fnName = toolCall.function?.name || toolCall.name;
      const args = toolCall.function?.arguments || toolCall.arguments || {};
      let result: any;

      switch (fnName) {
        case 'search_listings':
        case 'get_listing_details':
        case 'get_categories':
        case 'check_availability':
        case 'create_listing_draft':
        case 'schedule_callback':
          result = await handleToolCall(supabase, fnName, args);
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

// --- Helper: route tool calls ---

async function handleToolCall(supabase: any, fnName: string, args: any) {
  switch (fnName) {
    case 'search_listings':
      return await searchListings(supabase, args);
    case 'get_listing_details':
      return await getListingDetails(supabase, args);
    case 'get_categories':
      return getCategories();
    case 'check_availability':
      return await checkAvailability(supabase, args);
    case 'create_listing_draft':
      return await createListingDraft(supabase, args);
    case 'schedule_callback':
      return await scheduleCallback(args);
    default:
      return { error: `Unknown function: ${fnName}` };
  }
}

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

async function createListingDraft(supabase: any, args: any) {
  const {
    title,
    description,
    category,
    mode,
    city,
    state,
    address,
    fulfillment_type = 'pickup',
    pickup_instructions,
    access_instructions,
    hours_of_access,
    delivery_fee,
    delivery_radius_miles,
    delivery_instructions,
    location_notes,
    // Rental pricing
    price_daily,
    price_weekly,
    price_monthly,
    deposit_amount,
    instant_book,
    rental_min_days,
    // Sale pricing
    price_sale,
    accept_card_payment,
    accept_cash_payment,
    // Dimensions
    weight_lbs,
    length_inches,
    width_inches,
    height_inches,
    // Details
    highlights,
    amenities,
    // Multi-slot
    total_slots,
    slot_names,
    // Availability
    available_from,
    available_to,
  } = args;

  if (!title || !description || !category || !mode) {
    return { error: 'title, description, category, and mode are required' };
  }

  // Generate a guest draft token so the user can claim it later
  const guest_draft_token = crypto.randomUUID();

  const insertData: Record<string, any> = {
    title,
    description,
    category,
    mode,
    city: city || null,
    state: state || null,
    address: address || null,
    fulfillment_type,
    status: 'draft',
    guest_draft_token,
    // Location details
    pickup_instructions: pickup_instructions || null,
    access_instructions: access_instructions || null,
    hours_of_access: hours_of_access || null,
    delivery_fee: delivery_fee || null,
    delivery_radius_miles: delivery_radius_miles || null,
    delivery_instructions: delivery_instructions || null,
    location_notes: location_notes || null,
    // Pricing
    price_daily: price_daily || null,
    price_weekly: price_weekly || null,
    price_monthly: price_monthly || null,
    price_sale: price_sale || null,
    deposit_amount: deposit_amount || null,
    instant_book: instant_book ?? false,
    rental_min_days: rental_min_days || null,
    // Payment preferences
    accept_card_payment: accept_card_payment ?? true,
    accept_cash_payment: accept_cash_payment ?? false,
    // Dimensions
    weight_lbs: weight_lbs || null,
    length_inches: length_inches || null,
    width_inches: width_inches || null,
    height_inches: height_inches || null,
    // Details
    highlights: highlights?.length ? highlights : null,
    amenities: amenities?.length ? amenities : null,
    // Multi-slot
    total_slots: total_slots || 1,
    slot_names: slot_names?.length ? slot_names : null,
    // Availability
    available_from: available_from || null,
    available_to: available_to || null,
  };

  const { data, error } = await supabase
    .from('listings')
    .insert(insertData)
    .select('id, title, status')
    .single();

  if (error) {
    console.error('Create draft error:', error);
    return { error: error.message };
  }

  return {
    success: true,
    listing_id: data.id,
    title: data.title,
    status: data.status,
    draft_token: guest_draft_token,
    message: `Draft listing "${data.title}" created with all details! The user just needs to add photos and connect Stripe to publish.`,
    url: `https://vendibookpreview.lovable.app/create-listing/${data.id}`,
  };
}

async function scheduleCallback(args: any) {
  const { name, phone, email, preferred_time, reason } = args;

  if (!name || !phone) {
    return { error: 'name and phone are required to schedule a callback' };
  }

  // Call the existing schedule-callback edge function
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/schedule-callback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${anonKey}`,
      },
      body: JSON.stringify({
        name: name.trim(),
        phone: phone.trim(),
        email: email?.trim() || undefined,
        source: 'voice-assistant-bappie',
        preferredTime: preferred_time || 'asap',
        preferredContact: 'phone',
        restaurantName: reason || 'Voice assistant callback request',
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Schedule callback error:', data);
      return { error: data.error || 'Failed to schedule callback' };
    }

    return {
      success: true,
      message: `Callback scheduled for ${name}. The Vendibook team will call ${phone} ${preferred_time || 'as soon as possible'}.`,
      ticketId: data.ticketId,
    };
  } catch (error) {
    console.error('Schedule callback error:', error);
    return { error: 'Failed to schedule callback. Please try again.' };
  }
}
