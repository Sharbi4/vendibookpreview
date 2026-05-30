/**
 * RentalAvailabilityPicker
 *
 * A real booking surface (not a contact form). Wired directly to the
 * listing's calendar via useHourlyAvailability + useBlockedDates, so every
 * day/hour shown is real availability for THIS listing.
 *
 * Used inside the card overlay (Satin Lux dark) and intended to be reused
 * on the listing-detail page. Styled with the dark Satin Lux palette so it
 * drops cleanly into the overlay container.
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
    getAvailableSlotsForDate,
  } = useHourlyAvailability({ listingId });

  const hasHourly = (!!priceHourly && priceHourly > 0) || settings.hourlyEnabled;
  const hasDaily = (!!priceDaily && priceDaily > 0) || settings.dailyEnabled;

  const [mode, setMode] = useState<'hourly' | 'daily'>(
    hasHourly && !hasDaily ? 'hourly' : 'daily',
  );
  useEffect(() => {
    if (hasHourly && !hasDaily) setMode('hourly');
    else if (hasDaily && !hasHourly) setMode('daily');
  }, [hasHourly, hasDaily]);

  const today = startOfDay(new Date());
  const maxDate = addYears(today, 1);
  const [currentMonth, setCurrentMonth] = useState<Date>(today);
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [hourlySelections, setHourlySelections] = useState<Record<string, string[]>>({});
  const [activeHourlyDate, setActiveHourlyDate] = useState<Date | undefined>();
  const [selectedSlotCount, setSelectedSlotCount] = useState(1);
  const [selectedSlotNumber, setSelectedSlotNumber] = useState<number | null>(
    totalSlots === 1 ? 1 : null,
  );

  // Track overlay opened once we know listingId
  useEffect(() => {
    if (!listingId) return;
    trackLeadEvent('availability_overlay_opened' as any, {
      listing_id: listingId,
      listing_title: listingTitle,
      category,
      source,
    });
  }, [listingId, listingTitle, category, source]);

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

  const handleDateClick = (date: Date) => {
    const status = getDayStatus(date);
    if (status === 'past' || status === 'full') return;
    trackLeadEvent('availability_date_selected' as any, {
      listing_id: listingId,
      mode,
      selected_date: format(date, 'yyyy-MM-dd'),
      source,
    });
    if (mode === 'hourly') {
      setActiveHourlyDate(date);
    } else {
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
    }
  };

  const hasHourlySelection = (date: Date): boolean => {
    const k = format(date, 'yyyy-MM-dd');
    return (hourlySelections[k]?.length || 0) > 0;
  };

  const isInDailyRange = (date: Date): boolean => {
    if (mode === 'hourly') return hasHourlySelection(date);
    if (!startDate) return false;
    if (!endDate) return isSameDay(date, startDate);
    return (isSameDay(date, startDate) || isAfter(date, startDate)) &&
      (isSameDay(date, endDate) || isBefore(date, endDate));
  };

  // Hourly slot list for the active date
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
    trackLeadEvent('availability_time_slot_selected' as any, {
      listing_id: listingId,
      selected_date: format(activeHourlyDate, 'yyyy-MM-dd'),
      selected_start: slot,
      source,
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
      };
    }
    if (!startDate || !priceDaily) return null;
    const d = endDate ? differenceInDays(endDate, startDate) + 1 : 1;
    if (d <= 0) return null;
    const { total: base, breakdown } = calculateTieredPrice(d, priceDaily, priceWeekly, priceMonthly);
    const basePrice = base * selectedSlotCount;
    const fees = calculateRentalFees(basePrice);
    return {
      durationLabel: `${d} day${d > 1 ? 's' : ''}`,
      breakdown: selectedSlotCount > 1 ? `${breakdown} × ${selectedSlotCount} slots` : breakdown,
      basePrice,
      serviceFee: fees.renterFee,
      total: fees.customerTotal,
    };
  }, [
    mode, totalSelectedHours, selectedDatesCount, startDate, endDate,
    priceHourly, priceDaily, priceWeekly, priceMonthly, selectedSlotCount,
  ]);

  const canContinue = mode === 'hourly' ? totalSelectedHours > 0 : !!startDate;

  const ctaLabel = useMemo(() => {
    if (mode === 'hourly') {
      if (totalSelectedHours === 0) return 'Select a time to continue';
    } else if (!startDate) {
      return 'Select a date to continue';
    }
    return instantBook ? 'Book Now' : 'Start Booking Request';
  }, [mode, totalSelectedHours, startDate, instantBook]);

  const handleContinue = () => {
    if (!canContinue) return;
    const params = new URLSearchParams();
    if (mode === 'hourly') {
      const hourlyDataParts = sortedSelectedDates.map((k) => `${k}:${hourlySelections[k].sort().join(',')}`);
      params.set('start', sortedSelectedDates[0]);
      params.set('end', sortedSelectedDates[sortedSelectedDates.length - 1]);
      params.set('hours', totalSelectedHours.toString());
      params.set('hourlyData', hourlyDataParts.join('|'));
    } else {
      if (!startDate) return;
      const s = format(startDate, 'yyyy-MM-dd');
      const e = endDate ? format(endDate, 'yyyy-MM-dd') : s;
      params.set('start', s);
      params.set('end', e);
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
      mode,
      selected_hours: totalSelectedHours || undefined,
      selected_days: pricing?.durationLabel,
    });
    onClose?.();
    navigate(`/book/${listingId}?${params.toString()}`);
  };

  // ─── Render ──────────────────────────────────────────────────────────────
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
                trackLeadEvent('availability_mode_changed' as any, {
                  listing_id: listingId,
                  mode: m,
                  source,
                });
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

      {/* Calendar */}
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
        <div className="flex items-center justify-between mb-2">
          <button
            type="button"
            onClick={() => canPrev && setCurrentMonth(subMonths(currentMonth, 1))}
            disabled={!canPrev}
            className="p-1.5 rounded-md hover:bg-white/10 disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-[13px] font-semibold">{format(currentMonth, 'MMMM yyyy')}</span>
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
            const isSelected = isInDailyRange(date) ||
              (mode === 'hourly' && activeHourlyDate && isSameDay(date, activeHourlyDate));
            const isTodayDate = isSameDay(date, today);
            const isStartOrEnd = startDate && (isSameDay(date, startDate) ||
              (endDate && isSameDay(date, endDate)));
            const disabled = status === 'past' || status === 'full';

            return (
              <button
                key={date.toISOString()}
                type="button"
                onClick={() => handleDateClick(date)}
                disabled={disabled}
                className={cn(
                  'relative aspect-square rounded-md text-[12px] font-medium flex items-center justify-center transition-all',
                  disabled && 'text-white/20 cursor-not-allowed',
                  !disabled && status === 'available' && 'text-white hover:bg-white/10',
                  !disabled && status === 'partial' && 'text-white hover:bg-white/10',
                  isSelected && !isStartOrEnd && 'bg-[#f97316]/25 ring-1 ring-[#f97316]',
                  isStartOrEnd && 'bg-[#f97316] text-white',
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
        {mode === 'daily' && startDate && (
          <div className="mt-3 pt-3 border-t border-white/10 text-[12px] text-center text-white/70">
            {endDate
              ? `${format(startDate, 'MMM d')} → ${format(endDate, 'MMM d')} · ${pricing?.durationLabel || ''}`
              : `${format(startDate, 'MMM d')} · 1 day (tap another date to extend)`}
          </div>
        )}
        {mode === 'hourly' && totalSelectedHours > 0 && (
          <div className="mt-3 pt-3 border-t border-white/10 text-[12px] text-center text-white/70">
            {selectedDatesCount} day{selectedDatesCount > 1 ? 's' : ''} · {totalSelectedHours} hr{totalSelectedHours > 1 ? 's' : ''}
          </div>
        )}
      </div>

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

      {/* Daily min booking time hint */}
      {mode === 'daily' && (
        <div className="text-[11px] text-white/50 text-center">
          Minimum booking time: 1 day
        </div>
      )}

      {/* Slot counter (multi-slot) */}
      {totalSlots > 1 && (startDate || totalSelectedHours > 0) && (
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
              <span className="text-[13px] font-semibold text-white">Estimated total</span>
              <span className="text-[16px] font-bold text-white tabular-nums">
                ${pricing.total.toLocaleString()}
              </span>
            </div>
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

      {!instantBook && canContinue && (
        <p className="text-[11px] text-center text-white/50 flex items-center justify-center gap-1.5">
          <Shield className="h-3 w-3" />
          Your card is authorized now and only charged if the host approves.
        </p>
      )}
    </div>
  );
};

export default RentalAvailabilityPicker;
