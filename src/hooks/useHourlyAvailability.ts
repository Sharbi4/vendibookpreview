import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO, isBefore, startOfDay, addHours, isAfter, setHours, setMinutes, differenceInHours } from 'date-fns';

interface HourlyAvailabilityOptions {
  listingId: string;
  selectedDate?: Date;
}

interface TimeWindow {
  start: string; // HH:mm format
  end: string;   // HH:mm format
  startHour: number;
  endHour: number;
}

interface BookingSlot {
  date: string;
  startTime: string | null;
  endTime: string | null;
  isHourly: boolean;
}

interface BlockedTimeSlot {
  date: string;
  startTime: string;
  endTime: string;
}

interface ListingHourlySettings {
  priceHourly: number | null;
  hourlyEnabled: boolean;
  dailyEnabled: boolean;
  minHours: number;
  maxHours: number;
  bufferTimeMins: number;
  minNoticeHours: number;
  operatingHoursStart: string | null; // HH:mm
  operatingHoursEnd: string | null;   // HH:mm
  priceDaily: number | null;
  priceWeekly: number | null;
}

interface DayAvailabilityInfo {
  hasHourlySlots: boolean;
  hasFullDay: boolean;
  isLimited: boolean;
  isUnavailable: boolean;
  availableWindows: TimeWindow[];
  windowsSummary: string;
}

