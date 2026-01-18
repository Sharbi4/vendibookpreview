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

  // Fetch all published listings
  const { data: allListings = [], isLoading } = useQuery({
    queryKey: ['home-listings'],
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

  // Split listings by mode
  const saleListings = useMemo(() => 
    allListings.filter(l => l.mode === 'sale').slice(0, 6), 
    [allListings]
  );
  
  const rentListings = useMemo(() => 
    allListings.filter(l => l.mode === 'rent').slice(0, 6), 
    [allListings]
  );

  if (isLoading) {
    return (
      <section className="py-8 bg-background">
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
    <section className="py-8 bg-background">
      <div className="container space-y-10">
        {/* For Sale Section */}
        {saleListings.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-md">
                  <DollarSign className="h-5 w-5 text-white" />
                </div>
                <h2 className="text-xl font-bold text-foreground">For Sale</h2>
                <span className="text-sm text-muted-foreground">
                  ({allListings.filter(l => l.mode === 'sale').length} listings)
                </span>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => navigate('/search?mode=sale')}
                className="text-primary"
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

        {/* For Rent Section */}
        {rentListings.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-amber-500 flex items-center justify-center shadow-md">
                  <Key className="h-5 w-5 text-white" />
                </div>
                <h2 className="text-xl font-bold text-foreground">For Rent</h2>
                <span className="text-sm text-muted-foreground">
                  ({allListings.filter(l => l.mode === 'rent').length} listings)
                </span>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => navigate('/search?mode=rent')}
                className="text-primary"
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

        {/* Empty State */}
        {saleListings.length === 0 && rentListings.length === 0 && (
          <div className="text-center py-12 bg-secondary/30 rounded-2xl">
            <div className="text-4xl mb-4">🚚</div>
            <h3 className="text-lg font-semibold text-foreground mb-2">No listings yet</h3>
            <p className="text-muted-foreground mb-4">Be the first to list your food truck!</p>
            <Button onClick={() => navigate('/host')}>
              List Your Asset
            </Button>
          </div>
        )}
      </div>
    </section>
  );
};

export default ListingsSections;