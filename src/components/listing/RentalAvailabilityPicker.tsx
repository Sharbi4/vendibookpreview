/**
 * RentalAvailabilityPicker
 *
 * Real booking surface wired to live availability. Supports:
 *  - Hourly bookings
 *  - Daily / multi-day
 *  - Weekly (snap to 7-day increments)
 *  - Monthly (month-range picker)
 *  - Month-to-month (start date + expected length)
 *
 * Long-range bookings validate the FULL selected window against blocked
 * dates and hourly availability before allowing the user to continue.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  format,
  differenceInDays,
  addDays,
  isBefore,
  isAfter,
  isSameDay,
  startOfDay,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  addMonths,
  subMonths,
  parseISO,
  addYears,
  lastDayOfMonth,
} from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Sun,
  Zap,
  Minus,
  Plus,
  ArrowRight,
  Shield,
  CalendarRange,
  Infinity as InfinityIcon,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBlockedDates } from '@/hooks/useBlockedDates';
import { useHourlyAvailability } from '@/hooks/useHourlyAvailability';
import { calculateRentalFees } from '@/lib/commissions';
import { trackLeadEvent } from '@/lib/leadTracking';

export interface RentalAvailabilityPickerProps {
  listingId: string;
  listingTitle?: string;
  category?: string;
  priceHourly?: number | null;
  priceDaily?: number | null;
  priceWeekly?: number | null;
  priceMonthly?: number | null;
  instantBook?: boolean;
  totalSlots?: number;
  slotNames?: string[] | null;
  availableFrom?: string | null;
  availableTo?: string | null;
  source?: string;
  onClose?: () => void;
}

type RentalLength = 'daily' | 'weekly' | 'monthly' | 'month_to_month';
type ExpectedLength = 1 | 2 | 3 | 6 | 12 | null;

const calculateTieredPrice = (
  days: number,
  priceDaily: number,
  priceWeekly?: number | null,
  priceMonthly?: number | null,
): { total: number; breakdown: string } => {
  if (!priceDaily || days <= 0) return { total: 0, breakdown: '' };
  let remaining = days;
  let total = 0;
  const parts: string[] = [];
  if (priceMonthly && remaining >= 30) {
    const months = Math.floor(remaining / 30);
    total += months * priceMonthly;
    parts.push(`${months}mo @ $${priceMonthly.toLocaleString()}`);
    remaining = remaining % 30;
  }
  if (priceWeekly && remaining >= 7) {
    const weeks = Math.floor(remaining / 7);
    total += weeks * priceWeekly;
    parts.push(`${weeks}wk @ $${priceWeekly.toLocaleString()}`);
    remaining = remaining % 7;
  }
  if (remaining > 0) {
    total += remaining * priceDaily;
    parts.push(`${remaining}d @ $${priceDaily.toLocaleString()}`);
  }
  return { total, breakdown: parts.join(' + ') };
};

const formatHourLabel = (hour: number): string => {
  if (hour === 0) return '12 AM';
  if (hour === 12) return '12 PM';
  return hour < 12 ? `${hour} AM` : `${hour - 12} PM`;
};

const MONTH_LABELS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const RentalAvailabilityPicker: React.FC<RentalAvailabilityPickerProps> = ({
  listingId,
  listingTitle,
  category,
  priceHourly,
  priceDaily,
  priceWeekly,
  priceMonthly,
  instantBook = false,
  totalSlots = 1,
  slotNames,
  availableFrom,
  availableTo,
  source = 'listing_card_availability_overlay',
  onClose,
}) => {
  const navigate = useNavigate();
  const { isDateUnavailable } = useBlockedDates({ listingId });
  const {
    settings,
    getDayAvailabilityInfo,
    getAvailableWindowsForDate,
  } = useHourlyAvailability({ listingId });

  const hasHourly = (!!priceHourly && priceHourly > 0) || settings.hourlyEnabled;
  const hasDaily = (!!priceDaily && priceDaily > 0) || settings.dailyEnabled;
  const hasWeekly = !!priceWeekly && priceWeekly > 0;
  const hasMonthly = !!priceMonthly && priceMonthly > 0;
  // Month-to-month requires monthly pricing as the signal
  const hasMonthToMonth = hasMonthly;

  const [mode, setMode] = useState<'hourly' | 'daily'>(
    hasHourly && !hasDaily ? 'hourly' : 'daily',
  );
  useEffect(() => {
    if (hasHourly && !hasDaily) setMode('hourly');
    else if (hasDaily && !hasHourly) setMode('daily');
  }, [hasHourly, hasDaily]);

  // Rental length only matters in daily mode
  const [rentalLength, setRentalLength] = useState<RentalLength>('daily');

  const today = startOfDay(new Date());
  const maxDate = addYears(today, 1);
  const [currentMonth, setCurrentMonth] = useState<Date>(today);
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  // Monthly mode: separate start/end month selection
  const [startMonth, setStartMonth] = useState<Date | undefined>();
  const [endMonth, setEndMonth] = useState<Date | undefined>();
  // Month-to-month
  const [expectedLength, setExpectedLength] = useState<ExpectedLength>(null);

  const [hourlySelections, setHourlySelections] = useState<Record<string, string[]>>({});
  const [activeHourlyDate, setActiveHourlyDate] = useState<Date | undefined>();
  const [selectedSlotCount, setSelectedSlotCount] = useState(1);
  const [selectedSlotNumber, setSelectedSlotNumber] = useState<number | null>(
    totalSlots === 1 ? 1 : null,
  );

  useEffect(() => {
    if (!listingId) return;
    trackLeadEvent('availability_overlay_opened' as any, {
      listing_id: listingId,
      listing_title: listingTitle,
      category,
      source,
    });
  }, [listingId, listingTitle, category, source]);

  // Reset selections when rental length changes
  useEffect(() => {
    setStartDate(undefined);
    setEndDate(undefined);
    setStartMonth(undefined);
    setEndMonth(undefined);
    setExpectedLength(null);
  }, [rentalLength]);

  // Calendar helpers
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const padding = Array(monthStart.getDay()).fill(null);
  const canPrev = isAfter(monthStart, startOfMonth(today));
  const canNext = isBefore(monthStart, startOfMonth(maxDate));

  const isDateDisabled = (date: Date): boolean => {
    if (isBefore(date, today)) return true;
    if (isAfter(date, maxDate)) return true;
    if (availableFrom && isBefore(date, startOfDay(parseISO(availableFrom)))) return true;
    if (availableTo && isAfter(startOfDay(date), startOfDay(parseISO(availableTo)))) return true;
    return isDateUnavailable(date);
  };

  const getDayStatus = (date: Date): 'available' | 'partial' | 'full' | 'past' => {
    if (isBefore(date, today)) return 'past';
    if (isDateDisabled(date)) return 'full';
    const info = getDayAvailabilityInfo(date);
    if (info.isUnavailable) return 'full';
    if (info.isLimited) return 'partial';
    return 'available';
  };

  // Validate a date range — returns unavailable dates inside [start, end]
  const validateRange = (start: Date, end: Date): Date[] => {
    if (!start || !end || isBefore(end, start)) return [];
    const range = eachDayOfInterval({ start, end });
    return range.filter((d) => isDateDisabled(d));
  };

  const rangeConflicts = useMemo(() => {
    if (mode !== 'daily') return [];
    if (rentalLength === 'monthly' && startMonth && endMonth) {
      const s = startOfMonth(startMonth);
      const e = lastDayOfMonth(endMonth);
      return validateRange(s, e);
    }
    if ((rentalLength === 'daily' || rentalLength === 'weekly') && startDate && endDate) {
      return validateRange(startDate, endDate);
    }
    if (rentalLength === 'month_to_month' && startDate) {
      // Validate at least the first month
      const e = expectedLength
        ? lastDayOfMonth(addMonths(startDate, expectedLength - 1))
        : lastDayOfMonth(addMonths(startDate, 0));
      return validateRange(startDate, e);
    }
    return [];
  }, [mode, rentalLength, startDate, endDate, startMonth, endMonth, expectedLength]);

  const conflictKeys = useMemo(
    () => new Set(rangeConflicts.map((d) => format(d, 'yyyy-MM-dd'))),
    [rangeConflicts],
  );

  const handleDateClick = (date: Date) => {
    const status = getDayStatus(date);
    if (status === 'past' || status === 'full') return;
    trackLeadEvent('availability_date_selected' as any, {
      listing_id: listingId,
      mode,
      rental_length: rentalLength,
      selected_date: format(date, 'yyyy-MM-dd'),
      source,
    });
    if (mode === 'hourly') {
      setActiveHourlyDate(date);
      return;
    }
    if (rentalLength === 'monthly') {
      // ignore individual day taps in monthly mode (use the month range picker)
      return;
    }
    if (rentalLength === 'weekly') {
      setStartDate(date);
      setEndDate(addDays(date, 6)); // default 1 week
      return;
    }
    if (rentalLength === 'month_to_month') {
      setStartDate(date);
      setEndDate(undefined);
      return;
    }
    // daily multi-day range
    if (!startDate || (startDate && endDate)) {
      setStartDate(date);
      setEndDate(undefined);
    } else if (isBefore(date, startDate)) {
      setStartDate(date);
      setEndDate(undefined);
    } else if (isSameDay(date, startDate)) {
      setEndDate(date);
    } else {
      setEndDate(date);
    }
  };

  const hasHourlySelection = (date: Date): boolean => {
    const k = format(date, 'yyyy-MM-dd');
    return (hourlySelections[k]?.length || 0) > 0;
  };

  const isInDailyRange = (date: Date): boolean => {
    if (mode === 'hourly') return hasHourlySelection(date);
    if (rentalLength === 'monthly') {
      if (!startMonth) return false;
      const s = startOfMonth(startMonth);
      const e = endMonth ? lastDayOfMonth(endMonth) : lastDayOfMonth(startMonth);
      return !isBefore(date, s) && !isAfter(date, e);
    }
    if (!startDate) return false;
    if (rentalLength === 'month_to_month') {
      const e = expectedLength
        ? lastDayOfMonth(addMonths(startDate, expectedLength - 1))
        : startDate;
      return !isBefore(date, startDate) && !isAfter(date, e);
    }
    if (!endDate) return isSameDay(date, startDate);
    return (isSameDay(date, startDate) || isAfter(date, startDate)) &&
      (isSameDay(date, endDate) || isBefore(date, endDate));
  };

  // Hourly slot list for active date
  const activeSlots = useMemo(() => {
    if (!activeHourlyDate || mode !== 'hourly') return [] as Array<{ value: string; label: string }>;
    const windows = getAvailableWindowsForDate(activeHourlyDate);
    const out: Array<{ value: string; label: string }> = [];
    windows.forEach((w) => {
      for (let h = w.startHour; h < w.endHour; h++) {
        out.push({
          value: `${h.toString().padStart(2, '0')}:00`,
          label: formatHourLabel(h),
        });
      }
    });
    return out;
  }, [activeHourlyDate, mode, getAvailableWindowsForDate]);

  const activeSelectedSlots = useMemo(() => {
    if (!activeHourlyDate) return [] as string[];
    return hourlySelections[format(activeHourlyDate, 'yyyy-MM-dd')] || [];
  }, [activeHourlyDate, hourlySelections]);

  const toggleSlot = (slot: string) => {
    if (!activeHourlyDate) return;
    const k = format(activeHourlyDate, 'yyyy-MM-dd');
    setHourlySelections((prev) => {
      const cur = prev[k] || [];
      const next = cur.includes(slot) ? cur.filter((s) => s !== slot) : [...cur, slot].sort();
      if (next.length === 0) {
        const { [k]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [k]: next };
    });
  };

  const totalSelectedHours = useMemo(
    () => Object.values(hourlySelections).reduce((s, arr) => s + arr.length, 0),
    [hourlySelections],
  );
  const selectedDatesCount = useMemo(
    () => Object.values(hourlySelections).filter((a) => a.length > 0).length,
    [hourlySelections],
  );
  const sortedSelectedDates = useMemo(
    () => Object.keys(hourlySelections).filter((k) => hourlySelections[k].length > 0).sort(),
    [hourlySelections],
  );

  // Resolve effective start/end for the chosen rental length
  const effectiveRange = useMemo(() => {
    if (mode !== 'daily') return null;
    if (rentalLength === 'monthly' && startMonth) {
      const s = startOfMonth(startMonth);
      const e = lastDayOfMonth(endMonth || startMonth);
      return { start: s, end: e };
    }
    if (rentalLength === 'month_to_month' && startDate) {
      const e = expectedLength
        ? lastDayOfMonth(addMonths(startDate, expectedLength - 1))
        : null;
      return { start: startDate, end: e };
    }
    if ((rentalLength === 'daily' || rentalLength === 'weekly') && startDate) {
      return { start: startDate, end: endDate || startDate };
    }
    return null;
  }, [mode, rentalLength, startDate, endDate, startMonth, endMonth, expectedLength]);

  // Price preview
  const pricing = useMemo(() => {
    if (mode === 'hourly') {
      if (totalSelectedHours === 0 || !priceHourly) return null;
      const basePrice = totalSelectedHours * priceHourly * selectedSlotCount;
      const fees = calculateRentalFees(basePrice);
      return {
        durationLabel:
          `${totalSelectedHours} hr${totalSelectedHours > 1 ? 's' : ''}` +
          (selectedDatesCount > 1 ? ` · ${selectedDatesCount} days` : ''),
        breakdown:
          `$${priceHourly}/hr × ${totalSelectedHours} hr` +
          (selectedSlotCount > 1 ? ` × ${selectedSlotCount} slots` : ''),
        basePrice,
        serviceFee: fees.renterFee,
        total: fees.customerTotal,
        ongoing: false,
      };
    }
    if (!effectiveRange || !priceDaily) return null;

    if (rentalLength === 'month_to_month' && !expectedLength) {
      // First-month estimate using monthly price
      if (!hasMonthly || !priceMonthly) return null;
      const basePrice = priceMonthly * selectedSlotCount;
      const fees = calculateRentalFees(basePrice);
      return {
        durationLabel: 'Month-to-month',
        breakdown: `$${priceMonthly.toLocaleString()}/mo · first month estimate`,
        basePrice,
        serviceFee: fees.renterFee,
        total: fees.customerTotal,
        ongoing: true,
      };
    }

    const d = effectiveRange.end
      ? differenceInDays(effectiveRange.end, effectiveRange.start) + 1
      : 1;
    if (d <= 0) return null;

    let base = 0;
    let breakdown = '';
    if (rentalLength === 'weekly' && priceWeekly) {
      const weeks = Math.max(1, Math.round(d / 7));
      base = weeks * priceWeekly;
      breakdown = `${weeks} wk @ $${priceWeekly.toLocaleString()}`;
    } else if ((rentalLength === 'monthly' || rentalLength === 'month_to_month') && priceMonthly) {
      const months = Math.max(1, Math.round(d / 30));
      base = months * priceMonthly;
      breakdown = `${months} mo @ $${priceMonthly.toLocaleString()}`;
    } else {
      const r = calculateTieredPrice(d, priceDaily, priceWeekly, priceMonthly);
      base = r.total;
      breakdown = r.breakdown;
    }

    const basePrice = base * selectedSlotCount;
    const fees = calculateRentalFees(basePrice);
    const durationLabel =
      rentalLength === 'monthly'
        ? `${Math.max(1, Math.round(d / 30))} month${Math.round(d / 30) > 1 ? 's' : ''}`
        : rentalLength === 'weekly'
        ? `${Math.max(1, Math.round(d / 7))} week${Math.round(d / 7) > 1 ? 's' : ''}`
        : `${d} day${d > 1 ? 's' : ''}`;

    return {
      durationLabel,
      breakdown: selectedSlotCount > 1 ? `${breakdown} × ${selectedSlotCount} slots` : breakdown,
      basePrice,
      serviceFee: fees.renterFee,
      total: fees.customerTotal,
      ongoing: false,
    };
  }, [
    mode, rentalLength, effectiveRange, totalSelectedHours, selectedDatesCount,
    priceHourly, priceDaily, priceWeekly, priceMonthly, selectedSlotCount,
    expectedLength, hasMonthly,
  ]);

  const hasConflict = rangeConflicts.length > 0;

  const canContinue = (() => {
    if (mode === 'hourly') return totalSelectedHours > 0;
    if (rentalLength === 'monthly') return !!startMonth && !hasConflict;
    if (rentalLength === 'month_to_month') return !!startDate && !hasConflict;
    return !!startDate && !hasConflict;
  })();

  const ctaLabel = useMemo(() => {
    if (mode === 'hourly' && totalSelectedHours === 0) return 'Select a time to continue';
    if (mode === 'daily' && rentalLength === 'monthly' && !startMonth) return 'Select a start month';
    if (mode === 'daily' && rentalLength !== 'monthly' && !startDate) return 'Select a date to continue';
    if (hasConflict) return 'Some dates unavailable';
    if (rentalLength === 'month_to_month') return 'Start Monthly Request';
    return instantBook ? 'Book Now' : 'Start Booking Request';
  }, [mode, rentalLength, totalSelectedHours, startDate, startMonth, instantBook, hasConflict]);

  const handleContinue = () => {
    if (!canContinue) return;
    const params = new URLSearchParams();
    let bookingMode: string = mode;

    if (mode === 'hourly') {
      const hourlyDataParts = sortedSelectedDates.map((k) => `${k}:${hourlySelections[k].sort().join(',')}`);
      params.set('start', sortedSelectedDates[0]);
      params.set('end', sortedSelectedDates[sortedSelectedDates.length - 1]);
      params.set('hours', totalSelectedHours.toString());
      params.set('hourlyData', hourlyDataParts.join('|'));
    } else {
      if (!effectiveRange) return;
      const s = format(effectiveRange.start, 'yyyy-MM-dd');
      const e = effectiveRange.end ? format(effectiveRange.end, 'yyyy-MM-dd') : s;
      params.set('start', s);
      params.set('end', e);
      bookingMode = rentalLength;
      params.set('bookingMode', rentalLength);
      if (rentalLength === 'month_to_month') {
        params.set('rentalTermType', 'month_to_month');
        if (expectedLength) params.set('expectedMonths', String(expectedLength));
      }
    }

    if (totalSlots > 1 && selectedSlotNumber) {
      const slotName = slotNames?.[selectedSlotNumber - 1] || `Spot ${selectedSlotNumber}`;
      params.set('slot', selectedSlotNumber.toString());
      params.set('slotName', slotName);
      params.set('slotCount', selectedSlotCount.toString());
    }
    trackLeadEvent('booking_request_started', {
      listing_id: listingId,
      category,
      source,
      mode: bookingMode,
      rental_length: rentalLength,
      expected_months: expectedLength || undefined,
      selected_hours: totalSelectedHours || undefined,
      selected_days: pricing?.durationLabel,
    });
    onClose?.();
    navigate(`/book/${listingId}?${params.toString()}`);
  };

  // ─── Render ──────────────────────────────────────────────────────────────
  const rentalLengthOptions: Array<{ value: RentalLength; label: string; show: boolean }> = [
    { value: 'daily', label: 'Daily', show: true },
    { value: 'weekly', label: 'Weekly', show: hasWeekly || !!priceDaily },
    { value: 'monthly', label: 'Monthly', show: hasMonthly || !!priceDaily },
    { value: 'month_to_month', label: 'Month-to-month', show: hasMonthToMonth },
  ];
  const visibleLengthOptions = rentalLengthOptions.filter((o) => o.show);
  const showLengthSelector = mode === 'daily' && visibleLengthOptions.length > 1;

  // Year/month dropdown options
  const monthOptions: Array<{ value: string; label: string }> = [];
  {
    let m = startOfMonth(today);
    const end = startOfMonth(maxDate);
    while (!isAfter(m, end)) {
      monthOptions.push({ value: format(m, 'yyyy-MM'), label: format(m, 'MMM yyyy') });
      m = addMonths(m, 1);
    }
  }

  return (
    <div className="space-y-4 text-white">
      {/* Mode toggle */}
      {hasHourly && hasDaily && (
        <div className="flex rounded-xl bg-white/5 p-1">
          {(['hourly', 'daily'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                if (mode === m) return;
                setMode(m);
                setActiveHourlyDate(undefined);
                setHourlySelections({});
                setStartDate(undefined);
                setEndDate(undefined);
                setStartMonth(undefined);
                setEndMonth(undefined);
                setRentalLength('daily');
              }}
              className={cn(
                'flex-1 py-2 px-3 text-[13px] font-medium rounded-lg transition-all flex items-center justify-center gap-1.5',
                mode === m ? 'bg-[#f97316] text-white shadow' : 'text-white/60 hover:text-white',
              )}
            >
              {m === 'hourly' ? <Clock className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
              {m === 'hourly' ? 'Hourly' : 'Daily'}
            </button>
          ))}
        </div>
      )}

      {/* Rental length selector */}
      {showLengthSelector && (
        <div className="space-y-1.5">
          <div className="text-[11px] uppercase tracking-wide text-white/40">Rental length</div>
          <div className="flex flex-wrap gap-1.5">
            {visibleLengthOptions.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => setRentalLength(o.value)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all border',
                  rentalLength === o.value
                    ? 'bg-[#f97316] text-white border-[#f97316]'
                    : 'bg-white/[0.03] text-white/70 border-white/10 hover:border-white/30',
                )}
              >
                {o.value === 'month_to_month' && <InfinityIcon className="inline h-3 w-3 mr-1 -mt-0.5" />}
                {o.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Monthly range picker (replaces calendar interactions) */}
      {mode === 'daily' && rentalLength === 'monthly' && (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 space-y-2">
          <div className="flex items-center gap-2 text-[12px] text-white/70">
            <CalendarRange className="h-3.5 w-3.5" />
            Month range
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select
              value={startMonth ? format(startMonth, 'yyyy-MM') : ''}
              onChange={(e) => {
                const v = e.target.value;
                if (!v) return;
                const d = parseISO(`${v}-01`);
                setStartMonth(d);
                if (endMonth && isBefore(endMonth, d)) setEndMonth(d);
                setCurrentMonth(d);
              }}
              className="h-10 rounded-lg bg-white/[0.04] border border-white/10 text-white text-[13px] px-2"
            >
              <option value="">Start month</option>
              {monthOptions.map((o) => (
                <option key={o.value} value={o.value} className="bg-[#0b0b0d]">{o.label}</option>
              ))}
            </select>
            <select
              value={endMonth ? format(endMonth, 'yyyy-MM') : ''}
              onChange={(e) => {
                const v = e.target.value;
                if (!v) return;
                setEndMonth(parseISO(`${v}-01`));
              }}
              disabled={!startMonth}
              className="h-10 rounded-lg bg-white/[0.04] border border-white/10 text-white text-[13px] px-2 disabled:opacity-40"
            >
              <option value="">End month</option>
              {monthOptions
                .filter((o) => !startMonth || !isBefore(parseISO(`${o.value}-01`), startMonth))
                .map((o) => (
                  <option key={o.value} value={o.value} className="bg-[#0b0b0d]">{o.label}</option>
                ))}
            </select>
          </div>
        </div>
      )}

      {/* Calendar */}
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
        <div className="flex items-center justify-between mb-2 gap-2">
          <button
            type="button"
            onClick={() => canPrev && setCurrentMonth(subMonths(currentMonth, 1))}
            disabled={!canPrev}
            className="p-1.5 rounded-md hover:bg-white/10 disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <select
            value={format(currentMonth, 'yyyy-MM')}
            onChange={(e) => {
              const v = e.target.value;
              if (v) setCurrentMonth(parseISO(`${v}-01`));
            }}
            className="text-[13px] font-semibold bg-transparent text-white text-center cursor-pointer hover:text-[#f97316]"
          >
            {monthOptions.map((o) => (
              <option key={o.value} value={o.value} className="bg-[#0b0b0d]">{o.label}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => canNext && setCurrentMonth(addMonths(currentMonth, 1))}
            disabled={!canNext}
            className="p-1.5 rounded-md hover:bg-white/10 disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-0.5 mb-1">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
            <div key={d} className="text-center text-[10px] font-medium text-white/40 py-1">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-0.5">
          {padding.map((_, i) => (
            <div key={`p-${i}`} className="aspect-square" />
          ))}
          {days.map((date) => {
            const status = getDayStatus(date);
            const inRange = isInDailyRange(date);
            const isConflict = inRange && conflictKeys.has(format(date, 'yyyy-MM-dd'));
            const isSelected = inRange ||
              (mode === 'hourly' && activeHourlyDate && isSameDay(date, activeHourlyDate));
            const isTodayDate = isSameDay(date, today);
            const isStartOrEnd =
              (startDate && isSameDay(date, startDate)) ||
              (endDate && isSameDay(date, endDate)) ||
              (startMonth && isSameDay(date, startOfMonth(startMonth))) ||
              (endMonth && isSameDay(date, lastDayOfMonth(endMonth)));
            const disabled = status === 'past' || status === 'full' ||
              (rentalLength === 'monthly' && mode === 'daily'); // monthly uses dropdowns

            return (
              <button
                key={date.toISOString()}
                type="button"
                onClick={() => handleDateClick(date)}
                disabled={disabled && !(rentalLength === 'monthly' && status !== 'past' && status !== 'full')}
                className={cn(
                  'relative aspect-square rounded-md text-[12px] font-medium flex items-center justify-center transition-all',
                  status === 'past' && 'text-white/20 cursor-not-allowed',
                  status === 'full' && 'text-white/20 cursor-not-allowed line-through',
                  status !== 'past' && status !== 'full' && rentalLength !== 'monthly' && 'text-white hover:bg-white/10',
                  status !== 'past' && status !== 'full' && rentalLength === 'monthly' && 'text-white/80 cursor-default',
                  isSelected && !isStartOrEnd && !isConflict && 'bg-[#f97316]/25 ring-1 ring-[#f97316]',
                  isStartOrEnd && !isConflict && 'bg-[#f97316] text-white',
                  isConflict && 'bg-red-500/30 ring-1 ring-red-500 text-white',
                  isTodayDate && !disabled && !isSelected && 'ring-1 ring-[#f97316]/50',
                )}
              >
                {date.getDate()}
                {status === 'partial' && !isSelected && (
                  <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-amber-400" />
                )}
              </button>
            );
          })}
        </div>

        {/* Summary line */}
        {mode === 'daily' && effectiveRange && (
          <div className="mt-3 pt-3 border-t border-white/10 text-[12px] text-center text-white/70">
            {rentalLength === 'month_to_month' && !expectedLength
              ? `Starts ${format(effectiveRange.start, 'MMM d')} · Month-to-month`
              : effectiveRange.end
                ? `${format(effectiveRange.start, 'MMM d')} → ${format(effectiveRange.end, 'MMM d, yyyy')} · ${pricing?.durationLabel || ''}`
                : `${format(effectiveRange.start, 'MMM d')} · select an end date`}
          </div>
        )}
        {mode === 'hourly' && totalSelectedHours > 0 && (
          <div className="mt-3 pt-3 border-t border-white/10 text-[12px] text-center text-white/70">
            {selectedDatesCount} day{selectedDatesCount > 1 ? 's' : ''} · {totalSelectedHours} hr{totalSelectedHours > 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Month-to-month: expected length */}
      {mode === 'daily' && rentalLength === 'month_to_month' && startDate && (
        <div className="space-y-1.5">
          <div className="text-[11px] uppercase tracking-wide text-white/40">Expected rental length</div>
          <div className="grid grid-cols-4 gap-1.5">
            {([1, 2, 3, 6] as ExpectedLength[]).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setExpectedLength(n)}
                className={cn(
                  'py-2 rounded-md text-[11px] font-medium transition-all border',
                  expectedLength === n
                    ? 'bg-[#f97316] text-white border-[#f97316]'
                    : 'bg-white/[0.03] text-white/70 border-white/10 hover:border-white/30',
                )}
              >
                {n} mo
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setExpectedLength(null)}
            className={cn(
              'w-full py-2 rounded-md text-[11px] font-medium transition-all border',
              expectedLength === null
                ? 'bg-white/10 text-white border-white/30'
                : 'bg-transparent text-white/60 border-white/10 hover:text-white',
            )}
          >
            Not sure / ongoing
          </button>
        </div>
      )}

      {/* Conflict warning */}
      {hasConflict && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-red-300 flex-shrink-0 mt-0.5" />
          <div className="text-[12px] text-red-100">
            Some dates in this rental period are unavailable. Adjust your start or end date.
            <div className="mt-1 text-[11px] text-red-200/80">
              {rangeConflicts.slice(0, 4).map((d) => format(d, 'MMM d')).join(', ')}
              {rangeConflicts.length > 4 && ` +${rangeConflicts.length - 4} more`}
            </div>
          </div>
        </div>
      )}

      {/* Hourly slots */}
      <AnimatePresence>
        {mode === 'hourly' && activeHourlyDate && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-medium text-white/80">
                {format(activeHourlyDate, 'EEE, MMM d')} · available hours
              </span>
              <span className="text-[11px] text-white/50">
                Minimum booking time: {Math.max(1, settings.minHours || 1)} hr{(settings.minHours || 1) > 1 ? 's' : ''}
              </span>
            </div>
            {activeSlots.length > 0 ? (
              <div className="grid grid-cols-4 gap-1.5">
                {activeSlots.map((s) => {
                  const isSel = activeSelectedSlots.includes(s.value);
                  return (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => toggleSlot(s.value)}
                      className={cn(
                        'py-2 rounded-md text-[11px] font-medium transition-all border',
                        isSel
                          ? 'bg-[#f97316] text-white border-[#f97316]'
                          : 'bg-white/[0.03] text-white border-white/10 hover:border-white/30',
                      )}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-md border border-white/10 bg-white/[0.02] p-3 text-center text-[12px] text-white/50">
                No bookable hours on this day.
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Min booking hint */}
      {mode === 'daily' && (
        <div className="text-[11px] text-white/50 text-center">
          Minimum booking time: {
            rentalLength === 'weekly' ? '1 week'
            : rentalLength === 'monthly' || rentalLength === 'month_to_month' ? '1 month'
            : '1 day'
          }
        </div>
      )}

      {/* Slot counter (multi-slot) */}
      {totalSlots > 1 && (startDate || startMonth || totalSelectedHours > 0) && (
        <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5">
          <div>
            <div className="text-[13px] font-medium text-white">Spots needed</div>
            <div className="text-[11px] text-white/50">{totalSlots - selectedSlotCount} remaining</div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedSlotCount((c) => Math.max(1, c - 1))}
              disabled={selectedSlotCount <= 1}
              className="h-7 w-7 rounded-md border border-white/15 hover:border-white/30 disabled:opacity-30 flex items-center justify-center"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="w-6 text-center text-[14px] font-semibold tabular-nums">{selectedSlotCount}</span>
            <button
              type="button"
              onClick={() => setSelectedSlotCount((c) => Math.min(totalSlots, c + 1))}
              disabled={selectedSlotCount >= totalSlots}
              className="h-7 w-7 rounded-md border border-white/15 hover:border-white/30 disabled:opacity-30 flex items-center justify-center"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Price preview */}
      <AnimatePresence>
        {pricing && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="rounded-xl border border-[#f97316]/30 bg-[#f97316]/[0.06] p-3 space-y-1.5"
          >
            <div className="flex items-center justify-between text-[12px] text-white/70">
              <span>{pricing.breakdown}</span>
              <span className="tabular-nums">${pricing.basePrice.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between text-[12px] text-white/70">
              <span>Service fee</span>
              <span className="tabular-nums">${pricing.serviceFee.toLocaleString()}</span>
            </div>
            <div className="h-px bg-white/10 my-1" />
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-semibold text-white">
                {pricing.ongoing ? 'First month estimate' : 'Estimated total'}
              </span>
              <span className="text-[16px] font-bold text-white tabular-nums">
                ${pricing.total.toLocaleString()}
              </span>
            </div>
            {pricing.ongoing && (
              <div className="text-[10.5px] text-white/50 leading-snug pt-1">
                Additional months billed or confirmed according to owner terms.
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Primary CTA */}
      <button
        type="button"
        onClick={handleContinue}
        disabled={!canContinue}
        className={cn(
          'w-full h-12 rounded-xl text-[14px] font-semibold transition-all flex items-center justify-center gap-2',
          canContinue
            ? 'bg-[#f97316] hover:bg-[#ea6c0a] text-white shadow-lg hover:scale-[1.01]'
            : 'bg-white/[0.06] text-white/40 cursor-not-allowed',
        )}
      >
        {instantBook && canContinue && <Zap className="h-4 w-4" />}
        {ctaLabel}
        {canContinue && pricing && (
          <span className="opacity-80 font-normal">· {pricing.durationLabel}</span>
        )}
        {canContinue && <ArrowRight className="h-4 w-4" />}
      </button>

      {rentalLength === 'month_to_month' && canContinue ? (
        <p className="text-[11px] text-center text-white/50 leading-snug">
          No commitment. Monthly rentals, renewals, deposits, documents, and final terms are confirmed with the owner before payment is completed.
        </p>
      ) : !instantBook && canContinue ? (
        <p className="text-[11px] text-center text-white/50 flex items-center justify-center gap-1.5">
          <Shield className="h-3 w-3" />
          Your card is authorized now and only charged if the host approves.
        </p>
      ) : null}
    </div>
  );
};

export default RentalAvailabilityPicker;
