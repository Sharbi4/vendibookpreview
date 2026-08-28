import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { 
  format, 
  differenceInDays, 
  addDays, 
  isBefore, 
  startOfDay, 
  parseISO,
  addHours,
  isSameDay,
  addYears,
  isAfter,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  addMonths,
  subMonths,
  isToday} from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Zap, 
  Clock, 
  Minus,
  Plus,
  ChevronLeft,
  ChevronRight,
  CalendarClock,
  Info} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { calculateRentalFees } from '@/lib/commissions';
import { supabase } from '@/integrations/supabase/client';
import { quoteRentalPeriod, resolveRentalRate, formatAmount } from '@/lib/listings/rentalPricing';
import { useBlockedDates } from '@/hooks/useBlockedDates';
import { useToast } from '@/hooks/use-toast';
import { useHourlyAvailability } from '@/hooks/useHourlyAvailability';
import { todayInTimeZone, currentHourInTimeZone } from '@/lib/listingTimezone';
import { trackCTAClick } from '@/lib/analytics';
import { trackLeadEvent } from '@/lib/leadTracking';
import type { ListingCategory, FulfillmentType } from '@/types/listing';

interface RentalBookingWidgetProps {
  listingId: string;
  listingTitle: string;
  hostId: string;
  isOwner: boolean;
  category: ListingCategory;
  // Pricing
  priceDaily?: number | null;
  priceWeekly?: number | null;
  priceMonthly?: number | null;
  priceHourly?: number | null;
  // Availability settings
  availableFrom?: string | null;
  availableTo?: string | null;
  hourlyEnabled?: boolean;
  dailyEnabled?: boolean;
  instantBook?: boolean;
  /** Instant Book only stays instant when the host is identity verified. */
  hostIdentityVerified?: boolean;
  // Host-defined minimums
  minHours?: number | null;
  minDays?: number | null;
  minNoticeHours?: number | null;
  // Multi-slot support
  totalSlots?: number;
  slotNames?: string[] | null;
  // Fulfillment
  fulfillmentType?: FulfillmentType;
  deliveryFee?: number | null;
  // Refundable security deposit (charged today, held, refunded after rental)
  depositAmount?: number | null;
}

/**
 * Period pricing now lives in `@/lib/listings/rentalPricing` so the widget,
 * the checkout summary and the server quote can never disagree.
 */
