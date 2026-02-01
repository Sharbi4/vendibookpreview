import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import Fuse from 'fuse.js';
import { Search as SearchIcon, SlidersHorizontal, X, MapPin, Tag, DollarSign, CalendarIcon, Navigation, CheckCircle2, Plug, Zap, Refrigerator, Flame, Wind, Wifi, Car, Shield, Droplet, Truck, LayoutGrid, Map, Columns } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { format, parseISO, eachDayOfInterval } from 'date-fns';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import ListingCard from '@/components/listing/ListingCard';
import QuickBookingModal from '@/components/search/QuickBookingModal';
import DateRangeFilter from '@/components/search/DateRangeFilter';
import { LocationSearchInput } from '@/components/search/LocationSearchInput';
import { RadiusFilter } from '@/components/search/RadiusFilter';
import SearchResultsMap from '@/components/search/SearchResultsMap';
import NoResultsAlert from '@/components/search/NoResultsAlert';
import GetAlertsCard from '@/components/search/GetAlertsCard';
import RequestAssetCTA from '@/components/search/RequestAssetCTA';
import MobileStickyBar from '@/components/search/MobileStickyBar';
import SaveSearchButton from '@/components/search/SaveSearchButton';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Listing, CATEGORY_LABELS, ListingCategory, ListingMode, AMENITIES_BY_CATEGORY } from '@/types/listing';
import { calculateDistance } from '@/lib/geolocation';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useGoogleMapsToken } from '@/hooks/useGoogleMapsToken';
import SEO from '@/components/SEO';
import JsonLd, { generateItemListSchema, generateSearchBreadcrumbSchema, ProductListItem } from '@/components/JsonLd';

// Fetch all blocked dates and bookings for availability filtering
interface UnavailableDates {
  [listingId: string]: string[];
}

// Extended listing type with coordinates
interface ListingWithCoords extends Listing {
  latitude?: number | null;
  longitude?: number | null;
}

// Popular features for quick filter bar
const POPULAR_FEATURES = [
  { id: 'generator', label: 'Generator', icon: Zap },
  { id: 'electrical_hookup', label: 'Electric Hookup', icon: Plug },
  { id: 'electric_hookup', label: 'Electric Hookup', icon: Plug },
  { id: 'refrigerator', label: 'Refrigerator', icon: Refrigerator },
  { id: 'fryer', label: 'Fryer', icon: Flame },
  { id: 'hood_system', label: 'Hood System', icon: Wind },
  { id: 'wifi', label: 'WiFi', icon: Wifi },
  { id: 'parking_available', label: 'Parking', icon: Car },
  { id: 'security', label: '24/7 Security', icon: Shield },
  { id: 'water_hookup', label: 'Water Hookup', icon: Droplet },
];

