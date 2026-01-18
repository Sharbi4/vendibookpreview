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

  // Real-time subscription for instant updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('host-bookings-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'booking_requests',
          filter: `host_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('[Realtime] Host booking update:', payload.eventType);
          
          // Show toast based on event type
          if (payload.eventType === 'INSERT') {
            toast({
              title: '📬 New Booking Request!',
              description: 'You have a new booking request. Review it in your dashboard.',
            });
          } else if (payload.eventType === 'UPDATE') {
            const newData = payload.new as BookingRequest;
            if (newData.payment_status === 'paid') {
              toast({
                title: '💰 Payment Received!',
                description: 'A renter has completed payment for their booking.',
              });
            } else if (newData.status === 'cancelled') {
              toast({
                title: 'Booking Cancelled',
                description: 'A booking has been cancelled.',
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
  }, [user, toast]);

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

  const cancelBooking = async (bookingId: string, reason?: string, refundAmount?: number) => {
    try {
      const { data, error } = await supabase.functions.invoke('cancel-booking', {
        body: { 
          booking_id: bookingId,
          cancellation_reason: reason,
          refund_amount: refundAmount, // undefined = full refund
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const wasRefunded = data?.refund && !data.refund.error;
      const isPartial = data?.refund?.is_partial;

      setBookings(prev =>
        prev.map(b =>
          b.id === bookingId
            ? { ...b, status: 'cancelled' as const }
            : b
        )
      );

      toast({
        title: wasRefunded 
          ? isPartial 
            ? 'Booking cancelled with partial refund' 
            : 'Booking cancelled & refunded'
          : 'Booking cancelled',
        description: wasRefunded 
          ? isPartial
            ? `Partial refund of $${data.refund.refund_amount.toFixed(2)} (of $${data.refund.original_amount.toFixed(2)}) has been processed.`
            : `Full refund of $${data.refund.refund_amount.toFixed(2)} has been processed.`
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

  const processDepositRefund = async (
    bookingId: string, 
    action: 'refund' | 'partial' | 'forfeit', 
    deductionAmount?: number, 
    notes?: string
  ) => {
    try {
      const { data, error } = await supabase.functions.invoke('process-deposit-refund', {
        body: { 
          booking_id: bookingId,
          refund_type: action === 'refund' ? 'full' : action,
          deduction_amount: deductionAmount || 0,
          notes: notes || '',
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Update local state
      setBookings(prev =>
        prev.map(b =>
          b.id === bookingId
            ? { 
                ...b, 
                deposit_status: data.deposit_status,
                deposit_refund_notes: notes || null,
                deposit_refunded_at: new Date().toISOString(),
              }
            : b
        )
      );

      toast({
        title: action === 'forfeit' 
          ? 'Deposit Forfeited' 
          : action === 'partial' 
            ? 'Partial Deposit Refund Processed' 
            : 'Deposit Refunded',
        description: action === 'forfeit'
          ? 'The security deposit has been forfeited.'
          : `$${data.refund_amount?.toFixed(2) || '0.00'} has been refunded to the renter.`,
      });

      return data;
    } catch (error) {
      console.error('Error processing deposit:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to process deposit. Please try again.',
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
    processDepositRefund,
  };
};