export const RentalBookingWidget: React.FC<RentalBookingWidgetProps> = ({
  listingId,
  listingTitle,
  hostId,
  isOwner,
  category,
  priceDaily,
  priceWeekly,
  priceMonthly,
  priceHourly,
  availableFrom,
  availableTo,
  hourlyEnabled: hourlyEnabledProp = false,
  dailyEnabled: dailyEnabledProp = true,
  instantBook = false,
  hostIdentityVerified = false,
  minHours,
  minDays,
  minNoticeHours,
  totalSlots = 1,
  slotNames,
  fulfillmentType = 'pickup',
  deliveryFee,
  depositAmount = null}) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { blockedDates, isDateUnavailable, getUnavailabilityReason, timeZone, isLoading: availabilityLoading } = useBlockedDates({ listingId });
  const { 
    settings: hourlySettings, 
    getDayAvailabilityInfo,
    getAvailableWindowsForDate,
    getAvailableSlotsForDate} = useHourlyAvailability({ listingId });

  // ─────────────────────────────────────────────────────────────────────────────
  // DERIVED: Hourly/Daily availability based on BOTH props AND pricing
  // If priceHourly is set, treat listing as hourly-capable regardless of flag
  // If priceDaily is set, treat listing as daily-capable regardless of flag
  // ─────────────────────────────────────────────────────────────────────────────
  const hasHourlyPricing = !!priceHourly && priceHourly > 0;
  // A listing priced only weekly or only monthly is still date-bookable —
  // gating on `price_daily` alone hid the whole calendar for long-term leases.
  const hasDailyPricing =
    (!!priceDaily && priceDaily > 0) ||
    (!!priceWeekly && priceWeekly > 0) ||
    (!!priceMonthly && priceMonthly > 0);
  
  // Effective enabled states: explicit flag OR has pricing
  const hourlyEnabled = hourlyEnabledProp || hasHourlyPricing;
  const dailyEnabled = dailyEnabledProp || hasDailyPricing;

  // ─────────────────────────────────────────────────────────────────────────────
  // STATE: Duration Mode
  // ─────────────────────────────────────────────────────────────────────────────
  const [mode, setMode] = useState<'hourly' | 'daily'>('daily');

  /** Shortest bookable rate the host configured — drives the headline price. */
  const headlineRate = useMemo(
    () => resolveRentalRate({
      price_daily: priceDaily,
      price_weekly: priceWeekly,
      price_monthly: priceMonthly,
    }),
    [priceDaily, priceWeekly, priceMonthly],
  );
  
  // ─────────────────────────────────────────────────────────────────────────────
  // STATE: Date Selection
  // ─────────────────────────────────────────────────────────────────────────────
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  
  // ─────────────────────────────────────────────────────────────────────────────
  // STATE: Hourly Time Slots (Multi-day support)
  // Map of date string (yyyy-MM-dd) → array of selected time slots (HH:mm)
  // ─────────────────────────────────────────────────────────────────────────────
  const [hourlySelections, setHourlySelections] = useState<Record<string, string[]>>({});
  const [activeHourlyDate, setActiveHourlyDate] = useState<Date | undefined>(); // Currently viewing time slots for this date
  
  // ─────────────────────────────────────────────────────────────────────────────
  // STATE: Slot Selection (Multi-slot listings)
  // ─────────────────────────────────────────────────────────────────────────────
  const [selectedSlotCount, setSelectedSlotCount] = useState(1);
  const [selectedSlotNumber, setSelectedSlotNumber] = useState<number | null>(null);

  // ─────────────────────────────────────────────────────────────────────────────
  // EFFECTS
  // ─────────────────────────────────────────────────────────────────────────────
  
  // Set default mode based on what's enabled
  useEffect(() => {
    if (hourlyEnabled && !dailyEnabled) {
      setMode('hourly');
    } else {
      setMode('daily');
    }
  }, [hourlyEnabled, dailyEnabled]);

  // Smart default: pre-select tomorrow as start date for daily mode to reduce taps
  useEffect(() => {
    if (mode === 'daily' && !startDate && dailyEnabled) {
      const tomorrow = addDays(today, 1);
      if (!isDateDisabled(tomorrow)) {
        setStartDate(tomorrow);
      }
    }
  }, [mode, dailyEnabled]); // intentionally limited deps - run once on mount/mode change

  // Auto-select slot 1 for single-slot listings
  useEffect(() => {
    if (totalSlots === 1 && selectedSlotNumber === null) {
      setSelectedSlotNumber(1);
    }
  }, [totalSlots, selectedSlotNumber]);

  // ─────────────────────────────────────────────────────────────────────────────
  // CALENDAR HELPERS
  // ─────────────────────────────────────────────────────────────────────────────
  // "Today" follows the listing's local calendar, so the first selectable day
  // matches the host's timezone rather than the shopper's browser clock.
  const today = startOfDay(parseISO(todayInTimeZone(timeZone)));
  const maxDate = addYears(today, 1);
  const minMonth = startOfMonth(today);
  const maxMonth = startOfMonth(maxDate);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const firstDayOfWeek = monthStart.getDay();
  const paddingDays = Array(firstDayOfWeek).fill(null);

  const canGoPrev = isAfter(monthStart, minMonth);
  const canGoNext = isBefore(monthStart, maxMonth);

  // Month slide direction drives the transition animation
  const [monthDirection, setMonthDirection] = useState<1 | -1>(1);
  const handlePrevMonth = () => {
    if (!canGoPrev) return;
    setMonthDirection(-1);
    setCurrentMonth(subMonths(currentMonth, 1));
  };
  const handleNextMonth = () => {
    if (!canGoNext) return;
    setMonthDirection(1);
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  // Touch swipe to switch months on mobile
  const swipeRef = React.useRef<{ x: number; y: number } | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    swipeRef.current = { x: t.clientX, y: t.clientY };
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!swipeRef.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - swipeRef.current.x;
    const dy = t.clientY - swipeRef.current.y;
    swipeRef.current = null;
    // Horizontal swipe only — ignore mostly-vertical scroll gestures
    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx < 0) handleNextMonth();
      else handlePrevMonth();
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // DATE VALIDATION
  // ─────────────────────────────────────────────────────────────────────────────
  const isDateDisabled = (date: Date): boolean => {
    if (isBefore(date, today)) return true;
    if (isAfter(date, maxDate)) return true;
    
    if (availableFrom) {
      const from = parseISO(availableFrom);
      if (isBefore(date, startOfDay(from))) return true;
    }
    if (availableTo) {
      const to = parseISO(availableTo);
      if (isBefore(startOfDay(to), date)) return true;
    }
    
    return isDateUnavailable(date);
  };

  /**
   * Plain-language explanation of why a day can't be picked.
   * Returns null when the day is selectable.
   */
  const getDayBlockReason = (date: Date): string | null => {
    if (isBefore(date, today)) return 'This date has already passed.';
    if (isAfter(date, maxDate)) return 'Bookings open up to 12 months ahead.';
    if (availableFrom && isBefore(date, startOfDay(parseISO(availableFrom)))) {
      return `This rental becomes available ${format(startOfDay(parseISO(availableFrom)), 'MMM d, yyyy')}.`;
    }
    if (availableTo && isBefore(startOfDay(parseISO(availableTo)), date)) {
      return `This rental is only available through ${format(startOfDay(parseISO(availableTo)), 'MMM d, yyyy')}.`;
    }
    const reason = getUnavailabilityReason(date);
    if (reason) return reason.label;
    const info = getDayAvailabilityInfo(date);
    if (info.isUnavailable) return 'Fully booked — no spots left.';
    return null;
  };

  /**
   * First unavailable day after the chosen start date. A stay can never span
   * it, so every day from here on is locked while an end date is being picked.
   */
  const rangeLimit = useMemo(() => {
    if (mode !== 'daily' || !startDate) return null;
    for (let i = 1; i <= 400; i += 1) {
      const candidate = addDays(startDate, i);
      if (isAfter(candidate, maxDate)) return null;
      if (isDateDisabled(candidate)) return candidate;
    }
    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, startDate, blockedDates, isDateUnavailable, availableFrom, availableTo]);

  /** True when no day in the visible month is bookable — drives the empty state. */
  const monthFullyUnavailable = useMemo(() => {
    if (availabilityLoading) return false;
    return daysInMonth.every(d => {
      const s = getDayStatus(d);
      return s !== 'available' && s !== 'partial';
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availabilityLoading, currentMonth, blockedDates, availableFrom, availableTo]);

  /** True when the day sits past the first blocked day after the start date. */
  const isBeyondRangeLimit = (date: Date): boolean => {
    if (mode !== 'daily' || !startDate || endDate || !rangeLimit) return false;
    return isAfter(date, startDate) && !isBefore(date, rangeLimit);
  };

  const getDayStatus = (date: Date): 'available' | 'partial' | 'full' | 'past' | 'outside' => {
    if (isBefore(date, today)) return 'past';
    if (isAfter(date, maxDate)) return 'outside';
    
    if (isDateDisabled(date)) return 'full';

    const info = getDayAvailabilityInfo(date);
    if (info.isUnavailable) return 'full';
    if (info.isLimited) return 'partial';
    return 'available';
  };

  const getAvailability = (date: Date) => {
    const available = getAvailableSlotsForDate(date);
    return { available, total: totalSlots };
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // DERIVED: Total selected hours across all days (for multi-day hourly)
  // ─────────────────────────────────────────────────────────────────────────────
  const totalSelectedHours = useMemo(() => {
    return Object.values(hourlySelections).reduce((sum, slots) => sum + slots.length, 0);
  }, [hourlySelections]);

  const selectedDatesCount = useMemo(() => {
    return Object.keys(hourlySelections).filter(dateKey => hourlySelections[dateKey].length > 0).length;
  }, [hourlySelections]);

  // Get sorted list of dates with selections
  const sortedSelectedDates = useMemo(() => {
    return Object.keys(hourlySelections)
      .filter(dateKey => hourlySelections[dateKey].length > 0)
      .sort();
  }, [hourlySelections]);

  // Check if a date has hourly selections
  const hasHourlySelection = (date: Date): boolean => {
    const dateKey = format(date, 'yyyy-MM-dd');
    return (hourlySelections[dateKey]?.length || 0) > 0;
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // DATE CLICK HANDLING
  // ─────────────────────────────────────────────────────────────────────────────
  const handleDateClick = (date: Date) => {
    const status = getDayStatus(date);
    if (status === 'past' || status === 'outside' || status === 'full') {
      const reason = getDayBlockReason(date);
      if (reason) {
        toast({
          title: `${format(date, 'MMM d')} is unavailable`,
          description: reason,
        });
      }
      return;
    }
    if (isBeyondRangeLimit(date)) {
      toast({
        title: 'Your stay would cross an unavailable day',
        description: rangeLimit
          ? `${format(rangeLimit, 'MMM d')} is unavailable — ${getDayBlockReason(rangeLimit) ?? 'pick an earlier end date.'}`
          : 'Pick an earlier end date.',
      });
      return;
    }

    if (mode === 'hourly') {
      // Multi-day hourly: set active date to show time slots (preserve existing selections)
      setActiveHourlyDate(date);
    } else {
      // Date range selection for daily mode
      if (!startDate || (startDate && endDate)) {
        // Start fresh selection
        setStartDate(date);
        setEndDate(undefined);
      } else if (isBefore(date, startDate)) {
        // Clicked before start - reset
        setStartDate(date);
        setEndDate(undefined);
      } else if (isSameDay(date, startDate)) {
        // Same day clicked - single day booking
        setEndDate(date);
      } else {
        // Clicked after start - set end
        setEndDate(date);
      }
    }
  };

  const isInSelectedRange = (date: Date): boolean => {
    if (mode === 'hourly') {
      // In hourly mode, highlight dates that have time selections
      return hasHourlySelection(date);
    }
    if (!startDate) return false;
    if (!endDate) return isSameDay(date, startDate);
    return (isSameDay(date, startDate) || isAfter(date, startDate)) && 
           (isSameDay(date, endDate) || isBefore(date, endDate));
  };

  const isActiveHourlyDate = (date: Date): boolean => {
    return activeHourlyDate ? isSameDay(date, activeHourlyDate) : false;
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // HOURLY TIME SLOT HELPERS
  // ─────────────────────────────────────────────────────────────────────────────
  const availableTimeSlots = useMemo(() => {
    if (!activeHourlyDate || mode !== 'hourly') return [];
    
    const windows = getAvailableWindowsForDate(activeHourlyDate);
    const slots: { value: string; label: string; endLabel: string }[] = [];
    
    windows.forEach(window => {
      for (let h = window.startHour; h < window.endHour; h++) {
        const timeStr = `${h.toString().padStart(2, '0')}:00`;
        const endH = h + 1;
        const label = h === 0 ? '12:00 AM' : h < 12 ? `${h}:00 AM` : h === 12 ? '12:00 PM' : `${h - 12}:00 PM`;
        const endLabel = endH === 0 ? '12:00 AM' : endH < 12 ? `${endH}:00 AM` : endH === 12 ? '12:00 PM' : `${endH - 12}:00 PM`;
        slots.push({ value: timeStr, label, endLabel });
      }
    });
    
    return slots;
  }, [activeHourlyDate, mode, getAvailableWindowsForDate]);

  // Get currently selected time slots for the active date
  const activeSelectedTimeSlots = useMemo(() => {
    if (!activeHourlyDate) return [];
    const dateKey = format(activeHourlyDate, 'yyyy-MM-dd');
    return hourlySelections[dateKey] || [];
  }, [activeHourlyDate, hourlySelections]);

  const toggleTimeSlot = (slot: string) => {
    if (!activeHourlyDate) return;
    const dateKey = format(activeHourlyDate, 'yyyy-MM-dd');
    
    setHourlySelections(prev => {
      const currentSlots = prev[dateKey] || [];
      let newSlots: string[];
      
      if (currentSlots.includes(slot)) {
        newSlots = currentSlots.filter(s => s !== slot);
      } else {
        newSlots = [...currentSlots, slot].sort();
      }
      
      // If no slots remain for this date, remove the date entry
      if (newSlots.length === 0) {
        const { [dateKey]: _, ...rest } = prev;
        return rest;
      }
      
      return { ...prev, [dateKey]: newSlots };
    });
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // SLOT COUNTER HELPERS
  // ─────────────────────────────────────────────────────────────────────────────
  const handleSlotCountChange = (delta: number) => {
    const newCount = selectedSlotCount + delta;
    if (newCount >= 1 && newCount <= totalSlots) {
      setSelectedSlotCount(newCount);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // PRICING CALCULATION
  // ─────────────────────────────────────────────────────────────────────────────
  const pricingInfo = useMemo(() => {
    if (mode === 'hourly') {
      if (totalSelectedHours === 0 || !priceHourly) return null;
      
      const hours = totalSelectedHours;
      const basePrice = hours * priceHourly * selectedSlotCount;
      const fees = calculateRentalFees(basePrice);
      
      const daysLabel = selectedDatesCount > 1 ? ` across ${selectedDatesCount} days` : '';
      
      return {
        type: 'hourly' as const,
        duration: hours,
        durationLabel: `${hours} hour${hours > 1 ? 's' : ''}${daysLabel}`,
        breakdown: `$${priceHourly}/hr × ${hours} hrs${selectedSlotCount > 1 ? ` × ${selectedSlotCount} slots` : ''}`,
        lines: [
          {
            key: 'hourly',
            label: `${hours} hour${hours > 1 ? 's' : ''} @ ${formatAmount(priceHourly)}/hr`,
            amount: hours * priceHourly * selectedSlotCount,
          },
        ],
        perDay: null as number | null,
        roundedUpNote: null,
        basePrice,
        serviceFee: fees.renterFee,
        total: fees.customerTotal};

    } else {
      if (!startDate) return null;

      // Inclusive day counting: same start/end = 1 day
      const days = endDate ? differenceInDays(endDate, startDate) + 1 : 1;
      if (days <= 0) return null;

      const quote = quoteRentalPeriod(days, {
        price_daily: priceDaily,
        price_weekly: priceWeekly,
        price_monthly: priceMonthly,
      });
      if (!quote) return null;

      const basePrice = quote.subtotal * selectedSlotCount;
      const fees = calculateRentalFees(basePrice);

      return {
        type: 'daily' as const,
        duration: days,
        durationLabel: `${days} day${days > 1 ? 's' : ''}`,
        breakdown: selectedSlotCount > 1 ? `${quote.breakdown} × ${selectedSlotCount} slots` : quote.breakdown,
        lines: quote.lines.map((l) => ({
          key: l.unit,
          label: `${l.count} ${l.unit === 'monthly' ? 'month' : l.unit === 'weekly' ? 'week' : 'day'}${l.count > 1 ? 's' : ''} × ${formatAmount(l.rate)}${l.unit === 'monthly' ? '/mo' : l.unit === 'weekly' ? '/week' : '/day'}${selectedSlotCount > 1 ? ` × ${selectedSlotCount} slots` : ''}`,
          amount: l.amount * selectedSlotCount,
        })),
        perDay: days > 0 ? (quote.subtotal * selectedSlotCount) / days : null,
        roundedUpNote: quote.roundedUp
          ? `This host bills in full ${quote.lines[0]?.unit === 'monthly' ? 'months' : 'weeks'}, so ${quote.billedDays} days are billed for your ${days}-day dates.`
          : null,
        basePrice,
        serviceFee: fees.renterFee,
        total: fees.customerTotal};

    }
  }, [mode, totalSelectedHours, selectedDatesCount, startDate, endDate, priceHourly, priceDaily, priceWeekly, priceMonthly, selectedSlotCount]);

  // ─────────────────────────────────────────────────────────────────────────────
  // LIVE TAX ESTIMATE
  // Same `tax-quote` source the checkout summary uses, so the renter never sees
  // the total jump between this widget and checkout. Cosmetic only — the
  // authoritative amount is re-locked server-side at order creation.
  // ─────────────────────────────────────────────────────────────────────────────
  const [taxEstimate, setTaxEstimate] = useState<{ tax_cents: number; label: string } | null>(null);
  const [taxState, setTaxState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const quotedTotal = pricingInfo?.total ?? 0;

  useEffect(() => {
    if (!listingId || quotedTotal <= 0) {
      setTaxEstimate(null);
      setTaxState('idle');
      return;
    }
    const controller = new AbortController();
    setTaxState('loading');
    const t = setTimeout(() => {
      supabase.functions
        .invoke('tax-quote', {
          body: { kind: 'rental', listing_id: listingId, total_cents: Math.round(quotedTotal * 100) },
        })
        .then(({ data, error }) => {
          if (controller.signal.aborted) return;
          if (!error && data) {
            setTaxEstimate(data as { tax_cents: number; label: string });
            setTaxState('ready');
          } else {
            setTaxEstimate(null);
            setTaxState('error');
          }
        })
        .catch(() => {
          if (!controller.signal.aborted) {
            setTaxEstimate(null);
            setTaxState('error');
          }
        });
    }, 400);
    return () => { clearTimeout(t); controller.abort(); };
  }, [listingId, quotedTotal]);

  const taxAmount = (taxEstimate?.tax_cents ?? 0) / 100;
  // The refundable security deposit is charged today and held; it is part of
  // the total the renter sees here so it matches the PayPal capture amount.
  const depositValue = depositAmount ?? 0;
  const estimatedTotal = quotedTotal + taxAmount + depositValue;

  // ─────────────────────────────────────────────────────────────────────────────
  // CAN CONTINUE CHECK
  // ─────────────────────────────────────────────────────────────────────────────
  // Host-defined minimums (normalized)
  const requiredHours = Math.max(1, Number(minHours) > 0 ? Number(minHours) : 1);
  const requiredDays = Math.max(1, Number(minDays) > 0 ? Number(minDays) : 1);
  const noticeHours = Number(minNoticeHours) > 0 ? Number(minNoticeHours) : 0;

  const selectedDays = useMemo(() => {
    if (mode !== 'daily' || !startDate) return 0;
    return endDate ? differenceInDays(endDate, startDate) + 1 : 1;
  }, [mode, startDate, endDate]);

  const noticeViolation = useMemo(() => {
    if (noticeHours <= 0) return false;
    // Minimum notice measured from the listing's local clock.
    const localNow = addHours(parseISO(todayInTimeZone(timeZone)), currentHourInTimeZone(timeZone));
    const earliest = addHours(localNow, noticeHours);
    const firstDate = mode === 'hourly'
      ? (sortedSelectedDates[0] ? parseISO(sortedSelectedDates[0]) : undefined)
      : startDate;
    if (!firstDate) return false;
    // Compare against end of the selected day so same-day notice windows still work
    return isBefore(addDays(startOfDay(firstDate), 1), earliest);
  }, [noticeHours, mode, sortedSelectedDates, startDate, timeZone]);

  const minimumMessage = useMemo(() => {
    if (mode === 'hourly') {
      if (totalSelectedHours > 0 && totalSelectedHours < requiredHours) {
        return `This host requires a minimum of ${requiredHours} hour${requiredHours > 1 ? 's' : ''}.`;
      }
    } else if (startDate && selectedDays < requiredDays) {
      return `This host requires a minimum of ${requiredDays} day${requiredDays > 1 ? 's' : ''}.`;
    }
    if (noticeViolation) {
      return `This host requires at least ${noticeHours} hour${noticeHours > 1 ? 's' : ''} advance notice.`;
    }
    return null;
  }, [mode, totalSelectedHours, requiredHours, startDate, selectedDays, requiredDays, noticeViolation, noticeHours]);

  const canContinue = useMemo(() => {
    if (noticeViolation) return false;
    if (mode === 'hourly') {
      return totalSelectedHours >= requiredHours;
    }
    // Daily mode: need a start date meeting the host's minimum stay
    return startDate !== undefined && selectedDays >= requiredDays;
  }, [mode, totalSelectedHours, requiredHours, startDate, selectedDays, requiredDays, noticeViolation]);

  // ─────────────────────────────────────────────────────────────────────────────
  // BOOKING FLOW: instant book vs request to book
  // Instant Book is a host setting, but it only holds when the host is verified
  // and the selected dates are cleanly available. Anything else falls back to a
  // request the host must approve — the same rule checkout enforces.
  // ─────────────────────────────────────────────────────────────────────────────
  const bookingFlow = useMemo(() => {
    if (!instantBook) {
      return {
        instant: false as const,
        reason: 'This host reviews every request before confirming.',
      };
    }
    if (!hostIdentityVerified) {
      return {
        instant: false as const,
        reason: 'Instant Book turns on once this host finishes identity verification.',
      };
    }

    const selectedDates = mode === 'hourly'
      ? sortedSelectedDates.map(key => parseISO(key))
      : startDate
        ? eachDayOfInterval({ start: startDate, end: endDate ?? startDate })
        : [];

    // Multi-slot: instant confirmation needs the full requested capacity free.
    if (totalSlots > 1 && selectedDates.length > 0) {
      const tight = selectedDates.find(day => getAvailability(day).available < selectedSlotCount);
      if (tight) {
        return {
          instant: false as const,
          reason: `Limited spots left on ${format(tight, 'MMM d')} — the host confirms this one manually.`,
        };
      }
    }

    // Partially booked days (hourly listings) always need host review.
    if (mode === 'hourly' && selectedDates.some(day => getDayAvailabilityInfo(day).isLimited)) {
      return {
        instant: false as const,
        reason: 'Part of your selected time is already booked — the host will confirm.',
      };
    }

    return { instant: true as const, reason: null };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    instantBook,
    hostIdentityVerified,
    mode,
    sortedSelectedDates,
    startDate,
    endDate,
    totalSlots,
    selectedSlotCount,
    blockedDates,
  ]);

  const isInstant = bookingFlow.instant;

  // ─────────────────────────────────────────────────────────────────────────────
  // CONTINUE TO BOOKING HANDLER
  // ─────────────────────────────────────────────────────────────────────────────
  const handleContinue = () => {
    trackCTAClick('continue_booking', 'rental_booking_widget');
    
    if (mode === 'hourly') {
      if (totalSelectedHours === 0) return;
      
      // For multi-day hourly, encode all selections
      // Format: hourlyData=date1:slot1,slot2|date2:slot3,slot4
      const hourlyDataParts = sortedSelectedDates.map(dateKey => {
        const slots = hourlySelections[dateKey].sort().join(',');
        return `${dateKey}:${slots}`;
      });
      
      const params = new URLSearchParams({
        start: sortedSelectedDates[0],
        end: sortedSelectedDates[sortedSelectedDates.length - 1],
        hours: totalSelectedHours.toString(),
        hourlyData: hourlyDataParts.join('|')});
      
      // Add slot info for multi-slot
      if (totalSlots > 1 && selectedSlotNumber) {
        const slotName = slotNames?.[selectedSlotNumber - 1] || `Spot ${selectedSlotNumber}`;
        params.set('slot', selectedSlotNumber.toString());
        params.set('slotName', slotName);
        params.set('slotCount', selectedSlotCount.toString());
      }
      
      if (!isInstant) params.set('flow', 'request');
      navigate(`/book/${listingId}?${params.toString()}`);
    } else {
      if (!startDate) return;

      // Final guard: never send a range that crosses an unavailable day.
      const conflict = eachDayOfInterval({ start: startDate, end: endDate ?? startDate })
        .find(day => isDateDisabled(day));
      if (conflict) {
        toast({
          title: 'Those dates are not available',
          description: `${format(conflict, 'MMM d')} is unavailable — ${getDayBlockReason(conflict) ?? 'please choose different dates.'}`,
          variant: 'destructive',
        });
        setEndDate(undefined);
        return;
      }

      const startStr = format(startDate, 'yyyy-MM-dd');
      const endStr = endDate ? format(endDate, 'yyyy-MM-dd') : startStr;
      
      const params = new URLSearchParams({
        start: startStr,
        end: endStr});
      
      // Add slot info for multi-slot
      if (totalSlots > 1 && selectedSlotNumber) {
        const slotName = slotNames?.[selectedSlotNumber - 1] || `Spot ${selectedSlotNumber}`;
        params.set('slot', selectedSlotNumber.toString());
        params.set('slotName', slotName);
        params.set('slotCount', selectedSlotCount.toString());
      }
      
      if (!isInstant) params.set('flow', 'request');
      navigate(`/book/${listingId}?${params.toString()}`);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // RESET HANDLER
  // ─────────────────────────────────────────────────────────────────────────────
  const handleReset = () => {
    setStartDate(undefined);
    setEndDate(undefined);
    setActiveHourlyDate(undefined);
    setHourlySelections({});
    setSelectedSlotCount(1);
    if (totalSlots > 1) {
      setSelectedSlotNumber(null);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // OWNER VIEW
  // ─────────────────────────────────────────────────────────────────────────────
  if (isOwner) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 p-6"
      >
        <div className="space-y-4">
          <div className="text-center space-y-2">
            <h3 className="font-semibold text-foreground">This is your listing</h3>
            <p className="text-sm text-muted-foreground">
              Guests will see the booking widget; you can still verify your saved pricing below.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-background/60 p-4">
            <p className="text-sm font-medium text-foreground mb-2">Saved pricing</p>
            <div className="space-y-1 text-sm text-muted-foreground">
              {hourlyEnabled && priceHourly ? (
                <div className="flex items-center justify-between gap-3">
                  <span>Hourly</span>
                  <span className="font-medium text-foreground">${priceHourly.toLocaleString()}/hr</span>
                </div>
              ) : null}
              {dailyEnabled && priceDaily ? (
                <div className="flex items-center justify-between gap-3">
                  <span>Daily</span>
                  <span className="font-medium text-foreground">${priceDaily.toLocaleString()}/day</span>
                </div>
              ) : null}
              {!((hourlyEnabled && priceHourly) || (dailyEnabled && priceDaily)) && (
                <p className="text-sm text-muted-foreground">No pricing is set yet.</p>
              )}
            </div>
          </div>

          <Button variant="outline" className="w-full" asChild>
            <a href={`/edit-listing/${listingId}`}>Manage Listing</a>
          </Button>
        </div>
      </motion.div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 100, damping: 20 }}
      className="rounded-xl border border-border bg-card overflow-hidden relative shadow-sm"
    >
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* HEADER - PRICE DISPLAY (compact, Airbnb-style) */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <div className="px-4 pt-4 pb-3 border-b border-border/60">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-baseline gap-1.5">
            {mode === 'hourly' && priceHourly ? (
              <>
                <span className="text-xl font-semibold text-foreground">
                  ${priceHourly?.toLocaleString() || '—'}
                </span>
                <span className="text-sm text-muted-foreground">/ hour</span>
              </>
            ) : (
              <>
                <span className="text-xl font-semibold text-foreground">
                  {headlineRate ? formatAmount(headlineRate.amount) : '—'}
                </span>
                <span className="text-sm text-muted-foreground">
                  {headlineRate ? headlineRate.suffix.replace('/', '/ ').trim() : '/ day'}
                </span>
              </>
            )}
          </div>

          {/* Badges */}
          <div className="flex gap-1.5 items-center">
            {isInstant && (
              <Badge className="bg-emerald-500 text-white border-0 text-[10px] px-1.5 py-0.5">
                <Zap className="h-2.5 w-2.5 mr-0.5" />
                Instant
              </Badge>
            )}
            {totalSlots > 1 && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">
                {totalSlots} spots
              </Badge>
            )}
          </div>
        </div>

        {/* Rate strip — every published rate in one compact line */}
        {mode !== 'hourly' && (priceDaily || priceWeekly || priceMonthly) ? (
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {priceDaily ? <span><span className="font-medium text-foreground">${priceDaily.toLocaleString()}</span> /day</span> : null}
            {priceWeekly ? <span><span className="font-medium text-foreground">${priceWeekly.toLocaleString()}</span> /week</span> : null}
            {priceMonthly ? <span><span className="font-medium text-foreground">${priceMonthly.toLocaleString()}</span> /month</span> : null}
          </div>
        ) : null}
        {mode === 'hourly' && priceDaily ? (
          <p className="mt-1 text-xs text-muted-foreground">
            Full day from ${priceDaily.toLocaleString()}
          </p>
        ) : null}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* BODY - BOOKING FLOW */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <div className="p-4 space-y-3 relative z-10">
        
        {/* ─────────────────────────────────────────────────────────────────────── */}
        {/* STEP 1: MODE TOGGLE (Only if both modes enabled) */}
        {/* ─────────────────────────────────────────────────────────────────────── */}
        {hourlyEnabled && dailyEnabled && (
          <div className="flex rounded-full bg-muted/60 p-0.5">
            <button
              onClick={() => { setMode('hourly'); handleReset(); }}
              className={cn(
                "flex-1 py-1.5 px-3 text-xs font-medium rounded-full transition-all duration-200",
                mode === 'hourly' 
                  ? "bg-background text-foreground shadow-sm" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Hourly
            </button>
            <button
              onClick={() => { setMode('daily'); handleReset(); }}
              className={cn(
                "flex-1 py-1.5 px-3 text-xs font-medium rounded-full transition-all duration-200",
                mode === 'daily' 
                  ? "bg-background text-foreground shadow-sm" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Daily / Weekly
            </button>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────────────── */}
        {/* STEP 2: CALENDAR (compact Airbnb-style) */}
        {/* ─────────────────────────────────────────────────────────────────────── */}
        <div
          className="rounded-xl border border-border/60 p-2.5 overflow-hidden"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Calendar Header */}
          <div className="flex items-center justify-between mb-1.5">
            <button
              onClick={handlePrevMonth}
              disabled={!canGoPrev}
              aria-label="Previous month"
              className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-muted active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <AnimatePresence mode="wait" initial={false} custom={monthDirection}>
              <motion.span
                key={format(currentMonth, 'yyyy-MM')}
                initial={{ opacity: 0, y: monthDirection * 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: monthDirection * -6 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className="font-medium text-xs"
              >
                {format(currentMonth, 'MMMM yyyy')}
              </motion.span>
            </AnimatePresence>
            <button
              onClick={handleNextMonth}
              disabled={!canGoNext}
              aria-label="Next month"
              className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-muted active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Weekday Headers */}
          <div className="grid grid-cols-7 mb-0.5">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
              <div key={`${day}-${i}`} className="text-center text-[9px] font-medium text-muted-foreground py-0.5">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid — skeleton while availability loads, slide on month change */}
          {availabilityLoading ? (
            <div className="grid grid-cols-7 gap-y-1 animate-pulse" aria-busy="true" aria-label="Loading availability">
              {paddingDays.map((_, i) => (
                <div key={`pad-${i}`} />
              ))}
              {daysInMonth.map(date => (
                <div key={`skel-${date.toISOString()}`} className="h-9 w-9 mx-auto rounded-full bg-muted/70" />
              ))}
            </div>
          ) : (
          <AnimatePresence mode="popLayout" initial={false} custom={monthDirection}>
          <motion.div
            key={format(currentMonth, 'yyyy-MM')}
            custom={monthDirection}
            initial={{ opacity: 0, x: monthDirection * 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: monthDirection * -40 }}
            transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
            className="grid grid-cols-7 gap-y-0.5"
          >
            {paddingDays.map((_, i) => (
              <div key={`pad-${i}`} />
            ))}
            {daysInMonth.map(date => {
              const status = getDayStatus(date);
              const isSelected = isInSelectedRange(date);
              const isStart = !!(startDate && isSameDay(date, startDate));
              const isEnd = !!(endDate && isSameDay(date, endDate));
              const isRangeMiddle = isSelected && !isStart && !isEnd;
              const { available } = getAvailability(date);
              const beyondLimit = isBeyondRangeLimit(date);
              const isDisabled = status === 'past' || status === 'outside' || status === 'full' || beyondLimit;
              const blockReason = beyondLimit
                ? `Your stay can't continue past ${rangeLimit ? format(rangeLimit, 'MMM d') : 'this date'} — ${rangeLimit ? (getDayBlockReason(rangeLimit) ?? 'that day is unavailable.') : 'a later day is unavailable.'}`
                : getDayBlockReason(date);
              const isActiveHourly = isActiveHourlyDate(date);
              const hasHourly = mode === 'hourly' && hasHourlySelection(date);
              const dateKey = format(date, 'yyyy-MM-dd');
              const hoursOnDate = hourlySelections[dateKey]?.length || 0;

              return (
                <TooltipProvider key={date.toISOString()}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => handleDateClick(date)}
                        disabled={isDisabled}
                        data-testid="rental-calendar-day"
                        data-day-key={dateKey}
                        data-day-status={status}
                        data-day-disabled={isDisabled ? 'true' : 'false'}
                        aria-disabled={isDisabled}
                        aria-label={
                          isDisabled
                            ? `${format(date, 'EEEE, MMMM d')} — unavailable. ${blockReason ?? ''}`.trim()
                            : format(date, 'EEEE, MMMM d')
                        }
                        className={cn(
                          "h-8 w-8 mx-auto rounded-full text-[11px] font-medium transition-all relative",
                          "flex flex-col items-center justify-center",
                          isDisabled && "opacity-30 cursor-not-allowed line-through",
                          beyondLimit && "opacity-40 no-underline",
                          !isDisabled && !isSelected && !isActiveHourly && "hover:ring-1 hover:ring-foreground",
                          (isStart || isEnd) && "bg-foreground text-background",
                          isRangeMiddle && "rounded-none w-full bg-muted text-foreground",
                          isActiveHourly && !isSelected && "ring-1 ring-foreground bg-muted",
                          status === 'partial' && !isSelected && !isActiveHourly && "bg-muted/60",
                          isToday(date) && !isSelected && !isActiveHourly && "ring-1 ring-foreground/40",
                        )}
                      >
                        <span>{format(date, 'd')}</span>
                        {/* Slot availability indicator for multi-slot OR hourly selection indicator */}
                        {mode === 'hourly' && hasHourly && (
                          <span className={cn(
                            "text-[8px] leading-none font-bold",
                            (isStart || isEnd) ? "text-background" : "text-foreground"
                          )}>
                            {hoursOnDate}h
                          </span>
                        )}
                        {mode !== 'hourly' && totalSlots > 1 && status !== 'past' && status !== 'outside' && (
                          <span className={cn(
                            "text-[8px] leading-none",
                            (isStart || isEnd) ? "text-background/80" : "text-muted-foreground"
                          )}>
                            {available}/{totalSlots}
                          </span>
                        )}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[220px] text-xs">
                      {isDisabled ? (
                        <span className="block">
                          <span className="block font-medium">{format(date, 'EEE, MMM d')} · Unavailable</span>
                          <span className="block text-muted-foreground">{blockReason ?? 'Not available for booking.'}</span>
                        </span>
                      ) : (
                        <>
                          {mode === 'hourly' && hasHourly && `${hoursOnDate} hour${hoursOnDate > 1 ? 's' : ''} selected`}
                          {mode === 'hourly' && !hasHourly && 'Tap to select hours'}
                          {mode !== 'hourly' && status === 'partial' && `${available} of ${totalSlots} spots available`}
                          {mode !== 'hourly' && status === 'available' && `${available} spot${available > 1 ? 's' : ''} available`}
                        </>
                      )}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              );
            })}
          </motion.div>
          </AnimatePresence>
          )}

          {/* Empty state: nothing bookable in this month */}
          {!availabilityLoading && monthFullyUnavailable && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-2 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground text-center"
            >
              <CalendarClock className="h-3.5 w-3.5 shrink-0" />
              No open dates in {format(currentMonth, 'MMMM')} — try the next month.
            </motion.p>
          )}

          {/* Range selection hint (daily mode) */}
          {mode === 'daily' && !availabilityLoading && (
            <p className="mt-1.5 text-[11px] text-muted-foreground text-center" aria-live="polite">
              {!startDate
                ? 'Tap a date to start your stay'
                : !endDate
                  ? 'Now tap your end date — or continue for a 1-day rental'
                  : null}
            </p>
          )}

          {/* Date Selection Summary */}
          {mode === 'daily' && startDate && (
            <div className="mt-2 pt-2 border-t border-border/60 text-xs text-center">
              <span className="text-muted-foreground">
                {endDate 
                  ? `${format(startDate, 'MMM d')} → ${format(endDate, 'MMM d')} · ${pricingInfo?.durationLabel}`
                  : `${format(startDate, 'MMM d')} · tap an end date (or continue for 1 day)`
                }
              </span>
              {!endDate && rangeLimit && (
                <p className="mt-1 text-[11px] text-muted-foreground/90">
                  Available through {format(addDays(rangeLimit, -1), 'MMM d')} — {getDayBlockReason(rangeLimit)?.toLowerCase()} on {format(rangeLimit, 'MMM d')}.
                </p>
              )}
            </div>
          )}
          
          {mode === 'hourly' && totalSelectedHours > 0 && (
            <div className="mt-2 pt-2 border-t border-border/60 text-xs text-center">
              <span className="text-muted-foreground">
                {selectedDatesCount} day{selectedDatesCount > 1 ? 's' : ''} · {totalSelectedHours} hour{totalSelectedHours > 1 ? 's' : ''} total
              </span>
            </div>
          )}
          
          {mode === 'hourly' && activeHourlyDate && (
            <div className="mt-1.5 text-xs text-center">
              <span className="font-medium text-foreground">
                {format(activeHourlyDate, 'EEEE, MMMM d')}
              </span>
            </div>
          )}
        </div>

        {/* ─────────────────────────────────────────────────────────────────────── */}
        {/* STEP 2B: TIME SLOT GRID (Hourly mode only) */}
        {/* ─────────────────────────────────────────────────────────────────────── */}
        <AnimatePresence mode="wait">
          {mode === 'hourly' && activeHourlyDate && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-3"
            >
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-foreground">Select time slots</h4>
                {activeSelectedTimeSlots.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {activeSelectedTimeSlots.length} on this day
                  </Badge>
                )}
              </div>
              
              {availableTimeSlots.length > 0 ? (
                <div className="grid grid-cols-4 gap-1.5">
                  {availableTimeSlots.map(slot => {
                    const isSelected = activeSelectedTimeSlots.includes(slot.value);
                    return (
                      <button
                        key={slot.value}
                        onClick={() => toggleTimeSlot(slot.value)}
                        className={cn(
                          "py-2 px-1 rounded-md text-xs font-medium transition-all",
                          isSelected 
                            ? "bg-primary text-primary-foreground shadow-sm" 
                            : "bg-muted/50 text-foreground hover:bg-muted"
                        )}
                      >
                        {slot.label}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="p-4 bg-muted/30 rounded-xl text-center">
                  <Clock className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No time slots available for this date</p>
                </div>
              )}
              
              <p className="text-xs text-center text-muted-foreground">
                Tap another date on the calendar to add more hours
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─────────────────────────────────────────────────────────────────────── */}
        {/* STEP 3: SLOT COUNTER (Multi-slot listings only) */}
        {/* ─────────────────────────────────────────────────────────────────────── */}
        {totalSlots > 1 && (startDate || totalSelectedHours > 0) && (
          <div className="flex items-center justify-between p-2.5 bg-muted/30 rounded-lg">
            <div>
              <span className="text-xs font-medium text-foreground">Spots needed</span>
              <p className="text-[11px] text-muted-foreground">
                {totalSlots - selectedSlotCount} remaining
              </p>
            </div>
            <div className="flex items-center gap-2.5">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => handleSlotCountChange(-1)}
                disabled={selectedSlotCount <= 1}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="text-lg font-semibold w-6 text-center">{selectedSlotCount}</span>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => handleSlotCountChange(1)}
                disabled={selectedSlotCount >= totalSlots}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────────────── */}
        {/* PRICE BREAKDOWN */}
        {/* ─────────────────────────────────────────────────────────────────────── */}
        <AnimatePresence mode="wait">
          {pricingInfo && (
            <motion.div 
              key="breakdown"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="pt-1 space-y-1.5"
            >
              {pricingInfo.lines.map((line) => (
                <div
                  key={line.key}
                  className="flex items-center justify-between text-xs text-muted-foreground"
                >
                  <span className="underline decoration-dotted underline-offset-2">{line.label}</span>
                  <span className="tabular-nums">{formatAmount(line.amount)}</span>
                </div>
              ))}
              {pricingInfo.lines.length > 1 && (
                <div className="flex items-center justify-between text-xs text-foreground/80">
                  <span>Rental subtotal</span>
                  <span className="tabular-nums">{formatAmount(pricingInfo.basePrice)}</span>
                </div>
              )}
              {pricingInfo.perDay !== null && pricingInfo.duration > 1 && (
                <p className="text-[11px] text-muted-foreground">
                  Works out to {formatAmount(Math.round(pricingInfo.perDay * 100) / 100)}/day
                </p>
              )}
              {pricingInfo.roundedUpNote && (
                <p className="text-[11px] text-muted-foreground">{pricingInfo.roundedUpNote}</p>
              )}
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Service fee</span>
                <span className="tabular-nums">{formatAmount(pricingInfo.serviceFee)}</span>
              </div>

              {depositValue > 0 && (
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Security deposit (refundable)</span>
                  <span>${depositValue.toLocaleString()}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{taxEstimate?.label || 'Estimated sales tax'}</span>
                <span>
                  {taxAmount > 0
                    ? formatAmount(taxAmount)
                    : taxState === 'loading'
                      ? 'Calculating…'
                      : 'At payment'}
                </span>
              </div>
              <Separator className="bg-border/60" />
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground">
                  {isInstant ? 'Est. total' : 'Est. total to authorize'}
                </span>
                <span 
                  className="text-base font-semibold text-foreground"
                  data-testid="rental-widget-total"
                >
                  {formatAmount(estimatedTotal)}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {isInstant
                  ? 'Charged when your booking is confirmed. Any security deposit is charged today and held — refunded (minus damages/fees) after your rental.'
                  : 'Authorized now, not charged. Only charged if the host approves. Any security deposit is held and refunded (minus damages/fees) after your rental.'}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─────────────────────────────────────────────────────────────────────── */}
        {/* CTA BUTTON */}
        {/* ─────────────────────────────────────────────────────────────────────── */}
        {minimumMessage && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="relative rounded-xl p-px bg-gradient-to-r from-primary/70 via-orange-400/80 to-primary/70 shadow-[0_0_20px_-4px_hsl(var(--primary)/0.45)]"
          >
            <div className="flex items-center gap-2.5 rounded-[11px] bg-background/90 backdrop-blur-sm px-3.5 py-2.5">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30">
                <CalendarClock className="h-3.5 w-3.5 text-primary" />
              </div>
              <span className="text-xs font-medium tracking-wide text-foreground/90">{minimumMessage}</span>
            </div>
          </motion.div>
        )}

        <Button
          variant={isInstant ? 'dark-shine' : 'outline'}
          className={cn(
            'w-full h-11 text-sm font-semibold rounded-lg',
            !isInstant && 'border-foreground/60 hover:bg-muted/50'
          )}
          onClick={() => {
            trackLeadEvent('check_availability_click', {
              listing_id: listingId,
              source: 'rental_booking_widget',
              instant_book: isInstant,
              instant_book_setting: instantBook});
            handleContinue();
          }}
          disabled={!canContinue}
          data-testid="rental-widget-cta"
          data-instant-book={isInstant ? 'true' : 'false'}
          data-booking-flow={isInstant ? 'instant' : 'request'}
        >
          {isInstant ? 'Continue to book' : 'Continue to request'}
          {pricingInfo && (
            <span className="ml-1.5 opacity-80 font-normal">
              · {pricingInfo.durationLabel}
            </span>
          )}
        </Button>

        <p className="text-[11px] text-center text-muted-foreground">
          {isInstant
            ? "You won't be charged until your booking is confirmed."
            : 'Payment authorized now — only charged if the host approves.'}
        </p>
        {!isInstant && bookingFlow.reason && (
          <p className="text-[11px] text-center text-muted-foreground/90">
            {bookingFlow.reason}
          </p>
        )}
        {depositValue > 0 && (
          <p className="text-[11px] text-center text-muted-foreground">
            Security deposit charged today and held; refunded (minus damages/fees) after your rental.
          </p>
        )}
      </div>
    </motion.div>
  );
};

export default RentalBookingWidget;
