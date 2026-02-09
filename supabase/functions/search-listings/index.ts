import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Haversine distance calculation (returns miles)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959; // Earth's radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

interface SearchRequest {
  query?: string;
  mode?: 'rent' | 'sale';
  category?: string;
  latitude?: number;
  longitude?: number;
  radius_miles?: number;
  start_date?: string;
  end_date?: string;
  amenities?: string[];
  min_price?: number;
  max_price?: number;
  instant_book_only?: boolean;
  verified_hosts_only?: boolean;
  delivery_capable?: boolean;
  page?: number;
  page_size?: number;
  sort_by?: 'newest' | 'price_low' | 'price_high' | 'distance' | 'relevance';
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const body: SearchRequest = await req.json();
    const {
      query,
      mode,
      category,
      latitude,
      longitude,
      radius_miles = 100,
      start_date,
      end_date,
      amenities,
      min_price,
      max_price,
      instant_book_only,
      verified_hosts_only,
      delivery_capable,
      page = 1,
      page_size = 20,
      sort_by = 'newest',
    } = body;

    // Clamp page_size to max 50
    const effectivePageSize = Math.min(page_size, 50);
    const offset = (page - 1) * effectivePageSize;

    // Start building the query
    let queryBuilder = supabaseClient
      .from('listings')
      .select('*', { count: 'exact' })
      .eq('status', 'published');

    // Apply mode filter
    if (mode) {
      queryBuilder = queryBuilder.eq('mode', mode);
    }

    // Apply category filter
    if (category) {
      queryBuilder = queryBuilder.eq('category', category);
    }

    // Apply text search (ILIKE on title, description, address)
    if (query && query.trim()) {
      const searchTerm = `%${query.trim()}%`;
      queryBuilder = queryBuilder.or(
        `title.ilike.${searchTerm},description.ilike.${searchTerm},address.ilike.${searchTerm}`
      );
    }

    // Apply price filters
    // Note: For rentals, we check both price_daily and price_hourly since listings can have either or both
    if (min_price !== undefined && min_price > 0) {
      if (mode === 'sale') {
        queryBuilder = queryBuilder.gte('price_sale', min_price);
      } else if (mode === 'rent') {
        // For rentals, include listings that have daily OR hourly pricing meeting the minimum
        // We'll do precise filtering in post-processing since we need to consider both pricing options
      } else {
        // For 'all' mode, we'll filter in post-processing
      }
    }

    if (max_price !== undefined && max_price < Infinity) {
      if (mode === 'sale') {
        queryBuilder = queryBuilder.lte('price_sale', max_price);
      } else if (mode === 'rent') {
        // For rentals, we'll filter in post-processing to consider both daily and hourly pricing
      }
    }

    // Apply instant book filter
    if (instant_book_only) {
      queryBuilder = queryBuilder.eq('instant_book', true);
    }

    // Apply amenities filter (all must be present)
    if (amenities && amenities.length > 0) {
      queryBuilder = queryBuilder.contains('amenities', amenities);
    }

    // Apply bounding box for location filtering (optimization before Haversine)
    if (latitude !== undefined && longitude !== undefined) {
      // ~69 miles per degree of latitude, longitude varies by latitude
      const latDelta = radius_miles / 69;
      const lngDelta = radius_miles / (69 * Math.cos(toRad(latitude)));
      
      queryBuilder = queryBuilder
        .gte('latitude', latitude - latDelta)
        .lte('latitude', latitude + latDelta)
        .gte('longitude', longitude - lngDelta)
        .lte('longitude', longitude + lngDelta);
    }

    // Fetch ALL matching listings first (we'll filter/paginate in memory for complex filters)
    // This is because we need to:
    // 1. Apply precise Haversine distance
    // 2. Check availability
    // 3. Check host verification
    const { data: listings, error: listingsError, count: totalBeforeComplexFilters } = await queryBuilder;

    if (listingsError) {
      throw listingsError;
    }