const Search = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Get initial values from URL params
  const initialQuery = searchParams.get('q') || '';
  const initialMode = searchParams.get('mode') as ListingMode | 'all' || 'all';
  const initialCategory = searchParams.get('category') as ListingCategory | 'all' || 'all';
  const initialStartDate = searchParams.get('start');
  const initialEndDate = searchParams.get('end');
  const initialLat = searchParams.get('lat');
  const initialLng = searchParams.get('lng');
  const initialRadius = searchParams.get('radius');
  const initialSort = searchParams.get('sort') as 'newest' | 'price-low' | 'price-high' | 'distance' | 'relevance' || 'newest';
  const initialInstantBook = searchParams.get('instant') === 'true';
  
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [mode, setMode] = useState<ListingMode | 'all'>(initialMode);
  const [category, setCategory] = useState<ListingCategory | 'all'>(initialCategory);
  const [locationText, setLocationText] = useState('');
  const [locationCoords, setLocationCoords] = useState<[number, number] | null>(
    initialLat && initialLng ? [parseFloat(initialLng), parseFloat(initialLat)] : null
  );
  const [searchRadius, setSearchRadius] = useState(initialRadius ? parseInt(initialRadius) : 25);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, Infinity]);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(
    initialStartDate && initialEndDate
      ? { from: parseISO(initialStartDate), to: parseISO(initialEndDate) }
      : undefined
  );
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [deliveryFilterEnabled, setDeliveryFilterEnabled] = useState(false);
  const [instantBookOnly, setInstantBookOnly] = useState(initialInstantBook);
  const [verifiedHostsOnly, setVerifiedHostsOnly] = useState(searchParams.get('verified') === 'true');
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [sortBy, setSortBy] = useState<'newest' | 'price-low' | 'price-high' | 'distance' | 'relevance'>(initialSort);
  const [viewMode, setViewMode] = useState<'grid' | 'map' | 'split'>('split');

  // Google Maps API key for map view
  const { apiKey: mapToken, isLoading: isMapTokenLoading, error: mapTokenError } = useGoogleMapsToken();


  // Quick booking modal state
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

  // Fetch all published listings with coordinates
  const { data: listings = [], isLoading: isLoadingListings } = useQuery({
    queryKey: ['search-listings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .eq('status', 'published')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as ListingWithCoords[];
    },
  });

  // Fetch host verification status for all listings using RPC (bypasses RLS)
  const hostIds = useMemo(() => [...new Set(listings.map(l => l.host_id).filter(Boolean) as string[])], [listings]);
  
  const { data: hostProfiles = [] } = useQuery({
    queryKey: ['host-profiles', hostIds],
    queryFn: async () => {
      if (hostIds.length === 0) return [];
      const { data, error } = await supabase
        .rpc('get_host_verification_status', { host_ids: hostIds });
      if (error) throw error;
      return data || [];
    },
    enabled: hostIds.length > 0,
  });

  // Create a map of host_id -> identity_verified
  const hostVerificationMap = useMemo(() => {
    const map: Record<string, boolean> = {};
    hostProfiles.forEach(profile => {
      map[profile.id] = profile.identity_verified ?? false;
    });
    return map;
  }, [hostProfiles]);

  // Fetch unavailable dates for all listings (blocked dates + approved bookings)
  const { data: unavailableDates = {} } = useQuery({
    queryKey: ['search-unavailable-dates', listings.map(l => l.id)],
    queryFn: async () => {
      if (listings.length === 0) return {};
      
      const listingIds = listings.map(l => l.id);
      
      // Fetch blocked dates
      const { data: blockedData } = await supabase
        .from('listing_blocked_dates')
        .select('listing_id, blocked_date')
        .in('listing_id', listingIds);
      
      // Fetch approved bookings
      const { data: bookingData } = await supabase
        .from('booking_requests')
        .select('listing_id, start_date, end_date')
        .in('listing_id', listingIds)
        .eq('status', 'approved');
      
      const result: UnavailableDates = {};
      
      // Initialize all listings
      listingIds.forEach(id => {
        result[id] = [];
      });
      
      // Add blocked dates
      blockedData?.forEach(bd => {
        if (!result[bd.listing_id]) result[bd.listing_id] = [];
        result[bd.listing_id].push(bd.blocked_date);
      });
      
      // Add booked date ranges
      bookingData?.forEach(booking => {
        if (!result[booking.listing_id]) result[booking.listing_id] = [];
        const dates = eachDayOfInterval({
          start: parseISO(booking.start_date),
          end: parseISO(booking.end_date),
        });
        dates.forEach(d => {
          result[booking.listing_id].push(format(d, 'yyyy-MM-dd'));
        });
      });
      
      return result;
    },
    enabled: listings.length > 0,
  });

  // Set up Fuse.js for fuzzy search
  const fuse = useMemo(() => {
    return new Fuse(listings, {
      keys: [
        { name: 'title', weight: 0.4 },
        { name: 'description', weight: 0.2 },
        { name: 'address', weight: 0.2 },
        { name: 'pickup_location_text', weight: 0.2 },
      ],
      threshold: 0.4,
      includeScore: true,
      ignoreLocation: true,
    });
  }, [listings]);

  // Check if a listing is available for the selected date range
  const isListingAvailableForDates = (listingId: string): boolean => {
    if (!dateRange?.from || !dateRange?.to) return true;
    
    const unavailable = unavailableDates[listingId] || [];
    const requestedDates = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });
    
    return !requestedDates.some(date => 
      unavailable.includes(format(date, 'yyyy-MM-dd'))
    );
  };

  // Check if a listing is within the search radius
  const isListingWithinRadius = (listing: ListingWithCoords): boolean => {
    if (!locationCoords) return true;
    
    if (listing.latitude == null || listing.longitude == null) return true; // Include if no coords stored
    
    const distance = calculateDistance(
      locationCoords[1], // lat
      locationCoords[0], // lng
      listing.latitude,
      listing.longitude
    );
    
    return distance <= searchRadius;
  };

  // Check if a listing can deliver to the user's location (for filtering)
  const canListingDeliverToLocation = (listing: ListingWithCoords): boolean => {
    if (!locationCoords) return true;
    if (!deliveryFilterEnabled) return true;
    
    return checkListingDeliveryCapability(listing);
  };

  // Check delivery capability for badge display (always checks, not dependent on filter)
  const checkListingDeliveryCapability = (listing: ListingWithCoords): boolean => {
    if (!locationCoords) return false;
    
    // Listing must support delivery
    if (listing.fulfillment_type !== 'delivery' && listing.fulfillment_type !== 'both') {
      return false;
    }
    
    // Listing must have delivery radius set
    if (!listing.delivery_radius_miles) return false;
    
    // Listing must have coordinates
    if (listing.latitude == null || listing.longitude == null) return false;
    
    // Calculate distance from listing to user's location
    const distance = calculateDistance(
      listing.latitude,
      listing.longitude,
      locationCoords[1], // user lat
      locationCoords[0]  // user lng
    );
    
    return distance <= listing.delivery_radius_miles;
  };

  // Get distance for display
  const getListingDistance = (listing: ListingWithCoords): number | null => {
    if (!locationCoords) return null;
    
    if (listing.latitude == null || listing.longitude == null) return null;
    
    return calculateDistance(
      locationCoords[1],
      locationCoords[0],
      listing.latitude,
      listing.longitude
    );
  };

  // Apply all filters
  const filteredListings = useMemo(() => {
    let results: ListingWithCoords[] = [];
    let scoreMap: Record<string, number> = {};

    // Apply fuzzy search if query exists
    if (searchQuery.trim()) {
      const fuseResults = fuse.search(searchQuery);
      results = fuseResults.map(result => result.item);
      // Store scores for relevance sorting (lower score = better match)
      fuseResults.forEach(result => {
        scoreMap[result.item.id] = result.score ?? 1;
      });
    } else {
      results = [...listings];
    }

    // Filter by mode
    if (mode !== 'all') {
      results = results.filter(listing => listing.mode === mode);
    }

    // Filter by category
    if (category !== 'all') {
      results = results.filter(listing => listing.category === category);
    }

    // Filter by location radius
    if (locationCoords) {
      results = results.filter(listing => isListingWithinRadius(listing));
    }

    // Filter by price range (only apply max if it's not Infinity)
    results = results.filter(listing => {
      const price = listing.mode === 'rent' 
        ? (listing.price_daily || 0) 
        : (listing.price_sale || 0);
      const meetsMin = price >= priceRange[0];
      const meetsMax = priceRange[1] === Infinity || price <= priceRange[1];
      return meetsMin && meetsMax;
    });

    // Filter by date availability
    if (dateRange?.from && dateRange?.to) {
      results = results.filter(listing => isListingAvailableForDates(listing.id));
    }

    // Filter by amenities
    if (selectedAmenities.length > 0) {
      results = results.filter(listing => {
        const listingAmenities = listing.amenities || [];
        return selectedAmenities.every(amenity => listingAmenities.includes(amenity));
      });
    }

    // Filter by delivery to user's location
    if (deliveryFilterEnabled && locationCoords) {
      results = results.filter(listing => canListingDeliverToLocation(listing));
    }

    // Filter by Instant Book
    if (instantBookOnly) {
      results = results.filter(listing => listing.mode === 'rent' && listing.instant_book === true);
    }

    // Filter by Verified Hosts
    if (verifiedHostsOnly) {
      results = results.filter(listing => hostVerificationMap[listing.host_id] === true);
    }

    // Apply sorting
    if (sortBy === 'relevance' && searchQuery.trim()) {
      // Sort by Fuse.js score (lower = better match)
      results = results.sort((a, b) => {
        const scoreA = scoreMap[a.id] ?? 1;
        const scoreB = scoreMap[b.id] ?? 1;
        return scoreA - scoreB;
      });
    } else if (sortBy === 'distance' && locationCoords) {
      results = results.sort((a, b) => {
        const distA = getListingDistance(a);
        const distB = getListingDistance(b);
        if (distA === null && distB === null) return 0;
        if (distA === null) return 1;
        if (distB === null) return -1;
        return distA - distB;
      });
    } else if (sortBy === 'newest') {
      results = results.sort((a, b) => 
        new Date(b.published_at || b.created_at).getTime() - new Date(a.published_at || a.created_at).getTime()
      );
    } else if (sortBy === 'price-low') {
      results = results.sort((a, b) => {
        const priceA = a.mode === 'rent' ? (a.price_daily || 0) : (a.price_sale || 0);
        const priceB = b.mode === 'rent' ? (b.price_daily || 0) : (b.price_sale || 0);
        return priceA - priceB;
      });
    } else if (sortBy === 'price-high') {
      results = results.sort((a, b) => {
        const priceA = a.mode === 'rent' ? (a.price_daily || 0) : (a.price_sale || 0);
        const priceB = b.mode === 'rent' ? (b.price_daily || 0) : (b.price_sale || 0);
        return priceB - priceA;
      });
    }

    return results;
  }, [listings, searchQuery, mode, category, locationCoords, searchRadius, priceRange, dateRange, selectedAmenities, deliveryFilterEnabled, instantBookOnly, verifiedHostsOnly, hostVerificationMap, fuse, unavailableDates, sortBy]);

  // Update URL params
  const handleSearch = (value: string) => {
    setSearchQuery(value);
    const params = new URLSearchParams(searchParams);
    if (value.trim()) {
      params.set('q', value);
      // Auto-select relevance sort when searching
      if (sortBy !== 'relevance') {
        setSortBy('relevance');
        params.set('sort', 'relevance');
      }
    } else {
      params.delete('q');
      // Reset to newest when clearing search
      if (sortBy === 'relevance') {
        setSortBy('newest');
        params.delete('sort');
      }
    }
    setSearchParams(params);
  };

  const handleModeChange = (value: string) => {
    const newMode = value as ListingMode | 'all';
    setMode(newMode);
    const params = new URLSearchParams(searchParams);
    if (newMode !== 'all') {
      params.set('mode', newMode);
    } else {
      params.delete('mode');
    }
    setSearchParams(params);
  };

  const handleCategoryChange = (value: string) => {
    const newCategory = value as ListingCategory | 'all';
    setCategory(newCategory);
    const params = new URLSearchParams(searchParams);
    if (newCategory !== 'all') {
      params.set('category', newCategory);
    } else {
      params.delete('category');
    }
    setSearchParams(params);
  };

  const handleLocationSelect = (location: { name: string; coordinates: [number, number] } | null) => {
    if (location) {
      setLocationCoords(location.coordinates);
      const params = new URLSearchParams(searchParams);
      params.set('lat', location.coordinates[1].toString());
      params.set('lng', location.coordinates[0].toString());
      params.set('radius', searchRadius.toString());
      setSearchParams(params);
    } else {
      setLocationCoords(null);
      const params = new URLSearchParams(searchParams);
      params.delete('lat');
      params.delete('lng');
      params.delete('radius');
      setSearchParams(params);
    }
  };

  const handleRadiusChange = (radius: number) => {
    setSearchRadius(radius);
    if (locationCoords) {
      const params = new URLSearchParams(searchParams);
      params.set('radius', radius.toString());
      setSearchParams(params);
    }
  };

  const handleDateRangeChange = (range: DateRange | undefined) => {
    setDateRange(range);
    const params = new URLSearchParams(searchParams);
    if (range?.from && range?.to) {
      params.set('start', format(range.from, 'yyyy-MM-dd'));
      params.set('end', format(range.to, 'yyyy-MM-dd'));
    } else {
      params.delete('start');
      params.delete('end');
    }
    setSearchParams(params);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setMode('all');
    setCategory('all');
    setLocationText('');
    setLocationCoords(null);
    setSearchRadius(25);
    setPriceRange([0, Infinity]);
    setDateRange(undefined);
    setSelectedAmenities([]);
    setDeliveryFilterEnabled(false);
    setInstantBookOnly(false);
    setVerifiedHostsOnly(false);
    setSortBy('newest');
    setSearchParams({});
  };

  const handleSortChange = (value: string) => {
    const newSort = value as 'newest' | 'price-low' | 'price-high' | 'distance' | 'relevance';
    setSortBy(newSort);
    const params = new URLSearchParams(searchParams);
    if (newSort !== 'newest') {
      params.set('sort', newSort);
    } else {
      params.delete('sort');
    }
    setSearchParams(params);
  };

  const toggleAmenity = (amenityId: string) => {
    setSelectedAmenities(prev =>
      prev.includes(amenityId)
        ? prev.filter(a => a !== amenityId)
        : [...prev, amenityId]
    );
  };

  const handleInstantBookChange = (enabled: boolean) => {
    setInstantBookOnly(enabled);
    const params = new URLSearchParams(searchParams);
    if (enabled) {
      params.set('instant', 'true');
    } else {
      params.delete('instant');
    }
    setSearchParams(params);
  };

  const handleVerifiedHostsChange = (enabled: boolean) => {
    setVerifiedHostsOnly(enabled);
    const params = new URLSearchParams(searchParams);
    if (enabled) {
      params.set('verified', 'true');
    } else {
      params.delete('verified');
    }
    setSearchParams(params);
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
    locationCoords !== null,
    priceRange[0] > 0 || priceRange[1] !== Infinity,
    dateRange?.from && dateRange?.to,
    selectedAmenities.length > 0,
    deliveryFilterEnabled,
    instantBookOnly,
    verifiedHostsOnly,
  ].filter(Boolean).length;

  // Generate structured data for Google Shopping / Search indexing
  const itemListSchema = useMemo(() => {
    const productItems: ProductListItem[] = filteredListings.map(listing => ({
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
      query: searchQuery || undefined,
      location: locationText || undefined,
    });
  }, [filteredListings, mode, category, searchQuery, locationText]);

  const breadcrumbSchema = useMemo(() => generateSearchBreadcrumbSchema({
    mode: mode as 'rent' | 'sale' | 'all',
    category: category !== 'all' ? category : undefined,
  }), [mode, category]);

  // Build dynamic SEO title and description
  const seoTitle = useMemo(() => {
    const parts: string[] = [];
    if (category !== 'all') {
      parts.push(CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS] || 'Listings');
    } else {
      parts.push('Food Trucks, Trailers & Ghost Kitchens');
    }
    if (mode !== 'all') {
      parts.push(mode === 'rent' ? 'for Rent' : 'for Sale');
    }
    if (locationText) {
      parts.push(`in ${locationText}`);
    }
    return `${parts.join(' ')} | Vendibook`;
  }, [category, mode, locationText]);

  const seoDescription = useMemo(() => {
    const categoryLabel = category !== 'all' 
      ? CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS]?.toLowerCase() 
      : 'food trucks, trailers, and ghost kitchens';
    const modeLabel = mode !== 'all' 
      ? (mode === 'rent' ? 'rent' : 'buy') 
      : 'rent or buy';
    const locationLabel = locationText ? ` in ${locationText}` : '';
    return `Browse ${filteredListings.length}+ ${categoryLabel} available to ${modeLabel}${locationLabel}. Verified listings with secure payments on Vendibook.`;
  }, [category, mode, locationText, filteredListings.length]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEO
        title={seoTitle}
        description={seoDescription}
        canonical="/search"
      />
      <JsonLd schema={[itemListSchema, breadcrumbSchema]} />
      <Header />
      
      <main className="flex-1">
        {/* Search Header - Enhanced styling matching Contact page */}
        <div className="border-b border-border bg-card/50 backdrop-blur-sm">
          <div className="container py-4">
            {/* Row 1: Search + Filters */}
            <div className="flex gap-3">
              <div className="relative flex-1">
                <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search trucks, trailers, kitchens..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10 h-11 text-sm rounded-xl border-border/60 focus:border-primary shadow-sm"
                />
                {searchQuery && (
                  <button
                    onClick={() => handleSearch('')}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              
              {/* Filter Button - Enhanced */}
              <Sheet open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
                <SheetTrigger asChild>
                  <Button variant="dark-shine" size="default" className="rounded-xl relative shrink-0 h-11 px-5">
                    <SlidersHorizontal className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Filters</span>
                    {activeFiltersCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 h-5 w-5 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center font-medium shadow-lg">
                        {activeFiltersCount}
                      </span>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent side="bottom" className="h-[85vh] flex flex-col">
                  <SheetHeader className="shrink-0">
                    <SheetTitle>Filters</SheetTitle>
                  </SheetHeader>
                  <ScrollArea className="flex-1 mt-4 -mx-6 px-6">
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
                        instantBookOnly={instantBookOnly}
                        verifiedHostsOnly={verifiedHostsOnly}
                        onModeChange={handleModeChange}
                        onCategoryChange={handleCategoryChange}
                        onLocationTextChange={setLocationText}
                        onLocationSelect={handleLocationSelect}
                        onRadiusChange={handleRadiusChange}
                        onPriceRangeChange={setPriceRange}
                        onDateRangeChange={handleDateRangeChange}
                        onAmenityToggle={toggleAmenity}
                        onDeliveryFilterChange={setDeliveryFilterEnabled}
                        onInstantBookChange={handleInstantBookChange}
                        onVerifiedHostsChange={handleVerifiedHostsChange}
                        onClear={clearFilters}
                      />
                    </div>
                  </ScrollArea>
                </SheetContent>
              </Sheet>
            </div>

            {/* Row 2: Results count + Sort + View toggle + Save Search */}
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground truncate">
                {isLoadingListings ? (
                  'Loading...'
                ) : (
                  <>
                    <span className="font-semibold text-foreground">{filteredListings.length}</span>
                    {' '}result{filteredListings.length !== 1 ? 's' : ''}
                    {searchQuery && (
                      <span className="hidden sm:inline"> for "<span className="text-foreground">{searchQuery}</span>"</span>
                    )}
                  </>
                )}
              </p>
              <div className="flex items-center gap-2 shrink-0">
                {/* Save Search Button */}
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
                
                {/* View Toggle - Enhanced */}
                <ToggleGroup type="single" value={viewMode} onValueChange={(value) => value && setViewMode(value as 'grid' | 'map' | 'split')} className="bg-card border border-border rounded-xl p-0.5 shadow-sm">
                  <ToggleGroupItem value="split" aria-label="Split view" className="h-8 px-2.5 rounded-lg data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                    <Columns className="h-3.5 w-3.5" />
                  </ToggleGroupItem>
                  <ToggleGroupItem value="grid" aria-label="Grid view" className="h-8 px-2.5 rounded-lg data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                    <LayoutGrid className="h-3.5 w-3.5" />
                  </ToggleGroupItem>
                  <ToggleGroupItem value="map" aria-label="Map view" className="h-8 px-2.5 rounded-lg data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                    <Map className="h-3.5 w-3.5" />
                  </ToggleGroupItem>
                </ToggleGroup>

                <select
                  value={sortBy}
                  onChange={(e) => handleSortChange(e.target.value)}
                  className="text-xs border border-border rounded-xl px-3 py-2 bg-card shadow-sm hover:bg-muted/50 transition-colors cursor-pointer"
                >
                  <option value="newest">Newest</option>
                  {searchQuery.trim() && <option value="relevance">Relevance</option>}
                  <option value="price-low">Price: Low</option>
                  <option value="price-high">Price: High</option>
                  {locationCoords && <option value="distance">Distance</option>}
                </select>
              </div>
            </div>
          </div>
        </div>
        {/* Results */}
        <div className="container py-6">
          <div className="flex gap-8">
            {/* Desktop Sidebar Filters - Enhanced card styling */}
            <aside className="hidden md:block w-64 shrink-0">
              <div className="sticky top-24 space-y-6 p-5 bg-card rounded-2xl border-0 shadow-xl">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-foreground">Filters</h2>
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
                  instantBookOnly={instantBookOnly}
                  verifiedHostsOnly={verifiedHostsOnly}
                  onModeChange={handleModeChange}
                  onCategoryChange={handleCategoryChange}
                  onLocationTextChange={setLocationText}
                  onLocationSelect={handleLocationSelect}
                  onRadiusChange={handleRadiusChange}
                  onPriceRangeChange={setPriceRange}
                  onDateRangeChange={handleDateRangeChange}
                  onAmenityToggle={toggleAmenity}
                  onDeliveryFilterChange={setDeliveryFilterEnabled}
                  onInstantBookChange={handleInstantBookChange}
                  onVerifiedHostsChange={handleVerifiedHostsChange}
                  onClear={clearFilters}
                />
              </div>
            </aside>

            {/* Results Grid */}
            <div className="flex-1">

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
                      Verified Hosts
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

              {/* Split View - Half Map, Half List */}
              {viewMode === 'split' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* List Side */}
                  <div className="order-2 lg:order-1">
                    <ScrollArea className="h-[600px] pr-4">
                      {filteredListings.length > 0 ? (
                        <div className="space-y-4">
                          {filteredListings.map((listing) => {
                            const distance = getListingDistance(listing);
                            const isHostVerified = hostVerificationMap[listing.host_id] ?? false;
                            const canDeliverToUser = checkListingDeliveryCapability(listing);
                            return (
                              <div key={listing.id} className="relative">
                                <ListingCard 
                                  listing={listing} 
                                  hostVerified={isHostVerified}
                                  showQuickBook
                                  onQuickBook={handleQuickBook}
                                  canDeliverToUser={canDeliverToUser}
                                  compact
                                />
                                {distance !== null && (
                                  <div className="absolute top-3 left-3 bg-background/90 backdrop-blur-sm px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 z-10">
                                    <Navigation className="h-3 w-3" />
                                    {distance < 1 ? '< 1' : Math.round(distance)} mi
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <NoResultsAlert 
                          onClearFilters={clearFilters}
                          category={category}
                          mode={mode}
                        />
                      )}
                    </ScrollArea>
                  </div>
                  {/* Map Side */}
                  <div className="order-1 lg:order-2 h-[400px] lg:h-[600px] rounded-xl overflow-hidden border border-border sticky top-24">
                    <SearchResultsMap
                      listings={filteredListings}
                      mapToken={mapToken}
                      isLoading={isMapTokenLoading}
                      error={mapTokenError}
                      userLocation={locationCoords}
                      searchRadius={searchRadius}
                      onListingClick={() => {
                        // Preview shows on click, button navigates to listing
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Map View */}
              {viewMode === 'map' && (
                <div className="h-[600px] rounded-xl overflow-hidden border border-border">
                  <SearchResultsMap
                    listings={filteredListings}
                    mapToken={mapToken}
                    isLoading={isMapTokenLoading}
                    error={mapTokenError}
                    userLocation={locationCoords}
                    searchRadius={searchRadius}
                    onListingClick={(listing) => {
                      window.location.href = `/listing/${listing.id}`;
                    }}
                  />
                </div>
              )}

              {/* Listings Grid */}
              {viewMode === 'grid' && (
                <>
                  {filteredListings.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {filteredListings.map((listing, index) => {
                        const distance = getListingDistance(listing);
                        const isHostVerified = hostVerificationMap[listing.host_id] ?? false;
                        const canDeliverToUser = checkListingDeliveryCapability(listing);
                        return (
                          <>
                            <div key={listing.id} className="relative">
                              <ListingCard 
                                listing={listing} 
                                hostVerified={isHostVerified}
                                showQuickBook
                                onQuickBook={handleQuickBook}
                                canDeliverToUser={canDeliverToUser}
                              />
                              {distance !== null && (
                                <div className="absolute top-3 left-3 bg-background/90 backdrop-blur-sm px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 z-10">
                                  <Navigation className="h-3 w-3" />
                                  {distance < 1 ? '< 1' : Math.round(distance)} mi
                                </div>
                              )}
                            </div>
                            {/* Get alerts after 8th listing */}
                            {index === 7 && filteredListings.length > 8 && (
                              <div key="get-alerts" className="col-span-1 sm:col-span-2 lg:col-span-3">
                                <GetAlertsCard category={category !== 'all' ? category : undefined} radius={searchRadius} />
                              </div>
                            )}
                          </>
                        );
                      })}
                    </div>
                  ) : (
                    <NoResultsAlert 
                      onClearFilters={clearFilters}
                      category={category}
                      mode={mode}
                    />
                  )}
                  
                  {/* Get alerts at bottom if less than 8 results */}
                  {filteredListings.length > 0 && filteredListings.length <= 8 && (
                    <div className="mt-6">
                      <GetAlertsCard category={category !== 'all' ? category : undefined} radius={searchRadius} />
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

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

      {/* Mobile Sticky Bar */}
      <MobileStickyBar
        activeFiltersCount={activeFiltersCount}
        sortBy={sortBy}
        onSortChange={handleSortChange}
        onFiltersClick={() => setIsFiltersOpen(true)}
        hasLocation={!!locationCoords}
        hasSearchQuery={!!searchQuery.trim()}
      />
    </div>
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
  onInstantBookChange: (enabled: boolean) => void;
  onVerifiedHostsChange: (enabled: boolean) => void;
  onClear: () => void;
}

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
  instantBookOnly,
  verifiedHostsOnly,
  onModeChange,
  onCategoryChange,
  onLocationTextChange,
  onLocationSelect,
  onRadiusChange,
  onPriceRangeChange,
  onDateRangeChange,
  onAmenityToggle,
  onDeliveryFilterChange,
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
    <div className="space-y-5">
      {/* Type Filter - First */}
      <div className="space-y-2">
        <Label className="text-sm font-medium flex items-center gap-2">
          <Tag className="h-4 w-4" />
          Listing Type
        </Label>
        <div className="flex flex-wrap gap-2">
          {[
            { value: 'all', label: 'All' },
            { value: 'rent', label: 'For Rent' },
            { value: 'sale', label: 'For Sale' },
          ].map((option) => (
            <label 
              key={option.value} 
              className={cn(
                "flex items-center gap-1.5 cursor-pointer px-3 py-1.5 rounded-full border text-sm transition-colors",
                mode === option.value 
                  ? "bg-primary text-primary-foreground border-primary" 
                  : "border-border hover:bg-muted"
              )}
            >
              <input
                type="radio"
                name="mode"
                checked={mode === option.value}
                onChange={() => onModeChange(option.value)}
                className="sr-only"
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Category Filter */}
      <div className="space-y-2">
        <Label className="text-sm font-medium flex items-center">
          Category
          <CategoryInfoModal />
        </Label>
        <div className="flex flex-wrap gap-2">
          <label 
            className={cn(
              "flex items-center cursor-pointer px-3 py-1.5 rounded-full border text-sm transition-colors",
              category === 'all' 
                ? "bg-primary text-primary-foreground border-primary" 
                : "border-border hover:bg-muted"
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
          {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
            <label 
              key={key} 
              className={cn(
                "flex items-center cursor-pointer px-3 py-1.5 rounded-full border text-sm transition-colors",
                category === key 
                  ? "bg-primary text-primary-foreground border-primary" 
                  : "border-border hover:bg-muted"
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

      {/* Date Range Filter */}
      <div className="max-w-xs">
        <DateRangeFilter
          dateRange={dateRange}
          onDateRangeChange={onDateRangeChange}
        />
      </div>

      {/* Delivery to My Location Filter */}
      <div className="space-y-2">
        <Label className="text-sm font-medium flex items-center gap-2">
          <Truck className="h-4 w-4" />
          Delivery Options
        </Label>
        <label className="flex items-start gap-3 cursor-pointer p-2.5 rounded-lg border border-border hover:bg-muted/50 transition-colors max-w-xs">
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
          <label className="flex items-start gap-3 cursor-pointer p-2.5 rounded-lg border border-border hover:bg-muted/50 transition-colors max-w-xs">
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
          <label className="flex items-start gap-3 cursor-pointer p-2.5 rounded-lg border border-border hover:bg-muted/50 transition-colors max-w-xs">
            <Checkbox
              checked={verifiedHostsOnly}
              onCheckedChange={(checked) => onVerifiedHostsChange(checked === true)}
            />
            <div className="space-y-0.5">
              <span className="text-sm font-medium flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5 text-amber-500" />
                Verified Hosts only
              </span>
              <p className="text-xs text-muted-foreground">
                ID verified via Stripe Identity
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
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {group.label}
                  </p>
                  <div className="space-y-1">
                    {group.items.map((item) => (
                      <label key={item.id} className="flex items-center gap-2 cursor-pointer py-1">
                        <Checkbox
                          checked={selectedAmenities.includes(item.id)}
                          onCheckedChange={() => onAmenityToggle(item.id)}
                        />
                        <span className="text-sm">{item.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
          {selectedAmenities.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {selectedAmenities.length} feature{selectedAmenities.length !== 1 ? 's' : ''} selected
            </p>
          )}
        </div>
      )}

      {category === 'all' && (
        <div className="p-3 bg-muted/50 rounded-lg">
          <p className="text-xs text-muted-foreground">
            Select a category above to filter by specific features and amenities.
          </p>
        </div>
      )}

      {/* Price Range Filter */}
      <div className="space-y-3">
        <Label className="text-sm font-medium flex items-center gap-2">
          <DollarSign className="h-4 w-4" />
          Price Range
        </Label>
        <div className="flex items-center gap-2 max-w-xs">
          <div className="relative flex-1">
            <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="number"
              placeholder="Min"
              value={priceRange[0] === 0 ? '' : priceRange[0]}
              onChange={(e) => {
                const value = e.target.value === '' ? 0 : parseInt(e.target.value);
                onPriceRangeChange([value, priceRange[1]]);
              }}
              className="pl-8 h-9"
              min={0}
            />
          </div>
          <span className="text-muted-foreground text-sm">to</span>
          <div className="relative flex-1">
            <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="number"
              placeholder="No max"
              value={priceRange[1] === Infinity ? '' : priceRange[1]}
              onChange={(e) => {
                const value = e.target.value === '' ? Infinity : parseInt(e.target.value);
                onPriceRangeChange([priceRange[0], value]);
              }}
              className="pl-8 h-9"
              min={0}
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          {mode === 'rent' ? 'Daily rental price' : mode === 'sale' ? 'Sale price' : 'Price per day or sale price'}
        </p>
      </div>
    </div>
  );
};

export default Search;
