import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Listing } from '@/types/listing';

// Query for sold items - based on completed sale_transactions
export const useSoldListings = (hostId: string | undefined) => {
  return useQuery({
    queryKey: ['sold-listings', hostId],
    queryFn: async () => {
      if (!hostId) return [];

      // Get completed sales for this seller
      const { data: sales, error: salesError } = await supabase
        .from('sale_transactions')
        .select('listing_id')
        .eq('seller_id', hostId)
        .eq('status', 'completed')
        .order('updated_at', { ascending: false })
        .limit(6);

      if (salesError || !sales || sales.length === 0) {
        return [];
      }

      // Get the listing details for sold items
      const listingIds = sales.map(s => s.listing_id);
      const { data: listings, error: listingsError } = await supabase
        .from('listings')
        .select('*')
        .in('id', listingIds);

      if (listingsError) {
        console.error('Error fetching sold listings:', listingsError);
        return [];
      }

      return (listings || []) as Listing[];
    },
    enabled: !!hostId,
    staleTime: 5 * 60 * 1000,
  });
};

export default useSoldListings;
