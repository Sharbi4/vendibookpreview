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
        case 'get_booking_info':
        case 'get_required_documents':
        case 'lookup_document_help':
        case 'send_booking_link':
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
    case 'get_booking_info':
      return await getBookingInfo(supabase, args);
    case 'get_required_documents':
      return await getRequiredDocuments(supabase, args);
    case 'lookup_document_help':
      return await lookupDocumentHelp(args);
    case 'send_booking_link':
      return await sendBookingLink(supabase, args);
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
    .eq('status', 'published').not('published_at', 'is', null).is('deleted_at', null).eq('moderation_status', 'clear')
    .not('title', 'ilike', 'Demo %')
    .limit(Math.min(limit, 10));

  if (mode) qb = qb.eq('mode', mode);
  if (category) qb = qb.eq('category', category);
  if (city) {
    // Search city in both city field AND address field, since some listings have city only in address
    const cityTerm = `%${city.replace(/,?\s*(TX|CA|FL|AL|GA|NC|AZ|NY|IL|OH|PA|WA|OR|CO|MA|NJ|VA|MD|MN|WI|MO|TN|IN|MI|SC|LA|KY|OK|CT|IA|MS|AR|KS|NV|NE|NM|WV|ID|HI|ME|MT|RI|DE|SD|ND|AK|VT|WY|DC)$/i, '').trim()}%`;
    qb = qb.or(`city.ilike.${cityTerm},address.ilike.${cityTerm}`);
  }

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
      url: `https://vendibook.com/listing/${l.id}`,
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
    .eq('status', 'published').not('published_at', 'is', null).is('deleted_at', null).eq('moderation_status', 'clear')
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
    url: `https://vendibook.com/listing/${data.id}`,
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
    url: `https://vendibook.com/create-listing/${data.id}`,
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

// --- Booking Assistant Tools ---