    if (!listings || listings.length === 0) {
      return new Response(
        JSON.stringify({
          listings: [],
          total_count: 0,
          page,
          page_size: effectivePageSize,
          total_pages: 0,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get unique host IDs for verification check
    const hostIds = [...new Set(listings.map(l => l.host_id).filter(Boolean))];

    // Fetch host verification status
    let hostVerificationMap: Record<string, boolean> = {};
    if (hostIds.length > 0) {
      const { data: profiles } = await supabaseClient
        .rpc('get_host_verification_status', { host_ids: hostIds });
      
      if (profiles) {
        profiles.forEach((p: { id: string; identity_verified: boolean }) => {
          hostVerificationMap[p.id] = p.identity_verified ?? false;
        });
      }
    }

    // Check availability if date range is specified
    let unavailableListingIds: Set<string> = new Set();
    if (start_date && end_date) {
      const listingIds = listings.map(l => l.id);

      // Get blocked dates in range
      const { data: blockedDates } = await supabaseClient
        .from('listing_blocked_dates')
        .select('listing_id')
        .in('listing_id', listingIds)
        .gte('blocked_date', start_date)
        .lte('blocked_date', end_date);

      if (blockedDates) {
        blockedDates.forEach(bd => unavailableListingIds.add(bd.listing_id));
      }

      // Get approved bookings that overlap with date range
      const { data: bookings } = await supabaseClient
        .from('booking_requests')
        .select('listing_id')
        .in('listing_id', listingIds)
        .eq('status', 'approved')
        .lte('start_date', end_date)
        .gte('end_date', start_date);

      if (bookings) {
        bookings.forEach(b => unavailableListingIds.add(b.listing_id));
      }
    }

    // Apply complex filters in memory
    let filteredListings = listings.map(listing => {
      // Calculate distance if location provided
      let distance_miles: number | null = null;
      if (latitude !== undefined && longitude !== undefined && listing.latitude && listing.longitude) {
        distance_miles = calculateDistance(latitude, longitude, listing.latitude, listing.longitude);
      }

      // Check if host is verified
      const host_verified = hostVerificationMap[listing.host_id] ?? false;

      // Check availability
      const is_available = !unavailableListingIds.has(listing.id);

      // Check delivery capability
      let can_deliver = false;
      if (latitude !== undefined && longitude !== undefined && 
          listing.latitude && listing.longitude &&
          listing.delivery_radius_miles &&
          (listing.fulfillment_type === 'delivery' || listing.fulfillment_type === 'both')) {
        const distFromListing = calculateDistance(listing.latitude, listing.longitude, latitude, longitude);
        can_deliver = distFromListing <= listing.delivery_radius_miles;
      }

      return {
        ...listing,
        distance_miles,
        host_verified,
        is_available,
        can_deliver,
      };
    });

    // Filter by precise distance (Haversine)
    if (latitude !== undefined && longitude !== undefined) {
      filteredListings = filteredListings.filter(l => {
        if (l.distance_miles === null) return true; // Include if no coords
        return l.distance_miles <= radius_miles;
      });
    }

    // Filter by date availability
    if (start_date && end_date) {
      filteredListings = filteredListings.filter(l => l.is_available);
    }

    // Filter by verified hosts
    if (verified_hosts_only) {
      filteredListings = filteredListings.filter(l => l.host_verified);
    }

    // Filter by delivery capability
    if (delivery_capable) {
      filteredListings = filteredListings.filter(l => l.can_deliver);
    }

    // Apply price filter for 'all' mode or rent mode with hourly consideration
    if (min_price !== undefined || max_price !== undefined) {
      filteredListings = filteredListings.filter(l => {
        // For rentals, use the primary price (daily if available, otherwise hourly)
        const price = l.mode === 'rent' 
          ? (l.price_daily || l.price_hourly || 0) 
          : (l.price_sale || 0);
        const meetsMin = min_price === undefined || min_price <= 0 || price >= min_price;
        const meetsMax = max_price === undefined || max_price >= Infinity || price <= max_price;
        return meetsMin && meetsMax;
      });
    }

    // Apply sorting
    if (sort_by === 'distance' && latitude !== undefined && longitude !== undefined) {
      filteredListings.sort((a, b) => {
        if (a.distance_miles === null && b.distance_miles === null) return 0;
        if (a.distance_miles === null) return 1;
        if (b.distance_miles === null) return -1;
        return a.distance_miles - b.distance_miles;
      });
    } else if (sort_by === 'price_low') {
      filteredListings.sort((a, b) => {
        // For rentals, use daily price if available, otherwise hourly
        const priceA = a.mode === 'rent' ? (a.price_daily || a.price_hourly || 0) : (a.price_sale || 0);
        const priceB = b.mode === 'rent' ? (b.price_daily || b.price_hourly || 0) : (b.price_sale || 0);
        return priceA - priceB;
      });
    } else if (sort_by === 'price_high') {
      filteredListings.sort((a, b) => {
        // For rentals, use daily price if available, otherwise hourly
        const priceA = a.mode === 'rent' ? (a.price_daily || a.price_hourly || 0) : (a.price_sale || 0);
        const priceB = b.mode === 'rent' ? (b.price_daily || b.price_hourly || 0) : (b.price_sale || 0);
        return priceB - priceA;
      });
    } else if (sort_by === 'relevance' && query && query.trim()) {
      // For relevance, prioritize title matches over description matches
      const searchLower = query.toLowerCase();
      filteredListings.sort((a, b) => {
        const aTitleMatch = a.title?.toLowerCase().includes(searchLower) ? 0 : 1;
        const bTitleMatch = b.title?.toLowerCase().includes(searchLower) ? 0 : 1;
        if (aTitleMatch !== bTitleMatch) return aTitleMatch - bTitleMatch;
        // Secondary sort by newest
        return new Date(b.published_at || b.created_at).getTime() - new Date(a.published_at || a.created_at).getTime();
      });
    } else {
      // Default: newest
      filteredListings.sort((a, b) => 
        new Date(b.published_at || b.created_at).getTime() - new Date(a.published_at || a.created_at).getTime()
      );
    }

    // Calculate total after all filters
    const totalCount = filteredListings.length;
    const totalPages = Math.ceil(totalCount / effectivePageSize);

    // Apply pagination
    const paginatedListings = filteredListings.slice(offset, offset + effectivePageSize);

    return new Response(
      JSON.stringify({
        listings: paginatedListings,
        total_count: totalCount,
        page,
        page_size: effectivePageSize,
        total_pages: totalPages,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Search error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
