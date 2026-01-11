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

  const stats = {
    pending: bookings.filter(b => b.status === 'pending').length,
    approved: bookings.filter(b => b.status === 'approved').length,
    total: bookings.length,
  };

  return {
    bookings,
    isLoading,
    stats,
    refetch: fetchBookings,
    approveBooking: (id: string, response?: string) => respondToBooking(id, 'approved', response),
    declineBooking: (id: string, response?: string) => respondToBooking(id, 'declined', response),
  };
};
