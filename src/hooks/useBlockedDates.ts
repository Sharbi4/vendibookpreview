import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO, eachDayOfInterval, addDays, subDays } from 'date-fns';

interface UseBlockedDatesOptions {
  listingId: string;
}

interface BookingInfo {
  start_date: string;
  end_date: string;
  status: string;
}

export const useBlockedDates = ({ listingId }: UseBlockedDatesOptions) => {
  const [blockedDates, setBlockedDates] = useState<Date[]>([]);
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
          .select('blocked_date')
          .eq('listing_id', listingId);

        if (blockedData) {
          setBlockedDates(blockedData.map(d => parseISO(d.blocked_date)));
        }

        // Fetch approved bookings
        const { data: bookingData } = await supabase
          .from('booking_requests')
          .select('start_date, end_date, status')
          .eq('listing_id', listingId)
          .eq('status', 'approved');

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
    
    const isBlocked = blockedDates.some(d => format(d, 'yyyy-MM-dd') === dateStr);
    const isBooked = bookedDates.some(d => format(d, 'yyyy-MM-dd') === dateStr);
    const isBuffer = bufferDates.some(d => format(d, 'yyyy-MM-dd') === dateStr);
    
    return isBlocked || isBooked || isBuffer;
  };

  const allUnavailableDates = [...blockedDates, ...bookedDates, ...bufferDates];

  return {
    blockedDates,
    bookedDates,
    bufferDates,
    bufferDays,
    upcomingBookings,
    allUnavailableDates,
    isDateUnavailable,
    isLoading,
  };
};
