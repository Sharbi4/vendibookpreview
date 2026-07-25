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
  fulfillment_types?: Array<'pickup' | 'delivery' | 'on_site'>;
  featured_only?: boolean;

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
      fulfillment_types,
      featured_only,

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
      .eq('status', 'published')
      .not('title', 'ilike', 'Demo %');

    // Apply mode filter
    if (mode) {
      queryBuilder = queryBuilder.eq('mode', mode);
    }

    // Apply category filter (supports comma-separated list)
    if (category) {
      const cats = category.split(',').map((c) => c.trim()).filter(Boolean);
      if (cats.length > 1) {
        queryBuilder = queryBuilder.in('category', cats);
      } else if (cats.length === 1) {
        queryBuilder = queryBuilder.eq('category', cats[0]);
      }
    }

    // Smart query parsing: extract intent, strip filler words, map to categories
    const categoryKeywords: Record<string, string> = {
      'kitchen': 'ghost_kitchen',
      'ghost kitchen': 'ghost_kitchen',
      'commercial kitchen': 'ghost_kitchen',
      'food truck': 'food_truck',
      'truck': 'food_truck',
      'food trailer': 'food_trailer',
      'trailer': 'food_trailer',
      'vendor lot': 'vendor_lot',
      'lot': 'vendor_lot',
      'vendor space': 'vendor_space',
      'space': 'vendor_space',
      'vending': 'vendor_space',
    };

    // Strip mode-related filler words from query
    let cleanedQuery = (query || '').trim();
    const modeFillers = /\b(for\s+rent|for\s+sale|to\s+rent|to\s+buy|rental|rentals)\b/gi;
    cleanedQuery = cleanedQuery.replace(modeFillers, '').trim();

    // Check if cleaned query maps to a known category
    const queryLower = cleanedQuery.toLowerCase();
    let inferredCategory: string | null = null;
    for (const [keyword, cat] of Object.entries(categoryKeywords)) {
      if (queryLower === keyword || queryLower.includes(keyword)) {
        inferredCategory = cat;
        break;
      }
    }

    // If we inferred a category and no explicit category was set, apply it as a filter
    if (inferredCategory && !category) {
      queryBuilder = queryBuilder.eq('category', inferredCategory);
    }

    // Apply text search (ILIKE on title, description, address, city, state)
    if (cleanedQuery) {
      // Parse "City, State" format for location searches
      const parts = cleanedQuery.split(',').map(p => p.trim()).filter(Boolean);
      
      if (parts.length >= 2) {
        const city = parts[0];
        queryBuilder = queryBuilder.or(
          `city.ilike.%${city}%,address.ilike.%${city}%,title.ilike.%${city}%`
        );
      } else if (!inferredCategory) {
        // Only do text search if we didn't already narrow by category
        const searchTerm = `%${cleanedQuery}%`;
        queryBuilder = queryBuilder.or(
          `title.ilike.${searchTerm},description.ilike.${searchTerm},address.ilike.${searchTerm},city.ilike.${searchTerm}`
        );
      }
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
        if (l.distance_miles === null) return false; // Exclude listings without coordinates in location searches
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

    // Filter by delivery capability (must deliver to searcher's coords)
    if (delivery_capable) {
      filteredListings = filteredListings.filter(l => l.can_deliver);
    }

    // Filter by fulfillment types (any-of). 'both' matches pickup or delivery.
    if (Array.isArray(fulfillment_types) && fulfillment_types.length > 0) {
      const wants = new Set(fulfillment_types);
      filteredListings = filteredListings.filter(l => {
        const ft = l.fulfillment_type;
        if (!ft) return false;
        if (wants.has('pickup') && (ft === 'pickup' || ft === 'both')) return true;
        if (wants.has('delivery') && (ft === 'delivery' || ft === 'both')) return true;
        if (wants.has('on_site') && ft === 'on_site') return true;
        return false;
      });
    }


    // Filter by featured listings
    if (featured_only) {
      const now = new Date().toISOString();
      filteredListings = filteredListings.filter(l => 
        l.featured_enabled && l.featured_expires_at && l.featured_expires_at > now
      );
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

    // Featured-first PRIMARY sort key + fair daily rotation among the featured cohort.
    // Mirrors src/lib/featured.ts (dailyFeaturedRotationKey).
    const nowIso = new Date().toISOString();
    const isFeatured = (l: any) =>
      !!(l.featured_enabled && l.featured_expires_at && l.featured_expires_at > nowIso);
    const today = nowIso.slice(0, 10);
    const rotKey = (l: any): number => {
      const seed = `${l.id}|${today}`;
      let h = 2166136261;
      for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
      return h >>> 0;
    };
    const featuredTiebreak = (a: any, b: any): number => {
      const fa = isFeatured(a), fb = isFeatured(b);
      if (fa !== fb) return fa ? -1 : 1;
      if (fa && fb) return rotKey(a) - rotKey(b);
      return 0;
    };


    // Apply sorting (featured-first, then requested order)
    if (sort_by === 'distance' && latitude !== undefined && longitude !== undefined) {
      filteredListings.sort((a, b) => {
        const fa = isFeatured(a), fb = isFeatured(b);
        if (fa !== fb) return fa ? -1 : 1;
        if (a.distance_miles === null && b.distance_miles === null) return 0;
        if (a.distance_miles === null) return 1;
        if (b.distance_miles === null) return -1;
        return a.distance_miles - b.distance_miles;
      });
    } else if (sort_by === 'price_low') {
      filteredListings.sort((a, b) => {
        const fa = isFeatured(a), fb = isFeatured(b);
        if (fa !== fb) return fa ? -1 : 1;
        const priceA = a.mode === 'rent' ? (a.price_daily || a.price_hourly || 0) : (a.price_sale || 0);
        const priceB = b.mode === 'rent' ? (b.price_daily || b.price_hourly || 0) : (b.price_sale || 0);
        return priceA - priceB;
      });
    } else if (sort_by === 'price_high') {
      filteredListings.sort((a, b) => {
        const fa = isFeatured(a), fb = isFeatured(b);
        if (fa !== fb) return fa ? -1 : 1;
        const priceA = a.mode === 'rent' ? (a.price_daily || a.price_hourly || 0) : (a.price_sale || 0);
        const priceB = b.mode === 'rent' ? (b.price_daily || b.price_hourly || 0) : (b.price_sale || 0);
        return priceB - priceA;
      });
    } else if (sort_by === 'relevance' && query && query.trim()) {
      const searchLower = query.toLowerCase();
      filteredListings.sort((a, b) => {
        const fa = isFeatured(a), fb = isFeatured(b);
        if (fa !== fb) return fa ? -1 : 1;
        const aTitleMatch = a.title?.toLowerCase().includes(searchLower) ? 0 : 1;
        const bTitleMatch = b.title?.toLowerCase().includes(searchLower) ? 0 : 1;
        if (aTitleMatch !== bTitleMatch) return aTitleMatch - bTitleMatch;
        return new Date(b.published_at || b.created_at).getTime() - new Date(a.published_at || a.created_at).getTime();
      });
    } else {
      // Default: newest (featured-first)
      filteredListings.sort((a, b) => {
        const fa = isFeatured(a), fb = isFeatured(b);
        if (fa !== fb) return fa ? -1 : 1;
        return new Date(b.published_at || b.created_at).getTime() - new Date(a.published_at || a.created_at).getTime();
      });
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
