import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO, eachDayOfInterval } from 'date-fns';

interface UseBlockedDatesOptions {
  listingId: string;
}

export const useBlockedDates = ({ listingId }: UseBlockedDatesOptions) => {
  const [blockedDates, setBlockedDates] = useState<Date[]>([]);
  const [bookedDates, setBookedDates] = useState<Date[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUnavailableDates = async () => {
      if (!listingId) return;

      setIsLoading(true);
      try {
        // Fetch blocked dates
        const { data: blockedData } = await supabase
          .from('listing_blocked_dates')
          .select('blocked_date')
          .eq('listing_id', listingId);

        if (blockedData) {
          setBlockedDates(blockedData.map(d => parseISO(d.blocked_date)));
        }

        // Fetch approved bookings
        const { data: bookingData } = await supabase
          .from('booking_requests')
          .select('start_date, end_date')
          .eq('listing_id', listingId)
          .eq('status', 'approved');

        if (bookingData) {
          const dates: Date[] = [];
          bookingData.forEach(booking => {
            const interval = eachDayOfInterval({
              start: parseISO(booking.start_date),
              end: parseISO(booking.end_date),
            });
            dates.push(...interval);
          });
          setBookedDates(dates);
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
    
    const isBlocked = blockedDates.some(d => format(d, 'yyyy-MM-dd') === dateStr);
    const isBooked = bookedDates.some(d => format(d, 'yyyy-MM-dd') === dateStr);
    
    return isBlocked || isBooked;
  };

  const allUnavailableDates = [...blockedDates, ...bookedDates];

  return {
    blockedDates,
    bookedDates,
    allUnavailableDates,
    isDateUnavailable,
    isLoading,
  };
};