export const useHourlyAvailability = ({ listingId, selectedDate }: HourlyAvailabilityOptions) => {
  const [settings, setSettings] = useState<ListingHourlySettings>({
    priceHourly: null,
    hourlyEnabled: false,
    dailyEnabled: true,
    minHours: 1,
    maxHours: 24,
    bufferTimeMins: 0,
    minNoticeHours: 0,
    operatingHoursStart: null,
    operatingHoursEnd: null,
    priceDaily: null,
    priceWeekly: null,
  });
  const [existingBookings, setExistingBookings] = useState<BookingSlot[]>([]);
  const [blockedDates, setBlockedDates] = useState<string[]>([]);
  const [blockedTimeSlots, setBlockedTimeSlots] = useState<BlockedTimeSlot[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch listing settings and availability data
  useEffect(() => {
    const fetchData = async () => {
      if (!listingId) return;
      
      setIsLoading(true);
      try {
        // Fetch listing settings
        const { data: listingData } = await supabase
          .from('listings')
          .select(`
            price_hourly,
            hourly_enabled,
            daily_enabled,
            min_hours,
            max_hours,
            buffer_time_mins,
            min_notice_hours,
            operating_hours_start,
            operating_hours_end,
            price_daily,
            price_weekly
          `)
          .eq('id', listingId)
          .single();

        if (listingData) {
          setSettings({
            priceHourly: (listingData as any).price_hourly,
            hourlyEnabled: (listingData as any).hourly_enabled || false,
            dailyEnabled: (listingData as any).daily_enabled !== false,
            minHours: (listingData as any).min_hours || 1,
            maxHours: (listingData as any).max_hours || 24,
            bufferTimeMins: (listingData as any).buffer_time_mins || 0,
            minNoticeHours: (listingData as any).min_notice_hours || 0,
            operatingHoursStart: (listingData as any).operating_hours_start,
            operatingHoursEnd: (listingData as any).operating_hours_end,
            priceDaily: listingData.price_daily,
            priceWeekly: listingData.price_weekly,
          });
        }

        // Fetch existing confirmed bookings
        const { data: bookings } = await supabase
          .from('booking_requests')
          .select('start_date, end_date, start_time, end_time, is_hourly_booking')
          .eq('listing_id', listingId)
          .in('status', ['approved', 'completed', 'pending'])
          .in('payment_status', ['paid', 'pending']);

        if (bookings) {
          setExistingBookings(bookings.map(b => ({
            date: b.start_date,
            startTime: (b as any).start_time,
            endTime: (b as any).end_time,
            isHourly: (b as any).is_hourly_booking || false,
          })));
        }

        // Fetch blocked dates (full day blocks)
        const { data: blockedData } = await supabase
          .from('listing_blocked_dates')
          .select('blocked_date')
          .eq('listing_id', listingId);

        if (blockedData) {
          setBlockedDates(blockedData.map(d => d.blocked_date));
        }

        // Fetch blocked time slots
        const { data: blockedTimes } = await supabase
          .from('listing_blocked_times')
          .select('blocked_date, start_time, end_time')
          .eq('listing_id', listingId);

        if (blockedTimes) {
          setBlockedTimeSlots(blockedTimes.map(t => ({
            date: t.blocked_date,
            startTime: t.start_time,
            endTime: t.end_time,
          })));
        }
      } catch (error) {
        console.error('Error fetching hourly availability:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [listingId]);

  // Check if a specific date has any daily booking (blocks all hourly)
  const hasDailyBookingOnDate = (date: Date): boolean => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return existingBookings.some(b => 
      !b.isHourly && b.date <= dateStr && b.date >= dateStr
    );
  };

  // Check if a date has any hourly booking (blocks daily for that date)
  const hasHourlyBookingOnDate = (date: Date): boolean => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return existingBookings.some(b => b.isHourly && b.date === dateStr);
  };

  // Get available time windows for a specific date
  const getAvailableWindowsForDate = (date: Date): TimeWindow[] => {
    if (!settings.hourlyEnabled) return [];
    
    const dateStr = format(date, 'yyyy-MM-dd');
    
    // If date is blocked or has daily booking, no hourly slots available
    if (blockedDates.includes(dateStr) || hasDailyBookingOnDate(date)) {
      return [];
    }

    // Default operating hours: 6 AM to 10 PM
    const opStart = settings.operatingHoursStart ? parseInt(settings.operatingHoursStart.split(':')[0]) : 6;
    const opEnd = settings.operatingHoursEnd ? parseInt(settings.operatingHoursEnd.split(':')[0]) : 22;

    // Build array of all hours in operating range
    const allHours: boolean[] = new Array(24).fill(false);
    for (let h = opStart; h < opEnd; h++) {
      allHours[h] = true;
    }

    // Block hours that are already booked
    const hourlyBookingsToday = existingBookings.filter(b => b.isHourly && b.date === dateStr);
    hourlyBookingsToday.forEach(booking => {
      if (booking.startTime && booking.endTime) {
        const startHour = parseInt(booking.startTime.split(':')[0]);
        const endHour = parseInt(booking.endTime.split(':')[0]);
        // Add buffer time
        const bufferHours = Math.ceil(settings.bufferTimeMins / 60);
        const actualStart = Math.max(0, startHour - bufferHours);
        const actualEnd = Math.min(24, endHour + bufferHours);
        for (let h = actualStart; h < actualEnd; h++) {
          allHours[h] = false;
        }
      }
    });

    // Block hours from blocked time slots
    const blockedTimesToday = blockedTimeSlots.filter(t => t.date === dateStr);
    blockedTimesToday.forEach(slot => {
      const startHour = parseInt(slot.startTime.split(':')[0]);
      const endHour = parseInt(slot.endTime.split(':')[0]);
      for (let h = startHour; h < endHour; h++) {
        allHours[h] = false;
      }
    });

    // Check minimum notice
    const now = new Date();
    if (format(date, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd')) {
      const currentHour = now.getHours();
      const minStartHour = currentHour + settings.minNoticeHours;
      for (let h = 0; h <= minStartHour; h++) {
        allHours[h] = false;
      }
    }

    // Convert to windows
    const windows: TimeWindow[] = [];
    let windowStart: number | null = null;

    for (let h = 0; h <= 24; h++) {
      if (h < 24 && allHours[h] && windowStart === null) {
        windowStart = h;
      } else if ((h === 24 || !allHours[h]) && windowStart !== null) {
        // Only include windows that meet minimum hours
        const duration = h - windowStart;
        if (duration >= settings.minHours) {
          windows.push({
            start: `${windowStart.toString().padStart(2, '0')}:00`,
            end: `${h.toString().padStart(2, '0')}:00`,
            startHour: windowStart,
            endHour: h,
          });
        }
        windowStart = null;
      }
    }

    return windows;
  };

  // Get day availability info for calendar display
  const getDayAvailabilityInfo = (date: Date): DayAvailabilityInfo => {
    const dateStr = format(date, 'yyyy-MM-dd');
    
    // Check if fully blocked
    if (blockedDates.includes(dateStr)) {
      return {
        hasHourlySlots: false,
        hasFullDay: false,
        isLimited: false,
        isUnavailable: true,
        availableWindows: [],
        windowsSummary: '',
      };
    }

    const hasDaily = hasDailyBookingOnDate(date);
    const hasHourly = hasHourlyBookingOnDate(date);
    const windows = getAvailableWindowsForDate(date);

    // Full day is available if:
    // 1. Daily booking is enabled
    // 2. No existing hourly bookings on this date (strict mode)
    // 3. No blocked time slots on this date
    const hasBlockedTimes = blockedTimeSlots.some(t => t.date === dateStr);
    const fullDayAvailable = settings.dailyEnabled && !hasHourly && !hasDaily && !hasBlockedTimes;

    // Create summary for calendar cell
    let summary = '';
    if (windows.length > 0) {
      const displayWindows = windows.slice(0, 2);
      summary = displayWindows.map(w => {
        const startH = parseInt(w.start.split(':')[0]);
        const endH = parseInt(w.end.split(':')[0]);
        return `${startH > 12 ? startH - 12 : startH}${startH >= 12 ? 'p' : 'a'}–${endH > 12 ? endH - 12 : endH}${endH >= 12 ? 'p' : 'a'}`;
      }).join(', ');
      if (windows.length > 2) {
        summary += ` +${windows.length - 2}`;
      }
    }

    return {
      hasHourlySlots: settings.hourlyEnabled && windows.length > 0,
      hasFullDay: fullDayAvailable,
      isLimited: settings.hourlyEnabled && windows.length > 0 && !fullDayAvailable,
      isUnavailable: !fullDayAvailable && windows.length === 0,
      availableWindows: windows,
      windowsSummary: summary,
    };
  };

  // Check if a date is fully unavailable
  const isDateFullyUnavailable = (date: Date): boolean => {
    const info = getDayAvailabilityInfo(date);
    return info.isUnavailable;
  };

  // Calculate price for hourly booking
  const calculateHourlyPrice = (hours: number): number => {
    if (!settings.priceHourly) return 0;
    return hours * settings.priceHourly;
  };

  // Calculate price for daily booking
  const calculateDailyPrice = (days: number): number => {
    if (!settings.priceDaily) return 0;
    const weeks = Math.floor(days / 7);
    const remainingDays = days % 7;
    if (settings.priceWeekly && weeks > 0) {
      return (weeks * settings.priceWeekly) + (remainingDays * settings.priceDaily);
    }
    return days * settings.priceDaily;
  };

  return {
    settings,
    isLoading,
    existingBookings,
    blockedDates,
    blockedTimeSlots,
    getDayAvailabilityInfo,
    getAvailableWindowsForDate,
    isDateFullyUnavailable,
    hasDailyBookingOnDate,
    hasHourlyBookingOnDate,
    calculateHourlyPrice,
    calculateDailyPrice,
  };
};
