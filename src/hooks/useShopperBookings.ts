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

  // Real-time subscription for instant updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('shopper-bookings-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'booking_requests',
          filter: `shopper_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('[Realtime] Shopper booking update:', payload.eventType);
          
          // Show toast based on event type
          if (payload.eventType === 'UPDATE') {
            const newData = payload.new as BookingRequest;
            if (newData.status === 'approved') {
              toast({
                title: '🎉 Booking Approved!',
                description: 'The host has approved your booking. You can now proceed with payment.',
              });
            } else if (newData.status === 'declined') {
              toast({
                title: 'Booking Declined',
                description: 'Unfortunately, the host has declined your booking request.',
                variant: 'destructive',
              });
            } else if (newData.payment_status === 'paid') {
              toast({
                title: '✅ Payment Confirmed',
                description: 'Your payment has been processed successfully!',
              });
            }
          }
          
          // Refetch to get the complete data with joins
          fetchBookings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchBookings, toast]);

  const cancelBooking = async (bookingId: string, reason?: string) => {
    try {
      // Use cancel-booking edge function for proper handling with refunds
      const { data, error } = await supabase.functions.invoke('cancel-booking', {
        body: { 
          booking_id: bookingId,
          cancellation_reason: reason,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const wasRefunded = data?.refund && !data.refund.error;

      toast({
        title: wasRefunded ? 'Booking cancelled & refunded' : 'Booking cancelled',
        description: wasRefunded 
          ? `Your refund of $${data.refund.refund_amount.toFixed(2)} is being processed.`
          : 'Your booking request has been cancelled.',
      });

      fetchBookings();
      return data;
    } catch (error) {
      console.error('Error cancelling booking:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to cancel booking. Please try again.',
        variant: 'destructive',
      });
      throw error;
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
