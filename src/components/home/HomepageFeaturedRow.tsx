import { excludeTestListings } from '@/lib/excludeTestListings';
import { useQuery } from '@tanstack/react-query';
import { useRef, useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ArrowRight, Crown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import ListingCard from '@/components/listing/ListingCard';
import { Skeleton } from '@/components/ui/skeleton';
import { isListingFeatured, sortFeaturedFirstFair } from '@/lib/featured';
import { filterPubliclyVisible } from '@/lib/listings/publicVisibility';
import { trackLeadEvent } from '@/lib/leadTracking';

const FEATURED_LIMIT = 12;

/**
 * Homepage "Featured Listings" row.
 *
 * - Renders active featured listings (paid OR complimentary; behavior is identical).
 * - Hidden entirely if there are no active featured listings.
 * - Renders cleanly with 1–N items without empty filler.
 */
const HomepageFeaturedRow = () => {
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [scrollState, setScrollState] = useState({ canLeft: false, canRight: true });

  const { data: listings = [], isLoading } = useQuery({
    queryKey: ['homepage-featured-row-v2'],
    queryFn: async () => {
      const nowIso = new Date().toISOString();
      const { data, error } = await excludeTestListings(
        supabase
          .from('listings')
          .select('*')
          .eq('status', 'published').not('published_at', 'is', null).is('deleted_at', null).eq('moderation_status', 'clear')
          .eq('featured_enabled', true)
          .gt('featured_expires_at', nowIso)
      )
        .order('featured_at', { ascending: false })
        .limit(FEATURED_LIMIT);
      if (error) throw error;
      // Defensive: re-check with helper, then rotate fairly among the featured cohort.
      return sortFeaturedFirstFair(
        filterPubliclyVisible(data ?? []).filter((l) => isListingFeatured(l as any)) as any,
      );
    },
    staleTime: 15000,
    refetchOnWindowFocus: true,
  });

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const canLeft = el.scrollLeft > 2;
    const canRight = el.scrollLeft + el.clientWidth < el.scrollWidth - 2;
    setScrollState((prev) =>
      prev.canLeft === canLeft && prev.canRight === canRight ? prev : { canLeft, canRight },
    );
  }, []);

  const scrollBy = useCallback((dir: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.75;
    el.scrollBy({ left: dir === 'left' ? -amount : amount, behavior: 'smooth' });
    setTimeout(updateScrollState, 350);
  }, [updateScrollState]);

  useEffect(() => {
    updateScrollState();
  }, [listings, updateScrollState]);

  // Loading state — keep it tight and similar to ListingsSections
  if (isLoading) {
    return (
      <section className="py-10 sm:py-12 bg-background">
        <div className="container px-4 sm:px-6">
          <Skeleton className="h-6 w-56 mb-4" />
          <div className="flex gap-3 overflow-hidden">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-64 w-[72%] sm:w-[42%] md:w-[28%] flex-shrink-0 rounded-xl" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  // Hide gracefully when there are no active featured listings
  if (!listings.length) return null;

  const handleViewAll = () => {
    trackLeadEvent('homepage_featured_view_all_click', {
      route: '/',
      source: 'home_featured_row',
    });
    navigate('/search?featured=1&utm_source=homepage&utm_medium=featured_row&utm_campaign=featured_view_all');
  };

  return (
    <section
      className="relative py-10 sm:py-14 overflow-hidden"
      aria-labelledby="homepage-featured-heading"
    >
      {/* Warm premium glow accents */}
      <div
        className="pointer-events-none absolute top-0 right-0 w-[500px] h-[400px] bg-amber-500/[0.04] rounded-full blur-[120px]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute bottom-0 left-0 w-[400px] h-[300px] bg-amber-400/[0.03] rounded-full blur-[100px]"
        aria-hidden="true"
      />

      <div className="container px-4 sm:px-6 flex items-end justify-between gap-3 mb-4 sm:mb-6 relative">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-400/90 mb-1 flex items-center gap-1.5">
            <Crown className="h-3.5 w-3.5" />
            Premium
          </p>
          <h2 id="homepage-featured-heading" className="text-2xl sm:text-3xl font-bold text-foreground">
            Featured Listings
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Hand-picked food trucks & trailers getting top placement this week.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            aria-label="Scroll featured listings left"
            onClick={() => scrollBy('left')}
            disabled={!scrollState.canLeft}
            className={`hidden md:inline-flex items-center justify-center w-8 h-8 rounded-full border border-border/70 bg-card/60 hover:bg-card transition-colors ${
              scrollState.canLeft ? 'opacity-100 cursor-pointer' : 'opacity-40 cursor-default'
            }`}
          >
            <ChevronLeft className="w-4 h-4 text-foreground" />
          </button>
          <button
            type="button"
            aria-label="Scroll featured listings right"
            onClick={() => scrollBy('right')}
            disabled={!scrollState.canRight}
            className={`hidden md:inline-flex items-center justify-center w-8 h-8 rounded-full border border-border/70 bg-card/60 hover:bg-card transition-colors ${
              scrollState.canRight ? 'opacity-100 cursor-pointer' : 'opacity-40 cursor-default'
            }`}
          >
            <ChevronRight className="w-4 h-4 text-foreground" />
          </button>
          <button
            type="button"
            onClick={handleViewAll}
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
          >
            View all
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="relative">
        <div
          ref={scrollRef}
          onScroll={updateScrollState}
          className="flex gap-3 sm:gap-4 overflow-x-auto snap-x snap-mandatory scroll-px-4 sm:scroll-px-6 px-4 sm:px-6 pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        >
          {listings.map((listing) => (
            <div
              key={listing.id}
              data-listing-id={listing.id}
              className="snap-start flex-shrink-0 w-[72%] sm:w-[42%] md:w-[32%] lg:w-[24%] xl:w-[22%]"
            >
              <ListingCard listing={listing as any} compact />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HomepageFeaturedRow;
