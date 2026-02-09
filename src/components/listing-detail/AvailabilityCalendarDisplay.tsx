import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, CalendarCheck, Lock, Clock, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameDay, 
  isToday, 
  isBefore, 
  isAfter,
  startOfDay, 
  parseISO,
  addYears,
} from 'date-fns';
import { useBlockedDates } from '@/hooks/useBlockedDates';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface AvailabilityCalendarDisplayProps {
  listingId: string;
  availableFrom?: string | null;
  availableTo?: string | null;
  className?: string;
  onDateSelect?: (startDate: Date, endDate?: Date) => void;
  selectable?: boolean;
}

export const AvailabilityCalendarDisplay: React.FC<AvailabilityCalendarDisplayProps> = ({
  listingId,
  availableFrom,
  availableTo,
  className,
  onDateSelect,
  selectable = false,
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedStart, setSelectedStart] = useState<Date | undefined>();
  const [selectedEnd, setSelectedEnd] = useState<Date | undefined>();
  const { blockedDates, bookedDates, bufferDates, isLoading, upcomingBookings } = useBlockedDates({ listingId });

  // Date limits: today to 1 year from today
  const today = startOfDay(new Date());
  const maxDate = addYears(today, 1);
  const minMonth = startOfMonth(today);
  const maxMonth = startOfMonth(maxDate);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const firstDayOfWeek = monthStart.getDay();
  const paddingDays = Array(firstDayOfWeek).fill(null);

  // Navigation limits
  const canGoPrev = isAfter(monthStart, minMonth) || isSameDay(monthStart, minMonth) === false;
  const canGoNext = isBefore(monthStart, maxMonth);

  const handlePrevMonth = () => {
    if (canGoPrev) {
      setCurrentMonth(subMonths(currentMonth, 1));
    }
  };
  
  const handleNextMonth = () => {
    if (canGoNext) {
      setCurrentMonth(addMonths(currentMonth, 1));
    }
  };

  const getDayStatus = (date: Date): 'available' | 'blocked' | 'booked' | 'buffer' | 'past' | 'outside_window' | 'future_limit' => {
    // Past dates
    if (isBefore(date, today)) return 'past';
    
    // Beyond 1 year limit
    if (isAfter(date, maxDate)) return 'future_limit';
    
    // Check if outside availability window
    if (availableFrom || availableTo) {
      const fromDate = availableFrom ? parseISO(availableFrom) : null;
      const toDate = availableTo ? parseISO(availableTo) : null;
      
      if (fromDate && isBefore(date, startOfDay(fromDate))) return 'outside_window';
      if (toDate && isBefore(startOfDay(toDate), date)) return 'outside_window';
    }

    const dateStr = format(date, 'yyyy-MM-dd');
    
    // Check if booked (confirmed booking)
    const isBooked = bookedDates.some(d => format(d, 'yyyy-MM-dd') === dateStr);
    if (isBooked) return 'booked';
    
    // Check if buffer day (around a booking)
    const isBuffer = bufferDates.some(d => format(d, 'yyyy-MM-dd') === dateStr);
    if (isBuffer) return 'buffer';
    
    // Check if manually blocked
    const isBlocked = blockedDates.some(d => format(typeof d === 'object' && 'blocked_date' in d ? parseISO((d as { blocked_date: string }).blocked_date) : d as Date, 'yyyy-MM-dd') === dateStr);
    if (isBlocked) return 'blocked';
    
    return 'available';
  };

  const isDateSelectable = (date: Date): boolean => {
    if (!selectable) return false;
    const status = getDayStatus(date);
    return status === 'available';
  };

  const handleDateClick = (date: Date) => {
    if (!selectable || !isDateSelectable(date)) return;

    if (!selectedStart || (selectedStart && selectedEnd)) {
      // Start new selection
      setSelectedStart(date);
      setSelectedEnd(undefined);
      onDateSelect?.(date);
    } else if (isBefore(date, selectedStart)) {
      // Clicked before start, reset to new start
      setSelectedStart(date);
      setSelectedEnd(undefined);
      onDateSelect?.(date);
    } else {
      // Set end date
      setSelectedEnd(date);
      onDateSelect?.(selectedStart, date);
    }
  };

  const isInSelectedRange = (date: Date): boolean => {
    if (!selectedStart) return false;
    if (!selectedEnd) return isSameDay(date, selectedStart);
    return (isSameDay(date, selectedStart) || isAfter(date, selectedStart)) && 
           (isSameDay(date, selectedEnd) || isBefore(date, selectedEnd));
  };

  const statusColors: Record<string, string> = {
    available: 'bg-background text-foreground border border-border',
    blocked: 'bg-muted text-muted-foreground',
    booked: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    buffer: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    past: 'bg-muted/30 text-muted-foreground/50',
    outside_window: 'bg-muted/50 text-muted-foreground/60',
    future_limit: 'bg-muted/30 text-muted-foreground/50',
  };

  const statusLabels: Record<string, string> = {
    available: 'Available',
    blocked: 'Blocked by host',
    booked: 'Booked',
    buffer: 'Buffer day',
    past: 'Past date',
    outside_window: 'Outside availability window',
    future_limit: 'Beyond 1 year limit',
  };

  if (isLoading) {
    return (
      <div className={cn("p-4 bg-card rounded-xl border border-border", className)}>
        <div className="h-64 flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Loading availability...</div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center gap-2">
        <CalendarCheck className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-foreground">Availability</h3>
        <Badge variant="secondary" className="text-[10px] ml-auto">
          Up to 1 year
        </Badge>
      </div>

      <div className="bg-card rounded-xl border border-border p-4">
        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handlePrevMonth}
            disabled={!canGoPrev}
            className="disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h4 className="text-base font-semibold text-foreground">
            {format(currentMonth, 'MMMM yyyy')}
          </h4>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleNextMonth}
            disabled={!canGoNext}
            className="disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Day Headers */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
            <div key={`${day}-${i}`} className="text-center text-xs font-medium text-muted-foreground py-1">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <TooltipProvider>
          <div className="grid grid-cols-7 gap-1">
            {paddingDays.map((_, index) => (
              <div key={`padding-${index}`} className="aspect-square" />
            ))}

            {daysInMonth.map(date => {
              const status = getDayStatus(date);
              const selectionAllowed = isDateSelectable(date);
              const isSelected = isInSelectedRange(date);
              const isStart = selectedStart && isSameDay(date, selectedStart);
              const isEnd = selectedEnd && isSameDay(date, selectedEnd);

              return (
                <Tooltip key={date.toISOString()}>
                  <TooltipTrigger asChild>
                    <div
                      onClick={() => handleDateClick(date)}
                      className={cn(
                        'aspect-square rounded-lg flex flex-col items-center justify-center text-xs transition-all relative',
                        statusColors[status],
                        isToday(date) && 'ring-2 ring-primary ring-offset-1',
                        selectable && selectionAllowed && 'cursor-pointer hover:bg-primary/10 hover:border-primary',
                        selectable && !selectionAllowed && 'cursor-not-allowed',
                        isSelected && 'bg-primary/20 border-primary',
                        (isStart || isEnd) && 'bg-primary text-primary-foreground border-primary',
                      )}
                    >
                      <span className="font-medium">{format(date, 'd')}</span>
                      {status === 'blocked' && (
                        <Lock className="h-2 w-2 absolute bottom-0.5" />
                      )}
                      {status === 'booked' && (
                        <CalendarCheck className="h-2 w-2 absolute bottom-0.5" />
                      )}
                      {status === 'buffer' && (
                        <Clock className="h-2 w-2 absolute bottom-0.5" />
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p>{format(date, 'MMM d, yyyy')}</p>
                    <p className="text-xs text-muted-foreground">{statusLabels[status]}</p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </TooltipProvider>

        {/* Selected Range Display */}
        {selectable && selectedStart && (
          <div className="mt-3 pt-3 border-t border-border">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Selected:</span>
              <span className="font-medium text-foreground">
                {format(selectedStart, 'MMM d')}
                {selectedEnd && ` – ${format(selectedEnd, 'MMM d, yyyy')}`}
              </span>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-border">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-background border border-border" />
            <span className="text-xs text-muted-foreground">Available</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-emerald-100 dark:bg-emerald-900/30" />
            <span className="text-xs text-muted-foreground">Booked</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-amber-100 dark:bg-amber-900/30" />
            <span className="text-xs text-muted-foreground">Buffer</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-muted" />
            <span className="text-xs text-muted-foreground">Blocked</span>
          </div>
        </div>
      </div>

      {/* Upcoming Bookings */}
      {upcomingBookings && upcomingBookings.length > 0 && (
        <div className="p-3 rounded-lg bg-muted/30 border border-border">
          <h4 className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            Upcoming Bookings
          </h4>
          <div className="space-y-1.5">
            {upcomingBookings.slice(0, 3).map((booking, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  {format(parseISO(booking.start_date), 'MMM d')} - {format(parseISO(booking.end_date), 'MMM d')}
                </span>
                <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 text-[10px] dark:bg-emerald-900/30 dark:text-emerald-400">
                  Confirmed
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info */}
      <div className="flex items-start gap-2 p-2 rounded-lg bg-muted/30">
        <Info className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-[11px] text-muted-foreground">
          {selectable 
            ? 'Tap a date to select your start date, then tap another for your end date.'
            : 'Grayed out dates are unavailable for booking. You can browse up to 1 year ahead.'}
        </p>
      </div>
    </div>
  );
};

export default AvailabilityCalendarDisplay;