async function getBookingInfo(supabase: any, args: any) {
  const { listing_id, start_date, end_date } = args;
  if (!listing_id) return { error: 'listing_id is required' };

  const { data: listing, error } = await supabase
    .from('listings')
    .select('id, title, category, mode, price_hourly, price_daily, price_weekly, price_monthly, price_sale, deposit_amount, instant_book, fulfillment_type, delivery_fee, delivery_radius_miles, rental_min_days, total_slots, slot_names, available_from, available_to, hourly_enabled, daily_enabled, city, state, address, amenities, highlights, pickup_instructions, access_instructions, hours_of_access')
    .eq('id', listing_id)
    .eq('status', 'published').not('published_at', 'is', null).is('deleted_at', null).eq('moderation_status', 'clear')
    .maybeSingle();

  if (error) throw error;
  if (!listing) return { error: 'Listing not found or not published' };

  // Check availability if dates provided
  let availability = null;
  if (start_date && end_date) {
    const { data: avail } = await supabase.rpc('check_booking_availability', {
      p_listing_id: listing_id,
      p_start_date: start_date,
      p_end_date: end_date,
    });
    availability = avail;
  }

  // Get required documents
  const { data: docs } = await supabase
    .from('listing_required_documents')
    .select('document_type, is_required, description')
    .eq('listing_id', listing_id);

  // Calculate pricing estimate
  let pricingBreakdown = null;
  if (start_date && end_date && listing.price_daily) {
    const days = Math.ceil((new Date(end_date).getTime() - new Date(start_date).getTime()) / (1000 * 60 * 60 * 24));
    
    let rentalPrice = days * listing.price_daily;
    let pricingMethod = `${days} days × $${listing.price_daily}/day`;
    
    // Check if weekly/monthly pricing is better
    if (listing.price_monthly && days >= 28) {
      const months = Math.floor(days / 30);
      const remainDays = days - (months * 30);
      const monthlyTotal = months * listing.price_monthly + remainDays * listing.price_daily;
      if (monthlyTotal < rentalPrice) {
        rentalPrice = monthlyTotal;
        pricingMethod = `${months} month(s) × $${listing.price_monthly}/mo + ${remainDays} days × $${listing.price_daily}/day`;
      }
    } else if (listing.price_weekly && days >= 7) {
      const weeks = Math.floor(days / 7);
      const remainDays = days - (weeks * 7);
      const weeklyTotal = weeks * listing.price_weekly + remainDays * listing.price_daily;
      if (weeklyTotal < rentalPrice) {
        rentalPrice = weeklyTotal;
        pricingMethod = `${weeks} week(s) × $${listing.price_weekly}/wk + ${remainDays} days × $${listing.price_daily}/day`;
      }
    }

    pricingBreakdown = {
      rental_total: rentalPrice,
      pricing_method: pricingMethod,
      deposit: listing.deposit_amount || 0,
      delivery_fee: listing.fulfillment_type === 'delivery' ? (listing.delivery_fee || 0) : 0,
      estimated_total: rentalPrice + (listing.deposit_amount || 0) + (listing.fulfillment_type === 'delivery' ? (listing.delivery_fee || 0) : 0),
    };
  }

  const docLabels: Record<string, string> = {
    drivers_license: "Driver's License",
    business_license: 'Business License',
    food_handler_certificate: 'Food Handler Certificate',
    safeserve_certification: 'SafeServe Certification',
    health_department_permit: 'Health Department Permit',
    commercial_liability_insurance: 'Commercial Liability Insurance',
    vehicle_insurance: 'Vehicle Insurance',
    certificate_of_insurance: 'Certificate of Insurance',
    work_history_proof: 'Work History / Experience Proof',
    prior_experience_proof: 'Prior Experience Proof',
  };

  return {
    listing: {
      id: listing.id,
      title: listing.title,
      category: listing.category,
      mode: listing.mode,
      location: [listing.city, listing.state].filter(Boolean).join(', ') || listing.address,
      pricing: formatPricing(listing),
      fulfillment: listing.fulfillment_type,
      delivery_fee: listing.delivery_fee,
      delivery_radius: listing.delivery_radius_miles,
      deposit: listing.deposit_amount,
      instant_book: listing.instant_book,
      min_rental_days: listing.rental_min_days,
      total_slots: listing.total_slots || 1,
      slot_names: listing.slot_names,
      available_from: listing.available_from,
      available_to: listing.available_to,
      pickup_instructions: listing.pickup_instructions,
      access_instructions: listing.access_instructions,
      hours_of_access: listing.hours_of_access,
      amenities: listing.amenities?.slice(0, 5),
    },
    availability,
    pricing_breakdown: pricingBreakdown,
    required_documents: (docs || []).map((d: any) => ({
      type: d.document_type,
      label: docLabels[d.document_type] || d.document_type,
      required: d.is_required,
      description: d.description,
    })),
    has_required_documents: (docs || []).some((d: any) => d.is_required),
    booking_url: `https://vendibook.com/listing/${listing.id}`,
    message: listing.instant_book
      ? `This listing supports Instant Book — you can reserve it right away on the website!`
      : `This listing requires host approval. Submit a booking request and the host will respond.`,
    next_steps: [
      'Visit the listing page to start your booking',
      ...(docs?.some((d: any) => d.is_required) ? ['Prepare your required documents (I can help you understand what you need!)'] : []),
      listing.deposit_amount ? `Be ready for a $${listing.deposit_amount} refundable deposit` : null,
      listing.fulfillment_type === 'delivery' ? 'Have your delivery address ready' : 'Plan for pickup at the listed location',
    ].filter(Boolean),
  };
}

