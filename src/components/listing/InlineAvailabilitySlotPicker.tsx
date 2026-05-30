import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isBefore,
  startOfDay,
  parseISO,
  format,
  addYears,
  isAfter,
  differenceInCalendarDays,
} from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useHourlyAvailability } from '@/hooks/useHourlyAvailability';
import { useBlockedDates } from '@/hooks/useBlockedDates';
import { cn } from '@/lib/utils';

interface Props {
  listingId: string;
  availableFrom?: string | null;
  availableTo?: string | null;
  onClose?: () => void;
}

type DayStatus =
  | 'available'
  | 'limited'
  | 'booked'
  | 'blocked'
  | 'past'
  | 'outside'
  | 'future';

const formatHour = (h: number) => {
  const period = h >= 12 ? 'p' : 'a';
  const display = h % 12 === 0 ? 12 : h % 12;
  return `${display}${period}`;
};

export const InlineAvailabilitySlotPicker = ({
  listingId,
  availableFrom,
  availableTo,
  onClose,
}: Props) => {
  const navigate = useNavigate();
  const today = startOfDay(new Date());
  const maxDate = addYears(today, 1);

  const [currentMonth, setCurrentMonth] = useState(today);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedHours, setSelectedHours] = useState<number[]>([]); // array of start-hours selected
  const [dailyEnd, setDailyEnd] = useState<Date | null>(null);

  const { settings, getDayAvailabilityInfo, getAvailableWindowsForDate, isLoading } =
    useHourlyAvailability({ listingId });
  const { blockedDates, bookedDates, isLoading: loadingBlocked } = useBlockedDates({ listingId });

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const padding = Array(monthStart.getDay()).fill(null);

  const canGoPrev = isAfter(monthStart, startOfMonth(today));
  const canGoNext = isBefore(monthStart, startOfMonth(maxDate));

  const getStatus = (date: Date): DayStatus => {
    if (isBefore(date, today)) return 'past';
    if (isAfter(date, maxDate)) return 'future';
    if (availableFrom && isBefore(date, startOfDay(parseISO(availableFrom)))) return 'outside';
    if (availableTo && isAfter(date, startOfDay(parseISO(availableTo)))) return 'outside';

    const dateStr = format(date, 'yyyy-MM-dd');
    if (bookedDates.some((d) => format(d, 'yyyy-MM-dd') === dateStr)) return 'booked';
    if (
      blockedDates.some((d) =>
        format(
          typeof d === 'object' && 'blocked_date' in d
            ? parseISO((d as { blocked_date: string }).blocked_date)
            : (d as Date),
          'yyyy-MM-dd',
        ) === dateStr,
      )
    )
      return 'blocked';

    if (settings.hourlyEnabled) {
      const info = getDayAvailabilityInfo(date);
      if (info.isUnavailable) return 'blocked';
      if (info.isLimited) return 'limited';
    }
    return 'available';
  };

  const isSelectable = (date: Date) => {
    const s = getStatus(date);
    return s === 'available' || s === 'limited';
  };

  const windows = useMemo(() => {
    if (!selectedDate || !settings.hourlyEnabled) return [];
    return getAvailableWindowsForDate(selectedDate);
  }, [selectedDate, settings.hourlyEnabled, getAvailableWindowsForDate]);

  const allBookableHours = useMemo(() => {
    const hours: number[] = [];
    windows.forEach((w) => {
      for (let h = w.startHour; h < w.endHour; h++) hours.push(h);
    });
    return hours;
  }, [windows]);

  const minHours = Math.max(1, settings.minHours || 1);
  const minDays = 1;

  const toggleHour = (hour: number) => {
    setSelectedHours((prev) => {
      if (prev.length === 0) return [hour];
      const sorted = [...prev].sort((a, b) => a - b);
      const min = sorted[0];
      const max = sorted[sorted.length - 1];
      if (prev.length === 1 && prev[0] === hour) return [];
      if (hour === min && sorted.length > 1) return sorted.slice(1);
      if (hour === max && sorted.length > 1) return sorted.slice(0, -1);
      const newMin = Math.min(min, hour);
      const newMax = Math.max(max, hour);
      const range: number[] = [];
      for (let h = newMin; h <= newMax; h++) {
        if (allBookableHours.includes(h)) range.push(h);
        else return prev;
      }
      return range;
    });
  };

  const selectedStart = selectedHours.length ? Math.min(...selectedHours) : null;
  const selectedEnd = selectedHours.length ? Math.max(...selectedHours) + 1 : null;
  const totalSelectedHours = selectedHours.length;
  const meetsHourlyMin = settings.hourlyEnabled && totalSelectedHours >= minHours;

  const dailyDays =
    !settings.hourlyEnabled && selectedDate && dailyEnd
      ? Math.abs(differenceInCalendarDays(dailyEnd, selectedDate)) + 1
      : !settings.hourlyEnabled && selectedDate
      ? 1
      : 0;
  const meetsDailyMin = !settings.hourlyEnabled && dailyDays >= minDays;

  const canStart = meetsHourlyMin || meetsDailyMin;

  const handleStart = () => {
    if (!selectedDate) return;
    onClose?.();
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    if (settings.hourlyEnabled && selectedStart !== null && selectedEnd !== null) {
      const startTime = `${selectedStart.toString().padStart(2, '0')}:00`;
      const endTime = `${selectedEnd.toString().padStart(2, '0')}:00`;
      const params = new URLSearchParams({
        start: dateStr,
        end: dateStr,
        startTime,
        endTime,
        hours: String(totalSelectedHours),
      });
      navigate(`/checkout/${listingId}?${params.toString()}`);
    } else {
      const endStr = dailyEnd ? format(dailyEnd, 'yyyy-MM-dd') : dateStr;
      navigate(`/checkout/${listingId}?start=${dateStr}&end=${endStr}`);
    }
  };

  const statusStyles: Record<DayStatus, string> = {
    available: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25 cursor-pointer',
    limited: 'bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25 cursor-pointer',
    booked: 'bg-red-500/10 text-red-300/60 border border-red-500/20 cursor-not-allowed',
    blocked: 'bg-white/[0.03] text-white/30 border border-white/5 cursor-not-allowed',
    past: 'text-white/15 cursor-not-allowed',
    outside: 'text-white/20 cursor-not-allowed',
    future: 'text-white/20 cursor-not-allowed',
  };

  const loading = isLoading || loadingBlocked;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <button
          onClick={() => canGoPrev && setCurrentMonth(subMonths(currentMonth, 1))}
          disabled={!canGoPrev}
          className="h-7 w-7 rounded-md text-white/70 hover:text-white hover:bg-white/5 disabled:opacity-30 flex items-center justify-center"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="text-[13px] font-semibold text-white">
          {format(currentMonth, 'MMMM yyyy')}
        </div>
        <button
          onClick={() => canGoNext && setCurrentMonth(addMonths(currentMonth, 1))}
          disabled={!canGoNext}
          className="h-7 w-7 rounded-md text-white/70 hover:text-white hover:bg-white/5 disabled:opacity-30 flex items-center justify-center"
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="rounded-xl border border-white/10 bg-black/30 p-2.5">
        <div className="grid grid-cols-7 gap-1 mb-1">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
            <div key={i} className="text-center text-[10px] text-white/40 py-0.5">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {padding.map((_, i) => (
            <div key={`p${i}`} className="aspect-square" />
          ))}
          {loading
            ? daysInMonth.map((d) => (
                <div
                  key={d.toISOString()}
                  className="aspect-square rounded-md bg-white/[0.03] animate-pulse"
                />
              ))
            : daysInMonth.map((date) => {
                const status = getStatus(date);
                const isSelected = selectedDate && isSameDay(date, selectedDate);
                const isDailyEnd = dailyEnd && isSameDay(date, dailyEnd);
                const inDailyRange =
                  !settings.hourlyEnabled &&
                  selectedDate &&
                  dailyEnd &&
                  date >= (selectedDate < dailyEnd ? selectedDate : dailyEnd) &&
                  date <= (selectedDate < dailyEnd ? dailyEnd : selectedDate);
                return (
                  <button
                    key={date.toISOString()}
                    type="button"
                    disabled={!isSelectable(date)}
                    onClick={() => {
                      if (!isSelectable(date)) return;
                      if (settings.hourlyEnabled) {
                        setSelectedDate(date);
                        setSelectedHours([]);
                        return;
                      }
                      if (!selectedDate || (selectedDate && dailyEnd)) {
                        setSelectedDate(date);
                        setDailyEnd(null);
                      } else if (isBefore(date, selectedDate)) {
                        setSelectedDate(date);
                        setDailyEnd(null);
                      } else {
                        setDailyEnd(date);
                      }
                    }}
                    className={cn(
                      'aspect-square rounded-md flex items-center justify-center text-[11px] font-medium transition-colors',
                      statusStyles[status],
                      (isSelected || isDailyEnd) &&
                        'ring-2 ring-[#f97316] bg-[#f97316]/25 text-white border-transparent',
                      inDailyRange &&
                        !isSelected &&
                        !isDailyEnd &&
                        'bg-[#f97316]/15 text-white border-[#f97316]/30',
                    )}
                  >
                    {format(date, 'd')}
                  </button>
                );
              })}
        </div>
      </div>

      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-white/50">
        <span className="inline-flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm bg-emerald-500/40" /> Available
        </span>
        {settings.hourlyEnabled && (
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-sm bg-amber-500/40" /> Limited hours
          </span>
        )}
        <span className="inline-flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm bg-red-500/30" /> Booked
        </span>
      </div>

      {selectedDate && settings.hourlyEnabled && (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[12px] font-semibold text-white">
              {format(selectedDate, 'EEE, MMM d')}
            </div>
            <div className="text-[10px] uppercase tracking-wider text-white/40">
              Tap hours to book
            </div>
          </div>

          {windows.length === 0 ? (
            <div className="text-[12px] text-white/50 py-3 text-center">
              No bookable hours on this day.
            </div>
          ) : (
            <div className="space-y-2.5">
              {windows.map((w) => (
                <div key={`${w.startHour}-${w.endHour}`}>
                  <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1.5">
                    {formatHour(w.startHour)} – {formatHour(w.endHour)} window
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {Array.from({ length: w.endHour - w.startHour }, (_, i) => w.startHour + i).map(
                      (h) => {
                        const active = selectedHours.includes(h);
                        return (
                          <button
                            key={h}
                            type="button"
                            onClick={() => toggleHour(h)}
                            className={cn(
                              'h-8 px-2.5 rounded-md text-[11px] font-medium border transition-colors',
                              active
                                ? 'bg-[#f97316] text-white border-[#f97316]'
                                : 'bg-white/[0.04] text-white/80 border-white/10 hover:border-[#f97316]/50 hover:bg-[#f97316]/10',
                            )}
                          >
                            {formatHour(h)}
                          </button>
                        );
                      },
                    )}
                  </div>
                </div>
              ))}

              <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[11px]">
                <span className="text-white/50">
                  Min booking time: <span className="text-white/80">{minHours} hr{minHours > 1 ? 's' : ''}</span>
                </span>
                <span className="text-white tabular-nums">
                  {totalSelectedHours > 0
                    ? `${totalSelectedHours} hr${totalSelectedHours > 1 ? 's' : ''} selected`
                    : '—'}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {!settings.hourlyEnabled && selectedDate && (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-[12px] text-white/70">
          {dailyEnd
            ? `${format(selectedDate < dailyEnd ? selectedDate : dailyEnd, 'MMM d')} – ${format(
                selectedDate < dailyEnd ? dailyEnd : selectedDate,
                'MMM d, yyyy',
              )} · ${dailyDays} day${dailyDays > 1 ? 's' : ''}`
            : `Start: ${format(selectedDate, 'MMM d, yyyy')} — tap a later date for checkout.`}
        </div>
      )}

      <button
        type="button"
        onClick={handleStart}
        disabled={!canStart}
        className={cn(
          'w-full h-12 rounded-xl text-[14px] font-semibold transition-all duration-150',
          canStart
            ? 'bg-[#f97316] hover:bg-[#ea6c0a] text-white hover:scale-[1.01]'
            : 'bg-white/[0.04] text-white/30 cursor-not-allowed border border-white/5',
        )}
      >
        {canStart
          ? settings.hourlyEnabled
            ? `Start booking · ${totalSelectedHours} hr${totalSelectedHours > 1 ? 's' : ''}`
            : `Start booking · ${dailyDays} day${dailyDays > 1 ? 's' : ''}`
          : selectedDate
          ? settings.hourlyEnabled
            ? `Select at least ${minHours} hour${minHours > 1 ? 's' : ''}`
            : 'Pick a date range to continue'
          : 'Pick a date to see time slots'}
      </button>
    </div>
  );
};

export default InlineAvailabilitySlotPicker;
