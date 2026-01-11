import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { Tables } from '@/integrations/supabase/types';

type BookingRequest = Tables<'booking_requests'>;
type Listing = Tables<'listings'>;

export interface ShopperBooking extends BookingRequest {
  listing: Pick<Listing, 'id' | 'title' | 'cover_image_url' | 'category' | 'address' | 'pickup_location_text'> | null;
}

export const useShopperBookings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [bookings, setBookings] = useState<ShopperBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchBookings = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('booking_requests')
        .select(`
          *,
          listing:listings(id, title, cover_image_url, category, address, pickup_location_text)
        `)
        .eq('shopper_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBookings(data || []);
    } catch (error) {
      console.error('Error fetching shopper bookings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load your bookings.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const cancelBooking = async (bookingId: string) => {
    try {
      const { error } = await supabase
        .from('booking_requests')
        .update({ status: 'cancelled' })
        .eq('id', bookingId)
        .eq('shopper_id', user?.id)
        .eq('status', 'pending');

      if (error) throw error;

      toast({
        title: 'Booking cancelled',
        description: 'Your booking request has been cancelled.',
      });

      fetchBookings();
    } catch (error) {
      console.error('Error cancelling booking:', error);
      toast({
        title: 'Error',
        description: 'Failed to cancel booking. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const stats = {
    total: bookings.length,
    pending: bookings.filter(b => b.status === 'pending').length,
    approved: bookings.filter(b => b.status === 'approved').length,
    declined: bookings.filter(b => b.status === 'declined').length,
    cancelled: bookings.filter(b => b.status === 'cancelled').length,
  };

  return {
    bookings,
    isLoading,
    stats,
    cancelBooking,
    refetch: fetchBookings,
  };
};
