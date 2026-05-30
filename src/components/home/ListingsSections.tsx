import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Truck, ChefHat, Caravan, Tags } from 'lucide-react';
import ListingCard from '@/components/listing/ListingCard';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { trackLeadEvent } from '@/lib/leadTracking';

type TabKey = 'rent' | 'sale' | 'trucks' | 'trailers';

const tabs: { key: TabKey; label: string; icon: typeof Truck }[] = [
  { key: 'rent', label: 'For Rent', icon: ChefHat },
  { key: 'sale', label: 'For Sale', icon: Tags },
  { key: 'trucks', label: 'Food Trucks', icon: Truck },
  { key: 'trailers', label: 'Food Trailers', icon: Caravan },
];

const BASE_CATEGORIES = ['food_truck', 'food_trailer'] as const;

const ListingsSections = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabKey>('rent');

  // For Rent — trucks + trailers, rent mode
  const { data: rentListings = [], isLoading: rentLoading } = useQuery({
    queryKey: ['home-rent-trucks-trailers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .eq('status', 'published')
        .eq('mode', 'rent')
        .in('category', BASE_CATEGORIES)
        .not('title', 'ilike', 'Demo%')
        .order('published_at', { ascending: false })
        .limit(12);
      if (error) throw error;
      return data;
    },
    staleTime: 60000,
  });

  // For Sale — trucks + trailers, sale mode
  const { data: saleListings = [], isLoading: saleLoading } = useQuery({
    queryKey: ['home-sale-trucks-trailers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .eq('status', 'published')
        .eq('mode', 'sale')
        .in('category', BASE_CATEGORIES)
        .not('title', 'ilike', 'Demo%')
        .order('published_at', { ascending: false })
        .limit(12);
      if (error) throw error;
      return data;
    },
    staleTime: 60000,
  });

  // Food Trucks — any mode
  const { data: truckListings = [], isLoading: trucksLoading } = useQuery({
    queryKey: ['home-trucks-any'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .eq('status', 'published')
        .eq('category', 'food_truck')
        .not('title', 'ilike', 'Demo%')
        .order('published_at', { ascending: false })
        .limit(12);
      if (error) throw error;
      return data;
    },
    staleTime: 60000,
  });

  // Food Trailers — any mode
  const { data: trailerListings = [], isLoading: trailersLoading } = useQuery({
    queryKey: ['home-trailers-any'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .eq('status', 'published')
        .eq('category', 'food_trailer')
        .not('title', 'ilike', 'Demo%')
        .order('published_at', { ascending: false })
        .limit(12);
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
    hostProfiles.forEach((profile) => {
      map[profile.id] = profile.identity_verified ?? false;
    });
    return map;
  }, [hostProfiles]);

  const isLoading = rentLoading || saleLoading || trucksLoading || trailersLoading;

  const activeListings =
    activeTab === 'rent'
      ? rentListings
      : activeTab === 'sale'
        ? saleListings
        : activeTab === 'trucks'
          ? truckListings
          : trailerListings;

  const viewAllPath =
    activeTab === 'rent'
      ? '/search?mode=rent&category=food_truck%2Cfood_trailer'
      : activeTab === 'sale'
        ? '/search?mode=sale&category=food_truck%2Cfood_trailer'
        : activeTab === 'trucks'
          ? '/search?category=food_truck'
          : '/search?category=food_trailer';

  const onCardClickCapture = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = (e.target as HTMLElement).closest('[data-listing-id]') as HTMLElement | null;
    const listingId = target?.getAttribute('data-listing-id') || undefined;
    trackLeadEvent('homepage_listing_card_click', {
      route: '/',
      source: 'home_recently_added',
      tab: activeTab,
      listing_id: listingId,
    });
  };

  if (isLoading) {
    return (
      <section className="py-8 bg-background">
        <div className="container">
          <Skeleton className="h-10 w-64 mx-auto mb-6" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="aspect-[4/3] w-full rounded-xl" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

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

      <div className="container px-4 sm:px-6 relative z-10">
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
            Recently Added Trucks &amp; Trailers
          </h2>
          <p className="text-muted-foreground text-sm">
            Real listings from verified owners across the US.
          </p>
        </motion.div>

        {/* Tab bar */}
        <div className="flex items-center justify-center flex-wrap gap-1 mb-8">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`relative flex items-center gap-2 px-3.5 sm:px-5 py-2.5 rounded-full text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? 'text-background'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              }`}
            >
              {activeTab === tab.key && (
                <motion.div
                  layoutId="active-tab"
                  className="absolute inset-0 bg-foreground rounded-full shadow-lg shadow-foreground/10"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
                />
              )}
              <span className="relative flex items-center gap-2">
                <tab.icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </span>
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
          >
            {activeListings.length > 0 ? (
              <>
                <div
                  onClickCapture={onCardClickCapture}
                  className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4"
                >
                  {activeListings.map((listing) => (
                    <ListingCard
                      key={listing.id}
                      listing={listing}
                      hostVerified={hostVerificationMap[listing.host_id] ?? false}
                      compact
                    />
                  ))}
                </div>
                <div className="flex justify-center mt-8">
                  <Button
                    variant="outline"
                    onClick={() => {
                      trackLeadEvent('homepage_browse_click', {
                        route: '/',
                        source: 'home_recently_added_view_all',
                        tab: activeTab,
                      });
                      navigate(viewAllPath);
                    }}
                    className="rounded-full px-8 border-border hover:border-foreground/20 hover:bg-foreground/5 text-foreground gap-2"
                  >
                    View All {tabs.find((t) => t.key === activeTab)?.label}
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center py-12 rounded-2xl border border-border/50 bg-card/30">
                <div className="text-4xl mb-3">🚚</div>
                <h3 className="text-lg font-semibold text-foreground mb-1">No listings yet</h3>
                <p className="text-sm text-muted-foreground mb-4">Be the first to list!</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/list')}
                  className="rounded-full"
                >
                  List Your Asset
                </Button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
};

export default ListingsSections;
