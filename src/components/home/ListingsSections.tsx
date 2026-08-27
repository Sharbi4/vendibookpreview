import { excludeTestListings } from '@/lib/excludeTestListings';
import { useMemo, useRef, useState, useCallback, useEffect } from 'react';
import { filterPubliclyVisible } from '@/lib/listings/publicVisibility';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import ListingCard from '@/components/listing/ListingCard';
import { supabase } from '@/integrations/supabase/client';
import { useSellerVerifiedMap } from '@/hooks/useSellerIdentityBadgeMap';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';
import { trackLeadEvent } from '@/lib/leadTracking';
import { isListingFeatured, sortNewFirstThenFeatured } from '@/lib/featured';

// Brand-new listings (published in the last 48h) lead the row, then
// featured-first with fair daily rotation (see src/lib/featured.ts).
const sortFeaturedFirst = <T extends { id: string; published_at?: string | null; featured_enabled?: boolean | null; featured_expires_at?: string | null }>(
  items: T[],
): T[] => sortNewFirstThenFeatured(items as any) as T[];


type RowKey = 'rent' | 'sale' | 'trucks' | 'trailers';

const BASE_CATEGORIES = ['food_truck', 'food_trailer'] as const;
const RENT_CATEGORIES = ['food_truck', 'food_trailer', 'ghost_kitchen'] as const;
const ROW_LIMIT = 8;

const ROW_META: Record<RowKey, {
  title: string;
  subtitle: string;
  viewMorePath: string;
}> = {
  rent: {
    title: 'Recently Added for Rent',
    subtitle: 'Food trucks, trailers, and shared commercial kitchens listed by owners and sellers.',
    viewMorePath: '/search?mode=rent&utm_source=homepage&utm_medium=listing_row&utm_campaign=homepage_browse&utm_content=recent_for_rent_view_more',
  },
  sale: {
    title: 'Recently Added for Sale',
    subtitle: 'Browse food trucks and trailers available to buy.',
    viewMorePath: '/search?mode=sale&category=food_truck%2Cfood_trailer&utm_source=homepage&utm_medium=listing_row&utm_campaign=homepage_browse&utm_content=recent_for_sale_view_more',
  },
  trucks: {
    title: 'Food Trucks',
    subtitle: 'Explore mobile kitchens ready for rent or purchase.',
    viewMorePath: '/search?category=food_truck&utm_source=homepage&utm_medium=listing_row&utm_campaign=homepage_browse&utm_content=food_trucks_view_more',
  },
  trailers: {
    title: 'Food Trailers',
    subtitle: 'Find concession trailers, mobile kitchens, and specialty trailers.',
    viewMorePath: '/search?category=food_trailer&utm_source=homepage&utm_medium=listing_row&utm_campaign=homepage_browse&utm_content=food_trailers_view_more',
  },
};

