import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import ListingCard from '@/components/listing/ListingCard';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';
import { trackLeadEvent } from '@/lib/leadTracking';

type RowKey = 'rent' | 'sale' | 'trucks' | 'trailers';

const BASE_CATEGORIES = ['food_truck', 'food_trailer'] as const;
const ROW_LIMIT = 8;

const ROW_META: Record<RowKey, {
  title: string;
  subtitle: string;
  viewMorePath: string;
  viewMoreEvent: string;
}> = {
  rent: {
    title: 'Recently Added for Rent',
    subtitle: 'New rental listings from verified owners.',
    viewMorePath: '/search?mode=rent&category=food_truck%2Cfood_trailer&utm_source=homepage&utm_medium=listing_row&utm_campaign=homepage_browse&utm_content=recent_for_rent_view_more',
    viewMoreEvent: 'homepage_recent_for_rent_view_more_clicked',
  },
  sale: {
    title: 'Recently Added for Sale',
    subtitle: 'Browse food trucks and trailers available to buy.',
    viewMorePath: '/search?mode=sale&category=food_truck%2Cfood_trailer&utm_source=homepage&utm_medium=listing_row&utm_campaign=homepage_browse&utm_content=recent_for_sale_view_more',
    viewMoreEvent: 'homepage_recent_for_sale_view_more_clicked',
  },
  trucks: {
    title: 'Food Trucks',
    subtitle: 'Explore mobile kitchens ready for rent or purchase.',
    viewMorePath: '/search?category=food_truck&utm_source=homepage&utm_medium=listing_row&utm_campaign=homepage_browse&utm_content=food_trucks_view_more',
    viewMoreEvent: 'homepage_food_trucks_view_more_clicked',
  },
  trailers: {
    title: 'Food Trailers',
    subtitle: 'Find concession trailers, mobile kitchens, and specialty trailers.',
    viewMorePath: '/search?category=food_trailer&utm_source=homepage&utm_medium=listing_row&utm_campaign=homepage_browse&utm_content=food_trailers_view_more',
    viewMoreEvent: 'homepage_food_trailers_view_more_clicked',
  },
};

const ListingsSections = () => {
  const navigate = useNavigate();

  const { data: rentListings = [], isLoading: rentLoading } = useQuery({
    queryKey: ['home-row-rent'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .eq('status', 'published')
        .eq('mode', 'rent')
        .in('category', BASE_CATEGORIES)
        .not('title', 'ilike', 'Demo%')
        .order('published_at', { ascending: false })
        .limit(ROW_LIMIT);
      if (error) throw error;
      return data;
    },
    staleTime: 60000,
  });

  const { data: saleListings = [], isLoading: saleLoading } = useQuery({
    queryKey: ['home-row-sale'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .eq('status', 'published')
        .eq('mode', 'sale')
        .in('category', BASE_CATEGORIES)
        .not('title', 'ilike', 'Demo%')
        .order('published_at', { ascending: false })
        .limit(ROW_LIMIT);
      if (error) throw error;
      return data;
    },
    staleTime: 60000,
  });

  const { data: truckListings = [], isLoading: trucksLoading } = useQuery({
    queryKey: ['home-row-trucks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .eq('status', 'published')
        .eq('category', 'food_truck')
        .not('title', 'ilike', 'Demo%')
        .order('published_at', { ascending: false })
        .limit(ROW_LIMIT);
      if (error) throw error;
      return data;
    },
    staleTime: 60000,
  });

  const { data: trailerListings = [], isLoading: trailersLoading } = useQuery({
    queryKey: ['home-row-trailers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .eq('status', 'published')
        .eq('category', 'food_trailer')
        .not('title', 'ilike', 'Demo%')
        .order('published_at', { ascending: false })
        .limit(ROW_LIMIT);
      if (error) throw error;
      return data;
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

  const { data: hostProfiles = [] } = useQuery({
    queryKey: ['home-host-profiles', hostIds],
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

  const hostVerificationMap = useMemo(() => {
    const map: Record<string, boolean> = {};
    hostProfiles.forEach((p) => {
      map[p.id] = p.identity_verified ?? false;
    });
    return map;
  }, [hostProfiles]);

  const isLoading = rentLoading || saleLoading || trucksLoading || trailersLoading;

  const rows: { key: RowKey; listings: typeof rentListings }[] = [
    { key: 'rent', listings: rentListings },
    { key: 'sale', listings: saleListings },
    { key: 'trucks', listings: truckListings },
    { key: 'trailers', listings: trailerListings },
  ];

  const visibleRows = rows.filter((r) => r.listings.length > 0);

  const handleViewMore = (key: RowKey) => {
    const meta = ROW_META[key];
    trackLeadEvent(meta.viewMoreEvent, {
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
    trackLeadEvent('homepage_listing_card_clicked', {
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
                  <button
                    type="button"
                    onClick={() => handleViewMore(key)}
                    className="flex-shrink-0 inline-flex items-center gap-1 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                  >
                    View more
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div
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
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ListingsSections;
