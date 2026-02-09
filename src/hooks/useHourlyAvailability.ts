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
  availableSlots?: number; // How many slots available in this window
}

interface HourlySlotData {
  date: string;
  slots: string[];
}

interface BookingSlot {
  date: string;
  endDate: string;
  startTime: string | null;
  endTime: string | null;
  isHourly: boolean;
  slotNumber: number | null;
  hourlySlots: HourlySlotData[] | null; // Multi-day hourly selections
}

interface BlockedTimeSlot {
  date: string;
  startTime: string;
  endTime: string;
}

// Weekly schedule types - matches listing wizard format
interface TimeRange {
  start: string; // HH:mm format
  end: string;   // HH:mm format
}

type DayOfWeek = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

type WeeklySchedule = {
  [key in DayOfWeek]?: TimeRange[];
};

interface ListingHourlySettings {
  priceHourly: number | null;
  hourlyEnabled: boolean;
  dailyEnabled: boolean;
  minHours: number;
  maxHours: number;
  bufferTimeMins: number;
  minNoticeHours: number;
  operatingHoursStart: string | null; // HH:mm - legacy fallback
  operatingHoursEnd: string | null;   // HH:mm - legacy fallback
  priceDaily: number | null;
  priceWeekly: number | null;
  totalSlots: number; // Total capacity slots for this listing
  hourlySchedule: WeeklySchedule | null; // Per-day operating hours from wizard
}

