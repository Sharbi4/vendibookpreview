import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ImpressionTracker } from '@/components/analytics/ImpressionTracker';
import { HostSupplyCTA } from '@/components/search/HostSupplyCTA';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Search as SearchIcon, SlidersHorizontal, X, MapPin, Tag, DollarSign, CalendarIcon, Navigation, CheckCircle2, Plug, Zap, Refrigerator, Flame, Wind, Wifi, Car, Shield, Droplet, Truck, LayoutGrid, Map, Columns, Rows3, Star, Heart, ArrowUpDown, ChevronDown, Check } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { format, parseISO } from 'date-fns';
import Header from '@/components/layout/Header';
import vendibookLogo from '@/assets/vendibook-logo.png';
import Footer from '@/components/layout/Footer';
import { usePageTracking } from '@/hooks/usePageTracking';
import { usePredictivePrefetch } from '@/hooks/usePredictivePrefetch';
import { trackLeadEvent } from '@/lib/leadTracking';
import ListingCard from '@/components/listing/ListingCard';
import { SkeletonCard } from '@/components/ui/SkeletonCard';
import QuickBookingModal from '@/components/search/QuickBookingModal';
import DateRangeFilter from '@/components/search/DateRangeFilter';
import { LocationSearchInput } from '@/components/search/LocationSearchInput';
import { RadiusFilter } from '@/components/search/RadiusFilter';
import SearchResultsMap from '@/components/search/SearchResultsMap';
import SmartNoResults from '@/components/search/SmartNoResults';
import { EmptyStateEmailCapture } from '@/components/search/EmptyStateEmailCapture';
import GetAlertsCard from '@/components/search/GetAlertsCard';
import RequestAssetCTA from '@/components/search/RequestAssetCTA';
import ReferralBrowseStrip from '@/components/referrals/ReferralBrowseStrip';
import MobileStickyBar from '@/components/search/MobileStickyBar';
import SaveSearchButton from '@/components/search/SaveSearchButton';
import { CategoryPillStrip } from '@/components/search/CategoryPillStrip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { CategoryInfoModal } from '@/components/categories/CategoryGuide';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { supabase } from '@/integrations/supabase/client';
import { filterPubliclyVisible } from '@/lib/listings/publicVisibility';
import { useQuery } from '@tanstack/react-query';
import { Listing, CATEGORY_LABELS, ListingCategory, ListingMode, AMENITIES_BY_CATEGORY } from '@/types/listing';
import { SPECIALTY_DEFS, SPECIALTY_SEARCH_QUERIES, SPECIALTY_SEARCH_SEO, specialtyVehicleHref, type SpecialtyKey, type SpecialtyVehicle } from '@/lib/listings/specialty';
import { trackEvent } from '@/lib/analytics';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useGoogleMapsToken } from '@/hooks/useGoogleMapsToken';
import SEO from '@/components/SEO';
import JsonLd, { generateItemListSchema, generateSearchBreadcrumbSchema, ProductListItem } from '@/components/JsonLd';

// Extended listing type with server-computed fields
interface SearchListing extends Listing {
  latitude?: number | null;
  longitude?: number | null;
  distance_miles?: number | null;
  host_verified?: boolean;
  is_available?: boolean;
  can_deliver?: boolean;
}

interface SearchMeta {
  requested_radius_miles: number;
  effective_radius_miles: number;
  radius_expanded: boolean;
  location_label: string | null;
  result_count: number;
  text_fallback_used: boolean;
  state_only_search: boolean;
}

interface SearchResponse {
  listings: SearchListing[];
  sponsored?: SearchListing[];
  total_count: number;
  page: number;
  page_size: number;
  total_pages: number;
  search_meta?: SearchMeta;
}

