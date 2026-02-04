import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface HostBadges {
  isTopRated: boolean;
  isSuperhost: boolean;
  completedBookings: number;
  isLoading: boolean;
}

export const useHostBadges = (
  hostId: string | undefined,
  averageRating: number | null | undefined,
  totalReviews: number | undefined,
  isFastResponder: boolean | undefined
): HostBadges => {
  // Fetch completed bookings count
  const { data: completedBookings = 0, isLoading } = useQuery({
    queryKey: ['host-completed-bookings', hostId],
    queryFn: async () => {
      if (!hostId) return 0;

      const { count, error } = await supabase
        .from('booking_requests')
        .select('*', { count: 'exact', head: true })
        .eq('host_id', hostId)
        .eq('status', 'completed');

      if (error) {
        console.error('Error fetching completed bookings:', error);
        return 0;
      }

      return count || 0;
    },
    enabled: !!hostId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Calculate badge eligibility
  const badges = useMemo(() => {
    const rating = averageRating ?? 0;
    const reviews = totalReviews ?? 0;
    const fastResponder = isFastResponder ?? false;
    const bookings = completedBookings;

    // Top Rated: High rating + enough reviews + fast response + completed bookings
    const isTopRated = 
      rating >= 4.8 &&
      reviews >= 5 &&
      fastResponder &&
      bookings >= 3;

    // Superhost: Even higher bar - more reviews and more bookings
    const isSuperhost = 
      rating >= 4.9 &&
      reviews >= 10 &&
      fastResponder &&
      bookings >= 10;

    return {
      isTopRated,
      isSuperhost,
      completedBookings: bookings,
      isLoading,
    };
  }, [averageRating, totalReviews, isFastResponder, completedBookings, isLoading]);

  return badges;
};

export default useHostBadges;
