import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Listing } from '@/types/listing';

export function useTrendingListings(limit = 5) {
  return useQuery({
    queryKey: ['trending-listings', limit],
    queryFn: async () => {
      // Get listing IDs with most recent bookings
      const { data: bookingData, error: bookingError } = await supabase
        .from('booking_requests')
        .select('listing_id, created_at')
        .in('status', ['pending', 'approved', 'completed'])
        .order('created_at', { ascending: false })
        .limit(50);

      if (bookingError) throw bookingError;

      // Count bookings per listing and get top ones
      const listingCounts = new Map<string, number>();
      for (const b of bookingData || []) {
        listingCounts.set(b.listing_id, (listingCounts.get(b.listing_id) || 0) + 1);
      }

      const topListingIds = [...listingCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([id]) => id);

      if (topListingIds.length === 0) {
        // Fallback: most viewed listings
        const { data, error } = await supabase
          .from('listings')
          .select('*')
          .eq('status', 'published')
          .order('view_count', { ascending: false })
          .limit(limit);
        if (error) throw error;
        return (data || []) as Listing[];
      }

      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .in('id', topListingIds)
        .eq('status', 'published');

      if (error) throw error;

      // Sort by booking count
      const sorted = (data || []).sort((a, b) => {
        return (listingCounts.get(b.id) || 0) - (listingCounts.get(a.id) || 0);
      });

      return sorted as Listing[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