const Search = () => {
  usePredictivePrefetch();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Track page views with Google Analytics
  usePageTracking();
  
  // Get initial values from URL params
  const initialQuery = searchParams.get('q') || '';
  const initialMode = searchParams.get('mode') as ListingMode | 'all' || 'all';
  const initialCategory = searchParams.get('category') as ListingCategory | 'all' || 'all';
  const initialStartDate = searchParams.get('start');
  const initialEndDate = searchParams.get('end');
  const initialLat = searchParams.get('lat');
  const initialLng = searchParams.get('lng');
  const initialRadius = searchParams.get('radius');
  // Accept both hyphenated (UI contract) and snake_case (backend contract)
  // sort values so shared/refreshed links never land on a blank control.
  const rawSortParam = searchParams.get('sort');
  const normalizedSortParam = rawSortParam === 'price_low' ? 'price-low' : rawSortParam === 'price_high' ? 'price-high' : rawSortParam;
  const initialSort = (['featured', 'newest', 'price-low', 'price-high', 'distance', 'relevance'].includes(normalizedSortParam || '')
    ? normalizedSortParam
    : 'featured') as 'featured' | 'newest' | 'price-low' | 'price-high' | 'distance' | 'relevance';
  const initialInstantBook = searchParams.get('instant') === 'true';
  const initialPage = parseInt(searchParams.get('page') || '1', 10);
  
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  // Debounced twin of searchQuery. The input renders searchQuery immediately,
  // but fetches/URL updates only use debouncedQuery — firing both per keystroke
  // replaced the result list on every character, causing image flicker and
  // scroll jank on mobile.
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [mode, setMode] = useState<ListingMode | 'all'>(initialMode);
  const [category, setCategory] = useState<ListingCategory | 'all'>(initialCategory);
  const [locationText, setLocationText] = useState(searchParams.get('location') || '');
  const [locationCoords, setLocationCoords] = useState<[number, number] | null>(
    initialLat && initialLng ? [parseFloat(initialLng), parseFloat(initialLat)] : null
  );
  const [searchRadius, setSearchRadius] = useState(initialRadius ? parseInt(initialRadius) : 50);
  const [priceRange, setPriceRange] = useState<[number, number]>([
    searchParams.get('min_price') ? Number(searchParams.get('min_price')) : 0,
    searchParams.get('max_price') ? Number(searchParams.get('max_price')) : Infinity,
  ]);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(
    initialStartDate && initialEndDate
      ? { from: parseISO(initialStartDate), to: parseISO(initialEndDate) }
      : undefined
  );
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>(
    searchParams.get('amenities')?.split(',').filter(Boolean) ?? []
  );
  const [deliveryFilterEnabled, setDeliveryFilterEnabled] = useState(searchParams.get('delivery') === '1');
  const [fulfillmentTypes, setFulfillmentTypes] = useState<Array<'pickup' | 'delivery' | 'on_site'>>(
    (searchParams.get('fulfillment')?.split(',').filter(Boolean) as Array<'pickup' | 'delivery' | 'on_site'>) || []
  );

  const [instantBookOnly, setInstantBookOnly] = useState(initialInstantBook);
  const [verifiedHostsOnly, setVerifiedHostsOnly] = useState(searchParams.get('verified') === 'true');
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [sortBy, setSortBy] = useState<'featured' | 'newest' | 'price-low' | 'price-high' | 'distance' | 'relevance'>(initialSort);
  // True when the text query was auto-geocoded into a place — tells the
  // backend to skip the city-name text filter so metro suburbs inside the
  // radius aren't excluded for not name-matching the searched city.
  const [queryIsLocation, setQueryIsLocation] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'map' | 'split' | 'list'>('list');
  const [hoveredListingId, setHoveredListingId] = useState<string | null>(null);
  const [page, setPage] = useState(initialPage);

  // Google Maps API key for map view
  const { apiKey: mapToken, isLoading: isMapTokenLoading, error: mapTokenError } = useGoogleMapsToken();

  // Auto-geocode the search query if it looks like a location and no coordinates are set
  useEffect(() => {
    // Specialty keywords ("coffee", "ice cream") are equipment searches, not
    // places — the geocoder otherwise resolves "coffee" to Coffeeville, MS
    // and wrongly location-scopes the deep links.
    const shouldGeocode = initialQuery && !initialLat && !initialLng && !locationCoords
      && !SPECIALTY_SEARCH_QUERIES.has(initialQuery.trim().toLowerCase());
    if (!shouldGeocode) return;

    const geocodeQuery = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('geocode-location', {
          body: { query: initialQuery, limit: 1 },
        });
        if (!error && data?.results?.length > 0) {
          const result = data.results[0];
          const coords: [number, number] = result.center; // [lng, lat]
          setLocationCoords(coords);
          setLocationText(result.text);
          setQueryIsLocation(true);
          // Update URL with coordinates
          const params = new URLSearchParams(searchParams);
          params.set('lat', coords[1].toString());
          params.set('lng', coords[0].toString());
          params.set('radius', searchRadius.toString());
          params.set('location', result.text);
          setSearchParams(params, { replace: true });
        }
      } catch (err) {
        console.error('Auto-geocode failed:', err);
      }
    };

    geocodeQuery();
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Quick booking modal state
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

  // Build search request params for edge function
  const searchRequestParams = useMemo(() => ({
    query: debouncedQuery.trim() || undefined,
    location_scoped: queryIsLocation || undefined,
    location_text: locationText?.trim() || undefined,
    auto_expand_radius: true,
    mode: mode !== 'all' ? mode : undefined,
    category: category !== 'all' ? category : undefined,
    latitude: locationCoords?.[1],
    longitude: locationCoords?.[0],
    radius_miles: searchRadius,
    start_date: dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined,
    end_date: dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined,
    amenities: selectedAmenities.length > 0 ? selectedAmenities : undefined,
    min_price: priceRange[0] > 0 ? priceRange[0] : undefined,
    max_price: priceRange[1] !== Infinity ? priceRange[1] : undefined,
    instant_book_only: instantBookOnly || undefined,
    verified_hosts_only: verifiedHostsOnly || undefined,
    delivery_capable: deliveryFilterEnabled || undefined,
    fulfillment_types: fulfillmentTypes.length > 0 ? fulfillmentTypes : undefined,
    page,
    page_size: 20,
    sort_by: sortBy === 'price-low' ? 'price_low' : sortBy === 'price-high' ? 'price_high' : sortBy,
  }), [debouncedQuery, queryIsLocation, locationText, mode, category, locationCoords, searchRadius, dateRange, selectedAmenities, priceRange, instantBookOnly, verifiedHostsOnly, deliveryFilterEnabled, fulfillmentTypes, page, sortBy]);


  // Fetch listings from edge function
  const { data: searchResults, isLoading: isLoadingListings, isFetching } = useQuery({
    queryKey: ['search-listings', searchRequestParams],
    queryFn: async (): Promise<SearchResponse> => {
      const { data, error } = await supabase.functions.invoke('search-listings', {
        body: searchRequestParams,
      });
      
      if (error) throw error;
      return data as SearchResponse;
    },
    // Keep previous results ONLY when nothing but the page changed. Any
    // meaningful search change (location, filters, sort, keyword) must show a
    // loading state instead of presenting stale inventory as the new result.
    placeholderData: (previousData, previousQuery) => {
      if (!previousData || !previousQuery) return undefined;
      const prevParams = (previousQuery.queryKey as [string, typeof searchRequestParams])[1];
      if (!prevParams) return undefined;
      const stripPage = ({ page: _page, ...rest }: typeof searchRequestParams) => JSON.stringify(rest);
      return stripPage(prevParams) === stripPage(searchRequestParams) ? previousData : undefined;
    },
  });


  // Defensive: drop rows that stopped being publicly visible after the fetch
  // (paused/deleted/unpublished) so cached payloads can't surface dead links.
  const listings = filterPubliclyVisible(searchResults?.listings ?? []);
  const totalCount = searchResults?.total_count ?? 0;
  const totalPages = searchResults?.total_pages ?? 0;
  // Featured inventory returned separately for the labeled "Sponsored" strip
  // when the shopper picks an explicit sort — the main list honors it strictly.
  const sponsoredListings = useMemo(
    () => filterPubliclyVisible(searchResults?.sponsored ?? []),
    [searchResults?.sponsored]
  );

  // Sort options shown to the shopper. Price sorts only exist in a single-mode
  // context (sale $ vs rent $/day are incompatible units); Distance requires a
  // selected location; Relevance requires a text query.
  const sortOptions = useMemo(() => [
    { value: 'featured', label: 'Featured' },
    ...(debouncedQuery.trim() ? [{ value: 'relevance', label: 'Relevance' }] : []),
    { value: 'newest', label: 'Newest' },
    ...(mode !== 'all' ? [
      { value: 'price-low', label: 'Price: Low → High' },
      { value: 'price-high', label: 'Price: High → Low' },
    ] : []),
    ...(locationCoords ? [{ value: 'distance', label: 'Distance' }] : []),
  ], [debouncedQuery, mode, locationCoords]);

  // Server-side search metadata: effective radius after sparse-inventory
  // auto-expansion, plus whether coordinate-less city/state matches were used.
  const searchMeta = searchResults?.search_meta;
  const effectiveRadius = searchMeta?.effective_radius_miles ?? searchRadius;
  const radiusAutoExpanded = !!searchMeta?.radius_expanded;

  // Manual CTA only when the server did NOT already widen the search.
  const showExpandRadiusCta =
    !!locationCoords && searchRadius < 100 && page === 1 && !isFetching &&
    !radiusAutoExpanded && totalCount < 5;

  // Debounced search_performed funnel event — fires ~600ms after results settle so we
  // don't double-count while the user is still typing or toggling filters.
  useEffect(() => {
    if (isLoadingListings) return;
    const t = setTimeout(() => {
      const payload = {
        query: debouncedQuery.trim() || undefined,
        mode: mode !== 'all' ? mode : 'all',
        category: category !== 'all' ? category : 'all',
        locationText: locationText || undefined,
        result_count: totalCount,
        page,
        source: 'search_page',
      };
      trackLeadEvent('search_performed', payload);
      // Split signal: separate zero-results from results-returned so we can
      // tell whether searches are landing empty vs landing-but-ignored.
      if (totalCount === 0) {
        trackLeadEvent('search_zero_results', payload);
      } else {
        trackLeadEvent('search_results_returned', payload);
      }
    }, 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery, mode, category, locationText, totalCount, page, isLoadingListings]);



  // Typing updates the input immediately (cheap); the expensive side effects
  // (edge-function fetch, URL rewrite, sort switch) are debounced below so a
  // full word costs one fetch instead of one per character.
  const handleSearch = (value: string) => {
    setSearchQuery(value);
  };

  // Debounce the actual search request + URL update until typing pauses.
  useEffect(() => {
    if (searchQuery === debouncedQuery) return;
    const t = setTimeout(() => {
      const value = searchQuery;
      setDebouncedQuery(value);
      // Freshly typed text is keyword search, not the auto-geocoded place.
      setQueryIsLocation(false);
      setPage(1); // Reset to page 1 on new search
      setSortBy(prev => {
        if (value.trim() && prev !== 'relevance') return 'relevance';
        if (!value.trim() && prev === 'relevance') return 'featured';
        return prev;
      });
      setSearchParams(prev => {
        const params = new URLSearchParams(prev);
        if (value.trim()) {
          params.set('q', value);
          params.set('sort', 'relevance');
        } else {
          params.delete('q');
          if (sortBy === 'relevance') params.delete('sort');
        }
        params.delete('page');
        return params;
      }, { replace: true });
    }, 400);
    return () => clearTimeout(t);
    // Only re-run when the typed value changes; URL/sort are read functionally
    // or as point-in-time snapshots to avoid clobbering concurrent filter taps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  // Deep links (specialty "Browse coffee trucks" chips, hub CTAs) can change
  // the URL while /search is already mounted — re-sync the core filters from
  // the params. Only applies values that differ from current state so the
  // user's own typing/filter taps (which write the same params) never loop.
  useEffect(() => {
    const q = searchParams.get('q') || '';
    const m = (searchParams.get('mode') as ListingMode | 'all') || 'all';
    const c = (searchParams.get('category') as ListingCategory | 'all') || 'all';
    if (q !== searchQuery && q !== debouncedQuery) {
      setSearchQuery(q);
      setDebouncedQuery(q);
      setQueryIsLocation(false);
    }
    if (m !== mode) setMode(m);
    if (c !== category) setCategory(c);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleModeChange = (value: string) => {
    const newMode = value as ListingMode | 'all';
    setMode(newMode);
    setPage(1);
    const params = new URLSearchParams(searchParams);
    if (newMode !== 'all') {
      params.set('mode', newMode);
    } else {
      params.delete('mode');
      // Price sorts/filters only exist in a single-mode context (sale price vs
      // rental $/day are incompatible units) — reset them when returning to All.
      if (sortBy === 'price-low' || sortBy === 'price-high') {
        setSortBy('featured');
        params.delete('sort');
      }
      if (priceRange[0] > 0 || priceRange[1] !== Infinity) {
        setPriceRange([0, Infinity]);
        params.delete('min_price');
        params.delete('max_price');
      }
    }
    params.delete('page');
    setSearchParams(params);
  };

  // Clears an applied specialty filter — back to a neutral marketplace search.
  const handleSpecialtyClear = () => {
    setSearchQuery('');
    setDebouncedQuery('');
    setQueryIsLocation(false);
    setCategory('all');
    setMode('all');
    setPage(1);
    const params = new URLSearchParams(searchParams);
    params.delete('q');
    params.delete('category');
    params.delete('mode');
    params.delete('page');
    setSearchParams(params);
    trackEvent({ category: 'Search', action: 'specialty_filter_cleared', label: activeSpecialty?.key });
  };

  // Specialty browse deep links (coffee/ice cream × truck/trailer) — sets the
  // exact same state the hub-header and listing-card links navigate to.
  // Re-tapping the active specialty pill toggles the filter off.
  const handleSpecialtySelect = (key: SpecialtyKey, vehicle: SpecialtyVehicle) => {
    if (activeSpecialty?.key === key && activeSpecialty?.vehicle === vehicle) {
      handleSpecialtyClear();
      return;
    }
    const def = SPECIALTY_DEFS[key];
    const newCategory: ListingCategory = vehicle === 'truck' ? 'food_truck' : 'food_trailer';
    setSearchQuery(def.searchQuery);
    setDebouncedQuery(def.searchQuery);
    setQueryIsLocation(false);
    setCategory(newCategory);
    setMode('sale');
    setPage(1);
    const params = new URLSearchParams(searchParams);
    params.set('q', def.searchQuery);
    params.set('category', newCategory);
    params.set('mode', 'sale');
    params.delete('page');
    setSearchParams(params);
  };

  // Highlights the matching specialty pill when the current search state is
  // exactly a specialty browse deep link.
  const activeSpecialty = useMemo(() => {
    if (mode !== 'sale' || (category !== 'food_truck' && category !== 'food_trailer')) return null;
    const q = debouncedQuery.trim().toLowerCase();
    const key = (Object.keys(SPECIALTY_DEFS) as SpecialtyKey[]).find((k) => SPECIALTY_DEFS[k].searchQuery === q);
    return key ? { key, vehicle: (category === 'food_truck' ? 'truck' : 'trailer') as SpecialtyVehicle } : null;
  }, [debouncedQuery, category, mode]);

  const handleCategoryChange = (value: string) => {
    const newCategory = value as ListingCategory | 'all';
    setCategory(newCategory);
    setPage(1);
    const params = new URLSearchParams(searchParams);
    if (newCategory !== 'all') {
      params.set('category', newCategory);
    } else {
      params.delete('category');
    }
    params.delete('page');
    setSearchParams(params);
  };

  // Typed location text is part of the shareable search state even before a
  // suggestion is picked, so it is persisted to the URL as `location`.
  const handleLocationTextChange = (text: string) => {
    setLocationText(text);
    setSearchParams(prev => {
      const params = new URLSearchParams(prev);
      if (text.trim()) params.set('location', text);
      else {
        params.delete('location');
        params.delete('lat');
        params.delete('lng');
        params.delete('radius');
      }
      params.delete('page');
      return params;
    }, { replace: true });
  };

  const handleLocationSelect = (location: { name: string; coordinates: [number, number] } | null) => {
    setPage(1);
    if (location) {
      setLocationCoords(location.coordinates);
      const params = new URLSearchParams(searchParams);
      params.set('lat', location.coordinates[1].toString());
      params.set('lng', location.coordinates[0].toString());
      params.set('radius', searchRadius.toString());
      params.delete('page');
      setSearchParams(params);
    } else {
      setLocationCoords(null);
      // Radius / "delivers to me" are meaningless without coordinates.
      setDeliveryFilterEnabled(false);
      setSortBy(prev => (prev === 'distance' ? 'featured' : prev));
      const params = new URLSearchParams(searchParams);
      params.delete('lat');
      params.delete('lng');
      params.delete('radius');
      params.delete('delivery');
      if (params.get('sort') === 'distance') params.delete('sort');
      params.delete('page');
      setSearchParams(params);
    }
  };


  const handleRadiusChange = (radius: number) => {
    setSearchRadius(radius);
    setPage(1);
    if (locationCoords) {
      const params = new URLSearchParams(searchParams);
      params.set('radius', radius.toString());
      params.delete('page');
      setSearchParams(params);
    }
  };

  const handleDateRangeChange = (range: DateRange | undefined) => {
    setDateRange(range);
    setPage(1);
    const params = new URLSearchParams(searchParams);
    if (range?.from && range?.to) {
      params.set('start', format(range.from, 'yyyy-MM-dd'));
      params.set('end', format(range.to, 'yyyy-MM-dd'));
    } else {
      params.delete('start');
      params.delete('end');
    }
    params.delete('page');
    setSearchParams(params);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setDebouncedQuery('');
    setMode('all');
    setCategory('all');
    setLocationText('');
    setLocationCoords(null);
    setSearchRadius(50);
    setQueryIsLocation(false);
    setPriceRange([0, Infinity]);
    setDateRange(undefined);
    setSelectedAmenities([]);
    setDeliveryFilterEnabled(false);
    setFulfillmentTypes([]);

    setInstantBookOnly(false);
    setVerifiedHostsOnly(false);
    setSortBy('featured');
    setPage(1);
    setSearchParams({});
  };

  const handleSortChange = (value: string) => {
    const newSort = value as 'featured' | 'newest' | 'price-low' | 'price-high' | 'distance' | 'relevance';
    setSortBy(newSort);
    setPage(1);
    const params = new URLSearchParams(searchParams);
    if (newSort !== 'featured') {
      params.set('sort', newSort);
    } else {
      params.delete('sort');
    }
    params.delete('page');
    setSearchParams(params);
  };

  const toggleAmenity = (amenityId: string) => {
    setPage(1);
    setSelectedAmenities(prev => {
      const next = prev.includes(amenityId)
        ? prev.filter(a => a !== amenityId)
        : [...prev, amenityId];
      const params = new URLSearchParams(searchParams);
      if (next.length > 0) params.set('amenities', next.join(','));
      else params.delete('amenities');
      params.delete('page');
      setSearchParams(params);
      return next;
    });
  };

  const handleInstantBookChange = (enabled: boolean) => {
    setInstantBookOnly(enabled);
    setPage(1);
    const params = new URLSearchParams(searchParams);
    if (enabled) {
      params.set('instant', 'true');
    } else {
      params.delete('instant');
    }
    params.delete('page');
    setSearchParams(params);
  };

  const handleVerifiedHostsChange = (enabled: boolean) => {
    setVerifiedHostsOnly(enabled);
    setPage(1);
    const params = new URLSearchParams(searchParams);
    if (enabled) {
      params.set('verified', 'true');
    } else {
      params.delete('verified');
    }
    params.delete('page');
    setSearchParams(params);
  };

  const handleFulfillmentToggle = (kind: 'pickup' | 'delivery' | 'on_site') => {
    setPage(1);
    setFulfillmentTypes(prev => {
      const next = prev.includes(kind) ? prev.filter(k => k !== kind) : [...prev, kind];
      const params = new URLSearchParams(searchParams);
      if (next.length > 0) params.set('fulfillment', next.join(','));
      else params.delete('fulfillment');
      params.delete('page');
      setSearchParams(params);
      return next;
    });
  };

  const handlePriceRangeChange = (value: [number, number]) => {
    setPriceRange(value);
    setPage(1);
    const params = new URLSearchParams(searchParams);
    if (value[0] > 0) params.set('min_price', String(value[0]));
    else params.delete('min_price');
    if (value[1] !== Infinity && Number.isFinite(value[1])) params.set('max_price', String(value[1]));
    else params.delete('max_price');
    params.delete('page');
    setSearchParams(params);
  };

  const handleDeliveryFilterChange = (enabled: boolean) => {
    setDeliveryFilterEnabled(enabled);
    setPage(1);
    const params = new URLSearchParams(searchParams);
    if (enabled) params.set('delivery', '1');
    else params.delete('delivery');
    params.delete('page');
    setSearchParams(params);
  };


  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    const params = new URLSearchParams(searchParams);
    if (newPage > 1) {
      params.set('page', newPage.toString());
    } else {
      params.delete('page');
    }
    setSearchParams(params);
    // Scroll to top of results
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getAmenityLabel = (amenityId: string): string => {
    for (const cat of Object.values(AMENITIES_BY_CATEGORY)) {
      for (const group of cat) {
        const item = group.items.find(i => i.id === amenityId);
        if (item) return item.label;
      }
    }
    return amenityId;
  };

  const handleQuickBook = (listing: Listing) => {
    setSelectedListing(listing);
    setIsBookingModalOpen(true);
  };

  const activeFiltersCount = [
    mode !== 'all',
    category !== 'all',
    // Typed location text counts even before a suggestion resolves coordinates.
    locationCoords !== null || !!locationText.trim(),
    priceRange[0] > 0 || priceRange[1] !== Infinity,
    dateRange?.from && dateRange?.to,
    selectedAmenities.length > 0,
    deliveryFilterEnabled,
    fulfillmentTypes.length > 0,

    instantBookOnly,
    verifiedHostsOnly,
  ].filter(Boolean).length;

  // "Clear all" must be reachable whenever ANY non-default search state exists —
  // including a keyword or a non-default sort, which aren't filter chips.
  const hasActiveSearchState =
    activeFiltersCount > 0 || !!searchQuery.trim() || !!debouncedQuery.trim() || sortBy !== 'featured';


  // Generate structured data for Google Shopping / Search indexing
  const itemListSchema = useMemo(() => {
    const productItems: ProductListItem[] = listings.map(listing => ({
      id: listing.id,
      title: listing.title,
      description: listing.description,
      cover_image_url: listing.cover_image_url,
      mode: listing.mode as 'rent' | 'sale',
      category: listing.category,
      price_daily: listing.price_daily,
      price_weekly: listing.price_weekly,
      price_sale: listing.price_sale,
      status: listing.status,
    }));

    return generateItemListSchema(productItems, {
      mode: mode as 'rent' | 'sale' | 'all',
      category: category !== 'all' ? category : undefined,
      query: debouncedQuery || undefined,
      location: locationText || undefined,
    });
  }, [listings, mode, category, debouncedQuery, locationText]);

  // Dedicated breadcrumb for specialty filtered-search URLs
  // (Home → specialty hub → vehicle landing page); generic otherwise.
  const breadcrumbSchema = useMemo(() => {
    if (activeSpecialty) {
      const def = SPECIALTY_DEFS[activeSpecialty.key];
      const seo = SPECIALTY_SEARCH_SEO[activeSpecialty.key][activeSpecialty.vehicle];
      const landingPath = specialtyVehicleHref(activeSpecialty.key, activeSpecialty.vehicle);
      return {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://vendibook.com/' },
          { '@type': 'ListItem', position: 2, name: `${def.pluralTitle} for Sale`, item: `https://vendibook.com${def.hubPath}` },
          { '@type': 'ListItem', position: 3, name: seo.crumb, item: `https://vendibook.com${landingPath}` },
        ],
      };
    }
    return generateSearchBreadcrumbSchema({
      mode: mode as 'rent' | 'sale' | 'all',
      category: category !== 'all' ? category : undefined,
    });
  }, [activeSpecialty, mode, category]);

  // Build dynamic SEO title and description. Specialty filtered-search URLs
  // get dedicated editorial metadata instead of the generic pattern.
  const seoTitle = useMemo(() => {
    if (activeSpecialty) {
      return SPECIALTY_SEARCH_SEO[activeSpecialty.key][activeSpecialty.vehicle].title;
    }
    const parts: string[] = [];
    if (category !== 'all') {
      parts.push(CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS] || 'Listings');
    } else {
      parts.push('Food Trucks, Trailers & Shared Kitchens');
    }
    if (mode !== 'all') {
      parts.push(mode === 'rent' ? 'for Rent' : 'for Sale');
    }
    if (locationText) {
      parts.push(`in ${locationText}`);
    }
    return `${parts.join(' ')} | Vendibook`;
  }, [activeSpecialty, category, mode, locationText]);

  const seoDescription = useMemo(() => {
    if (activeSpecialty) {
      return SPECIALTY_SEARCH_SEO[activeSpecialty.key][activeSpecialty.vehicle].description;
    }
    const categoryLabel = category !== 'all'
      ? CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS]?.toLowerCase()
      : 'food trucks, trailers, and shared kitchens';
    const modeLabel = mode !== 'all'
      ? (mode === 'rent' ? 'rent' : 'buy')
      : 'rent or buy';
    const locationLabel = locationText ? ` in ${locationText}` : '';
    return `Browse ${totalCount}+ ${categoryLabel} available to ${modeLabel}${locationLabel}. Compare listings and book with payment protection on Vendibook.`;
  }, [activeSpecialty, category, mode, locationText, totalCount]);

  // Specialty filtered-search URLs canonicalize to their dedicated landing
  // page where one exists (coffee / ice cream) so the two surfaces never
  // compete for the same query; the rest self-canonicalize with their full
  // query string as a distinct, indexable search state.
  const seoCanonical = useMemo(() => {
    if (!activeSpecialty) return '/search';
    return specialtyVehicleHref(activeSpecialty.key, activeSpecialty.vehicle);
  }, [activeSpecialty]);


  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (page <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push('ellipsis');
        pages.push(totalPages);
      } else if (page >= totalPages - 2) {
        pages.push(1);
        pages.push('ellipsis');
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('ellipsis');
        pages.push(page - 1);
        pages.push(page);
        pages.push(page + 1);
        pages.push('ellipsis');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEO
        title={seoTitle}
        description={seoDescription}
        canonical={seoCanonical}
      />
      <JsonLd schema={[itemListSchema, breadcrumbSchema]} />
      <Header hideSearch />
      
      <main className="flex-1">
      {/* Spacer - logo/tagline removed */}

        {/* Search Header — Premium hero with layered gradients */}
        <div className="relative border-b border-border/40 overflow-hidden">
          {/* Layered ambient background */}
          <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.04] via-background to-background" />
          {/* Radial-gradient glows (no blur filter) — large blur-3xl layers
              re-rasterize on scroll/keyboard on mobile GPUs and cause the
              flicker/tearing seen during typing. Same fix as HeroBackground. */}
          <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full pointer-events-none" style={{ background: 'radial-gradient(closest-side, hsl(var(--primary) / 0.10) 0%, transparent 100%)' }} />
          <div className="absolute -top-20 right-0 w-80 h-80 rounded-full pointer-events-none" style={{ background: 'radial-gradient(closest-side, hsl(var(--primary) / 0.05) 0%, transparent 100%)' }} />
          {/* Grid texture */}
          <div
            className="absolute inset-0 opacity-[0.015] pointer-events-none"
            style={{
              backgroundImage: 'linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)',
              backgroundSize: '32px 32px',
            }}
          />
          {/* Bottom glow line */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2/3 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/3 h-[3px] bg-gradient-to-r from-transparent via-primary/20 to-transparent" />

          <div className="container relative py-5 sm:py-6">
            {/* Title row — micro headline + live result chip */}
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-foreground flex items-center justify-center shadow-sm">
                  <SearchIcon className="h-4 w-4 text-background" />
                </div>
                <div>
                  <h1 className="text-base sm:text-lg font-semibold text-foreground leading-tight">
                    {category !== 'all' ? CATEGORY_LABELS[category] : 'Browse the marketplace'}
                  </h1>
                  <p className="text-[11px] sm:text-xs text-muted-foreground leading-tight">
                    {locationText ? `Near ${locationText}` : 'Trucks, trailers, kitchens & vendor spaces nationwide'}
                  </p>
                </div>
              </div>
            </div>

            {/* Row 1: Premium search input + filters */}
            <div className="flex gap-2 sm:gap-3">
              <div className="relative flex-1 group">
                {/* Glow halo on focus */}
                <div className="absolute -inset-px rounded-2xl opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none" style={{ boxShadow: '0 0 0 4px hsl(var(--primary) / 0.10), 0 0 24px hsl(var(--primary) / 0.15)' }} />
                <div className="relative flex items-center bg-[#faf8f5] border border-[#1b1714]/10 rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.10),0_12px_28px_-22px_rgba(0,0,0,0.5)] group-focus-within:border-primary/50 group-focus-within:shadow-[0_2px_6px_rgba(0,0,0,0.12),0_16px_34px_-22px_rgba(0,0,0,0.55)] transition-all duration-200">
                  <SearchIcon className="absolute left-3.5 h-4 w-4 text-[#1b1714]/45 group-focus-within:text-primary transition-colors" />
                  <Input
                    type="text"
                    placeholder="Search trucks, trailers, kitchens, locations…"
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="pl-10 pr-10 h-11 text-base sm:text-sm rounded-2xl border-0 bg-transparent text-[#1b1714] placeholder:text-[#1b1714]/45 focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => handleSearch('')}
                      className="absolute right-3 h-6 w-6 rounded-full hover:bg-[#1b1714]/[0.07] flex items-center justify-center text-[#1b1714]/50 hover:text-[#1b1714] transition-colors"
                      aria-label="Clear search"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Filter Button */}
              <Sheet open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="default" className="rounded-2xl relative shrink-0 h-11 px-4 sm:px-5 border-primary/35 bg-primary/[0.10] text-foreground hover:bg-primary/[0.16] hover:border-primary/50 transition-all duration-200">
                    <SlidersHorizontal className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Filters</span>
                    {activeFiltersCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 h-5 min-w-[20px] px-1 bg-primary text-primary-foreground text-[10px] rounded-full flex items-center justify-center font-bold shadow-lg ring-2 ring-background">
                        {activeFiltersCount}
                      </span>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent
                  side="bottom"
                  className="sale-light h-[85vh] flex flex-col rounded-t-3xl border-t-0 p-0 shadow-[0_-18px_60px_-24px_rgba(0,0,0,0.6)] data-[state=open]:duration-300 data-[state=closed]:duration-200"
                >
                  <div className="shrink-0 px-6 pt-3 pb-3 border-b border-[#1b1714]/[0.08]">
                    <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[#1b1714]/15" aria-hidden />
                    <SheetHeader className="flex-row items-center justify-between space-y-0 text-left">
                      <SheetTitle className="text-base tracking-tight">Filters</SheetTitle>
                      {activeFiltersCount > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={clearFilters}
                          className="h-8 px-2 text-xs text-primary hover:text-primary"
                        >
                          Clear all
                        </Button>
                      )}
                    </SheetHeader>
                  </div>
                  <ScrollArea className="flex-1 px-6 pt-4 scroll-smooth">
                    <div className="pb-6">
                      <FilterContent
                        mode={mode}
                        category={category}
                        locationText={locationText}
                        locationCoords={locationCoords}
                        searchRadius={searchRadius}
                        priceRange={priceRange}
                        dateRange={dateRange}
                        selectedAmenities={selectedAmenities}
                        deliveryFilterEnabled={deliveryFilterEnabled}
                        fulfillmentTypes={fulfillmentTypes}

                        instantBookOnly={instantBookOnly}
                        verifiedHostsOnly={verifiedHostsOnly}
                        onModeChange={handleModeChange}
                        onCategoryChange={handleCategoryChange}
                        onLocationTextChange={setLocationText}
                        onLocationSelect={handleLocationSelect}
                        onRadiusChange={handleRadiusChange}
                        onPriceRangeChange={handlePriceRangeChange}
                        onDateRangeChange={handleDateRangeChange}
                        onAmenityToggle={toggleAmenity}
                        onDeliveryFilterChange={handleDeliveryFilterChange}
                        onFulfillmentToggle={handleFulfillmentToggle}

                        onInstantBookChange={handleInstantBookChange}
                        onVerifiedHostsChange={handleVerifiedHostsChange}
                        onClear={clearFilters}
                      />
                    </div>
                  </ScrollArea>
                  <div className="shrink-0 border-t border-[#1b1714]/[0.08] px-6 py-3 pb-[calc(env(safe-area-inset-bottom,0px)+12px)]">
                    <Button
                      variant="cta"
                      className="w-full h-12 rounded-2xl"
                      onClick={() => setIsFiltersOpen(false)}
                    >
                      Show {totalCount.toLocaleString()} listing{totalCount !== 1 ? 's' : ''}
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            {/* Mode segmented control — unmistakable All / For Sale / For Rent */}
            <div className="mt-3">
              <div
                className="inline-flex items-center rounded-full border border-border/50 bg-background/60 backdrop-blur p-1 gap-0.5"
                role="tablist"
                aria-label="Listing type"
              >
                {([
                  { value: 'all', label: 'All' },
                  { value: 'sale', label: 'For Sale' },
                  { value: 'rent', label: 'For Rent' },
                ] as const).map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    role="tab"
                    aria-selected={mode === option.value}
                    onClick={() => handleModeChange(option.value)}
                    className={cn(
                      'h-8 px-4 rounded-full text-sm font-medium transition-all duration-200 no-tap-highlight',
                      mode === option.value
                        ? 'bg-foreground text-background shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Airbnb-style category pill strip */}
            <div className="mt-3 -mx-1">
              <CategoryPillStrip
                activeCategory={category}
                onCategoryChange={handleCategoryChange}
                instantBookOnly={instantBookOnly}
                onInstantBookToggle={handleInstantBookChange}
                verifiedHostsOnly={verifiedHostsOnly}
                onVerifiedToggle={handleVerifiedHostsChange}
                activeSpecialty={activeSpecialty}
                onSpecialtySelect={handleSpecialtySelect}
                onSpecialtyClear={handleSpecialtyClear}
              />
            </div>

            {/* Row 2: Results count + Sort + View toggle + Save Search */}
            <div className="mt-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <p className="text-sm text-muted-foreground truncate">
                  {isLoadingListings ? (
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                      Searching marketplace…
                    </span>
                  ) : (
                    <>
                      <span className="font-bold text-foreground tabular-nums">{totalCount.toLocaleString()}</span>
                      {' '}listing{totalCount !== 1 ? 's' : ''}
                      {locationCoords && (
                        <span className="hidden sm:inline"> within {searchRadius} mi of <span className="font-medium text-foreground">{locationText || 'selected location'}</span></span>
                      )}
                      {searchQuery && (
                        <span className="hidden sm:inline"> matching <span className="font-medium text-foreground">"{debouncedQuery}"</span></span>
                      )}
                      {totalPages > 1 && (
                        <span className="hidden md:inline text-muted-foreground/70"> · pg {page}/{totalPages}</span>
                      )}
                    </>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <SaveSearchButton
                  category={category !== 'all' ? category : undefined}
                  mode={mode !== 'all' ? mode : undefined}
                  locationText={locationText}
                  latitude={locationCoords?.[1]}
                  longitude={locationCoords?.[0]}
                  radiusMiles={searchRadius}
                  instantBookOnly={instantBookOnly}
                  amenities={selectedAmenities}
                />

                <ToggleGroup
                  type="single"
                  value={viewMode}
                  onValueChange={(value) => value && setViewMode(value as 'grid' | 'map' | 'split' | 'list')}
                  className="bg-transparent border border-border/40 rounded-xl p-0.5"
                >
                  <ToggleGroupItem value="grid" aria-label="Grid view" title="Grid view" className="h-7 px-2 rounded-lg text-muted-foreground data-[state=on]:bg-foreground/90 data-[state=on]:text-background transition-all duration-200">
                    <LayoutGrid className="h-3.5 w-3.5" />
                  </ToggleGroupItem>
                  <ToggleGroupItem value="list" aria-label="List view" title="List view" className="h-7 px-2 rounded-lg text-muted-foreground data-[state=on]:bg-foreground/90 data-[state=on]:text-background transition-all duration-200">
                    <Rows3 className="h-3.5 w-3.5" />
                  </ToggleGroupItem>
                  <ToggleGroupItem value="split" aria-label="Split view" title="Split view (list + map)" className="hidden md:flex h-7 px-2 rounded-lg text-muted-foreground data-[state=on]:bg-foreground/90 data-[state=on]:text-background transition-all duration-200">
                    <Columns className="h-3.5 w-3.5" />
                  </ToggleGroupItem>
                  <ToggleGroupItem value="map" aria-label="Map view" title="Map view" className="h-7 px-2 rounded-lg text-muted-foreground data-[state=on]:bg-foreground/90 data-[state=on]:text-background transition-all duration-200">
                    <Map className="h-3.5 w-3.5" />
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
              {locationCoords && (
                <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] text-muted-foreground">Within</span>
                  {[10, 25, 50, 100, 250].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => handleRadiusChange(r)}
                      className={cn(
                        'px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors duration-200',
                        searchRadius === r
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'border-border/50 text-muted-foreground hover:text-foreground hover:border-border'
                      )}
                    >
                      {r} mi
                    </button>
                  ))}
                  <span className="text-[11px] text-muted-foreground">
                    of {locationText || 'selected location'}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
        {/* Results */}
        <div className="container py-6">
          <div className="flex gap-8">
            {/* Desktop Sidebar Filters - Enhanced card styling */}
            <aside className="hidden md:block w-[15rem] lg:w-[16rem] shrink-0 self-start sticky top-24">
              <div
                className="sale-light space-y-5 p-4 rounded-2xl border border-[#1b1714]/[0.07] shadow-[0_1px_2px_rgba(24,20,16,0.04),0_14px_34px_-26px_rgba(0,0,0,0.45)] max-h-[calc(100vh-7.5rem)] overflow-y-auto overscroll-contain scroll-smooth scrollbar-quiet"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold tracking-tight text-foreground">Filters</h2>
                  {activeFiltersCount > 0 && (
                    <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs text-primary hover:text-primary">
                      Clear all
                    </Button>
                  )}
                </div>
                <FilterContent
                  mode={mode}
                  category={category}
                  locationText={locationText}
                  locationCoords={locationCoords}
                  searchRadius={searchRadius}
                  priceRange={priceRange}
                  dateRange={dateRange}
                  selectedAmenities={selectedAmenities}
                  deliveryFilterEnabled={deliveryFilterEnabled}
                  fulfillmentTypes={fulfillmentTypes}
                  instantBookOnly={instantBookOnly}
                  verifiedHostsOnly={verifiedHostsOnly}
                  onModeChange={handleModeChange}
                  onCategoryChange={handleCategoryChange}
                  onLocationTextChange={setLocationText}
                  onLocationSelect={handleLocationSelect}
                  onRadiusChange={handleRadiusChange}
                  onPriceRangeChange={handlePriceRangeChange}
                  onDateRangeChange={handleDateRangeChange}
                  onAmenityToggle={toggleAmenity}
                  onDeliveryFilterChange={handleDeliveryFilterChange}
                  onFulfillmentToggle={handleFulfillmentToggle}

                  onInstantBookChange={handleInstantBookChange}
                  onVerifiedHostsChange={handleVerifiedHostsChange}
                  onClear={clearFilters}
                />
              </div>
            </aside>

            {/* Results Grid */}
            <div className="flex-1">

              {/* Results context + primary Sort control, directly above listings */}
              <div className="flex items-center justify-between gap-3 mb-4">
                <p className="text-sm text-muted-foreground min-w-0">
                  {locationCoords ? (
                    <>
                      {radiusAutoExpanded ? 'Expanded search to ' : 'Showing within '}
                      <span className="font-semibold text-foreground">{effectiveRadius} miles</span> of{' '}
                      <span className="font-semibold text-foreground">{locationText || 'selected location'}</span>
                      {radiusAutoExpanded && ' — few listings nearby'}
                    </>
                  ) : (
                    'Showing all listings nationwide'
                  )}
                  {searchMeta?.text_fallback_used && (
                    <span className="ml-1">Includes nearby city matches.</span>
                  )}
                  {showExpandRadiusCta && (
                    <button
                      type="button"
                      onClick={() => handleRadiusChange(100)}
                      className="ml-2 text-primary font-medium hover:underline underline-offset-2"
                    >
                      Expand to 100 miles
                    </button>
                  )}
                </p>
                <SortControl sortBy={sortBy} options={sortOptions} onChange={handleSortChange} />
              </div>

              {/* Active Filters Badges */}
              {(mode !== 'all' || category !== 'all' || locationCoords || dateRange?.from || selectedAmenities.length > 0 || instantBookOnly || verifiedHostsOnly) && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {mode !== 'all' && (
                    <Badge variant="secondary" className="gap-1">
                      <Tag className="h-3 w-3" />
                      {mode === 'rent' ? 'For Rent' : 'For Sale'}
                      <button onClick={() => handleModeChange('all')}>
                        <X className="h-3 w-3 ml-1" />
                      </button>
                    </Badge>
                  )}
                  {category !== 'all' && (
                    <Badge variant="secondary" className="gap-1">
                      {CATEGORY_LABELS[category]}
                      <button onClick={() => handleCategoryChange('all')}>
                        <X className="h-3 w-3 ml-1" />
                      </button>
                    </Badge>
                  )}
                  {instantBookOnly && (
                    <Badge variant="secondary" className="gap-1 bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                      <Zap className="h-3 w-3" />
                      Instant Book
                      <button onClick={() => handleInstantBookChange(false)}>
                        <X className="h-3 w-3 ml-1" />
                      </button>
                    </Badge>
                  )}
                  {verifiedHostsOnly && (
                    <Badge variant="secondary" className="gap-1 bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                      <Shield className="h-3 w-3" />
                      Identity Verified
                      <button onClick={() => handleVerifiedHostsChange(false)}>
                        <X className="h-3 w-3 ml-1" />
                      </button>
                    </Badge>
                  )}
                  {locationCoords && (
                    <Badge variant="secondary" className="gap-1">
                      <Navigation className="h-3 w-3" />
                      {locationText || 'Selected location'} ({searchRadius} mi)
                      <button onClick={() => {
                        setLocationText('');
                        handleLocationSelect(null);
                      }}>
                        <X className="h-3 w-3 ml-1" />
                      </button>
                    </Badge>
                  )}
                  {dateRange?.from && dateRange?.to && (
                    <Badge variant="secondary" className="gap-1">
                      <CalendarIcon className="h-3 w-3" />
                      {format(dateRange.from, 'MMM d')} - {format(dateRange.to, 'MMM d')}
                      <button onClick={() => handleDateRangeChange(undefined)}>
                        <X className="h-3 w-3 ml-1" />
                      </button>
                    </Badge>
                  )}
                  {selectedAmenities.map(amenityId => (
                    <Badge key={amenityId} variant="secondary" className="gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      {getAmenityLabel(amenityId)}
                      <button onClick={() => toggleAmenity(amenityId)}>
                        <X className="h-3 w-3 ml-1" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              {/* Split View — Airbnb-style: scrollable cards left, sticky full-viewport map right */}
              {viewMode === 'split' && (
                <div className="flex flex-col lg:grid lg:grid-cols-[1fr_1.1fr] xl:grid-cols-[1fr_1.2fr] gap-4 lg:gap-6">
                  <div className="lg:order-2 h-[280px] lg:h-auto lg:sticky lg:top-20 lg:self-start rounded-2xl overflow-hidden border border-border/60 shadow-lg z-10 relative">
                    <div className="h-full lg:h-[calc(100vh-110px)] relative">
                      <SearchResultsMap
                        listings={listings}
                        mapToken={mapToken}
                        isLoading={isMapTokenLoading}
                        error={mapTokenError}
                        userLocation={locationCoords}
                        searchRadius={searchRadius}
                        onListingClick={() => {}}
                      />
                      <div className="absolute bottom-3 left-3 z-20 px-2.5 py-1 rounded-full bg-background/95 backdrop-blur-md border border-border/60 shadow-sm text-[11px] font-medium">
                        <span className="font-bold">{listings.length}</span> on map
                      </div>
                    </div>
                  </div>
                  <div className="lg:order-1 lg:max-h-[calc(100vh-110px)] lg:overflow-y-auto lg:pr-2 lg:-mr-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {isLoadingListings && listings.length === 0 ? (
                        Array.from({ length: 4 }).map((_, i) => (
                          <SkeletonCard key={i} variant="listing" />
                        ))
                      ) : listings.length > 0 ? (
                        listings.map((listing) => (
                          <div
                            key={listing.id}
                            className={cn(
                              "relative group rounded-2xl transition-all duration-200",
                              hoveredListingId === listing.id && "ring-2 ring-primary ring-offset-2 ring-offset-background scale-[1.01]"
                            )}
                            onMouseEnter={() => setHoveredListingId(listing.id)}
                            onMouseLeave={() => setHoveredListingId(null)}
                          >
                            <ListingCard
                              listing={listing}
                              hostVerified={listing.host_verified ?? false}
                              showQuickBook
                              onQuickBook={handleQuickBook}
                              canDeliverToUser={listing.can_deliver ?? false}
                              variant="search"
                              compact
                            />
                            {listing.distance_miles !== null && listing.distance_miles !== undefined && (
                              <div className="absolute top-3 left-3 bg-background/95 backdrop-blur-sm px-2 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1 z-10 shadow-sm border border-border/40">
                                <Navigation className="h-3 w-3" />
                                {listing.distance_miles < 1 ? '< 1' : Math.round(listing.distance_miles)} mi
                              </div>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="col-span-full">
                          <SmartNoResults
                            searchParams={searchRequestParams}
                            onClearFilters={clearFilters}
                            category={category !== 'all' ? category : undefined}
                            mode={mode !== 'all' ? mode : undefined}
                            locationText={debouncedQuery || locationText}
                            activeFiltersCount={activeFiltersCount}
                          />
                        </div>
                      )}
                    </div>
                    {totalPages > 1 && (
                      <div className="mt-8 mb-4">
                        <Pagination>
                          <PaginationContent>
                            <PaginationItem>
                              <PaginationPrevious onClick={() => page > 1 && handlePageChange(page - 1)} className={page === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'} />
                            </PaginationItem>
                            {getPageNumbers().map((pageNum, idx) => (
                              <PaginationItem key={idx}>
                                {pageNum === 'ellipsis' ? <span className="px-3 py-2">...</span> : (
                                  <PaginationLink onClick={() => handlePageChange(pageNum)} isActive={page === pageNum} className="cursor-pointer">{pageNum}</PaginationLink>
                                )}
                              </PaginationItem>
                            ))}
                            <PaginationItem>
                              <PaginationNext onClick={() => page < totalPages && handlePageChange(page + 1)} className={page >= totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'} />
                            </PaginationItem>
                          </PaginationContent>
                        </Pagination>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* List View — compact horizontal rows */}
              {viewMode === 'list' && (
                <>
                  {sponsoredListings.length > 0 && (
                    <div className="mb-5">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Sponsored</p>
                      <div className="space-y-3">
                        {sponsoredListings.map((listing) => (
                          <ListingCard
                            key={`sponsored-${listing.id}`}
                            listing={listing}
                            hostVerified={listing.host_verified ?? false}
                            showQuickBook
                            onQuickBook={handleQuickBook}
                            canDeliverToUser={listing.can_deliver ?? false}
                            variant="search"
                            horizontal
                          />
                        ))}
                      </div>
                    </div>
                  )}
                  {isLoadingListings && listings.length === 0 ? (
                    <div className="space-y-3">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <SkeletonCard key={i} variant="row" />
                      ))}
                    </div>
                  ) : listings.length > 0 ? (
                    <div className="space-y-3">
                      {listings.map((listing) => (
                        <div key={listing.id} className="relative">
                          <ListingCard
                            listing={listing}
                            hostVerified={listing.host_verified ?? false}
                            showQuickBook
                            onQuickBook={handleQuickBook}
                            canDeliverToUser={listing.can_deliver ?? false}
                            variant="search"
                            horizontal
                          />
                          {listing.distance_miles !== null && listing.distance_miles !== undefined && (
                            <div className="absolute top-3 left-3 bg-background/95 backdrop-blur-sm px-2 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1 z-10 shadow-sm border border-border/40">
                              <Navigation className="h-3 w-3" />
                              {listing.distance_miles < 1 ? '< 1' : Math.round(listing.distance_miles)} mi
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <SmartNoResults
                      searchParams={searchRequestParams}
                      onClearFilters={clearFilters}
                      category={category !== 'all' ? category : undefined}
                      mode={mode !== 'all' ? mode : undefined}
                      locationText={debouncedQuery || locationText}
                      activeFiltersCount={activeFiltersCount}
                    />
                  )}
                  {totalPages > 1 && (
                    <div className="mt-8">
                      <Pagination>
                        <PaginationContent>
                          <PaginationItem>
                            <PaginationPrevious onClick={() => page > 1 && handlePageChange(page - 1)} className={page === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'} />
                          </PaginationItem>
                          {getPageNumbers().map((pageNum, idx) => (
                            <PaginationItem key={idx}>
                              {pageNum === 'ellipsis' ? <span className="px-3 py-2">...</span> : (
                                <PaginationLink onClick={() => handlePageChange(pageNum)} isActive={page === pageNum} className="cursor-pointer">{pageNum}</PaginationLink>
                              )}
                            </PaginationItem>
                          ))}
                          <PaginationItem>
                            <PaginationNext onClick={() => page < totalPages && handlePageChange(page + 1)} className={page >= totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'} />
                          </PaginationItem>
                        </PaginationContent>
                      </Pagination>
                    </div>
                  )}
                </>
              )}

              {/* Map View — full immersive */}
              {viewMode === 'map' && (
                <div className="h-[calc(100vh-200px)] min-h-[500px] rounded-2xl overflow-hidden border border-border/60 shadow-lg relative">
                  <SearchResultsMap
                    listings={listings}
                    mapToken={mapToken}
                    isLoading={isMapTokenLoading}
                    error={mapTokenError}
                    userLocation={locationCoords}
                    searchRadius={searchRadius}
                    onListingClick={(listing) => {
                      trackLeadEvent('listing_card_click', {
                        listing_id: listing.id,
                        category: (listing as any).category,
                        source: 'search_map',
                      });
                      navigate(`/listing/${listing.id}`);
                    }}
                  />
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20">
                    <button
                      onClick={() => setViewMode('split')}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-foreground text-background text-sm font-semibold shadow-2xl hover:scale-105 active:scale-95 transition-transform"
                    >
                      <Rows3 className="h-4 w-4" />
                      Show list
                    </button>
                  </div>
                </div>
              )}

              {/* Listings Grid */}
              {viewMode === 'grid' && (
                <>
                  {isLoadingListings && listings.length === 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <SkeletonCard key={i} variant="listing" />
                      ))}
                    </div>
                  ) : listings.length > 0 ? (
                    <>
                    {sponsoredListings.length > 0 && (
                      <div className="mb-6">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Sponsored</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                          {sponsoredListings.map((listing) => (
                            <ListingCard
                              key={`sponsored-${listing.id}`}
                              listing={listing}
                              hostVerified={listing.host_verified ?? false}
                              showQuickBook
                              onQuickBook={handleQuickBook}
                              canDeliverToUser={listing.can_deliver ?? false}
                              variant="search"
                            />
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">

                      {listings.map((listing, index) => (
                        <React.Fragment key={listing.id}>
                          <ImpressionTracker
                            eventName="search_result_impression"
                            dedupKey={`search-impression-${listing.id}-${page}`}
                            payload={{
                              listing_id: listing.id,
                              position: index,
                              page,
                              category: (listing as any).category,
                              mode,
                            }}
                            className="relative"
                          >
                            <ListingCard 
                              listing={listing} 
                              hostVerified={listing.host_verified ?? false}
                              showQuickBook
                              onQuickBook={handleQuickBook}
                              canDeliverToUser={listing.can_deliver ?? false}
                              variant="search"
                            />
                            {listing.distance_miles !== null && listing.distance_miles !== undefined && (
                              <div className="absolute top-3 left-3 bg-background/90 backdrop-blur-sm px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 z-10">
                                <Navigation className="h-3 w-3" />
                                {listing.distance_miles < 1 ? '< 1' : Math.round(listing.distance_miles)} mi
                              </div>
                            )}
                          </ImpressionTracker>
                          {/* Get alerts after 8th listing */}
                          {index === 7 && listings.length > 8 && (
                            <div className="col-span-1 sm:col-span-2 lg:col-span-3">
                              <GetAlertsCard category={category !== 'all' ? category : undefined} radius={searchRadius} />
                            </div>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                    {/* Supply CTA on sparse results — surface host opportunity */}
                    {listings.length > 0 && listings.length < 3 && (
                      <div className="mt-6">
                        <HostSupplyCTA />
                      </div>
                    )}
                    </>
                  ) : (
                    <SmartNoResults
                      searchParams={searchRequestParams}
                      onClearFilters={clearFilters}
                      category={category !== 'all' ? category : undefined}
                      mode={mode !== 'all' ? mode : undefined}
                      locationText={debouncedQuery || locationText}
                      activeFiltersCount={activeFiltersCount}
                    />
                  )}
                  
                  {/* Get alerts at bottom if less than 8 results */}
                  {listings.length > 0 && listings.length <= 8 && (
                    <div className="mt-6">
                      <GetAlertsCard category={category !== 'all' ? category : undefined} radius={searchRadius} />
                    </div>
                  )}

                  {/* Pagination for grid view */}
                  {totalPages > 1 && (
                    <div className="mt-8">
                      <Pagination>
                        <PaginationContent>
                          <PaginationItem>
                            <PaginationPrevious 
                              onClick={() => page > 1 && handlePageChange(page - 1)}
                              className={page === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                            />
                          </PaginationItem>
                          {getPageNumbers().map((pageNum, idx) => (
                            <PaginationItem key={idx}>
                              {pageNum === 'ellipsis' ? (
                                <span className="px-3 py-2">...</span>
                              ) : (
                                <PaginationLink
                                  onClick={() => handlePageChange(pageNum)}
                                  isActive={page === pageNum}
                                  className="cursor-pointer"
                                >
                                  {pageNum}
                                </PaginationLink>
                              )}
                            </PaginationItem>
                          ))}
                          <PaginationItem>
                            <PaginationNext 
                              onClick={() => page < totalPages && handlePageChange(page + 1)}
                              className={page >= totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                            />
                          </PaginationItem>
                        </PaginationContent>
                      </Pagination>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        <ReferralBrowseStrip />

        {/* Request Asset CTA */}
        <div className="container py-8 pb-24 md:pb-8">
          <RequestAssetCTA />
        </div>
      </main>

      <Footer />

      {/* Quick Booking Modal */}
      <QuickBookingModal
        listing={selectedListing}
        open={isBookingModalOpen}
        onOpenChange={setIsBookingModalOpen}
        initialStartDate={dateRange?.from}
        initialEndDate={dateRange?.to}
      />

      {/* Mobile floating Map/List toggle */}
      <button
        type="button"
        onClick={() => setViewMode(viewMode === 'map' ? 'list' : 'map')}
        className="md:hidden fixed bottom-24 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 rounded-full bg-foreground text-background px-4 py-2.5 text-xs font-semibold shadow-lg"
        aria-label={viewMode === 'map' ? 'Show list' : 'Show map'}
      >
        {viewMode === 'map' ? <Rows3 className="h-4 w-4" /> : <Map className="h-4 w-4" />}
        {viewMode === 'map' ? 'List' : 'Map'}
      </button>


      {/* Mobile Sticky Bar */}
      <MobileStickyBar
        activeFiltersCount={activeFiltersCount}
        sortBy={sortBy}
        onSortChange={handleSortChange}
        onFiltersClick={() => setIsFiltersOpen(true)}
        hasLocation={!!locationCoords}
        hasSearchQuery={!!searchQuery.trim()}
        showPriceSorts={mode !== 'all'}
      />
    </div>
  );
};

// Labeled Sort control rendered directly above results (desktop + mobile).
const SortControl = ({ sortBy, options, onChange }: {
  sortBy: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) => {
  const current = options.find((o) => o.value === sortBy)?.label ?? 'Featured';
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Sort results, currently ${current}`}
          className="inline-flex items-center gap-2 h-9 pl-3.5 pr-3 rounded-full border border-border/50 bg-background/70 backdrop-blur text-sm text-foreground hover:border-border transition-colors duration-200 shrink-0"
        >
          <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="whitespace-nowrap">
            <span className="text-muted-foreground">Sort:</span>{' '}
            <span className="font-semibold">{current}</span>
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 rounded-xl">
        {options.map((o) => (
          <DropdownMenuItem
            key={o.value}
            onClick={() => onChange(o.value)}
            className="flex items-center justify-between gap-2"
          >
            {o.label}
            {sortBy === o.value && <Check className="h-4 w-4 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

// Filter Content Component
interface FilterContentProps {
  mode: ListingMode | 'all';
  category: ListingCategory | 'all';
  locationText: string;
  locationCoords: [number, number] | null;
  searchRadius: number;
  priceRange: [number, number];
  dateRange: DateRange | undefined;
  selectedAmenities: string[];
  deliveryFilterEnabled: boolean;
  fulfillmentTypes: Array<'pickup' | 'delivery' | 'on_site'>;

  instantBookOnly: boolean;
  verifiedHostsOnly: boolean;
  onModeChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onLocationTextChange: (value: string) => void;
  onLocationSelect: (location: { name: string; coordinates: [number, number] } | null) => void;
  onRadiusChange: (radius: number) => void;
  onPriceRangeChange: (value: [number, number]) => void;
  onDateRangeChange: (range: DateRange | undefined) => void;
  onAmenityToggle: (amenityId: string) => void;
  onDeliveryFilterChange: (enabled: boolean) => void;
  onFulfillmentToggle: (kind: 'pickup' | 'delivery' | 'on_site') => void;

  onInstantBookChange: (enabled: boolean) => void;
  onVerifiedHostsChange: (enabled: boolean) => void;
  onClear: () => void;
}

// Min/max price inputs that commit on blur or Enter, so typing doesn't fire
// a search per keystroke. Re-syncs when the parent value resets (Clear all).
const PriceRangeInputs = ({
  value,
  onChange,
}: {
  value: [number, number];
  onChange: (next: [number, number]) => void;
}) => {
  const formatMax = (v: number) => (Number.isFinite(v) && v > 0 ? String(v) : '');
  const [minText, setMinText] = useState(value[0] > 0 ? String(value[0]) : '');
  const [maxText, setMaxText] = useState(formatMax(value[1]));

  useEffect(() => {
    setMinText(value[0] > 0 ? String(value[0]) : '');
    setMaxText(formatMax(value[1]));
  }, [value]);

  const commit = () => {
    const min = minText.trim() === '' ? 0 : Math.max(0, Math.floor(Number(minText)) || 0);
    let max = maxText.trim() === '' ? Infinity : Math.floor(Number(maxText)) || 0;
    if (max <= 0) max = Infinity;
    if (max !== Infinity && max < min) max = min;
    onChange([min, max]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
  };

  return (
    <div className="flex items-center gap-2 max-w-xs">
      <div className="relative flex-1">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
        <Input
          type="number"
          inputMode="numeric"
          min={0}
          placeholder="Min"
          value={minText}
          onChange={(e) => setMinText(e.target.value)}
          onBlur={commit}
          onKeyDown={handleKeyDown}
          className="pl-7 h-9 text-base"
          aria-label="Minimum price"
        />
      </div>
      <span className="text-muted-foreground text-sm">–</span>
      <div className="relative flex-1">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
        <Input
          type="number"
          inputMode="numeric"
          min={0}
          placeholder="Max"
          value={maxText}
          onChange={(e) => setMaxText(e.target.value)}
          onBlur={commit}
          onKeyDown={handleKeyDown}
          className="pl-7 h-9 text-base"
          aria-label="Maximum price"
        />
      </div>
    </div>
  );
};

const FilterContent = ({
  mode,
  category,
  locationText,
  locationCoords,
  searchRadius,
  priceRange,
  dateRange,
  selectedAmenities,
  deliveryFilterEnabled,
  fulfillmentTypes,

  instantBookOnly,
  verifiedHostsOnly,
  
  onCategoryChange,
  onLocationTextChange,
  onLocationSelect,
  onRadiusChange,
  onPriceRangeChange,
  onDateRangeChange,
  onAmenityToggle,
  onDeliveryFilterChange,
  onFulfillmentToggle,

  onInstantBookChange,
  onVerifiedHostsChange,
}: FilterContentProps) => {
  // Get amenities to show based on selected category
  const getAvailableAmenities = () => {
    if (category !== 'all') {
      return AMENITIES_BY_CATEGORY[category] || [];
    }
    // If no category selected, show all amenities grouped by category
    return [];
  };

  const availableAmenities = getAvailableAmenities();
  return (
    <div className="space-y-5 [&>div+div]:pt-5 [&>div+div]:border-t [&>div+div]:border-foreground/[0.06]">
      {/* Category Filter */}
      <div className="space-y-2">
        <Label className="text-sm font-medium flex items-center">
          Category
          <CategoryInfoModal />
        </Label>
        <div className="flex flex-wrap gap-2 md:justify-center">
          <label 
            className={cn(
              "flex items-center cursor-pointer px-3 py-1.5 rounded-full border text-sm transition-colors duration-200",
              category === 'all' 
                ? "bg-primary text-primary-foreground border-primary" 
                : "border-transparent bg-foreground/[0.04] text-foreground/80 hover:bg-foreground/[0.08]"
            )}
          >
            <input
              type="radio"
              name="category"
              checked={category === 'all'}
              onChange={() => onCategoryChange('all')}
              className="sr-only"
            />
            <span>All</span>
          </label>
          {Object.entries(CATEGORY_LABELS)
            .filter(([key]) => key !== 'vendor_lot')
            .map(([key, label]) => (
            <label 
              key={key} 
              className={cn(
                "flex items-center cursor-pointer px-3 py-1.5 rounded-full border text-sm transition-colors duration-200",
                category === key 
                  ? "bg-primary text-primary-foreground border-primary" 
                  : "border-transparent bg-foreground/[0.04] text-foreground/80 hover:bg-foreground/[0.08]"
              )}
            >
              <input
                type="radio"
                name="category"
                checked={category === key}
                onChange={() => onCategoryChange(key)}
                className="sr-only"
              />
              <span>{label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Location Filter with Geocoding - Second */}
      <div className="space-y-2">
        <Label className="text-sm font-medium flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          Location
        </Label>
        <div className="max-w-xs">
          <LocationSearchInput
            value={locationText}
            onChange={onLocationTextChange}
            onLocationSelect={onLocationSelect}
            selectedCoordinates={locationCoords}
            placeholder="City, state, or zip code"
            showRadiusSelector
            radius={searchRadius}
            onRadiusChange={onRadiusChange}
          />
        </div>
      </div>

      {/* Radius Filter - only show when no inline radius (i.e. no location selected) */}
      {!locationCoords && (
        <div className="max-w-xs">
          <RadiusFilter
            radius={searchRadius}
            onChange={onRadiusChange}
            disabled={!locationCoords}
          />
        </div>
      )}

      {/* Price Filter — only in a single-mode context (sale $ vs rent $/day
          are incompatible units, so All mode intentionally has no price filter) */}
      {mode !== 'all' && (
        <div className="space-y-2">
          <Label className="text-sm font-medium flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Price
          </Label>
          <PriceRangeInputs value={priceRange} onChange={onPriceRangeChange} />
          {mode === 'rent' && (
            <p className="text-xs text-muted-foreground">Filters the listing's primary rental price (daily when set, otherwise hourly).</p>
          )}
        </div>
      )}

      {/* Date Range Filter - Only show for rent mode */}
      {mode !== 'sale' && (
        <div className="max-w-xs">
          <DateRangeFilter
            dateRange={dateRange}
            onDateRangeChange={onDateRangeChange}
          />
        </div>
      )}

      {/* Fulfillment Type Filter */}
      <div className="space-y-2">
        <Label className="text-sm font-medium flex items-center gap-2">
          <Truck className="h-4 w-4" />
          Fulfillment
        </Label>
        <div className="flex flex-wrap gap-2">
          {([
            { key: 'pickup', label: 'Pickup' },
            { key: 'delivery', label: 'Delivery' },
            { key: 'on_site', label: 'On-site' },
          ] as const).map(({ key, label }) => {
            const active = fulfillmentTypes.includes(key);
            return (
              <button
                key={key}
                type="button"
                onClick={() => onFulfillmentToggle(key)}
                aria-pressed={active}
                data-fulfillment-option={key}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors duration-200',
                  active
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-transparent bg-foreground/[0.04] text-foreground/80 hover:bg-foreground/[0.08]',
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">Show listings offering any selected option.</p>
      </div>

      {/* Delivery to My Location Filter */}

      <div className="space-y-2">
        <Label className="text-sm font-medium flex items-center gap-2">
          <Truck className="h-4 w-4" />
          Delivery Options
        </Label>
        <label className="flex items-start gap-3 cursor-pointer py-2 pr-1 rounded-xl hover:bg-foreground/[0.03] transition-colors duration-200 max-w-xs">
          <Checkbox
            checked={deliveryFilterEnabled}
            onCheckedChange={(checked) => onDeliveryFilterChange(checked === true)}
            disabled={!locationCoords}
          />
          <div className="space-y-0.5">
            <span className="text-sm font-medium">Delivers to my location</span>
            <p className="text-xs text-muted-foreground">
              {locationCoords 
                ? "Only listings that deliver to you"
                : "Select a location first"
              }
            </p>
          </div>
        </label>
      </div>

      {/* Instant Book Filter */}
      <div className="space-y-2">
        <Label className="text-sm font-medium flex items-center gap-2">
          <Zap className="h-4 w-4" />
          Booking Options
        </Label>
        <div className="space-y-2">
          <label className="flex items-start gap-3 cursor-pointer py-2 pr-1 rounded-xl hover:bg-foreground/[0.03] transition-colors duration-200 max-w-xs">
            <Checkbox
              checked={instantBookOnly}
              onCheckedChange={(checked) => onInstantBookChange(checked === true)}
            />
            <div className="space-y-0.5">
              <span className="text-sm font-medium flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5 text-amber-500" />
                Instant Book only
              </span>
              <p className="text-xs text-muted-foreground">
                Book and pay immediately
              </p>
            </div>
          </label>
          <label className="flex items-start gap-3 cursor-pointer py-2 pr-1 rounded-xl hover:bg-foreground/[0.03] transition-colors duration-200 max-w-xs">
            <Checkbox
              checked={verifiedHostsOnly}
              onCheckedChange={(checked) => onVerifiedHostsChange(checked === true)}
            />
            <div className="space-y-0.5">
              <span className="text-sm font-medium flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5 text-emerald-500" />
                Identity Verified only
              </span>
              <p className="text-xs text-muted-foreground">
                Optional Plaid identity check completed. Does not verify ownership, title, condition, value, or listing accuracy.
              </p>
            </div>
          </label>
        </div>
      </div>

      {/* Amenities Filter - Show when category is selected */}
      {availableAmenities.length > 0 && (
        <div className="space-y-3">
          <Label className="text-sm font-medium flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Features & Amenities
          </Label>
          <ScrollArea className="h-[200px] pr-3">
            <div className="space-y-4">
              {availableAmenities.map((group) => (
                <div key={group.label} className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {group.label}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {group.items.map((amenity) => (
                      <label
                        key={amenity.id}
                        className={cn(
                          "flex items-center gap-1.5 cursor-pointer px-2.5 py-1 rounded-full border text-xs transition-colors duration-200",
                          selectedAmenities.includes(amenity.id)
                            ? "bg-primary text-primary-foreground border-primary"
                            : "border-transparent bg-foreground/[0.04] text-foreground/80 hover:bg-foreground/[0.08]"
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={selectedAmenities.includes(amenity.id)}
                          onChange={() => onAmenityToggle(amenity.id)}
                          className="sr-only"
                        />
                        <span>{amenity.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
};

export default Search;
