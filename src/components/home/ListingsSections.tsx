import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Truck, ChefHat, MapPin, Store } from 'lucide-react';
import ListingCard from '@/components/listing/ListingCard';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

type TabKey = 'sale' | 'rent' | 'vendor';

const tabs: { key: TabKey; label: string; icon: typeof Truck }[] = [
  { key: 'sale', label: 'For Sale', icon: Truck },
  { key: 'rent', label: 'For Rent', icon: ChefHat },
  { key: 'vendor', label: 'Vendor Spaces', icon: MapPin },
];

const ListingsSections = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabKey>('sale');

  // Fetch rental listings
  const { data: rentListings = [], isLoading: rentLoading } = useQuery({
    queryKey: ['home-rent-listings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .eq('status', 'published')
        .eq('mode', 'rent')
        .neq('category', 'vendor_space')
        .not('title', 'ilike', 'Demo%')
        .order('published_at', { ascending: false })
        .limit(6);
      if (error) throw error;
      return data;
    },
    staleTime: 60000,
  });

  // Fetch sale listings
  const { data: saleListings = [], isLoading: saleLoading } = useQuery({
    queryKey: ['home-sale-listings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .eq('status', 'published')
        .eq('mode', 'sale')
        .not('title', 'ilike', 'Demo%')
        .order('published_at', { ascending: false })
        .limit(6);
      if (error) throw error;
      return data;
    },
    staleTime: 60000,
  });

  // Fetch vendor space listings
  const { data: vendorSpaceListings = [], isLoading: vendorLoading } = useQuery({
    queryKey: ['home-vendor-listings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .eq('status', 'published')
        .or('category.eq.vendor_space,category.eq.vendor_lot')
        .not('title', 'ilike', 'Demo%')
        .order('published_at', { ascending: false })
        .limit(6);
      if (error) throw error;
      return data;
    },
    staleTime: 60000,
  });

  const allListings = useMemo(() => [...rentListings, ...saleListings, ...vendorSpaceListings], [rentListings, saleListings, vendorSpaceListings]);

  const hostIds = useMemo(() => {
    const ids = allListings.map(l => l.host_id).filter(Boolean);
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
    hostProfiles.forEach(profile => {
      map[profile.id] = profile.identity_verified ?? false;
    });
    return map;
  }, [hostProfiles]);

  const isLoading = rentLoading || saleLoading || vendorLoading;

  const activeListings = activeTab === 'sale' ? saleListings 
    : activeTab === 'rent' ? rentListings 
    : vendorSpaceListings;

  const viewAllPath = activeTab === 'sale' ? '/search?mode=sale' 
    : activeTab === 'rent' ? '/search?mode=rent' 
    : '/vendor-spaces';

  const tabCounts: Record<TabKey, number> = {
    sale: saleListings.length,
    rent: rentListings.length,
    vendor: vendorSpaceListings.length,
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
      <div className="absolute top-0 right-0 w-[400px] h-[300px] bg-primary/5 rounded-full blur-3xl" aria-hidden="true" />
      
      <div className="container px-4 sm:px-6 relative z-10">
        {/* Section header */}
        <div className="text-center mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Discover Your Next Space</h2>
          <p className="text-muted-foreground text-sm">Browse verified food trucks, trailers, kitchens & vendor spaces</p>
        </div>

        {/* Tab bar */}
        <div className="flex items-center justify-center gap-1 mb-8">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`relative flex items-center gap-2 px-4 sm:px-6 py-2.5 rounded-full text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? 'text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              }`}
            >
              {activeTab === tab.key && (
                <motion.div
                  layoutId="active-tab"
                  className="absolute inset-0 bg-primary rounded-full shadow-lg shadow-primary/20"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
                />
              )}
              <span className="relative flex items-center gap-2">
                <tab.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.label.replace('For ', '')}</span>
              </span>
            </button>
          ))}
        </div>

        {/* Listing grid with animation */}
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
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
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
                    onClick={() => navigate(viewAllPath)}
                    className="rounded-full px-8 border-border hover:border-primary/40 hover:bg-primary/5 text-foreground gap-2"
                  >
                    View All {tabs.find(t => t.key === activeTab)?.label}
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center py-12 rounded-2xl border border-border/50 bg-card/30">
                <div className="text-4xl mb-3">🚚</div>
                <h3 className="text-lg font-semibold text-foreground mb-1">No listings yet</h3>
                <p className="text-sm text-muted-foreground mb-4">Be the first to list!</p>
                <Button variant="outline" size="sm" onClick={() => navigate('/list')} className="rounded-full">
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