interface DayAvailabilityInfo {
  hasHourlySlots: boolean;
  hasFullDay: boolean;
  isLimited: boolean;
  isUnavailable: boolean;
  availableWindows: TimeWindow[];
  windowsSummary: string;
  availableSlots: number; // How many slots are still available
  totalSlots: number;
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
    totalSlots: 1,
    hourlySchedule: null,
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
        // Fetch listing settings including total_slots and hourly_schedule for capacity management
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
            price_weekly,
            total_slots,
            hourly_schedule
          `)
          .eq('id', listingId)
          .single();

        if (listingData) {
          const priceHourly = Number((listingData as any).price_hourly ?? 0) || null;
          const hourlyEnabled = Boolean((listingData as any).hourly_enabled) || (priceHourly !== null && priceHourly > 0);

          // Parse hourly_schedule from JSONB
          let hourlySchedule: WeeklySchedule | null = null;
          if ((listingData as any).hourly_schedule) {
            try {
              hourlySchedule = typeof (listingData as any).hourly_schedule === 'string'
                ? JSON.parse((listingData as any).hourly_schedule)
                : (listingData as any).hourly_schedule;
            } catch (e) {
              console.warn('Failed to parse hourly_schedule:', e);
            }
          }

          setSettings({
            priceHourly,
            hourlyEnabled,
            dailyEnabled: (listingData as any).daily_enabled !== false,
            minHours: (listingData as any).min_hours || 1,
            maxHours: (listingData as any).max_hours || 24,
            bufferTimeMins: (listingData as any).buffer_time_mins || 0,
            minNoticeHours: (listingData as any).min_notice_hours || 0,
            operatingHoursStart: (listingData as any).operating_hours_start,
            operatingHoursEnd: (listingData as any).operating_hours_end,
            priceDaily: listingData.price_daily,
            priceWeekly: listingData.price_weekly,
            totalSlots: listingData.total_slots || 1,
            hourlySchedule,
          });
        }

        // Fetch existing confirmed bookings including slot information and hourly_slots
        const { data: bookings } = await supabase
          .from('booking_requests')
          .select('start_date, end_date, start_time, end_time, is_hourly_booking, slot_number, hourly_slots')
          .eq('listing_id', listingId)
          .in('status', ['approved', 'completed', 'pending'])
          .in('payment_status', ['paid', 'pending']);

        if (bookings) {
          setExistingBookings(bookings.map(b => ({
            date: b.start_date,
            endDate: b.end_date,
            startTime: (b as any).start_time,
            endTime: (b as any).end_time,
            isHourly: (b as any).is_hourly_booking || false,
            slotNumber: b.slot_number,
            hourlySlots: (b as any).hourly_slots as HourlySlotData[] | null,
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

  // Count how many slots are booked for a specific date (daily bookings)
  const countDailyBookingsOnDate = (date: Date): number => {
    const dateStr = format(date, 'yyyy-MM-dd');
    // Count bookings that span this date (start_date <= date <= end_date)
    return existingBookings.filter(b => 
      !b.isHourly && b.date <= dateStr && b.endDate >= dateStr
    ).length;
  };

  // Check if a specific date has ALL slots booked with daily bookings
  const hasDailyBookingOnDate = (date: Date): boolean => {
    return countDailyBookingsOnDate(date) >= settings.totalSlots;
  };

  // Count how many slots have hourly bookings on a date
  // Supports both legacy (start_date match) and new (hourly_slots) formats
  const countHourlyBookingsOnDate = (date: Date): number => {
    const dateStr = format(date, 'yyyy-MM-dd');
    // Get unique slot numbers that have hourly bookings on this date
    const bookedSlots = new Set(
      existingBookings
        .filter(b => {
          if (!b.isHourly) return false;
          // Check hourly_slots for multi-day bookings
          if (b.hourlySlots && b.hourlySlots.length > 0) {
            return b.hourlySlots.some(s => s.date === dateStr && s.slots.length > 0);
          }
          // Legacy: check start_date
          return b.date === dateStr;
        })
        .map(b => b.slotNumber ?? 0) // null slot_number treated as slot 0
    );
    return bookedSlots.size;
  };

  // Check if a date has ANY hourly booking (for blocking daily on single-slot)
  // Supports both legacy and new hourly_slots formats
  const hasHourlyBookingOnDate = (date: Date): boolean => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return existingBookings.some(b => {
      if (!b.isHourly) return false;
      // Check hourly_slots for multi-day bookings
      if (b.hourlySlots && b.hourlySlots.length > 0) {
        return b.hourlySlots.some(s => s.date === dateStr && s.slots.length > 0);
      }
      // Legacy: check start_date
      return b.date === dateStr;
    });
  };

  // Get available slots count for a specific date
  const getAvailableSlotsForDate = (date: Date): number => {
    const dailyBooked = countDailyBookingsOnDate(date);
    return Math.max(0, settings.totalSlots - dailyBooked);
  };

  // Count hourly bookings for a specific hour on a date
  // Supports both legacy (start_time/end_time) and new (hourly_slots) formats
  const countHourlyBookingsForHour = (date: Date, hour: number): number => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const hourStr = `${hour.toString().padStart(2, '0')}:00`;
    
    return existingBookings.filter(b => {
      if (!b.isHourly) return false;
      
      // Check new multi-day hourly_slots format first
      if (b.hourlySlots && b.hourlySlots.length > 0) {
        const daySlots = b.hourlySlots.find(s => s.date === dateStr);
        if (daySlots && daySlots.slots.includes(hourStr)) {
          return true;
        }
        return false;
      }
      
      // Fallback to legacy start_time/end_time format
      if (b.date !== dateStr || !b.startTime || !b.endTime) return false;
      const startHour = parseInt(b.startTime.split(':')[0]);
      const endHour = parseInt(b.endTime.split(':')[0]);
      return hour >= startHour && hour < endHour;
    }).length;
  };

  // Get the day of week key for schedule lookup
  const getDayOfWeekKey = (date: Date): DayOfWeek => {
    const days: DayOfWeek[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    return days[date.getDay()];
  };

  // Get operating hours for a specific date from schedule or fallback
  const getOperatingHoursForDate = (date: Date): TimeRange[] => {
    const dayKey = getDayOfWeekKey(date);
    
    // Check hourly_schedule first (from wizard)
    if (settings.hourlySchedule && settings.hourlySchedule[dayKey]) {
      const dayRanges = settings.hourlySchedule[dayKey];
      if (dayRanges && dayRanges.length > 0) {
        return dayRanges;
      }
    }
    
    // Fallback to legacy operating_hours_start/end or defaults
    const opStart = settings.operatingHoursStart || '06:00';
    const opEnd = settings.operatingHoursEnd || '22:00';
    return [{ start: opStart, end: opEnd }];
  };

  // Get available time windows for a specific date with slot-aware logic
  const getAvailableWindowsForDate = (date: Date): TimeWindow[] => {
    if (!settings.hourlyEnabled) return [];
    
    const dateStr = format(date, 'yyyy-MM-dd');
    
    // If date is fully blocked, no hourly slots available
    if (blockedDates.includes(dateStr)) {
      return [];
    }

    // Check how many slots are available (not booked with daily bookings)
    const availableSlots = getAvailableSlotsForDate(date);
    if (availableSlots <= 0) {
      return []; // All slots have daily bookings
    }

    // Get operating hours for this specific day from schedule
    const operatingRanges = getOperatingHoursForDate(date);
    
    // If no operating hours for this day (closed), return empty
    if (!operatingRanges || operatingRanges.length === 0) {
      return [];
    }

    // Build array tracking available slots per hour
    const availableSlotsPerHour: number[] = new Array(24).fill(0);
    
    // Process each operating range for this day
    operatingRanges.forEach(range => {
      const opStart = parseInt(range.start.split(':')[0]);
      const opEnd = parseInt(range.end.split(':')[0]);
      
      for (let h = opStart; h < opEnd; h++) {
        // Start with available slots (not daily-booked)
        let slotsForHour = availableSlots;
      
        // Subtract hourly bookings that cover this hour
        const hourlyBookingsForThisHour = countHourlyBookingsForHour(date, h);
        slotsForHour -= hourlyBookingsForThisHour;
      
        // Apply buffer time from adjacent hourly bookings
        // Get all hourly bookings that affect this date (both legacy and hourly_slots)
        const hourlyBookingsToday = existingBookings.filter(b => {
          if (!b.isHourly) return false;
          if (b.hourlySlots && b.hourlySlots.length > 0) {
            return b.hourlySlots.some(s => s.date === dateStr && s.slots.length > 0);
          }
          return b.date === dateStr;
        });
      
        const bufferHours = Math.ceil(settings.bufferTimeMins / 60);
        if (bufferHours > 0) {
          hourlyBookingsToday.forEach(booking => {
            // For hourly_slots format, calculate buffer based on booked hours
            if (booking.hourlySlots && booking.hourlySlots.length > 0) {
              const daySlots = booking.hourlySlots.find(s => s.date === dateStr);
              if (daySlots && daySlots.slots.length > 0) {
                const bookedHours = daySlots.slots.map(s => parseInt(s.split(':')[0])).sort((a, b) => a - b);
                const firstHour = bookedHours[0];
                const lastHour = bookedHours[bookedHours.length - 1] + 1; // +1 because end of last hour
              
                // Check buffer before first booked hour
                if (h >= firstHour - bufferHours && h < firstHour) {
                  slotsForHour = Math.max(0, slotsForHour - 1);
                }
                // Check buffer after last booked hour
                if (h >= lastHour && h < lastHour + bufferHours) {
                  slotsForHour = Math.max(0, slotsForHour - 1);
                }
              }
            } else if (booking.startTime && booking.endTime) {
              // Legacy format
              const startHour = parseInt(booking.startTime.split(':')[0]);
              const endHour = parseInt(booking.endTime.split(':')[0]);
              // Check if this hour falls in the buffer zone
              if (h >= startHour - bufferHours && h < startHour) {
                slotsForHour = Math.max(0, slotsForHour - 1);
              }
              if (h >= endHour && h < endHour + bufferHours) {
                slotsForHour = Math.max(0, slotsForHour - 1);
              }
            }
          });
        }
      
        availableSlotsPerHour[h] = Math.max(0, slotsForHour);
      }
    });

    // Block hours from blocked time slots
    const blockedTimesToday = blockedTimeSlots.filter(t => t.date === dateStr);
    blockedTimesToday.forEach(slot => {
      const startHour = parseInt(slot.startTime.split(':')[0]);
      const endHour = parseInt(slot.endTime.split(':')[0]);
      for (let h = startHour; h < endHour; h++) {
        availableSlotsPerHour[h] = 0;
      }
    });

    // Check minimum notice for today
    const now = new Date();
    if (format(date, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd')) {
      const currentHour = now.getHours();
      const minStartHour = currentHour + settings.minNoticeHours;
      for (let h = 0; h <= minStartHour; h++) {
        availableSlotsPerHour[h] = 0;
      }
    }

    // Convert to windows - an hour is available if there's at least 1 slot
    const windows: TimeWindow[] = [];
    let windowStart: number | null = null;
    let minSlotsInWindow = settings.totalSlots;

    for (let h = 0; h <= 24; h++) {
      const hasAvailability = h < 24 && availableSlotsPerHour[h] > 0;
      
      if (hasAvailability && windowStart === null) {
        windowStart = h;
        minSlotsInWindow = availableSlotsPerHour[h];
      } else if (hasAvailability && windowStart !== null) {
        minSlotsInWindow = Math.min(minSlotsInWindow, availableSlotsPerHour[h]);
      } else if (!hasAvailability && windowStart !== null) {
        // Only include windows that meet minimum hours
        const duration = h - windowStart;
        if (duration >= settings.minHours) {
          windows.push({
            start: `${windowStart.toString().padStart(2, '0')}:00`,
            end: `${h.toString().padStart(2, '0')}:00`,
            startHour: windowStart,
            endHour: h,
            availableSlots: minSlotsInWindow,
          });
        }
        windowStart = null;
        minSlotsInWindow = settings.totalSlots;
      }
    }

    return windows;
  };

  // Get day availability info for calendar display with slot awareness
  const getDayAvailabilityInfo = (date: Date): DayAvailabilityInfo => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const availableSlots = getAvailableSlotsForDate(date);
    
    // Check if fully blocked
    if (blockedDates.includes(dateStr)) {
      return {
        hasHourlySlots: false,
        hasFullDay: false,
        isLimited: false,
        isUnavailable: true,
        availableWindows: [],
        windowsSummary: '',
        availableSlots: 0,
        totalSlots: settings.totalSlots,
      };
    }

    const allDailyBooked = availableSlots <= 0;
    const hasHourly = hasHourlyBookingOnDate(date);
    const windows = getAvailableWindowsForDate(date);

    // Full day is available if:
    // 1. Daily booking is enabled
    // 2. At least one slot is not hourly-booked on this date
    // 3. No blocked time slots on this date
    // 4. At least one slot is available (not daily-booked)
    const hasBlockedTimes = blockedTimeSlots.some(t => t.date === dateStr);
    
    // For single-slot listings, any hourly booking blocks full-day
    // For multi-slot listings, full-day is available if there are available slots without hourly bookings
    let fullDayAvailable = false;
    if (settings.dailyEnabled && !allDailyBooked && !hasBlockedTimes) {
      if (settings.totalSlots === 1) {
        // Single slot: any hourly booking blocks full day
        fullDayAvailable = !hasHourly;
      } else {
        // Multi-slot: check if any slot is completely free (no hourly bookings)
        const hourlyBookedSlots = countHourlyBookingsOnDate(date);
        fullDayAvailable = hourlyBookedSlots < availableSlots;
      }
    }

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
      // Add slot availability info for multi-slot listings
      if (settings.totalSlots > 1 && availableSlots < settings.totalSlots) {
        summary += ` (${availableSlots}/${settings.totalSlots})`;
      }
    }

    return {
      hasHourlySlots: settings.hourlyEnabled && windows.length > 0,
      hasFullDay: fullDayAvailable,
      isLimited: (settings.hourlyEnabled && windows.length > 0 && !fullDayAvailable) || (availableSlots < settings.totalSlots && availableSlots > 0),
      isUnavailable: !fullDayAvailable && windows.length === 0,
      availableWindows: windows,
      windowsSummary: summary,
      availableSlots,
      totalSlots: settings.totalSlots,
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
    getAvailableSlotsForDate,
    countDailyBookingsOnDate,
  };
};
