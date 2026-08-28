import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
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

interface ResolvedLocation {
  city?: string;
  state?: string;
  zip?: string;
}

const STATE_ALIASES: Record<string, string> = {
  alabama: 'AL', alaska: 'AK', arizona: 'AZ', arkansas: 'AR', california: 'CA', colorado: 'CO',
  connecticut: 'CT', delaware: 'DE', florida: 'FL', georgia: 'GA', hawaii: 'HI', idaho: 'ID',
  illinois: 'IL', indiana: 'IN', iowa: 'IA', kansas: 'KS', kentucky: 'KY', louisiana: 'LA',
  maine: 'ME', maryland: 'MD', massachusetts: 'MA', michigan: 'MI', minnesota: 'MN',
  mississippi: 'MS', missouri: 'MO', montana: 'MT', nebraska: 'NE', nevada: 'NV',
  'new hampshire': 'NH', 'new jersey': 'NJ', 'new mexico': 'NM', 'new york': 'NY',
  'north carolina': 'NC', 'north dakota': 'ND', ohio: 'OH', oklahoma: 'OK', oregon: 'OR',
  pennsylvania: 'PA', 'rhode island': 'RI', 'south carolina': 'SC', 'south dakota': 'SD',
  tennessee: 'TN', texas: 'TX', utah: 'UT', vermont: 'VT', virginia: 'VA', washington: 'WA',
  'west virginia': 'WV', wisconsin: 'WI', wyoming: 'WY', 'district of columbia': 'DC',
};

function escapePostgrest(value: string): string {
  return value.replace(/[,%()]/g, ' ').trim();
}

function normalizeState(value?: string): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (/^[a-z]{2}$/i.test(trimmed)) return trimmed.toUpperCase();
  return STATE_ALIASES[trimmed.toLowerCase()] || trimmed;
}

async function reverseResolveLocation(latitude: number, longitude: number): Promise<ResolvedLocation | null> {
  try {
    const url = new URL('https://nominatim.openstreetmap.org/reverse');
    url.searchParams.set('lat', String(latitude));
    url.searchParams.set('lon', String(longitude));
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('addressdetails', '1');

    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'Vendibook/1.0 (search location fallback)',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
    if (!response.ok) return null;

    const row = await response.json();
    const address = row?.address || {};
    const city = address.city || address.town || address.village || address.hamlet;
    const state = address['ISO3166-2-lvl4']?.split('-')?.[1] || normalizeState(address.state);
    const zip = address.postcode;
    if (!city && !state && !zip) return null;
    return { city, state, zip };
  } catch (error) {
    console.warn('Search reverse-location fallback unavailable:', error);
    return null;
  }
}

