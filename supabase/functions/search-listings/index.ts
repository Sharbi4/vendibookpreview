import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  buildHoustonAreaOrFilter,
  getHoustonAreaCities,
  HOUSTON_SEARCH_STATE,
} from '../_shared/houstonSearchArea.ts';
import {
  escapeOrValue,
  haversineMiles,
  MAX_RADIUS_MILES,
  MIN_RELEVANT_RESULTS,
  nextRadius,
  parseLocationInput,
  toRad,
} from '../_shared/locationSearch.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Haversine distance calculation (returns miles)
const calculateDistance = haversineMiles;


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
  // True when `query` is the geocoded location itself (e.g. "Austin, TX") —
  // the radius filter already scopes geography, so the city text filter must
  // be skipped or surrounding suburbs get excluded (double-constraint bug).
  location_scoped?: boolean;
  /** Raw location text ("Tucson, AZ", "85719", "Arizona") for structured fallback. */
  location_text?: string;
  /** Allow automatic radius expansion when local inventory is sparse (default true). */
  auto_expand_radius?: boolean;

  page?: number;
  page_size?: number;
  sort_by?: 'featured' | 'newest' | 'price_low' | 'price_high' | 'distance' | 'relevance';
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
      location_scoped,
      location_text,
      auto_expand_radius = true,

      page = 1,
      page_size = 20,
      sort_by = 'featured',
    } = body;

    // When the query IS the geocoded location, suppress the city-name text
    // filter — the Haversine radius below is the geographic source of truth.
    const locationScoped =
      !!location_scoped && latitude !== undefined && longitude !== undefined;

    const hasCoords = latitude !== undefined && longitude !== undefined
      && Number.isFinite(latitude) && Number.isFinite(longitude);

    // Structured location parsed from either the explicit location text or,
    // when the shopper typed a place into the keyword box, the query itself.
    const parsedLocation = parseLocationInput(
      location_text || (locationScoped || !hasCoords ? query : undefined)
    );
    const hasStructuredLocation = !!(parsedLocation.city || parsedLocation.state || parsedLocation.zip);
    // State-only searches ("Arizona", "AZ") are a structured filter, not a radius search.
    const stateOnlySearch = parsedLocation.kind === 'state';

    const requestedRadius = Math.max(1, Math.min(radius_miles, MAX_RADIUS_MILES));

    // Clamp page_size to max 50
    const effectivePageSize = Math.min(page_size, 50);
    const offset = (page - 1) * effectivePageSize;


    // Base query = every non-geographic filter. Rebuilt per geo attempt so a
    // sparse-inventory radius expansion re-runs the identical filter set.
    const buildBaseQuery = () => {
    let queryBuilder = supabaseClient
      .from('listings')
      .select('*', { count: 'exact' })
      .eq('status', 'published').not('published_at', 'is', null).is('deleted_at', null).eq('moderation_status', 'clear')
      .not('title', 'ilike', 'Demo %');



    // Apply mode filter
    if (mode) {
      queryBuilder = queryBuilder.eq('mode', mode);
    }

    // Apply category filter (supports comma-separated list)
    if (category) {
      let cats = category.split(',').map((c) => c.trim()).filter(Boolean);
      // Vendor Spaces alias: current `vendor_space` and legacy `vendor_lot`
      // records are the same shopper concept — always search both.
      if (cats.includes('vendor_space') || cats.includes('vendor_lot')) {
        cats = [...new Set([...cats, 'vendor_space', 'vendor_lot'])];
      }
      if (cats.length > 1) {
        queryBuilder = queryBuilder.in('category', cats);
      } else if (cats.length === 1) {
        queryBuilder = queryBuilder.eq('category', cats[0]);
      }
    }

    // Smart query parsing: extract intent, strip filler words, map to categories.
    // Aliases are matched token-by-token with prefix tolerance so a shopper who
    // has typed "food truc" (or "trailers", "kitchens") still lands on the right
    // category instead of falling through to a literal phrase ILIKE that only
    // matches the handful of titles containing that exact substring.
    const categoryAliases: Array<[string, string]> = [
      ['food truck', 'food_truck'],
      ['foodtruck', 'food_truck'],
      ['truck', 'food_truck'],
      ['trucks', 'food_truck'],
      ['food trailer', 'food_trailer'],
      ['foodtrailer', 'food_trailer'],
      ['concession trailer', 'food_trailer'],
      ['trailer', 'food_trailer'],
      ['trailers', 'food_trailer'],
      ['ghost kitchen', 'ghost_kitchen'],
      ['commercial kitchen', 'ghost_kitchen'],
      ['shared kitchen', 'ghost_kitchen'],
      ['commissary', 'ghost_kitchen'],
      ['kitchen', 'ghost_kitchen'],
      ['kitchens', 'ghost_kitchen'],
      ['vendor space', 'vendor_space'],
      ['vendor spaces', 'vendor_space'],
      ['vendor lot', 'vendor_lot'],
      ['lot', 'vendor_lot'],
      ['space', 'vendor_space'],
      ['vending', 'vendor_space'],
    ];

    // Strip mode-related filler words from query
    let cleanedQuery = (query || '').trim();
    const modeFillers = /\b(for\s+rent|for\s+sale|to\s+rent|to\s+buy|rental|rentals)\b/gi;
    cleanedQuery = cleanedQuery.replace(modeFillers, '').trim();

    const queryLower = cleanedQuery.toLowerCase().replace(/\s+/g, ' ').trim();
    const queryTokens = queryLower.split(' ').filter(Boolean);

    // A query matches an alias when every typed token is a prefix of the alias's
    // corresponding token (min 3 chars so "f" doesn't select a category), or the
    // alias appears verbatim inside the query.
    const matchesAlias = (alias: string): boolean => {
      if (!queryLower) return false;
      if (queryLower.includes(alias)) return true;
      const aliasTokens = alias.split(' ');
      if (queryTokens.length === 0 || queryTokens.length > aliasTokens.length) return false;
      return queryTokens.every((tok, i) => {
        const target = aliasTokens[i];
        if (!target) return false;
        if (tok.length < 3) return tok === target;
        return target.startsWith(tok);
      });
    };

    let inferredCategory: string | null = null;
    for (const [alias, cat] of categoryAliases) {
      if (matchesAlias(alias)) {
        inferredCategory = cat;
        break;
      }
    }

    // If we inferred a category and no explicit category was set, apply it as a filter
    if (inferredCategory && !category) {
      queryBuilder = queryBuilder.eq('category', inferredCategory);
    }

    // Structured location handling for a place typed into the keyword box.
    // Only unambiguous shapes (ZIP, "City, ST", state name/abbr) count — a bare
    // single word like "Phoenix" or "kitchen" keeps normal text search.
    const queryPlace = location_text ? { kind: null } as ReturnType<typeof parseLocationInput> : parseLocationInput(cleanedQuery);
    const queryIsStructuredPlace =
      !location_text && (queryPlace.kind === 'zip' || queryPlace.kind === 'state' || queryPlace.kind === 'city_state');

    // Apply text search (ILIKE on title, description, address, city).
    // Skipped for location-scoped searches so metro suburbs inside the radius
    // aren't filtered out for not name-matching the searched city.
    if (cleanedQuery && !locationScoped && !queryIsStructuredPlace) {
      const houstonAreaCities = getHoustonAreaCities(cleanedQuery);

      if (houstonAreaCities) {
        // Houston-only inclusion: match the real stored suburb city while keeping
        // the requested market scoped to Texas.
        queryBuilder = queryBuilder
          .eq('state', HOUSTON_SEARCH_STATE)
          .or(buildHoustonAreaOrFilter());
      } else if (!inferredCategory) {
        // Token-wise OR: every meaningful token may match any text column, so a
        // multi-word or partially typed phrase still returns sensible inventory
        // instead of requiring the exact substring.
        const terms = (queryTokens.length > 1 ? [queryLower, ...queryTokens] : [queryLower])
          .filter((t) => t.length >= 3);
        const ors: string[] = [];
        for (const term of terms) {
          const searchTerm = `%${escapeOrValue(term)}%`;
          ors.push(
            `title.ilike.${searchTerm}`,
            `description.ilike.${searchTerm}`,
            `address.ilike.${searchTerm}`,
            `city.ilike.${searchTerm}`,
          );
        }
        if (ors.length > 0) queryBuilder = queryBuilder.or(ors.join(','));
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

    return queryBuilder;
    };

    // ---- Geographic fetch passes -------------------------------------------
    // Pass A: bounding box at the requested radius (cheap pre-filter for Haversine).
    // Pass B: bounding box at 500 mi, only when local inventory is sparse.
    // Pass C: structured city/state/ZIP match so listings with valid location
    //         fields but NULL coordinates never disappear from a place search.
    const HARD_FETCH_LIMIT = 1000;
    const FALLBACK_FETCH_LIMIT = 300;

    const withBoundingBox = (builder: any, radius: number) => {
      const latDelta = radius / 69;
      const lngDelta = radius / (69 * Math.max(0.05, Math.cos(toRad(latitude as number))));
      return builder
        .gte('latitude', (latitude as number) - latDelta)
        .lte('latitude', (latitude as number) + latDelta)
        .gte('longitude', (longitude as number) - lngDelta)
        .lte('longitude', (longitude as number) + lngDelta);
    };

    const withStructuredLocation = (builder: any) => {
      let b = builder;
      if (parsedLocation.state) b = b.eq('state', parsedLocation.state);
      const ors: string[] = [];
      if (parsedLocation.zip) ors.push(`postal_code.ilike.%${escapeOrValue(parsedLocation.zip)}%`);
      if (parsedLocation.city) {
        const c = escapeOrValue(parsedLocation.city);
        ors.push(`city.ilike.%${c}%`, `address.ilike.%${c}%`);
      }
      if (ors.length) b = b.or(ors.join(','));
      return b;
    };

    const rowsById = new Map<string, any>();
    const fallbackIds = new Set<string>();
    const collect = (rows: any[] | null, markFallback = false) => {
      for (const row of rows ?? []) {
        if (!rowsById.has(row.id)) rowsById.set(row.id, row);
        if (markFallback) fallbackIds.add(row.id);
      }
    };

    let fetchRadius = requestedRadius;
    let radiusExpanded = false;

    if (hasCoords && !stateOnlySearch) {
      const { data: nearRows, error: nearErr } = await withBoundingBox(buildBaseQuery(), requestedRadius)
        .limit(HARD_FETCH_LIMIT);
      if (nearErr) throw nearErr;
      collect(nearRows);

      const withinRequested = (nearRows ?? []).filter((l: any) =>
        l.latitude != null && l.longitude != null &&
        haversineMiles(latitude as number, longitude as number, l.latitude, l.longitude) <= requestedRadius
      ).length;

      if (auto_expand_radius && withinRequested < MIN_RELEVANT_RESULTS && requestedRadius < MAX_RADIUS_MILES) {
        const { data: wideRows, error: wideErr } = await withBoundingBox(buildBaseQuery(), MAX_RADIUS_MILES)
          .limit(HARD_FETCH_LIMIT);
        if (wideErr) throw wideErr;
        collect(wideRows);
        fetchRadius = MAX_RADIUS_MILES;
      }
    }

    // Structured fallback: same filters, matched on city/state/ZIP text.
    let textFallbackUsed = false;
    if (hasStructuredLocation) {
      const { data: textRows, error: textErr } = await withStructuredLocation(buildBaseQuery())
        .limit(FALLBACK_FETCH_LIMIT);
      if (textErr) throw textErr;
      const newOnes = (textRows ?? []).filter((r: any) => !rowsById.has(r.id) || r.latitude == null);
      collect(textRows, false);
      // Only coordinate-less rows count as a text fallback tier; coordinate rows
      // are already ranked by true distance.
      for (const r of textRows ?? []) {
        if (r.latitude == null || r.longitude == null) {
          fallbackIds.add(r.id);
          textFallbackUsed = true;
        }
      }
      void newOnes;
    }

    // No geography at all → plain filtered fetch.
    if (!hasCoords && !hasStructuredLocation) {
      const { data: plainRows, error: plainErr } = await buildBaseQuery().limit(HARD_FETCH_LIMIT);
      if (plainErr) throw plainErr;
      collect(plainRows);
    } else if (!hasCoords && stateOnlySearch && rowsById.size === 0) {
      const { data: stateRows, error: stateErr } = await buildBaseQuery()
        .eq('state', parsedLocation.state as string)
        .limit(HARD_FETCH_LIMIT);
      if (stateErr) throw stateErr;
      collect(stateRows);
    }

    const listings = [...rowsById.values()];
    void fetchRadius;

    if (listings.length === 0) {
      return new Response(
        JSON.stringify({
          listings: [],
          sponsored: [],
          total_count: 0,
          page,
          page_size: effectivePageSize,
          total_pages: 0,
          search_meta: {
            requested_radius_miles: requestedRadius,
            effective_radius_miles: requestedRadius,
            radius_expanded: false,
            location_label: parsedLocation.label ?? null,
            result_count: 0,
            text_fallback_used: false,
            state_only_search: stateOnlySearch,
          },
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
        // True when the listing matched by structured city/state/ZIP because it
        // has no coordinates — surfaced after true-distance results.
        location_text_match: distance_miles === null && fallbackIds.has(listing.id),
      };
    });

    // NOTE: precise Haversine radius filtering happens after the remaining
    // filters so the progressive-expansion threshold counts *relevant* results.


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

    // ---- Progressive radius expansion --------------------------------------
    // Widen only the geographic constraint (never mode/category/dates/verified
    // /delivery/price) until at least MIN_RELEVANT_RESULTS relevant listings
    // exist or the 500-mile ceiling is reached.
    let effectiveRadius = requestedRadius;
    if (hasCoords && !stateOnlySearch) {
      const withCoords = filteredListings.filter((l) => l.distance_miles !== null);
      const fallbackRows = filteredListings.filter((l) => l.location_text_match);

      const countWithin = (radius: number) =>
        withCoords.filter((l) => (l.distance_miles as number) <= radius).length + fallbackRows.length;

      while (
        auto_expand_radius &&
        countWithin(effectiveRadius) < MIN_RELEVANT_RESULTS &&
        effectiveRadius < MAX_RADIUS_MILES
      ) {
        const next = nextRadius(effectiveRadius);
        if (!next || next === effectiveRadius) break;
        effectiveRadius = next;
      }

      filteredListings = filteredListings.filter(
        (l) => (l.distance_miles !== null && l.distance_miles <= effectiveRadius) || l.location_text_match
      );
    } else if (hasCoords) {
      filteredListings = filteredListings.filter(
        (l) => l.distance_miles === null || l.distance_miles <= effectiveRadius || l.location_text_match
      );
    }
    const radiusWasExpanded = effectiveRadius > requestedRadius;
    const usedTextFallback = textFallbackUsed && filteredListings.some((l) => l.location_text_match);


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


    // Explicit shopper sorts (price/distance/newest/relevance) are honored
    // STRICTLY — pinning featured listings above them would misrepresent the
    // requested order. Featured inventory is instead returned in `sponsored`
    // for a labeled strip above the results. Only the default `featured`
    // discovery sort pins featured listings first.
    const isExplicitSort =
      sort_by === 'price_low' ||
      sort_by === 'price_high' ||
      sort_by === 'newest' ||
      (sort_by === 'relevance' && !!query?.trim()) ||
      (sort_by === 'distance' && latitude !== undefined && longitude !== undefined);
    const sponsored = isExplicitSort
      ? filteredListings
          .filter((l) => isFeatured(l))
          .sort((a, b) => rotKey(a) - rotKey(b))
          .slice(0, 4)
      : [];

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
        const rawA = a.mode === 'rent' ? (a.price_daily || a.price_hourly || 0) : (a.price_sale || 0);
        const rawB = b.mode === 'rent' ? (b.price_daily || b.price_hourly || 0) : (b.price_sale || 0);
        // Price-unknown listings ("Price TBD") sink to the end, not the top.
        const priceA = rawA > 0 ? rawA : Number.MAX_SAFE_INTEGER;
        const priceB = rawB > 0 ? rawB : Number.MAX_SAFE_INTEGER;
        return priceA - priceB;
      });
    } else if (sort_by === 'price_high') {
      filteredListings.sort((a, b) => {
        const priceA = a.mode === 'rent' ? (a.price_daily || a.price_hourly || 0) : (a.price_sale || 0);
        const priceB = b.mode === 'rent' ? (b.price_daily || b.price_hourly || 0) : (b.price_sale || 0);
        return priceB - priceA;
      });
    } else if (sort_by === 'newest') {
      // Explicit Newest: strict chronological, no featured override.
      filteredListings.sort((a, b) =>
        new Date(b.published_at || b.created_at).getTime() - new Date(a.published_at || a.created_at).getTime()
      );
    } else if (sort_by === 'relevance' && query && query.trim()) {
      // Explicit Relevance: title match strength then recency, no featured override.
      const searchLower = query.toLowerCase();
      filteredListings.sort((a, b) => {
        const aTitleMatch = a.title?.toLowerCase().includes(searchLower) ? 0 : 1;
        const bTitleMatch = b.title?.toLowerCase().includes(searchLower) ? 0 : 1;
        if (aTitleMatch !== bTitleMatch) return aTitleMatch - bTitleMatch;
        return new Date(b.published_at || b.created_at).getTime() - new Date(a.published_at || a.created_at).getTime();
      });
    } else {
      // Default `featured` discovery sort. For a location search, results are
      // tiered first — nearby (inside the requested radius), then structured
      // city/state fallbacks with no coordinates, then expanded-area results —
      // and featured rotation applies inside each tier.
      const tierOf = (l: any): number => {
        if (!hasCoords || stateOnlySearch) return 0;
        if (l.distance_miles !== null && l.distance_miles <= requestedRadius) return 0;
        if (l.location_text_match) return 1;
        return 2;
      };
      filteredListings.sort((a, b) => {
        const ta = tierOf(a), tb = tierOf(b);
        if (ta !== tb) return ta - tb;
        const _f = featuredTiebreak(a, b); if (_f !== 0) return _f;
        if (ta === 2 && a.distance_miles !== null && b.distance_miles !== null) {
          return a.distance_miles - b.distance_miles;
        }
        return new Date(b.published_at || b.created_at).getTime() - new Date(a.published_at || a.created_at).getTime();
      });
    }


    // A listing shown in the Sponsored strip must not also appear in the
    // main results below it — the same truck would render twice on the page.
    // Exclude sponsored ids from the result list (order-independent, so this
    // runs after sorting) so each listing is shown exactly once.
    const sponsoredIds = new Set(sponsored.map((l: any) => l.id));
    const resultsListings = sponsoredIds.size
      ? filteredListings.filter((l) => !sponsoredIds.has(l.id))
      : filteredListings;

    // Calculate total after all filters
    const totalCount = resultsListings.length;
    const totalPages = Math.ceil(totalCount / effectivePageSize);

    // Apply pagination
    const paginatedListings = resultsListings.slice(offset, offset + effectivePageSize);

    return new Response(
      JSON.stringify({
        listings: paginatedListings,
        // Sponsored strip is a page-1 header; repeating it on later pages
        // would re-show listings the shopper already saw.
        sponsored: page <= 1 ? sponsored : [],
        total_count: totalCount,
        page,
        page_size: effectivePageSize,
        total_pages: totalPages,
        search_meta: {
          requested_radius_miles: requestedRadius,
          effective_radius_miles: effectiveRadius,
          radius_expanded: radiusWasExpanded,
          location_label: parsedLocation.label ?? null,
          result_count: totalCount,
          text_fallback_used: usedTextFallback,
          state_only_search: stateOnlySearch,
        },
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
