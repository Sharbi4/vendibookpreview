import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { Tables } from '@/integrations/supabase/types';

type BookingRequest = Tables<'booking_requests'>;

interface BookingWithListing extends BookingRequest {
  listing?: {
    id: string;
    title: string;
    cover_image_url: string | null;
    category: string;
  };
  shopper?: {
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  };
}

export const useHostBookings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [bookings, setBookings] = useState<BookingWithListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchBookings = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      // First get booking requests where user is host
      const { data: bookingData, error: bookingError } = await supabase
        .from('booking_requests')
        .select('*')
        .eq('host_id', user.id)
        .order('created_at', { ascending: false });

      if (bookingError) throw bookingError;

      // Then fetch related listings and shopper profiles
      const enrichedBookings = await Promise.all(
        (bookingData || []).map(async (booking) => {
          const [listingResult, shopperResult] = await Promise.all([
            supabase
              .from('listings')
              .select('id, title, cover_image_url, category')
              .eq('id', booking.listing_id)
              .maybeSingle(),
            supabase
              .from('profiles')
              .select('full_name, email, avatar_url')
              .eq('id', booking.shopper_id)
              .maybeSingle(),
          ]);

          return {
            ...booking,
            listing: listingResult.data || undefined,
            shopper: shopperResult.data || undefined,
          };
        })
      );

      setBookings(enrichedBookings);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load booking requests',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [user]);

  const respondToBooking = async (
    bookingId: string, 
    status: 'approved' | 'declined', 
    response?: string
  ) => {
    try {
      const { error } = await supabase
        .from('booking_requests')
        .update({
          status,
          host_response: response || null,
          responded_at: new Date().toISOString(),
        })
        .eq('id', bookingId)
        .eq('host_id', user?.id);

      if (error) throw error;

      // Send email notification (fire and forget)
      supabase.functions.invoke('send-booking-notification', {
        body: { 
          booking_id: bookingId, 
          event_type: status, 
          host_response: response || undefined,
        },
      }).catch(console.error);

      setBookings(prev =>
        prev.map(b =>
          b.id === bookingId
            ? { ...b, status, host_response: response || null, responded_at: new Date().toISOString() }
            : b
        )
      );

      toast({
        title: status === 'approved' ? 'Booking Approved!' : 'Booking Declined',
        description: status === 'approved' 
          ? 'The shopper has been notified' 
          : 'The request has been declined',
      });
    } catch (error) {
      console.error('Error responding to booking:', error);
      toast({
        title: 'Error',
        description: 'Failed to update booking',
        variant: 'destructive',
      });
    }
  };

  const cancelBooking = async (bookingId: string, reason?: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('cancel-booking', {
        body: { 
          booking_id: bookingId,
          cancellation_reason: reason,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const wasRefunded = data?.refund && !data.refund.error;

      setBookings(prev =>
        prev.map(b =>
          b.id === bookingId
            ? { ...b, status: 'cancelled' as const }
            : b
        )
      );

      toast({
        title: wasRefunded ? 'Booking cancelled & refunded' : 'Booking cancelled',
        description: wasRefunded 
          ? `Refund of $${data.refund.refund_amount.toFixed(2)} has been processed.`
          : 'The booking has been cancelled.',
      });

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
    pending: bookings.filter(b => b.status === 'pending').length,
    approved: bookings.filter(b => b.status === 'approved').length,
    declined: bookings.filter(b => b.status === 'declined').length,
    total: bookings.length,
  };

  return {
    bookings,
    isLoading,
    stats,
    refetch: fetchBookings,
    approveBooking: (id: string, response?: string) => respondToBooking(id, 'approved', response),
    declineBooking: (id: string, response?: string) => respondToBooking(id, 'declined', response),
    cancelBooking,
  };
};
