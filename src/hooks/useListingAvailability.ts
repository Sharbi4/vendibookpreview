import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO, eachDayOfInterval } from 'date-fns';
import type { Tables } from '@/integrations/supabase/types';

type BookingRequest = Tables<'booking_requests'>;

interface BlockedDate {
  id: string;
  listing_id: string;
  blocked_date: string;
  reason: string | null;
}

interface BookingWithDates extends BookingRequest {
  listing_title?: string;
}

export const useListingAvailability = (listingId: string) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [bookings, setBookings] = useState<BookingWithDates[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user || !listingId) return;

    setIsLoading(true);
    try {
      // Fetch blocked dates
      const { data: blockedData, error: blockedError } = await supabase
        .from('listing_blocked_dates')
        .select('*')
        .eq('listing_id', listingId);

      if (blockedError) throw blockedError;
      setBlockedDates(blockedData || []);

      // Fetch approved bookings for this listing
      const { data: bookingData, error: bookingError } = await supabase
        .from('booking_requests')
        .select('*')
        .eq('listing_id', listingId)
        .in('status', ['approved', 'pending']);

      if (bookingError) throw bookingError;
      setBookings(bookingData || []);
    } catch (error) {
      console.error('Error fetching availability:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user, listingId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const blockDate = async (date: Date, reason?: string) => {
    if (!user) return;

    const dateStr = format(date, 'yyyy-MM-dd');
    
    try {
      const { error } = await supabase
        .from('listing_blocked_dates')
        .insert({
          listing_id: listingId,
          host_id: user.id,
          blocked_date: dateStr,
          reason: reason || null,
        });

      if (error) {
        if (error.code === '23505') {
          toast({
            title: 'Already blocked',
            description: 'This date is already blocked.',
            variant: 'destructive',
          });
          return;
        }
        throw error;
      }

      toast({
        title: 'Date blocked',
        description: `${format(date, 'MMM d, yyyy')} is now unavailable.`,
      });
      
      fetchData();
    } catch (error) {
      console.error('Error blocking date:', error);
      toast({
        title: 'Error',
        description: 'Failed to block date. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const unblockDate = async (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    
    try {
      const { error } = await supabase
        .from('listing_blocked_dates')
        .delete()
        .eq('listing_id', listingId)
        .eq('blocked_date', dateStr);

      if (error) throw error;

      toast({
        title: 'Date unblocked',
        description: `${format(date, 'MMM d, yyyy')} is now available.`,
      });
      
      fetchData();
    } catch (error) {
      console.error('Error unblocking date:', error);
      toast({
        title: 'Error',
        description: 'Failed to unblock date. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const blockDateRange = async (startDate: Date, endDate: Date, reason?: string) => {
    if (!user) return;

    const dates = eachDayOfInterval({ start: startDate, end: endDate });
    
    try {
      const inserts = dates.map(date => ({
        listing_id: listingId,
        host_id: user.id,
        blocked_date: format(date, 'yyyy-MM-dd'),
        reason: reason || null,
      }));

      const { error } = await supabase
        .from('listing_blocked_dates')
        .upsert(inserts, { onConflict: 'listing_id,blocked_date' });

      if (error) throw error;

      toast({
        title: 'Dates blocked',
        description: `${dates.length} dates are now unavailable.`,
      });
      
      fetchData();
    } catch (error) {
      console.error('Error blocking dates:', error);
      toast({
        title: 'Error',
        description: 'Failed to block dates. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Get all booked dates from approved bookings
  const getBookedDates = (): Date[] => {
    const dates: Date[] = [];
    bookings.forEach(booking => {
      if (booking.status === 'approved') {
        const start = parseISO(booking.start_date);
        const end = parseISO(booking.end_date);
        const interval = eachDayOfInterval({ start, end });
        dates.push(...interval);
      }
    });
    return dates;
  };

  // Get all pending booking dates
  const getPendingDates = (): Date[] => {
    const dates: Date[] = [];
    bookings.forEach(booking => {
      if (booking.status === 'pending') {
        const start = parseISO(booking.start_date);
        const end = parseISO(booking.end_date);
        const interval = eachDayOfInterval({ start, end });
        dates.push(...interval);
      }
    });
    return dates;
  };

  // Check if a date is blocked
  const isDateBlocked = (date: Date): boolean => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return blockedDates.some(bd => bd.blocked_date === dateStr);
  };

  // Check if a date is booked
  const isDateBooked = (date: Date): boolean => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return bookings.some(booking => {
      if (booking.status !== 'approved') return false;
      const start = booking.start_date;
      const end = booking.end_date;
      return dateStr >= start && dateStr <= end;
    });
  };

  // Check if a date has pending booking
  const isDatePending = (date: Date): boolean => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return bookings.some(booking => {
      if (booking.status !== 'pending') return false;
      const start = booking.start_date;
      const end = booking.end_date;
      return dateStr >= start && dateStr <= end;
    });
  };

  return {
    blockedDates,
    bookings,
    isLoading,
    blockDate,
    unblockDate,
    blockDateRange,
    getBookedDates,
    getPendingDates,
    isDateBlocked,
    isDateBooked,
    isDatePending,
    refetch: fetchData,
  };
};