async function getRequiredDocuments(supabase: any, args: any) {
  const { listing_id } = args;
  if (!listing_id) return { error: 'listing_id is required' };

  const { data: listing } = await supabase
    .from('listings')
    .select('title, city, state, category')
    .eq('id', listing_id)
    .maybeSingle();

  const { data: docs, error } = await supabase
    .from('listing_required_documents')
    .select('document_type, is_required, description')
    .eq('listing_id', listing_id);

  if (error) throw error;

  const docLabels: Record<string, string> = {
    drivers_license: "Driver's License",
    business_license: 'Business License',
    food_handler_certificate: 'Food Handler Certificate',
    safeserve_certification: 'SafeServe Certification',
    health_department_permit: 'Health Department Permit',
    commercial_liability_insurance: 'Commercial Liability Insurance',
    vehicle_insurance: 'Vehicle Insurance',
    certificate_of_insurance: 'Certificate of Insurance',
    work_history_proof: 'Work History / Experience Proof',
    prior_experience_proof: 'Prior Experience Proof',
  };

  const docHelp: Record<string, string> = {
    drivers_license: "A valid government-issued photo ID. Most people already have this.",
    business_license: "A business license from your city or county. You can usually apply at your local city hall or online through your county clerk's office. Processing typically takes 1-3 weeks.",
    food_handler_certificate: "A food safety certification. You can get this online through ServSafe, StateFoodSafety.com, or your local health department. Most online courses take 1-2 hours and cost around $10-15.",
    safeserve_certification: "SafeServe (also called ServSafe Manager) is a more advanced food safety certification. The exam costs about $36 and you can study online. Many community colleges also offer prep courses.",
    health_department_permit: "A permit from your local health department. Contact your county health department to apply. They'll need to inspect your food operation. Plan for 2-4 weeks processing time.",
    commercial_liability_insurance: "General liability insurance for your food business. Companies like FLIP (Food Liability Insurance Program), Next Insurance, or Hiscox offer affordable policies starting around $25-50/month. You can get coverage same-day online.",
    vehicle_insurance: "Proof of vehicle insurance if you're operating a food truck. Your standard auto insurance may not cover commercial use — check with your provider about adding commercial vehicle coverage.",
    certificate_of_insurance: "A COI from your insurance provider naming the listing host as additionally insured. Call your insurance company and request one — they usually issue it within 24-48 hours at no extra charge.",
    work_history_proof: "Documentation showing your relevant work experience in the food industry. This could be a resume, reference letters, or previous employment records.",
    prior_experience_proof: "Evidence of prior experience operating similar equipment or in a similar setting. Photos of your work, social media posts, or references from past employers work great.",
  };

  if (!docs || docs.length === 0) {
    return {
      listing_title: listing?.title,
      has_documents: false,
      message: 'Great news! This listing does not require any documents to book. You can go ahead and submit a booking request right away!',
    };
  }

  return {
    listing_title: listing?.title,
    location: listing ? [listing.city, listing.state].filter(Boolean).join(', ') : null,
    category: listing?.category,
    has_documents: true,
    documents: docs.map((d: any) => ({
      type: d.document_type,
      label: docLabels[d.document_type] || d.document_type,
      required: d.is_required,
      description: d.description,
      how_to_get: docHelp[d.document_type] || 'Contact the listing host for details on this requirement.',
    })),
    message: `This listing requires ${docs.filter((d: any) => d.is_required).length} document(s). I can explain how to get any of them — just ask!`,
    tip: "You can upload documents after submitting your booking request. The host will review them before approving your booking.",
  };
}