const ListingsSections = () => {
  const navigate = useNavigate();

  const { data: rentListings = [], isLoading: rentLoading } = useQuery({
    queryKey: ['home-row-rent-v2'],
    queryFn: async () => {
      const { data, error } = await excludeTestListings(
        supabase
          .from('listings')
          .select('*')
          .eq('status', 'published').not('published_at', 'is', null).is('deleted_at', null).eq('moderation_status', 'clear')
          .eq('mode', 'rent')
          .in('category', RENT_CATEGORIES)
      )
        .order('published_at', { ascending: false })
        .limit(ROW_LIMIT);
      if (error) throw error;
      return filterPubliclyVisible(data ?? []);
    },
    staleTime: 60000,
  });

  const { data: saleListings = [], isLoading: saleLoading } = useQuery({
    queryKey: ['home-row-sale-v2'],
    queryFn: async () => {
      const { data, error } = await excludeTestListings(
        supabase
          .from('listings')
          .select('*')
          .eq('status', 'published').not('published_at', 'is', null).is('deleted_at', null).eq('moderation_status', 'clear')
          .eq('mode', 'sale')
          .in('category', BASE_CATEGORIES)
      )
        .order('published_at', { ascending: false })
        .limit(ROW_LIMIT);
      if (error) throw error;
      return filterPubliclyVisible(data ?? []);
    },
    staleTime: 60000,
  });

  const { data: truckListings = [], isLoading: trucksLoading } = useQuery({
    queryKey: ['home-row-trucks-v2'],
    queryFn: async () => {
      const { data, error } = await excludeTestListings(
        supabase
          .from('listings')
          .select('*')
          .eq('status', 'published').not('published_at', 'is', null).is('deleted_at', null).eq('moderation_status', 'clear')
          .eq('category', 'food_truck')
      )
        .order('published_at', { ascending: false })
        .limit(ROW_LIMIT);
      if (error) throw error;
      return filterPubliclyVisible(data ?? []);
    },
    staleTime: 60000,
  });

  const { data: trailerListings = [], isLoading: trailersLoading } = useQuery({
    queryKey: ['home-row-trailers-v2'],
    queryFn: async () => {
      const { data, error } = await excludeTestListings(
        supabase
          .from('listings')
          .select('*')
          .eq('status', 'published').not('published_at', 'is', null).is('deleted_at', null).eq('moderation_status', 'clear')
          .eq('category', 'food_trailer')
      )
        .order('published_at', { ascending: false })
        .limit(ROW_LIMIT);
      if (error) throw error;
      return filterPubliclyVisible(data ?? []);
    },
    staleTime: 60000,
  });

  const allListings = useMemo(
    () => [...rentListings, ...saleListings, ...truckListings, ...trailerListings],
    [rentListings, saleListings, truckListings, trailerListings],
  );

  const hostIds = useMemo(() => {
    const ids = allListings.map((l) => l.host_id).filter(Boolean);
    return [...new Set(ids)] as string[];
  }, [allListings]);

  /**
   * Authoritative paid Identity Verified badges, batched. The legacy
   * profiles.identity_verified column is history, not a badge source.
   */
  const hostVerificationMap = useSellerVerifiedMap(hostIds);


  const isLoading = rentLoading || saleLoading || trucksLoading || trailersLoading;

  const rows: { key: RowKey; listings: typeof rentListings }[] = [
    { key: 'rent', listings: sortFeaturedFirst(rentListings) },
    { key: 'sale', listings: sortFeaturedFirst(saleListings) },
    { key: 'trucks', listings: sortFeaturedFirst(truckListings) },
    { key: 'trailers', listings: sortFeaturedFirst(trailerListings) },
  ];

  const visibleRows = rows.filter((r) => r.listings.length > 0);

  const scrollRefs = useRef<Record<RowKey, HTMLDivElement | null>>({
    rent: null,
    sale: null,
    trucks: null,
    trailers: null,
  });

  const [scrollState, setScrollState] = useState<Record<RowKey, { canLeft: boolean; canRight: boolean }>>({
    rent: { canLeft: false, canRight: true },
    sale: { canLeft: false, canRight: true },
    trucks: { canLeft: false, canRight: true },
    trailers: { canLeft: false, canRight: true },
  });

  const updateScrollState = useCallback((key: RowKey) => {
    const el = scrollRefs.current[key];
    if (!el) return;
    const canLeft = el.scrollLeft > 2;
    const canRight = el.scrollLeft + el.clientWidth < el.scrollWidth - 2;
    setScrollState((prev) => {
      if (prev[key].canLeft === canLeft && prev[key].canRight === canRight) return prev;
      return { ...prev, [key]: { canLeft, canRight } };
    });
  }, []);

  const scrollRow = useCallback((key: RowKey, direction: 'left' | 'right') => {
    const el = scrollRefs.current[key];
    if (!el) return;
    const scrollAmount = el.clientWidth * 0.75;
    el.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
    setTimeout(() => updateScrollState(key), 350);
  }, [updateScrollState]);

  useEffect(() => {
    visibleRows.forEach(({ key }) => updateScrollState(key));
  }, [visibleRows, updateScrollState]);

  const handleViewMore = (key: RowKey) => {
    const meta = ROW_META[key];
    trackLeadEvent('homepage_listing_row_view_more_click', {
      route: '/',
      source: 'home_listing_row_view_more',
      row_name: key,
      destination_url: meta.viewMorePath,
    });
    navigate(meta.viewMorePath);
  };

  const handleCardClickCapture = (rowKey: RowKey) => (e: React.MouseEvent<HTMLDivElement>) => {
    const target = (e.target as HTMLElement).closest('[data-listing-id]') as HTMLElement | null;
    if (!target) return;
    const listingId = target.getAttribute('data-listing-id') || undefined;
    const positionAttr = target.getAttribute('data-position') || undefined;
    trackLeadEvent('homepage_listing_card_click', {
      route: '/',
      source: 'home_listing_row',
      row_name: rowKey,
      listing_id: listingId,
      position_in_row: positionAttr ? Number(positionAttr) : undefined,
    });
  };

  if (isLoading) {
    return (
      <section className="py-10 sm:py-14 bg-background">
        <div className="container px-4 sm:px-6 space-y-10">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-6 w-56" />
              <div className="flex gap-3 overflow-hidden">
                {[...Array(4)].map((_, j) => (
                  <Skeleton key={j} className="h-56 w-[70%] sm:w-[42%] lg:w-[28%] flex-shrink-0 rounded-xl" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (visibleRows.length === 0) return null;

  return (
    <section className="py-10 sm:py-16 relative overflow-hidden bg-background">
      <div
        className="absolute top-0 right-0 w-[500px] h-[400px] bg-foreground/[0.03] rounded-full blur-[100px]"
        aria-hidden="true"
      />
      <div
        className="absolute bottom-0 left-0 w-[400px] h-[300px] bg-foreground/[0.02] rounded-full blur-[80px]"
        aria-hidden="true"
      />

      <div className="relative z-10">
        <div className="container px-4 sm:px-6">
          <motion.div
            className="mb-8 sm:mb-10"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
              Explore Recent Listings
            </h2>
            <p className="text-muted-foreground text-sm">
              Browse food trucks and trailers by rental, sale, and asset type.
            </p>
          </motion.div>
        </div>

        <div className="space-y-10 sm:space-y-14 pb-28 sm:pb-12">
          {visibleRows.map(({ key, listings }) => {
            const meta = ROW_META[key];
            const state = scrollState[key];
            return (
              <div key={key}>
                <div className="container px-4 sm:px-6 flex items-end justify-between gap-3 mb-3 sm:mb-4">
                  <div className="min-w-0">
                    <h3 className="text-lg sm:text-xl font-semibold text-foreground truncate">
                      {meta.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-muted-foreground truncate">
                      {meta.subtitle}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Desktop arrow buttons */}
                    <button
                      type="button"
                      aria-label={`Scroll ${meta.title} left`}
                      onClick={() => scrollRow(key, 'left')}
                      className={`hidden md:inline-flex items-center justify-center w-8 h-8 rounded-full border border-border/70 bg-card/60 hover:bg-card transition-colors ${
                        state.canLeft ? 'opacity-100 cursor-pointer' : 'opacity-40 cursor-default'
                      }`}
                      disabled={!state.canLeft}
                    >
                      <ChevronLeft className="w-4 h-4 text-foreground" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Scroll ${meta.title} right`}
                      onClick={() => scrollRow(key, 'right')}
                      className={`hidden md:inline-flex items-center justify-center w-8 h-8 rounded-full border border-border/70 bg-card/60 hover:bg-card transition-colors ${
                        state.canRight ? 'opacity-100 cursor-pointer' : 'opacity-40 cursor-default'
                      }`}
                      disabled={!state.canRight}
                    >
                      <ChevronRight className="w-4 h-4 text-foreground" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleViewMore(key)}
                      className="flex-shrink-0 inline-flex items-center gap-1 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                    >
                      View more
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <div
                    ref={(el) => { scrollRefs.current[key] = el; }}
                    onScroll={() => updateScrollState(key)}
                    onClickCapture={handleCardClickCapture(key)}
                    className="flex gap-3 sm:gap-4 overflow-x-auto snap-x snap-mandatory scroll-px-4 sm:scroll-px-6 px-4 sm:px-6 pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                  >
                    {listings.map((listing, index) => (
                      <div
                        key={listing.id}
                        data-position={index}
                        className="snap-start flex-shrink-0 w-[72%] sm:w-[42%] md:w-[32%] lg:w-[24%] xl:w-[22%]"
                      >
                        <ListingCard
                          listing={listing}
                          hostVerified={hostVerificationMap[listing.host_id] ?? false}
                          compact
                        />
                      </div>
                    ))}
                    {/* Trailing View more card */}
                    <button
                      type="button"
                      onClick={() => handleViewMore(key)}
                      className="snap-start flex-shrink-0 w-[40%] sm:w-[24%] md:w-[20%] lg:w-[16%] rounded-xl border border-border/60 bg-card/40 hover:bg-card/70 hover:border-foreground/20 transition-colors flex flex-col items-center justify-center text-center gap-2 p-4 min-h-[180px]"
                    >
                      <ArrowRight className="w-5 h-5 text-primary" />
                      <span className="text-sm font-medium text-foreground">View more</span>
                      <span className="text-xs text-muted-foreground">{meta.title}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ListingsSections;
