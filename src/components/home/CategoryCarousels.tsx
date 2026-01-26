import { useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import ListingCard from '@/components/listing/ListingCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, MapPin, Truck, Warehouse, Building2 } from 'lucide-react';
import { Database } from '@/integrations/supabase/types';

type ListingCategory = Database['public']['Enums']['listing_category'];

interface CategoryConfig {
  category: ListingCategory;
  title: string;
  icon: React.ReactNode;
  description: string;
}

const CATEGORIES: CategoryConfig[] = [
  {
    category: 'vendor_lot',
    title: 'Vendor Lots',
    icon: <MapPin className="h-5 w-5 text-white" />,
    description: 'Parking lots & prime spots available hourly, daily, or monthly for your food business',
  },
  {
    category: 'ghost_kitchen',
    title: 'Ghost Kitchens',
    icon: <Building2 className="h-5 w-5 text-white" />,
    description: 'Commercial kitchen spaces for delivery-only operations',
  },
  {
    category: 'food_trailer',
    title: 'Food Trailers',
    icon: <Warehouse className="h-5 w-5 text-white" />,
    description: 'Fully equipped trailers ready to roll',
  },
  {
    category: 'food_truck',
    title: 'Food Trucks',
    icon: <Truck className="h-5 w-5 text-white" />,
    description: 'Mobile kitchens for your culinary venture',
  },
];

interface CategoryCarouselProps {
  config: CategoryConfig;
  listings: any[];
  hostVerificationMap: Record<string, boolean>;
  isLoading: boolean;
}

const CategoryCarousel = ({ config, listings, hostVerificationMap, isLoading }: CategoryCarouselProps) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 320; // Card width + gap
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div>
            <Skeleton className="h-6 w-32 mb-1" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
        <div className="flex gap-4 overflow-hidden">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="min-w-[300px] space-y-3">
              <Skeleton className="h-48 w-full rounded-xl" />
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (listings.length === 0) {
    return null; // Don't render empty categories
  }

  return (
    <div className="mb-12">
      {/* Category Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-xl font-semibold text-foreground">{config.title}</h3>
          <p className="text-sm text-muted-foreground">{config.description}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-full"
            onClick={() => scroll('left')}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-full"
            onClick={() => scroll('right')}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="ml-2 text-primary"
            onClick={() => navigate(config.category === 'vendor_lot' ? '/vendor-lots' : `/search?category=${config.category}`)}
          >
            View all
          </Button>
        </div>
      </div>

      {/* Scrollable Carousel */}
      <div
        ref={scrollContainerRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {listings.map((listing) => (
          <div
            key={listing.id}
            className="min-w-[300px] max-w-[300px] flex-shrink-0"
            style={{ scrollSnapAlign: 'start' }}
          >
            <ListingCard
              listing={listing}
              hostVerified={hostVerificationMap[listing.host_id] ?? false}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

const CategoryCarousels = () => {
  // Fetch all published listings
  const { data: allListings = [], isLoading: isLoadingListings } = useQuery({
    queryKey: ['category-carousel-listings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .eq('status', 'published')
        .order('published_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Get unique host IDs
  const hostIds = [...new Set(allListings.map((l) => l.host_id).filter(Boolean))] as string[];

  // Fetch host verification status
  const { data: hostProfiles = [] } = useQuery({
    queryKey: ['category-carousel-hosts', hostIds],
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

  // Create verification map
  const hostVerificationMap: Record<string, boolean> = {};
  hostProfiles.forEach((profile) => {
    hostVerificationMap[profile.id] = profile.identity_verified ?? false;
  });

  // Group listings by category
  const listingsByCategory = CATEGORIES.reduce((acc, config) => {
    acc[config.category] = allListings.filter((l) => l.category === config.category);
    return acc;
  }, {} as Record<ListingCategory, typeof allListings>);

  // Check if any category has listings
  const hasAnyListings = CATEGORIES.some(
    (config) => listingsByCategory[config.category]?.length > 0
  );

  if (!hasAnyListings && !isLoadingListings) {
    return null;
  }

  return (
    <section className="py-16 bg-gradient-to-b from-background via-muted/10 to-background relative overflow-hidden">
      {/* Premium decorative elements */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-to-b from-primary/5 to-transparent rounded-full blur-3xl" aria-hidden="true" />
      
      <div className="container relative z-10">
        <div className="mb-10 text-center sm:text-left">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3 text-shadow-premium">
            Browse by <span className="gradient-text-warm">Category</span>
          </h2>
          <p className="text-muted-foreground text-lg">
            Explore listings across all categories
          </p>
        </div>

        {CATEGORIES.map((config) => (
          <CategoryCarousel
            key={config.category}
            config={config}
            listings={listingsByCategory[config.category] || []}
            hostVerificationMap={hostVerificationMap}
            isLoading={isLoadingListings}
          />
        ))}
      </div>
    </section>
  );
};

export default CategoryCarousels;