async function lookupDocumentHelp(args: any) {
  const { document_type, city, state } = args;
  if (!document_type) return { error: 'document_type is required (e.g., food_handler_certificate, business_license)' };

  const searchQueries: Record<string, string> = {
    business_license: `how to get a business license for food business ${city || ''} ${state || ''}`,
    food_handler_certificate: `food handler certificate course online ${state || ''}`,
    safeserve_certification: `ServSafe food manager certification exam ${state || ''}`,
    health_department_permit: `health department food permit application ${city || ''} ${state || ''}`,
    commercial_liability_insurance: `food vendor liability insurance affordable online`,
    vehicle_insurance: `food truck commercial vehicle insurance ${state || ''}`,
  };

  const query = searchQueries[document_type] || `how to get ${document_type.replace(/_/g, ' ')} for food business ${state || ''}`;

  try {
    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!apiKey) {
      console.log('Firecrawl not configured, returning static help');
      return {
        document_type,
        message: `I don't have web search available right now, but here's what I know: For a ${document_type.replace(/_/g, ' ')}, check with your local city hall or county clerk, or search online for "${query}".`,
      };
    }

    const response = await fetch('https://api.firecrawl.dev/v1/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        limit: 3,
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      return {
        document_type,
        message: `I couldn't search for that right now, but try searching online for: "${query}"`,
      };
    }

    const results = (data.data || []).map((r: any) => ({
      title: r.title,
      url: r.url,
      snippet: r.description?.substring(0, 200),
    }));

    return {
      document_type,
      search_query: query,
      results,
      message: results.length > 0
        ? `Here's what I found about getting your ${document_type.replace(/_/g, ' ')}. I found ${results.length} helpful resource(s).`
        : `I searched but couldn't find specific results. Try visiting your local government website or searching "${query}" for the most up-to-date info.`,
    };
  } catch (err) {
    console.error('Document help lookup error:', err);
    return {
      document_type,
      message: `I had trouble searching right now. Try Googling: "${query}"`,
    };
  }
}

// --- Send Booking Link via SMS + Email ---

