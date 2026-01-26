import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Review {
  id: string;
  booking_id: string;
  listing_id: string;
  host_id: string;
  rating: number;
  review_text: string | null;
  created_at: string;
  updated_at: string;
  reviewer_name?: string;
  reviewer_avatar_url?: string | null;
}

// Safe interface that doesn't expose reviewer_id
interface SafeReviewRow {
  id: string;
  booking_id: string;
  listing_id: string;
  host_id: string;
  rating: number;
  review_text: string | null;
  created_at: string;
  updated_at: string;
  reviewer_display_name: string;
  reviewer_avatar_url: string | null;
}

export const useListingReviews = (listingId: string | undefined) => {
  return useQuery({
    queryKey: ['reviews', 'listing', listingId],
    queryFn: async () => {
      if (!listingId) return [];
      
      // Use the safe RPC function that doesn't expose reviewer_id
      const { data, error } = await supabase
        .rpc('get_listing_reviews_safe', { p_listing_id: listingId });

      if (error) throw error;

      return (data as SafeReviewRow[]).map(review => ({
        id: review.id,
        booking_id: review.booking_id,
        listing_id: review.listing_id,
        host_id: review.host_id,
        rating: review.rating,
        review_text: review.review_text,
        created_at: review.created_at,
        updated_at: review.updated_at,
        reviewer_name: review.reviewer_display_name || 'Anonymous',
        reviewer_avatar_url: review.reviewer_avatar_url,
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
