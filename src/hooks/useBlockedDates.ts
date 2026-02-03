import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO, eachDayOfInterval, addDays, subDays } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface UseBlockedDatesOptions {
  listingId: string;
}

interface BookingInfo {
  start_date: string;
  end_date: string;
  status: string;
}

interface BlockedDateRecord {
  id: string;
  blocked_date: string;
  reason?: string | null;
}

// Overload for object parameter
export function useBlockedDates(options: UseBlockedDatesOptions): ReturnType<typeof useBlockedDatesInternal>;
// Overload for string parameter
export function useBlockedDates(listingId: string): ReturnType<typeof useBlockedDatesInternal>;
// Implementation
export function useBlockedDates(arg: UseBlockedDatesOptions | string) {
  const listingId = typeof arg === 'string' ? arg : arg.listingId;
  return useBlockedDatesInternal(listingId);
}

const useBlockedDatesInternal = (listingId: string) => {
  const { toast } = useToast();
  const [blockedDates, setBlockedDates] = useState<BlockedDateRecord[]>([]);
  const [blockedDateObjects, setBlockedDateObjects] = useState<Date[]>([]);
  const [bookedDates, setBookedDates] = useState<Date[]>([]);
  const [bufferDates, setBufferDates] = useState<Date[]>([]);
  const [upcomingBookings, setUpcomingBookings] = useState<BookingInfo[]>([]);
  const [bufferDays, setBufferDays] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUnavailableDates = async () => {
      if (!listingId) return;

      setIsLoading(true);
      try {
        // Fetch listing to get buffer days
        const { data: listingData } = await supabase
          .from('listings')
          .select('rental_buffer_days')
          .eq('id', listingId)
          .single();

        const buffer = (listingData as any)?.rental_buffer_days || 0;
        setBufferDays(buffer);

        // Fetch blocked dates
        const { data: blockedData } = await supabase
          .from('listing_blocked_dates')
          .select('id, blocked_date, reason')
          .eq('listing_id', listingId);

        if (blockedData) {
          setBlockedDates(blockedData as unknown as BlockedDateRecord[]);
          setBlockedDateObjects(blockedData.map(d => parseISO(d.blocked_date)));
        }

        // Fetch approved bookings that are paid (confirmed)
        const { data: bookingData } = await supabase
          .from('booking_requests')
          .select('start_date, end_date, status, payment_status')
          .eq('listing_id', listingId)
          .in('status', ['approved', 'completed'])
          .eq('payment_status', 'paid');

        if (bookingData) {
          const dates: Date[] = [];
          const buffers: Date[] = [];
          
          bookingData.forEach(booking => {
            const startDate = parseISO(booking.start_date);
            const endDate = parseISO(booking.end_date);
            
            // Add booking dates
            const interval = eachDayOfInterval({
              start: startDate,
              end: endDate,
            });
            dates.push(...interval);

            // Add buffer days before and after if configured
            if (buffer > 0) {
              // Buffer before start
              for (let i = 1; i <= buffer; i++) {
                buffers.push(subDays(startDate, i));
              }
              // Buffer after end
              for (let i = 1; i <= buffer; i++) {
                buffers.push(addDays(endDate, i));
              }
            }
          });
          
          setBookedDates(dates);
          setBufferDates(buffers);
          
          // Store upcoming bookings for display
          const today = format(new Date(), 'yyyy-MM-dd');
          const upcoming = bookingData.filter(b => b.end_date >= today);
          setUpcomingBookings(upcoming.sort((a, b) => a.start_date.localeCompare(b.start_date)));
        }
      } catch (error) {
        console.error('Error fetching unavailable dates:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUnavailableDates();
  }, [listingId]);

  const isDateUnavailable = (date: Date): boolean => {
    const dateStr = format(date, 'yyyy-MM-dd');
    
    const isBlocked = blockedDateObjects.some(d => format(d, 'yyyy-MM-dd') === dateStr);
    const isBooked = bookedDates.some(d => format(d, 'yyyy-MM-dd') === dateStr);
    const isBuffer = bufferDates.some(d => format(d, 'yyyy-MM-dd') === dateStr);
    
    return isBlocked || isBooked || isBuffer;
  };

  const addBlockedDates = useCallback(async (dates: Date[], reason?: string) => {
    if (!listingId || dates.length === 0) return;

    // Get current user for host_id
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const records = dates.map(date => ({
        listing_id: listingId,
        host_id: user.id,
        blocked_date: format(date, 'yyyy-MM-dd'),
        reason: reason || null,
      }));

      const { error } = await supabase
        .from('listing_blocked_dates')
        .upsert(records, { onConflict: 'listing_id,blocked_date' });

      if (error) throw error;

      // Refetch blocked dates
      const { data: blockedData } = await supabase
        .from('listing_blocked_dates')
        .select('id, blocked_date, reason')
        .eq('listing_id', listingId);

      if (blockedData) {
        setBlockedDates(blockedData as unknown as BlockedDateRecord[]);
        setBlockedDateObjects((blockedData as BlockedDateRecord[]).map(d => parseISO(d.blocked_date)));
      }

      toast({
        title: 'Dates blocked',
        description: `${dates.length} date${dates.length > 1 ? 's' : ''} marked as unavailable.`,
      });
    } catch (error) {
      console.error('Error blocking dates:', error);
      toast({
        title: 'Error',
        description: 'Failed to block dates. Please try again.',
        variant: 'destructive',
      });
    }
  }, [listingId, toast]);

  const removeBlockedDate = useCallback(async (dateId: string) => {
    // Capture the record before any state updates to avoid stale closure
    const recordToRemove = blockedDates.find(d => d.id === dateId);
    
    try {
      const { error } = await supabase
        .from('listing_blocked_dates')
        .delete()
        .eq('id', dateId);

      if (error) throw error;

      setBlockedDates(prev => prev.filter(d => d.id !== dateId));
      if (recordToRemove) {
        setBlockedDateObjects(prev => 
          prev.filter(d => format(d, 'yyyy-MM-dd') !== recordToRemove.blocked_date)
        );
      }

      toast({
        title: 'Date unblocked',
        description: 'The date is now available for bookings.',
      });
    } catch (error) {
      console.error('Error removing blocked date:', error);
      toast({
        title: 'Error',
        description: 'Failed to unblock date. Please try again.',
        variant: 'destructive',
      });
    }
  }, [blockedDates, toast]);

  const allUnavailableDates = [...blockedDateObjects, ...bookedDates, ...bufferDates];

  return {
    blockedDates,
    bookedDates,
    bufferDates,
    bufferDays,
    upcomingBookings,
    allUnavailableDates,
    isDateUnavailable,
    isLoading,
    addBlockedDates,
    removeBlockedDate,
  };
};
