import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, CalendarCheck, Lock, Clock, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
  startOfDay, 
  parseISO 
} from 'date-fns';
import { useBlockedDates } from '@/hooks/useBlockedDates';
import { useHourlyAvailability } from '@/hooks/useHourlyAvailability';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface InlineAvailabilityCalendarProps {
  listingId: string;
  availableFrom?: string | null;
  availableTo?: string | null;
  className?: string;
}

type DayStatus = 'available' | 'limited' | 'blocked' | 'booked' | 'buffer' | 'past' | 'outside_window';

export const InlineAvailabilityCalendar = ({
  listingId,
  availableFrom,
  availableTo,
  className,
}: InlineAvailabilityCalendarProps) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const { blockedDates, bookedDates, bufferDates, isLoading } = useBlockedDates({ listingId });
  const { settings, getDayAvailabilityInfo } = useHourlyAvailability({ listingId });

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  // Generate both months' calendars
  const month1 = currentMonth;
  const month2 = addMonths(currentMonth, 1);

  const getDayStatus = (date: Date): DayStatus => {
    if (isBefore(date, startOfDay(new Date()))) return 'past';
    
    // Check if outside availability window
    if (availableFrom || availableTo) {
      const fromDate = availableFrom ? parseISO(availableFrom) : null;
      const toDate = availableTo ? parseISO(availableTo) : null;
      
      if (fromDate && isBefore(date, startOfDay(fromDate))) return 'outside_window';
      if (toDate && isBefore(startOfDay(toDate), date)) return 'outside_window';
    }

    const dateStr = format(date, 'yyyy-MM-dd');
    
    // Check if booked
    const isBooked = bookedDates.some(d => format(d, 'yyyy-MM-dd') === dateStr);
    if (isBooked) return 'booked';
    
    // Check if buffer day
    const isBuffer = bufferDates.some(d => format(d, 'yyyy-MM-dd') === dateStr);
    if (isBuffer) return 'buffer';
    
    // Check if manually blocked
    const isBlocked = blockedDates.some(d => {
      if (typeof d === 'object' && 'blocked_date' in d) {
        return (d as { blocked_date: string }).blocked_date === dateStr;
      }
      return format(d as Date, 'yyyy-MM-dd') === dateStr;
    });
    if (isBlocked) return 'blocked';
    
    // Check for hourly availability (limited status)
    if (settings.hourlyEnabled) {
      const dayInfo = getDayAvailabilityInfo(date);
      if (dayInfo.isLimited) return 'limited';
    }
    
    return 'available';
  };

  const statusStyles: Record<DayStatus, string> = {
    available: 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800',
    limited: 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800',
    blocked: 'bg-muted text-muted-foreground',
    booked: 'bg-red-50 text-red-600 border border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800',
    buffer: 'bg-orange-50 text-orange-600 border border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800',
    past: 'bg-muted/30 text-muted-foreground/50',
    outside_window: 'bg-muted/50 text-muted-foreground/60',
  };

  const statusLabels: Record<DayStatus, string> = {
    available: 'Available',
    limited: 'Limited hours',
    blocked: 'Blocked by host',
    booked: 'Booked',
    buffer: 'Buffer day',
    past: 'Past date',
    outside_window: 'Outside availability window',
  };

  const renderMonth = (monthDate: Date) => {
    const monthStart = startOfMonth(monthDate);
    const monthEnd = endOfMonth(monthDate);
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const firstDayOfWeek = monthStart.getDay();
    const paddingDays = Array(firstDayOfWeek).fill(null);

    return (
      <div className="flex-1 min-w-[200px]">
        <h4 className="text-center font-semibold text-foreground mb-3">
          {format(monthDate, 'MMMM yyyy')}
        </h4>
        
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-0.5 mb-1">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day, i) => (
            <div key={`${day}-${i}`} className="text-center text-[10px] font-medium text-muted-foreground py-1">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-0.5">
          {paddingDays.map((_, index) => (
            <div key={`padding-${index}`} className="aspect-square" />
          ))}

          {daysInMonth.map(date => {
            const status = getDayStatus(date);
            const isCurrentDay = isToday(date);

            return (
              <Tooltip key={date.toISOString()}>
                <TooltipTrigger asChild>
                  <div
                    className={cn(
                      'aspect-square rounded-md flex items-center justify-center text-xs font-medium transition-all cursor-default',
                      statusStyles[status],
                      isCurrentDay && 'ring-2 ring-primary ring-offset-1',
                    )}
                  >
                    {format(date, 'd')}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  <p className="font-medium">{format(date, 'MMM d, yyyy')}</p>
                  <p className="text-muted-foreground">{statusLabels[status]}</p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className={cn("space-y-4", className)}>
        <h2 className="text-xl font-semibold text-foreground">Availability</h2>
        <div className="h-64 flex items-center justify-center bg-muted/30 rounded-xl border border-border">
          <div className="animate-pulse text-muted-foreground text-sm">Loading availability...</div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">Availability</h2>
        <p className="text-sm text-muted-foreground hidden sm:block">
          Select dates using the booking widget
        </p>
      </div>

      <div className="bg-card rounded-xl border border-border p-4 sm:p-6">
        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handlePrevMonth}
            disabled={isBefore(startOfMonth(currentMonth), startOfMonth(new Date()))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            {format(month1, 'MMM')} – {format(month2, 'MMM yyyy')}
          </span>
          <Button variant="ghost" size="icon" onClick={handleNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Dual-Month Calendar */}
        <TooltipProvider>
          <div className="flex flex-col sm:flex-row gap-6">
            {renderMonth(month1)}
            <div className="hidden sm:block w-px bg-border" />
            {renderMonth(month2)}
          </div>
        </TooltipProvider>

        {/* Legend */}
        <div className="flex flex-wrap gap-x-4 gap-y-2 mt-6 pt-4 border-t border-border">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-emerald-50 border border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800" />
            <span className="text-xs text-muted-foreground">Available</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-amber-50 border border-amber-200 dark:bg-amber-900/20 dark:border-amber-800" />
            <span className="text-xs text-muted-foreground">Limited</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-800" />
            <span className="text-xs text-muted-foreground">Booked</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-muted" />
            <span className="text-xs text-muted-foreground">Unavailable</span>
          </div>
        </div>
      </div>

      {/* Mobile hint */}
      <p className="text-xs text-muted-foreground text-center sm:hidden">
        <Info className="inline h-3 w-3 mr-1" />
        Scroll down to select dates
      </p>
    </div>
  );
};

export default InlineAvailabilityCalendar;