function listingMatchesResolvedLocation(listing: any, location: ResolvedLocation | null): boolean {
  if (!location) return false;
  const listingCity = String(listing.city || '').trim().toLowerCase();
  const listingState = normalizeState(String(listing.state || ''))?.toLowerCase();
  const listingZip = String(listing.zip || '').trim();

  const cityMatch = location.city ? listingCity === location.city.trim().toLowerCase() : false;
  const stateMatch = location.state ? listingState === normalizeState(location.state)?.toLowerCase() : false;
  const zipMatch = location.zip ? listingZip === String(location.zip).trim() : false;

  if (location.city && location.state) return cityMatch && stateMatch;
  return zipMatch || cityMatch || stateMatch;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

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

    const effectivePageSize = Math.min(Math.max(page_size, 1), 50);
    const pageNumber = Math.max(page, 1);
    const offset = (pageNumber - 1) * effectivePageSize;
    const hasCoordinates = Number.isFinite(latitude) && Number.isFinite(longitude);

    let queryBuilder = supabaseClient
      .from('listings')
      .select('*', { count: 'exact' })
      .eq('status', 'published')
      .not('published_at', 'is', null)
      .is('deleted_at', null)
      .eq('moderation_status', 'clear')
      .not('title', 'ilike', 'Demo %');

    if (mode) queryBuilder = queryBuilder.eq('mode', mode);

    if (category) {
      const cats = category.split(',').map((c) => c.trim()).filter(Boolean);
      if (cats.length > 1) queryBuilder = queryBuilder.in('category', cats);
      else if (cats.length === 1) queryBuilder = queryBuilder.eq('category', cats[0]);
    }

    const categoryKeywords: Array<[RegExp, string]> = [
      [/\bghost\s+kitchen\b|\bcommercial\s+kitchen\b|\bkitchen\b/i, 'ghost_kitchen'],
      [/\bfood\s+trailer\b|\btrailer\b/i, 'food_trailer'],
      [/\bfood\s+truck\b|\btruck\b/i, 'food_truck'],
      [/\bvendor\s+lot\b|\blot\b/i, 'vendor_lot'],
      [/\bvendor\s+space\b|\bvending\b|\bspace\b/i, 'vendor_space'],
    ];

    let cleanedQuery = (query || '').trim();
    cleanedQuery = cleanedQuery.replace(/\b(for\s+rent|for\s+sale|to\s+rent|to\s+buy|rental|rentals)\b/gi, '').trim();

    let inferredCategory: string | null = null;
    for (const [pattern, cat] of categoryKeywords) {
      if (pattern.test(cleanedQuery)) {
        inferredCategory = cat;
        break;
      }
    }
    if (inferredCategory && !category) queryBuilder = queryBuilder.eq('category', inferredCategory);

    // Detect obvious location-only searches so city/state pairs are ANDed instead of
    // accidentally returning every listing in the state.
    const zipOnly = cleanedQuery.match(/^\d{5}$/);
    const cityState = cleanedQuery.match(/^\s*([^,]+),\s*([A-Za-z .]{2,})\s*$/);
    const stateOnly = normalizeState(cleanedQuery);
    const looksLikeStateOnly = Boolean(cleanedQuery && (STATE_ALIASES[cleanedQuery.toLowerCase()] || /^[A-Za-z]{2}$/.test(cleanedQuery)));

    if (cleanedQuery && !inferredCategory) {
      if (zipOnly) {
        const zip = escapePostgrest(zipOnly[0]);
        queryBuilder = queryBuilder.or(`zip.eq.${zip},address.ilike.%${zip}%`);
      } else if (cityState) {
        const city = escapePostgrest(cityState[1]);
        const state = escapePostgrest(normalizeState(cityState[2]) || cityState[2]);
        queryBuilder = queryBuilder.ilike('city', `%${city}%`).ilike('state', `%${state}%`);
      } else if (looksLikeStateOnly && stateOnly) {
        queryBuilder = queryBuilder.ilike('state', `%${escapePostgrest(stateOnly)}%`);
      } else {
        const term = escapePostgrest(cleanedQuery);
        queryBuilder = queryBuilder.or(
          `title.ilike.%${term}%,description.ilike.%${term}%,address.ilike.%${term}%,city.ilike.%${term}%,state.ilike.%${term}%,zip.ilike.%${term}%`
        );
      }
    }

    if (min_price !== undefined && min_price > 0 && mode === 'sale') {
      queryBuilder = queryBuilder.gte('price_sale', min_price);
    }
    if (max_price !== undefined && Number.isFinite(max_price) && mode === 'sale') {
      queryBuilder = queryBuilder.lte('price_sale', max_price);
    }
    if (instant_book_only) queryBuilder = queryBuilder.eq('instant_book', true);
    if (amenities?.length) queryBuilder = queryBuilder.contains('amenities', amenities);

    const { data: listings, error: listingsError } = await queryBuilder;
    if (listingsError) throw listingsError;

    if (!listings?.length) {
      return new Response(JSON.stringify({
        listings: [], total_count: 0, page: pageNumber, page_size: effectivePageSize, total_pages: 0,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Resolve selected coordinates once so listings without lat/lng can still be
    // matched by their structured city/state/ZIP rather than disappearing.
    const resolvedLocation = hasCoordinates
      ? await reverseResolveLocation(latitude as number, longitude as number)
      : null;

    const hostIds = [...new Set(listings.map((l) => l.host_id).filter(Boolean))];
    const hostVerificationMap: Record<string, boolean> = {};
    if (hostIds.length > 0) {
      const { data: profiles } = await supabaseClient.rpc('get_host_verification_status', { host_ids: hostIds });
      profiles?.forEach((p: { id: string; identity_verified: boolean }) => {
        hostVerificationMap[p.id] = p.identity_verified ?? false;
      });
    }

    const unavailableListingIds = new Set<string>();
    if (start_date && end_date) {
      const listingIds = listings.map((l) => l.id);
      const [{ data: blockedDates }, { data: bookings }] = await Promise.all([
        supabaseClient
          .from('listing_blocked_dates')
          .select('listing_id')
          .in('listing_id', listingIds)
          .gte('blocked_date', start_date)
          .lte('blocked_date', end_date),
        supabaseClient
          .from('booking_requests')
          .select('listing_id')
          .in('listing_id', listingIds)
          .eq('status', 'approved')
          .lte('start_date', end_date)
          .gte('end_date', start_date),
      ]);
      blockedDates?.forEach((row) => unavailableListingIds.add(row.listing_id));
      bookings?.forEach((row) => unavailableListingIds.add(row.listing_id));
    }

    let filteredListings = listings.map((listing) => {
      let distance_miles: number | null = null;
      if (hasCoordinates && listing.latitude != null && listing.longitude != null) {
        distance_miles = calculateDistance(
          latitude as number,
          longitude as number,
          Number(listing.latitude),
          Number(listing.longitude)
        );
      }

      let can_deliver = false;
      if (
        hasCoordinates &&
        listing.latitude != null &&
        listing.longitude != null &&
        listing.delivery_radius_miles &&
        (listing.fulfillment_type === 'delivery' || listing.fulfillment_type === 'both')
      ) {
        can_deliver = calculateDistance(
          Number(listing.latitude),
          Number(listing.longitude),
          latitude as number,
          longitude as number
        ) <= Number(listing.delivery_radius_miles);
      }

      return {
        ...listing,
        distance_miles,
        host_verified: hostVerificationMap[listing.host_id] ?? false,
        is_available: !unavailableListingIds.has(listing.id),
        can_deliver,
      };
    });

    if (hasCoordinates) {
      filteredListings = filteredListings.filter((listing) => {
        if (listing.distance_miles != null) return listing.distance_miles <= radius_miles;
        return listingMatchesResolvedLocation(listing, resolvedLocation);
      });
    }

    if (start_date && end_date) filteredListings = filteredListings.filter((l) => l.is_available);
    if (verified_hosts_only) filteredListings = filteredListings.filter((l) => l.host_verified);
    if (delivery_capable) filteredListings = filteredListings.filter((l) => l.can_deliver);

    if (fulfillment_types?.length) {
      const wants = new Set(fulfillment_types);
      filteredListings = filteredListings.filter((l) => {
        const ft = l.fulfillment_type;
        return Boolean(
          (wants.has('pickup') && (ft === 'pickup' || ft === 'both')) ||
          (wants.has('delivery') && (ft === 'delivery' || ft === 'both')) ||
          (wants.has('on_site') && ft === 'on_site')
        );
      });
    }

    if (featured_only) {
      const now = new Date().toISOString();
      filteredListings = filteredListings.filter((l) =>
        l.featured_enabled && l.featured_expires_at && l.featured_expires_at > now
      );
    }

    if (min_price !== undefined || max_price !== undefined) {
      filteredListings = filteredListings.filter((l) => {
        const price = l.mode === 'rent'
          ? Number(l.price_daily || l.price_hourly || 0)
          : Number(l.price_sale || 0);
        const meetsMin = min_price === undefined || min_price <= 0 || price >= min_price;
        const meetsMax = max_price === undefined || !Number.isFinite(max_price) || price <= max_price;
        return meetsMin && meetsMax;
      });
    }

    const nowIso = new Date().toISOString();
    const isFeatured = (l: any) => Boolean(
      l.featured_enabled && l.featured_expires_at && l.featured_expires_at > nowIso
    );
    const today = nowIso.slice(0, 10);
    const rotationKey = (l: any): number => {
      const seed = `${l.id}|${today}`;
      let hash = 2166136261;
      for (let i = 0; i < seed.length; i++) {
        hash ^= seed.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
      }
      return hash >>> 0;
    };
    const featuredTiebreak = (a: any, b: any): number => {
      const aFeatured = isFeatured(a);
      const bFeatured = isFeatured(b);
      if (aFeatured !== bFeatured) return aFeatured ? -1 : 1;
      if (aFeatured && bFeatured) return rotationKey(a) - rotationKey(b);
      return 0;
    };

    const getPrice = (l: any) => l.mode === 'rent'
      ? Number(l.price_daily || l.price_hourly || 0)
      : Number(l.price_sale || 0);

    if (sort_by === 'distance' && hasCoordinates) {
      filteredListings.sort((a, b) => {
        const featured = featuredTiebreak(a, b);
        if (featured) return featured;
        if (a.distance_miles == null && b.distance_miles == null) return 0;
        if (a.distance_miles == null) return 1;
        if (b.distance_miles == null) return -1;
        return a.distance_miles - b.distance_miles;
      });
    } else if (sort_by === 'price_low' || sort_by === 'price_high') {
      const direction = sort_by === 'price_low' ? 1 : -1;
      filteredListings.sort((a, b) => {
        const featured = featuredTiebreak(a, b);
        if (featured) return featured;
        return (getPrice(a) - getPrice(b)) * direction;
      });
    } else if (sort_by === 'relevance' && cleanedQuery) {
      const searchLower = cleanedQuery.toLowerCase();
      filteredListings.sort((a, b) => {
        const featured = featuredTiebreak(a, b);
        if (featured) return featured;
        const score = (l: any) => {
          if (String(l.title || '').toLowerCase().includes(searchLower)) return 0;
          if (String(l.city || '').toLowerCase().includes(searchLower)) return 1;
          if (String(l.description || '').toLowerCase().includes(searchLower)) return 2;
          return 3;
        };
        const scoreDiff = score(a) - score(b);
        if (scoreDiff) return scoreDiff;
        return new Date(b.published_at || b.created_at).getTime() - new Date(a.published_at || a.created_at).getTime();
      });
    } else {
      filteredListings.sort((a, b) => {
        const featured = featuredTiebreak(a, b);
        if (featured) return featured;
        return new Date(b.published_at || b.created_at).getTime() - new Date(a.published_at || a.created_at).getTime();
      });
    }

    const totalCount = filteredListings.length;
    const totalPages = Math.ceil(totalCount / effectivePageSize);
    const paginatedListings = filteredListings.slice(offset, offset + effectivePageSize);

    return new Response(JSON.stringify({
      listings: paginatedListings,
      total_count: totalCount,
      page: pageNumber,
      page_size: effectivePageSize,
      total_pages: totalPages,
      resolved_location: resolvedLocation,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('Search error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
