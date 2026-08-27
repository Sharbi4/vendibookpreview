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
  Calendar, 
  Zap, 
  ArrowRight, 
  Shield, 
  Clock, 
  Sun,
  CalendarRange,
  Minus,
  Plus,
  ChevronLeft,
  ChevronRight,
  Users,
  MapPin,
  CheckCircle,
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
import { calculateRentalFees, formatCurrency } from '@/lib/commissions';
import { supabase } from '@/integrations/supabase/client';
import { quoteRentalPeriod, resolveRentalRate, formatAmount } from '@/lib/listings/rentalPricing';
import { useBlockedDates } from '@/hooks/useBlockedDates';
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
  minHours,
  minDays,
  minNoticeHours,
  totalSlots = 1,
  slotNames,
  fulfillmentType = 'pickup',
  deliveryFee}) => {
  const navigate = useNavigate();
  const { blockedDates, isDateUnavailable, timeZone } = useBlockedDates({ listingId });
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
  // STATE: UI
  // ─────────────────────────────────────────────────────────────────────────────
  const [isHovered, setIsHovered] = useState(false);

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

  const handlePrevMonth = () => canGoPrev && setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => canGoNext && setCurrentMonth(addMonths(currentMonth, 1));

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
    if (status === 'past' || status === 'outside' || status === 'full') return;

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
  const estimatedTotal = quotedTotal + taxAmount;

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
      
      navigate(`/book/${listingId}?${params.toString()}`);
    } else {
      if (!startDate) return;
      
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
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className="rounded-[22px] border border-border/70 bg-card overflow-hidden relative shadow-[0_20px_60px_-30px_hsl(var(--foreground)/0.35)]"
    >
      {/* Glow effect */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 opacity-0 pointer-events-none"
        animate={{ opacity: isHovered ? 1 : 0 }}
        transition={{ duration: 0.3 }}
      />

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* HEADER - PRICE DISPLAY */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <div className="p-5 bg-gradient-to-br from-muted/50 to-muted/30 border-b border-border relative">
        <div className="flex items-start justify-between gap-3">
          <div>
            {mode === 'hourly' && priceHourly ? (
              <>
                <div className="flex items-baseline gap-2">
                  <motion.span 
                    className="text-3xl font-bold text-foreground"
                    initial={{ scale: 1 }}
                    whileHover={{ scale: 1.02 }}
                  >
                    ${priceHourly?.toLocaleString() || '—'}
                  </motion.span>
                  <span className="text-muted-foreground text-lg">/hour</span>
                </div>
                {priceDaily && (
                  <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
                    <Sun className="h-3.5 w-3.5 text-primary" />
                    Full day from ${priceDaily.toLocaleString()}
                  </p>
                )}
              </>
            ) : (
              <>
                <div className="flex items-baseline gap-2">
                  <motion.span 
                    className="text-3xl font-bold text-foreground"
                    initial={{ scale: 1 }}
                    whileHover={{ scale: 1.02 }}
                  >
                    {headlineRate ? formatAmount(headlineRate.amount) : '—'}
                  </motion.span>
                  <span className="text-muted-foreground text-lg">
                    {headlineRate ? headlineRate.suffix.replace('/', '/ ').trim() : '/day'}
                  </span>
                </div>
                
                {/* Tiered pricing indicators */}
                <div className="mt-1 space-y-0.5">
                  {priceHourly && hourlyEnabled && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-primary" />
                      ${priceHourly.toLocaleString()}/hr for hourly
                    </p>
                  )}
                  {priceDaily && headlineRate?.unit !== 'daily' && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                      <Sun className="h-3.5 w-3.5 text-primary" />
                      ${priceDaily.toLocaleString()}/day
                    </p>
                  )}
                  {priceWeekly && headlineRate?.unit !== 'weekly' && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                      
                      ${priceWeekly.toLocaleString()}/week for 7+ days
                    </p>
                  )}
                  {priceMonthly && headlineRate?.unit !== 'monthly' && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                      <CalendarRange className="h-3.5 w-3.5 text-primary" />
                      ${priceMonthly.toLocaleString()}/month for 30+ days
                    </p>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Badges */}
          <div className="flex flex-col gap-2 items-end">
            {instantBook && (
              <Badge className="bg-emerald-500 text-white border-0 shadow-md">
                <Zap className="h-3 w-3 mr-1" />
                Instant
              </Badge>
            )}
            {totalSlots > 1 && (
              <Badge variant="secondary" className="text-xs">
                <MapPin className="h-3 w-3 mr-1" />
                {totalSlots} Spots
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* BODY - BOOKING FLOW */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <div className="p-5 space-y-4 relative z-10">
        
        {/* ─────────────────────────────────────────────────────────────────────── */}
        {/* STEP 1: MODE TOGGLE (Only if both modes enabled) */}
        {/* ─────────────────────────────────────────────────────────────────────── */}
        {hourlyEnabled && dailyEnabled && (
          <div className="flex rounded-lg bg-muted/50 p-1">
            <button
              onClick={() => { setMode('hourly'); handleReset(); }}
              className={cn(
                "flex-1 py-2 px-3 text-sm font-medium rounded-md transition-all duration-200 flex items-center justify-center gap-1.5",
                mode === 'hourly' 
                  ? "bg-background text-foreground shadow-sm" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Clock className="h-4 w-4" />
              Hourly
            </button>
            <button
              onClick={() => { setMode('daily'); handleReset(); }}
              className={cn(
                "flex-1 py-2 px-3 text-sm font-medium rounded-md transition-all duration-200 flex items-center justify-center gap-1.5",
                mode === 'daily' 
                  ? "bg-background text-foreground shadow-sm" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Sun className="h-4 w-4" />
              Daily / Weekly
            </button>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────────────── */}
        {/* STEP 2: CALENDAR */}
        {/* ─────────────────────────────────────────────────────────────────────── */}
        <div className="bg-muted/30 rounded-xl p-3">
          {/* Calendar Header */}
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={handlePrevMonth}
              disabled={!canGoPrev}
              className="p-1.5 rounded-full hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="font-medium text-sm">
              {format(currentMonth, 'MMMM yyyy')}
            </span>
            <button
              onClick={handleNextMonth}
              disabled={!canGoNext}
              className="p-1.5 rounded-full hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Weekday Headers */}
          <div className="grid grid-cols-7 gap-0.5 mb-1">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
              <div key={day} className="text-center text-[10px] font-medium text-muted-foreground py-1">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-0.5">
            {paddingDays.map((_, i) => (
              <div key={`pad-${i}`} />
            ))}
            {daysInMonth.map(date => {
              const status = getDayStatus(date);
              const isSelected = isInSelectedRange(date);
              const isStart = startDate && isSameDay(date, startDate);
              const isEnd = endDate && isSameDay(date, endDate);
              const { available } = getAvailability(date);
              const isDisabled = status === 'past' || status === 'outside' || status === 'full';
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
                        className={cn(
                          "aspect-square p-0.5 rounded-md text-xs font-medium transition-all relative",
                          "flex flex-col items-center justify-center",
                          isDisabled && "opacity-30 cursor-not-allowed",
                          !isDisabled && !isSelected && !isActiveHourly && "hover:bg-muted",
                          isSelected && "bg-primary text-primary-foreground",
                          isActiveHourly && !isSelected && "ring-2 ring-primary bg-primary/10",
                          isStart && "rounded-l-md",
                          isEnd && "rounded-r-md",
                          status === 'partial' && !isSelected && !isActiveHourly && "bg-amber-50 dark:bg-amber-950/30",
                          isToday(date) && !isSelected && !isActiveHourly && "ring-1 ring-primary/50",
                        )}
                      >
                        <span>{format(date, 'd')}</span>
                        {/* Slot availability indicator for multi-slot OR hourly selection indicator */}
                        {mode === 'hourly' && hasHourly && (
                          <span className={cn(
                            "text-[8px] leading-none font-bold",
                            isSelected ? "text-primary-foreground" : "text-primary"
                          )}>
                            {hoursOnDate}h
                          </span>
                        )}
                        {mode !== 'hourly' && totalSlots > 1 && status !== 'past' && status !== 'outside' && (
                          <span className={cn(
                            "text-[8px] leading-none",
                            isSelected ? "text-primary-foreground/80" : "text-muted-foreground"
                          )}>
                            {available}/{totalSlots}
                          </span>
                        )}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      {mode === 'hourly' && hasHourly && `${hoursOnDate} hour${hoursOnDate > 1 ? 's' : ''} selected`}
                      {mode === 'hourly' && !hasHourly && status === 'available' && 'Tap to select hours'}
                      {mode !== 'hourly' && status === 'available' && `${available} spot${available > 1 ? 's' : ''} available`}
                      {status === 'partial' && `${available} of ${totalSlots} spots available`}
                      {status === 'full' && 'Fully booked'}
                      {status === 'past' && 'Past date'}
                      {status === 'outside' && 'Outside availability'}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              );
            })}
          </div>

          {/* Date Selection Summary */}
          {mode === 'daily' && startDate && (
            <div className="mt-3 pt-3 border-t border-border text-sm text-center">
              <span className="text-muted-foreground">
                {endDate 
                  ? `${format(startDate, 'MMM d')} → ${format(endDate, 'MMM d')} (${pricingInfo?.durationLabel})`
                  : `${format(startDate, 'MMM d')} (tap end date or continue for 1 day)`
                }
              </span>
            </div>
          )}
          
          {mode === 'hourly' && totalSelectedHours > 0 && (
            <div className="mt-3 pt-3 border-t border-border text-sm text-center">
              <span className="text-muted-foreground">
                {selectedDatesCount} day{selectedDatesCount > 1 ? 's' : ''} • {totalSelectedHours} hour{totalSelectedHours > 1 ? 's' : ''} total
              </span>
            </div>
          )}
          
          {mode === 'hourly' && activeHourlyDate && (
            <div className="mt-2 text-sm text-center">
              <span className="font-medium text-primary">
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
          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-xl">
            <div>
              <span className="text-sm font-medium text-foreground">Spots needed</span>
              <p className="text-xs text-muted-foreground">
                {totalSlots - selectedSlotCount} remaining
              </p>
            </div>
            <div className="flex items-center gap-3">
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
              className="p-4 bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl border border-primary/20 space-y-2"
            >
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>{pricingInfo.breakdown}</span>
                <span>${pricingInfo.basePrice.toLocaleString()}</span>
              </div>
              {pricingInfo.roundedUpNote && (
                <p className="text-xs text-muted-foreground">{pricingInfo.roundedUpNote}</p>
              )}
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Service fee</span>
                <span>${pricingInfo.serviceFee.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>{taxEstimate?.label || 'Estimated sales tax'}</span>
                <span>
                  {taxAmount > 0
                    ? formatAmount(taxAmount)
                    : taxState === 'loading'
                      ? 'Calculating…'
                      : 'Calculated at payment'}
                </span>
              </div>
              <Separator className="bg-primary/20" />
              <div className="flex items-center justify-between pt-1">
                <span className="font-semibold text-foreground">
                  {instantBook ? 'Est. total' : 'Est. total to authorize'}
                </span>
                <motion.span 
                  className="text-xl font-bold text-foreground"
                  initial={{ scale: 1 }}
                  whileHover={{ scale: 1.05 }}
                  data-testid="rental-widget-total"
                >
                  {formatAmount(estimatedTotal)}
                </motion.span>
              </div>
              <p className="text-xs text-muted-foreground">
                {instantBook
                  ? 'Charged when your booking is confirmed. Any security deposit is handled separately and is not charged today.'
                  : 'Authorized now, not charged. You are only charged if the host approves your request.'}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─────────────────────────────────────────────────────────────────────── */}
        {/* CTA BUTTON */}
        {/* ─────────────────────────────────────────────────────────────────────── */}
        {minimumMessage && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
            <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>{minimumMessage}</span>
          </div>
        )}

        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button
            variant={instantBook ? 'dark-shine' : 'outline'}
            className={cn(
              'w-full h-14 text-base font-semibold',
              instantBook ? 'shadow-lg' : 'border-primary/40 hover:bg-primary/5'
            )}
            size="lg"
            onClick={() => {
              trackLeadEvent('check_availability_click', {
                listing_id: listingId,
                source: 'rental_booking_widget',
                instant_book: instantBook});
              handleContinue();
            }}
            disabled={!canContinue}
            data-testid="rental-widget-cta"
            data-instant-book={instantBook ? 'true' : 'false'}
          >
            {instantBook ? (
              <>
                <Zap className="h-5 w-5 mr-2" />
                Continue to book
              </>
            ) : (
              'Continue to request'
            )}
            {pricingInfo && (
              <span className="ml-2 opacity-80">
                · {pricingInfo.durationLabel}
              </span>
            )}
            <ArrowRight className="h-5 w-5 ml-2" />
          </Button>
        </motion.div>

        <p className="text-xs text-center text-muted-foreground flex items-center justify-center gap-1.5">
          <Shield className="h-3.5 w-3.5" />
          {instantBook
            ? 'Instant Book — no host approval needed. Payment is taken when the booking is confirmed.'
            : 'Request to Book — payment authorized now, not charged. Only charged if the host approves.'}
        </p>

        {/* Trust indicators */}
        <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground pt-2">
          <span className="flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5" />
            Secure booking
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            Free cancellation
          </span>
        </div>
      </div>
    </motion.div>
  );
};

export default RentalBookingWidget;
