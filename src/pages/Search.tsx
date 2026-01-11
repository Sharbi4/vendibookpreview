import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import Fuse from 'fuse.js';
import { Search as SearchIcon, SlidersHorizontal, X, MapPin, Tag, DollarSign, CalendarIcon, Navigation } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { format, parseISO, eachDayOfInterval } from 'date-fns';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import ListingCard from '@/components/listing/ListingCard';
import QuickBookingModal from '@/components/search/QuickBookingModal';
import DateRangeFilter from '@/components/search/DateRangeFilter';
import { LocationSearchInput } from '@/components/search/LocationSearchInput';
import { RadiusFilter } from '@/components/search/RadiusFilter';
import NewsletterSection from '@/components/newsletter/NewsletterSection';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
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
import { Listing, CATEGORY_LABELS, ListingCategory, ListingMode } from '@/types/listing';
import { calculateDistance } from '@/lib/geolocation';

// Fetch all blocked dates and bookings for availability filtering
interface UnavailableDates {
  [listingId: string]: string[];
}

// Cache for geocoded listing addresses
interface ListingCoordinates {
  [listingId: string]: [number, number] | null;
}

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
  
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [mode, setMode] = useState<ListingMode | 'all'>(initialMode);
  const [category, setCategory] = useState<ListingCategory | 'all'>(initialCategory);
  const [locationText, setLocationText] = useState('');
  const [locationCoords, setLocationCoords] = useState<[number, number] | null>(
    initialLat && initialLng ? [parseFloat(initialLng), parseFloat(initialLat)] : null
  );
  const [searchRadius, setSearchRadius] = useState(initialRadius ? parseInt(initialRadius) : 25);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 50000]);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(
    initialStartDate && initialEndDate
      ? { from: parseISO(initialStartDate), to: parseISO(initialEndDate) }
      : undefined
  );
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  
  // Quick booking modal state
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

  // Geocoded listing coordinates cache
  const [listingCoordinates, setListingCoordinates] = useState<ListingCoordinates>({});

  // Fetch all published listings
  const { data: listings = [], isLoading: isLoadingListings } = useQuery({
    queryKey: ['search-listings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .eq('status', 'published')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Listing[];
    },
  });

  // Geocode listing addresses when they change
  useEffect(() => {
    const geocodeListings = async () => {
      const uncachedListings = listings.filter(
        l => l.address && listingCoordinates[l.id] === undefined
      );
      
      if (uncachedListings.length === 0) return;

      // Batch geocode (limit to avoid rate limits)
      const toGeocode = uncachedListings.slice(0, 10);
      const newCoords: ListingCoordinates = { ...listingCoordinates };

      for (const listing of toGeocode) {
        if (!listing.address) {
          newCoords[listing.id] = null;
          continue;
        }

        try {
          const { data, error } = await supabase.functions.invoke('geocode-location', {
            body: { query: listing.address, limit: 1 },
          });

          if (!error && data.results?.length > 0) {
            newCoords[listing.id] = data.results[0].center;
          } else {
            newCoords[listing.id] = null;
          }
        } catch {
          newCoords[listing.id] = null;
        }
      }

      setListingCoordinates(newCoords);
    };

    if (locationCoords && listings.length > 0) {
      geocodeListings();
    }
  }, [listings, locationCoords]);

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
  const isListingWithinRadius = (listing: Listing): boolean => {
    if (!locationCoords) return true;
    
    const coords = listingCoordinates[listing.id];
    if (!coords) return true; // Include if we couldn't geocode
    
    const distance = calculateDistance(
      locationCoords[1], // lat
      locationCoords[0], // lng
      coords[1],
      coords[0]
    );
    
    return distance <= searchRadius;
  };

  // Get distance for display
  const getListingDistance = (listing: Listing): number | null => {
    if (!locationCoords) return null;
    
    const coords = listingCoordinates[listing.id];
    if (!coords) return null;
    
    return calculateDistance(
      locationCoords[1],
      locationCoords[0],
      coords[1],
      coords[0]
    );
  };

  // Apply all filters
  const filteredListings = useMemo(() => {
    let results = listings;

    // Apply fuzzy search if query exists
    if (searchQuery.trim()) {
      const fuseResults = fuse.search(searchQuery);
      results = fuseResults.map(result => result.item);
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

    // Filter by price range
    results = results.filter(listing => {
      const price = listing.mode === 'rent' 
        ? (listing.price_daily || 0) 
        : (listing.price_sale || 0);
      return price >= priceRange[0] && price <= priceRange[1];
    });

    // Filter by date availability
    if (dateRange?.from && dateRange?.to) {
      results = results.filter(listing => isListingAvailableForDates(listing.id));
    }

    // Sort by distance if location is set
    if (locationCoords) {
      results = results.sort((a, b) => {
        const distA = getListingDistance(a);
        const distB = getListingDistance(b);
        if (distA === null && distB === null) return 0;
        if (distA === null) return 1;
        if (distB === null) return -1;
        return distA - distB;
      });
    }

    return results;
  }, [listings, searchQuery, mode, category, locationCoords, searchRadius, priceRange, dateRange, fuse, unavailableDates, listingCoordinates]);

  // Update URL params
  const handleSearch = (value: string) => {
    setSearchQuery(value);
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set('q', value);
    } else {
      params.delete('q');
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
    setPriceRange([0, 50000]);
    setDateRange(undefined);
    setSearchParams({});
  };

  const handleQuickBook = (listing: Listing) => {
    setSelectedListing(listing);
    setIsBookingModalOpen(true);
  };

  const activeFiltersCount = [
    mode !== 'all',
    category !== 'all',
    locationCoords !== null,
    priceRange[0] > 0 || priceRange[1] < 50000,
    dateRange?.from && dateRange?.to,
  ].filter(Boolean).length;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1">
        {/* Search Header */}
        <div className="bg-gradient-to-b from-primary/5 to-background border-b border-border">
          <div className="container py-8">
            <h1 className="text-3xl font-bold text-foreground mb-6">
              Find Your Perfect Asset
            </h1>
            
            {/* Search Bar */}
            <div className="flex gap-3">
              <div className="relative flex-1">
                <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search food trucks, trailers, kitchens..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-12 h-12 text-base rounded-full border-2 focus:border-primary"
                />
                {searchQuery && (
                  <button
                    onClick={() => handleSearch('')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              
              {/* Filter Button (Mobile) */}
              <Sheet open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="lg" className="md:hidden rounded-full relative">
                    <SlidersHorizontal className="h-5 w-5" />
                    {activeFiltersCount > 0 && (
                      <span className="absolute -top-1 -right-1 h-5 w-5 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center">
                        {activeFiltersCount}
                      </span>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent side="bottom" className="h-[85vh] overflow-y-auto">
                  <SheetHeader>
                    <SheetTitle>Filters</SheetTitle>
                  </SheetHeader>
                  <div className="mt-6 space-y-6">
                    <FilterContent
                      mode={mode}
                      category={category}
                      locationText={locationText}
                      locationCoords={locationCoords}
                      searchRadius={searchRadius}
                      priceRange={priceRange}
                      dateRange={dateRange}
                      onModeChange={handleModeChange}
                      onCategoryChange={handleCategoryChange}
                      onLocationTextChange={setLocationText}
                      onLocationSelect={handleLocationSelect}
                      onRadiusChange={handleRadiusChange}
                      onPriceRangeChange={setPriceRange}
                      onDateRangeChange={handleDateRangeChange}
                      onClear={clearFilters}
                    />
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            {/* Quick Filters */}
            <div className="flex flex-wrap gap-2 mt-4">
              <Select value={mode} onValueChange={handleModeChange}>
                <SelectTrigger className="w-[140px] rounded-full">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="rent">For Rent</SelectItem>
                  <SelectItem value="sale">For Sale</SelectItem>
                </SelectContent>
              </Select>

              <Select value={category} onValueChange={handleCategoryChange}>
                <SelectTrigger className="w-[160px] rounded-full">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {activeFiltersCount > 0 && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
                  Clear all
                  <X className="h-4 w-4 ml-1" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="container py-8">
          <div className="flex gap-8">
            {/* Desktop Sidebar Filters */}
            <aside className="hidden md:block w-64 shrink-0">
              <div className="sticky top-24 space-y-6 p-4 bg-card rounded-xl border border-border">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-foreground">Filters</h2>
                  {activeFiltersCount > 0 && (
                    <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs">
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
                  onModeChange={handleModeChange}
                  onCategoryChange={handleCategoryChange}
                  onLocationTextChange={setLocationText}
                  onLocationSelect={handleLocationSelect}
                  onRadiusChange={handleRadiusChange}
                  onPriceRangeChange={setPriceRange}
                  onDateRangeChange={handleDateRangeChange}
                  onClear={clearFilters}
                />
              </div>
            </aside>

            {/* Results Grid */}
            <div className="flex-1">
              {/* Results Count */}
              <div className="mb-6 flex items-center justify-between">
                <p className="text-muted-foreground">
                  {isLoadingListings ? (
                    'Loading...'
                  ) : (
                    <>
                      <span className="font-semibold text-foreground">{filteredListings.length}</span>
                      {' '}result{filteredListings.length !== 1 ? 's' : ''} found
                      {searchQuery && (
                        <span> for "<span className="text-foreground">{searchQuery}</span>"</span>
                      )}
                      {locationCoords && (
                        <span> within <span className="text-foreground">{searchRadius} miles</span></span>
                      )}
                    </>
                  )}
                </p>
              </div>

              {/* Active Filters Badges */}
              {(mode !== 'all' || category !== 'all' || locationCoords || dateRange?.from) && (
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
                </div>
              )}

              {/* Listings Grid */}
              {filteredListings.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredListings.map((listing) => {
                    const distance = getListingDistance(listing);
                    return (
                      <div key={listing.id} className="relative">
                        <ListingCard listing={listing} />
                        {listing.mode === 'rent' && (
                          <Button
                            size="sm"
                            className="absolute bottom-4 right-4 shadow-lg"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleQuickBook(listing);
                            }}
                          >
                            Quick Book
                          </Button>
                        )}
                        {distance !== null && (
                          <div className="absolute top-3 left-3 bg-background/90 backdrop-blur-sm px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                            <Navigation className="h-3 w-3" />
                            {distance < 1 ? '< 1' : Math.round(distance)} mi
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-16">
                  <SearchIcon className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-foreground mb-2">No results found</h3>
                  <p className="text-muted-foreground mb-6">
                    Try adjusting your search or filters to find what you're looking for.
                  </p>
                  <Button onClick={clearFilters} variant="outline">
                    Clear all filters
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Newsletter Section */}
        <NewsletterSection />
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
  onModeChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onLocationTextChange: (value: string) => void;
  onLocationSelect: (location: { name: string; coordinates: [number, number] } | null) => void;
  onRadiusChange: (radius: number) => void;
  onPriceRangeChange: (value: [number, number]) => void;
  onDateRangeChange: (range: DateRange | undefined) => void;
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
  onModeChange,
  onCategoryChange,
  onLocationTextChange,
  onLocationSelect,
  onRadiusChange,
  onPriceRangeChange,
  onDateRangeChange,
}: FilterContentProps) => {
  return (
    <>
      {/* Date Range Filter */}
      <DateRangeFilter
        dateRange={dateRange}
        onDateRangeChange={onDateRangeChange}
      />

      {/* Location Filter with Geocoding */}
      <div className="space-y-3">
        <Label className="text-sm font-medium flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          Location
        </Label>
        <LocationSearchInput
          value={locationText}
          onChange={onLocationTextChange}
          onLocationSelect={onLocationSelect}
          selectedCoordinates={locationCoords}
          placeholder="City, state, or zip code"
        />
      </div>

      {/* Radius Filter */}
      <RadiusFilter
        radius={searchRadius}
        onChange={onRadiusChange}
        disabled={!locationCoords}
      />

      {/* Type Filter */}
      <div className="space-y-3">
        <Label className="text-sm font-medium flex items-center gap-2">
          <Tag className="h-4 w-4" />
          Listing Type
        </Label>
        <div className="space-y-2">
          {[
            { value: 'all', label: 'All Types' },
            { value: 'rent', label: 'For Rent' },
            { value: 'sale', label: 'For Sale' },
          ].map((option) => (
            <label key={option.value} className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={mode === option.value}
                onCheckedChange={() => onModeChange(option.value)}
              />
              <span className="text-sm">{option.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Category Filter */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Category</Label>
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={category === 'all'}
              onCheckedChange={() => onCategoryChange('all')}
            />
            <span className="text-sm">All Categories</span>
          </label>
          {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={category === key}
                onCheckedChange={() => onCategoryChange(key)}
              />
              <span className="text-sm">{label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Price Range Filter */}
      <div className="space-y-3">
        <Label className="text-sm font-medium flex items-center gap-2">
          <DollarSign className="h-4 w-4" />
          Price Range
        </Label>
        <div className="px-2">
          <Slider
            value={priceRange}
            min={0}
            max={50000}
            step={100}
            onValueChange={(value) => onPriceRangeChange(value as [number, number])}
            className="my-4"
          />
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>${priceRange[0].toLocaleString()}</span>
            <span>${priceRange[1].toLocaleString()}</span>
          </div>
        </div>
      </div>
    </>
  );
};

export default Search;
