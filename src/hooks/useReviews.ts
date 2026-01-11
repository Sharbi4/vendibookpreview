import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Review {
  id: string;
  booking_id: string;
  listing_id: string;
  reviewer_id: string;
  host_id: string;
  rating: number;
  review_text: string | null;
  created_at: string;
  updated_at: string;
  reviewer_name?: string;
}

export const useListingReviews = (listingId: string | undefined) => {
  return useQuery({
    queryKey: ['reviews', 'listing', listingId],
    queryFn: async () => {
      if (!listingId) return [];
      
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('listing_id', listingId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch reviewer names
      const reviewerIds = [...new Set(data.map(r => r.reviewer_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', reviewerIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);

      return data.map(review => ({
        ...review,
        reviewer_name: profileMap.get(review.reviewer_id) || 'Anonymous'
      })) as Review[];
    },
    enabled: !!listingId,
  });
};

export const useBookingReview = (bookingId: string | undefined) => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['reviews', 'booking', bookingId],
    queryFn: async () => {
      if (!bookingId) return null;
      
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('booking_id', bookingId)
        .maybeSingle();

      if (error) throw error;
      return data as Review | null;
    },
    enabled: !!bookingId && !!user,
  });
};

export const useCreateReview = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      bookingId,
      listingId,
      hostId,
      rating,
      reviewText,
    }: {
      bookingId: string;
      listingId: string;
      hostId: string;
      rating: number;
      reviewText?: string;
    }) => {
      if (!user) throw new Error('Must be logged in to leave a review');

      const { data, error } = await supabase
        .from('reviews')
        .insert({
          booking_id: bookingId,
          listing_id: listingId,
          host_id: hostId,
          reviewer_id: user.id,
          rating,
          review_text: reviewText || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['reviews', 'listing', variables.listingId] });
      queryClient.invalidateQueries({ queryKey: ['reviews', 'booking', variables.bookingId] });
      toast.success('Review submitted successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to submit review');
    },
  });
};

export const useListingAverageRating = (listingId: string | undefined) => {
  return useQuery({
    queryKey: ['reviews', 'average', listingId],
    queryFn: async () => {
      if (!listingId) return null;
      
      const { data, error } = await supabase
        .from('reviews')
        .select('rating')
        .eq('listing_id', listingId);

      if (error) throw error;
      if (!data || data.length === 0) return null;

      const average = data.reduce((sum, r) => sum + r.rating, 0) / data.length;
      return {
        average: Math.round(average * 10) / 10,
        count: data.length,
      };
    },
    enabled: !!listingId,
  });
};
