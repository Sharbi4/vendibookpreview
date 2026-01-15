import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import ListingCard from '@/components/listing/ListingCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import SEO from '@/components/SEO';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  MapPin,
  Filter,
  Clock,
  DollarSign,
  LayoutGrid,
  List,
  X,
  Truck,
  Calendar,
  Star,
} from 'lucide-react';

type RentalDuration = 'all' | 'hourly' | 'daily' | 'weekly' | 'monthly';
type SortOption = 'newest' | 'price-low' | 'price-high' | 'rating';

const RENTAL_DURATIONS = [
  { value: 'all', label: 'All Durations', icon: Clock },
  { value: 'hourly', label: 'Hourly', icon: Clock },
  { value: 'daily', label: 'Daily', icon: Calendar },
  { value: 'weekly', label: 'Weekly', icon: Calendar },
  { value: 'monthly', label: 'Monthly', icon: Calendar },
];

const VendorLots = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [rentalDuration, setRentalDuration] = useState<RentalDuration>(
    (searchParams.get('duration') as RentalDuration) || 'all'
  );
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000]);
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [locationFilter, setLocationFilter] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Fetch vendor lot listings
  const { data: listings = [], isLoading } = useQuery({
    queryKey: ['vendor-lot-listings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .eq('status', 'published')
        .eq('category', 'vendor_lot')
        .order('published_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Get unique host IDs
  const hostIds = [...new Set(listings.map((l) => l.host_id).filter(Boolean))] as string[];

  // Fetch host verification status
  const { data: hostProfiles = [] } = useQuery({
    queryKey: ['vendor-lot-hosts', hostIds],
    queryFn: async () => {
      if (hostIds.length === 0) return [];
      const { data, error } = await supabase
        .from('profiles')
        .select('id, identity_verified')
        .in('id', hostIds);
      if (error) throw error;
      return data;
    },
    enabled: hostIds.length > 0,
  });

  // Fetch reviews for ratings
  const { data: reviews = [] } = useQuery({
    queryKey: ['vendor-lot-reviews', listings.map(l => l.id)],
    queryFn: async () => {
      if (listings.length === 0) return [];
      const { data, error } = await supabase
        .from('reviews')
        .select('listing_id, rating')
        .in('listing_id', listings.map(l => l.id));
      if (error) throw error;
      return data;
    },
    enabled: listings.length > 0,
  });

  // Create verification map
  const hostVerificationMap: Record<string, boolean> = {};
  hostProfiles.forEach((profile) => {
    hostVerificationMap[profile.id] = profile.identity_verified ?? false;
  });

  // Create rating map
  const ratingMap = useMemo(() => {
    const map: Record<string, { avg: number; count: number }> = {};
    reviews.forEach((review) => {
      if (!map[review.listing_id]) {
        map[review.listing_id] = { avg: 0, count: 0 };
      }
      const current = map[review.listing_id];
      current.avg = (current.avg * current.count + review.rating) / (current.count + 1);
      current.count += 1;
    });
    return map;
  }, [reviews]);

  // Filter and sort listings
  const filteredListings = useMemo(() => {
    let result = [...listings];

    // Filter by rental duration (based on pricing availability)
    if (rentalDuration !== 'all') {
      result = result.filter((listing) => {
        if (rentalDuration === 'hourly') {
          // Hourly would typically have low daily rates or specific hourly indicator
          return listing.price_daily && listing.price_daily <= 100;
        }
        if (rentalDuration === 'daily') {
          return listing.price_daily != null;
        }
        if (rentalDuration === 'weekly') {
          return listing.price_weekly != null;
        }
        if (rentalDuration === 'monthly') {
          // Monthly would be indicated by weekly price or longer availability
          return listing.price_weekly != null;
        }
        return true;
      });
    }

    // Filter by price range
    result = result.filter((listing) => {
      const price = listing.price_daily || listing.price_weekly || 0;
      return price >= priceRange[0] && price <= priceRange[1];
    });

    // Filter by location
    if (locationFilter.trim()) {
      const search = locationFilter.toLowerCase();
      result = result.filter((listing) =>
        listing.address?.toLowerCase().includes(search) ||
        listing.title?.toLowerCase().includes(search)
      );
    }

    // Sort
    if (sortBy === 'newest') {
      result.sort((a, b) => 
        new Date(b.published_at || b.created_at).getTime() - 
        new Date(a.published_at || a.created_at).getTime()
      );
    } else if (sortBy === 'price-low') {
      result.sort((a, b) => (a.price_daily || 0) - (b.price_daily || 0));
    } else if (sortBy === 'price-high') {
      result.sort((a, b) => (b.price_daily || 0) - (a.price_daily || 0));
    } else if (sortBy === 'rating') {
      result.sort((a, b) => {
        const ratingA = ratingMap[a.id]?.avg || 0;
        const ratingB = ratingMap[b.id]?.avg || 0;
        return ratingB - ratingA;
      });
    }

    return result;
  }, [listings, rentalDuration, priceRange, locationFilter, sortBy, ratingMap]);

  const activeFiltersCount = [
    rentalDuration !== 'all',
    priceRange[0] > 0 || priceRange[1] < 1000,
    locationFilter.trim() !== '',
  ].filter(Boolean).length;

  const clearFilters = () => {
    setRentalDuration('all');
    setPriceRange([0, 1000]);
    setLocationFilter('');
  };

  const FilterContent = () => (
    <div className="space-y-6">
      {/* Rental Duration */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Rental Duration</Label>
        <div className="grid grid-cols-2 gap-2">
          {RENTAL_DURATIONS.map((duration) => (
            <Button
              key={duration.value}
              variant={rentalDuration === duration.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setRentalDuration(duration.value as RentalDuration)}
              className="justify-start"
            >
              <duration.icon className="h-4 w-4 mr-2" />
              {duration.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Price Range */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Price Range (per day)</Label>
          <span className="text-sm text-muted-foreground">
            ${priceRange[0]} - ${priceRange[1]}+
          </span>
        </div>
        <Slider
          value={priceRange}
          onValueChange={(value) => setPriceRange(value as [number, number])}
          min={0}
          max={1000}
          step={25}
          className="mt-2"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>$0</span>
          <span>$500</span>
          <span>$1000+</span>
        </div>
      </div>

      {/* Location Filter */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Location</Label>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by city or address..."
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Clear Filters */}
      {activeFiltersCount > 0 && (
        <Button variant="ghost" onClick={clearFilters} className="w-full">
          <X className="h-4 w-4 mr-2" />
          Clear All Filters
        </Button>
      )}
    </div>
  );

  return (
    <>
      <SEO
        title="Vendor Lots for Rent | Vendibook"
        description="Find parking lots and prime spots available hourly, daily, or monthly for your food truck or vendor business. Secure your perfect location today."
      />
      <div className="min-h-screen flex flex-col bg-background">
        <Header />

        <main className="flex-1">
          {/* Hero Section */}
          <section className="bg-gradient-to-br from-primary/10 via-background to-secondary/20 py-12 md:py-16">
            <div className="container">
              <div className="max-w-3xl">
                <Badge className="mb-4 bg-primary/20 text-primary border-primary/30">
                  <MapPin className="h-3 w-3 mr-1" />
                  Vendor Lots
                </Badge>
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
                  Find Your Perfect Spot
                </h1>
                <p className="text-lg text-muted-foreground mb-6">
                  Parking lots & prime spots available hourly, daily, or monthly for your food business. 
                  Connect with property owners and secure high-traffic locations.
                </p>
                <div className="flex flex-wrap gap-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4 text-primary" />
                    Flexible Duration
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Truck className="h-4 w-4 text-primary" />
                    Perfect for Food Trucks
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <DollarSign className="h-4 w-4 text-primary" />
                    Competitive Rates
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Filters & Listings */}
          <section className="py-8">
            <div className="container">
              {/* Toolbar */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-2">
                  <p className="text-muted-foreground">
                    <span className="font-semibold text-foreground">{filteredListings.length}</span>{' '}
                    vendor lot{filteredListings.length !== 1 ? 's' : ''} available
                  </p>
                  {activeFiltersCount > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {activeFiltersCount} filter{activeFiltersCount !== 1 ? 's' : ''} active
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  {/* Mobile Filter Button */}
                  <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                    <SheetTrigger asChild>
                      <Button variant="outline" className="lg:hidden">
                        <Filter className="h-4 w-4 mr-2" />
                        Filters
                        {activeFiltersCount > 0 && (
                          <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 flex items-center justify-center">
                            {activeFiltersCount}
                          </Badge>
                        )}
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="w-[300px] sm:w-[400px]">
                      <SheetHeader>
                        <SheetTitle>Filters</SheetTitle>
                        <SheetDescription>
                          Narrow down vendor lots by your preferences
                        </SheetDescription>
                      </SheetHeader>
                      <div className="mt-6">
                        <FilterContent />
                      </div>
                    </SheetContent>
                  </Sheet>

                  {/* Sort */}
                  <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newest">Newest First</SelectItem>
                      <SelectItem value="price-low">Price: Low to High</SelectItem>
                      <SelectItem value="price-high">Price: High to Low</SelectItem>
                      <SelectItem value="rating">Top Rated</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* View Toggle */}
                  <div className="hidden sm:flex items-center border border-border rounded-lg overflow-hidden">
                    <Button
                      variant={viewMode === 'grid' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('grid')}
                      className="rounded-none"
                    >
                      <LayoutGrid className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={viewMode === 'list' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('list')}
                      className="rounded-none"
                    >
                      <List className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Main Content */}
              <div className="flex gap-8">
                {/* Desktop Sidebar Filters */}
                <aside className="hidden lg:block w-64 flex-shrink-0">
                  <div className="sticky top-24 bg-card border border-border rounded-xl p-5">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <Filter className="h-4 w-4" />
                      Filters
                    </h3>
                    <FilterContent />
                  </div>
                </aside>

                {/* Listings Grid */}
                <div className="flex-1">
                  {isLoading ? (
                    <div className={`grid gap-6 ${viewMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3' : 'grid-cols-1'}`}>
                      {[...Array(6)].map((_, i) => (
                        <div key={i} className="space-y-3">
                          <Skeleton className="h-48 w-full rounded-xl" />
                          <Skeleton className="h-5 w-3/4" />
                          <Skeleton className="h-4 w-1/2" />
                        </div>
                      ))}
                    </div>
                  ) : filteredListings.length > 0 ? (
                    <div className={`grid gap-6 ${viewMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3' : 'grid-cols-1'}`}>
                      {filteredListings.map((listing) => (
                        <ListingCard
                          key={listing.id}
                          listing={listing}
                          hostVerified={hostVerificationMap[listing.host_id] ?? false}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-16 bg-secondary/30 rounded-2xl">
                      <div className="text-5xl mb-4">🏞️</div>
                      <h3 className="text-xl font-semibold text-foreground mb-2">
                        No Vendor Lots Found
                      </h3>
                      <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                        No vendor lots match your current filters. Try adjusting your criteria or check back later for new listings.
                      </p>
                      <Button onClick={clearFilters} variant="outline">
                        Clear All Filters
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* CTA Section */}
          <section className="py-12 bg-primary/5">
            <div className="container">
              <div className="text-center max-w-2xl mx-auto">
                <h2 className="text-2xl font-bold mb-4">Own a Lot?</h2>
                <p className="text-muted-foreground mb-6">
                  Turn your parking lot or unused space into a revenue stream. 
                  List it on Vendibook and connect with food vendors looking for prime locations.
                </p>
                <Button size="lg" asChild>
                  <a href="/create-listing">List Your Lot</a>
                </Button>
              </div>
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default VendorLots;
