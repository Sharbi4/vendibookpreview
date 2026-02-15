import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, DollarSign, Key } from 'lucide-react';
import ListingCard from '@/components/listing/ListingCard';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

const ListingsSections = () => {
  const navigate = useNavigate();

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

  // Fetch sale listings (newest first)
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

  // Combine all listings for host lookup
  const allListings = useMemo(() => [...rentListings, ...saleListings, ...vendorSpaceListings], [rentListings, saleListings, vendorSpaceListings]);

  // Extract unique host IDs
  const hostIds = useMemo(() => {
    const ids = allListings.map(l => l.host_id).filter(Boolean);
    return [...new Set(ids)] as string[];
  }, [allListings]);

  // Fetch host verification status
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

  // Create verification map
  const hostVerificationMap = useMemo(() => {
    const map: Record<string, boolean> = {};
    hostProfiles.forEach(profile => {
      map[profile.id] = profile.identity_verified ?? false;
    });
    return map;
  }, [hostProfiles]);

  const isLoading = rentLoading || saleLoading || vendorLoading;

  if (isLoading) {
    return (
      <section className="py-8" style={{ background: '#0d0d0d' }}>
        <div className="container">
          <Skeleton className="h-8 w-32 mb-6" />
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
    <section className="py-8 sm:py-12 relative overflow-hidden" style={{ background: 'linear-gradient(180deg, #0d0d0d 0%, #141414 50%, #0d0d0d 100%)' }}>
      {/* Subtle decorative orbs */}
      <div className="absolute top-0 right-0 w-[400px] h-[300px] bg-primary/5 rounded-full blur-3xl" aria-hidden="true" />
      <div className="absolute bottom-0 left-0 w-[300px] h-[200px] bg-amber-500/5 rounded-full blur-3xl" aria-hidden="true" />
      
      <div className="container px-4 sm:px-6 space-y-8 sm:space-y-12 relative z-10">
        {/* For Rent Section - RENTAL FIRST */}
        {rentListings.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold text-white">Featured Rentals</h2>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => navigate('/search?mode=rent')}
                className="text-primary font-medium hover:bg-primary/5"
              >
                View all
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              {rentListings.map((listing) => (
                <ListingCard 
                  key={listing.id} 
                  listing={listing} 
                  hostVerified={hostVerificationMap[listing.host_id] ?? false}
                  compact
                />
              ))}
            </div>
          </div>
        )}

        {/* Featured Vendor Spaces Section */}
        {vendorSpaceListings.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-xl font-bold text-white">Featured Vendor Spaces</h2>
                <p className="text-sm text-white/50 mt-1">Find the perfect location or food truck park for your business</p>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => navigate('/vendor-spaces')}
                className="text-primary font-medium hover:bg-primary/5"
              >
                View all
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              {vendorSpaceListings.map((listing) => (
                <ListingCard 
                  key={listing.id} 
                  listing={listing} 
                  hostVerified={hostVerificationMap[listing.host_id] ?? false}
                  compact
                />
              ))}
            </div>
          </div>
        )}

        {/* For Sale Section - Secondary */}
        {saleListings.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold text-white">Featured for Sale</h2>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => navigate('/search?mode=sale')}
                className="text-primary font-medium hover:bg-primary/5"
              >
                View all
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              {saleListings.map((listing) => (
                <ListingCard 
                  key={listing.id} 
                  listing={listing} 
                  hostVerified={hostVerificationMap[listing.host_id] ?? false}
                  compact
                />
              ))}
            </div>
          </div>
        )}

        {/* Empty State - Premium design */}
        {saleListings.length === 0 && rentListings.length === 0 && (
          <div className="text-center py-16 glass-card rounded-2xl border border-border/50">
            <div className="text-5xl mb-4">🚚</div>
            <h3 className="text-xl font-semibold text-foreground mb-2">No listings yet</h3>
            <p className="text-muted-foreground mb-6">Be the first to list your food truck!</p>
            <Button variant="dark-shine" size="lg" onClick={() => navigate('/host')}>
              List Your Asset
            </Button>
          </div>
        )}
      </div>
    </section>
  );
};

export default ListingsSections;