async function sendBookingLink(supabase: any, args: any) {
  const { listing_id, phone, email, name, start_date, end_date } = args;
  
  if (!listing_id) return { error: 'listing_id is required' };
  if (!phone && !email) return { error: 'At least a phone number or email is required to send the booking link' };

  // Get listing info for the message
  const { data: listing } = await supabase
    .from('listings')
    .select('title, category, city, state, price_daily, price_weekly, price_monthly, deposit_amount, cover_image_url')
    .eq('id', listing_id)
    .maybeSingle();

  if (!listing) return { error: 'Listing not found' };

  const bookingUrl = `https://vendibook.com/listing/${listing_id}`;
  const location = [listing.city, listing.state].filter(Boolean).join(', ');
  const dateRange = start_date && end_date ? `${start_date} to ${end_date}` : '';
  
  const results: { sms?: string; email?: string } = {};
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

  // Send SMS via Zendesk ticket (which triggers SMS)
  if (phone) {
    try {
      const smsBody = `Hi${name ? ' ' + name : ''}! 🚚 Here's the listing you asked about on Vendibook:\n\n` +
        `📋 ${listing.title}\n` +
        (location ? `📍 ${location}\n` : '') +
        (listing.price_daily ? `💰 $${listing.price_daily}/day\n` : '') +
        (dateRange ? `📅 ${dateRange}\n` : '') +
        `\n👉 Book now: ${bookingUrl}\n\n` +
        `Questions? Reply to this text or call us!`;

      // Use schedule-callback to create a Zendesk ticket with the SMS content
      const response = await fetch(`${supabaseUrl}/functions/v1/schedule-callback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${anonKey}`,
        },
        body: JSON.stringify({
          name: (name || 'Vendi Caller').trim(),
          phone: phone.trim(),
          email: email?.trim() || undefined,
          source: 'voice-assistant-booking-link',
          preferredTime: 'N/A - Booking link sent',
          preferredContact: 'text',
          restaurantName: `Booking Link: ${listing.title}`,
          notes: smsBody,
        }),
      });

      if (response.ok) {
        results.sms = 'sent';
      } else {
        results.sms = 'failed';
      }
    } catch (err) {
      console.error('SMS send error:', err);
      results.sms = 'failed';
    }
  }

  // Send email via Resend
  if (email) {
    try {
      const resendKey = Deno.env.get('RESEND_API_KEY');
      if (!resendKey) {
        results.email = 'not_configured';
      } else {
        const categoryLabels: Record<string, string> = {
          food_truck: 'Food Truck',
          food_trailer: 'Food Trailer',
          ghost_kitchen: 'Shared Kitchen',
          vendor_space: 'Vendor Space',
        };

        const emailHtml = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
            <div style="background: linear-gradient(135deg, #FF5124, #FF7A52); padding: 32px 24px; text-align: center; border-radius: 12px 12px 0 0;">
              <img src="https://nbrehbwfsmedbelzntqs.supabase.co/storage/v1/object/public/email-assets/logo.png" alt="Vendibook" style="height: 48px; margin-bottom: 16px;" />
              <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 700;">Your Booking Link is Ready! 🎉</h1>
            </div>
            
            <div style="padding: 32px 24px;">
              <p style="font-size: 16px; color: #333; margin-bottom: 24px;">
                Hi${name ? ' ' + name : ''}! Thanks for chatting with Vendi. Here's the listing you were interested in:
              </p>
              
              <div style="border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; margin-bottom: 24px;">
                ${listing.cover_image_url ? `<img src="${listing.cover_image_url}" alt="${listing.title}" style="width: 100%; height: 200px; object-fit: cover;" />` : ''}
                <div style="padding: 20px;">
                  <h2 style="margin: 0 0 8px; font-size: 20px; color: #111;">${listing.title}</h2>
                  <p style="margin: 0 0 4px; color: #666; font-size: 14px;">${categoryLabels[listing.category] || listing.category}${location ? ' • ' + location : ''}</p>
                  ${listing.price_daily ? `<p style="margin: 8px 0 0; font-size: 18px; font-weight: 700; color: #FF5124;">$${listing.price_daily}/day</p>` : ''}
                  ${listing.deposit_amount ? `<p style="margin: 4px 0 0; font-size: 13px; color: #888;">Refundable deposit: $${listing.deposit_amount}</p>` : ''}
                  ${dateRange ? `<p style="margin: 8px 0 0; font-size: 14px; color: #555;">📅 ${dateRange}</p>` : ''}
                </div>
              </div>
              
              <a href="${bookingUrl}" style="display: block; background: #FF5124; color: white; text-align: center; padding: 16px 32px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: 600; margin-bottom: 24px;">
                View Listing & Book Now →
              </a>
              
              <div style="background: #f9fafb; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                <p style="margin: 0; font-size: 14px; color: #555;">
                  <strong>💡 Quick tip:</strong> Your card will be authorized now and only charged if approved. No surprises!
                </p>
              </div>
              
              <p style="font-size: 13px; color: #999; text-align: center;">
                Need help? Reply to this email or talk to Vendi anytime on <a href="https://vendibook.com" style="color: #FF5124;">vendibook.com</a>
              </p>
            </div>
          </div>
        `;

        const emailResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'Vendibook <noreply@updates.vendibook.com>',
            to: [email.trim()],
            subject: `Your Booking Link: ${listing.title} 🚚`,
            html: emailHtml,
          }),
        });

        if (emailResponse.ok) {
          results.email = 'sent';
        } else {
          const errData = await emailResponse.json();
          console.error('Email send error:', errData);
          results.email = 'failed';
        }
      }
    } catch (err) {
      console.error('Email send error:', err);
      results.email = 'failed';
    }
  }

  const sentMethods = [];
  if (results.sms === 'sent') sentMethods.push('text message');
  if (results.email === 'sent') sentMethods.push('email');

  if (sentMethods.length > 0) {
    return {
      success: true,
      sms_status: results.sms || 'not_requested',
      email_status: results.email || 'not_requested',
      message: `I've sent the booking link for "${listing.title}" via ${sentMethods.join(' and ')}! Just click the link when you're ready to complete your booking. Your card will only be authorized — you won't be charged unless the host approves.`,
      booking_url: bookingUrl,
    };
  } else {
    return {
      success: false,
      sms_status: results.sms || 'not_requested',
      email_status: results.email || 'not_requested',
      message: `I had trouble sending the link, but you can book directly at: ${bookingUrl}`,
      booking_url: bookingUrl,
    };
  }
}
