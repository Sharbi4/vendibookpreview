import React, { useState } from 'react';
import { Calendar, ArrowRight, CalendarCheck, Lock, Clock, ChevronLeft, ChevronRight, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isToday, isBefore, startOfDay, parseISO, isSameDay, differenceInDays } from 'date-fns';
import { useBlockedDates } from '@/hooks/useBlockedDates';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface DateSelectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listingId: string;
  availableFrom?: string | null;
  availableTo?: string | null;
  priceDaily: number | null;
  priceWeekly?: number | null;
  onDatesSelected: (startDate: Date, endDate: Date) => void;
}

export const DateSelectionModal: React.FC<DateSelectionModalProps> = ({
  open,
  onOpenChange,
  listingId,
  availableFrom,
  availableTo,
  priceDaily,
  priceWeekly,
  onDatesSelected,
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const { blockedDates, bookedDates, bufferDates, isLoading } = useBlockedDates({ listingId });

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const firstDayOfWeek = monthStart.getDay();
  const paddingDays = Array(firstDayOfWeek).fill(null);

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  const getDayStatus = (date: Date): 'available' | 'blocked' | 'booked' | 'buffer' | 'past' | 'outside_window' => {
    if (isBefore(date, startOfDay(new Date()))) return 'past';
    
    if (availableFrom || availableTo) {
      const fromDate = availableFrom ? parseISO(availableFrom) : null;
      const toDate = availableTo ? parseISO(availableTo) : null;
      
      if (fromDate && isBefore(date, startOfDay(fromDate))) return 'outside_window';
      if (toDate && isBefore(startOfDay(toDate), date)) return 'outside_window';
    }

    const dateStr = format(date, 'yyyy-MM-dd');
    
    const isBooked = bookedDates.some(d => format(d, 'yyyy-MM-dd') === dateStr);
    if (isBooked) return 'booked';
    
    const isBuffer = bufferDates.some(d => format(d, 'yyyy-MM-dd') === dateStr);
    if (isBuffer) return 'buffer';
    
    const isBlocked = blockedDates.some(d => format(d, 'yyyy-MM-dd') === dateStr);
    if (isBlocked) return 'blocked';
    
    return 'available';
  };

  const isDateSelectable = (date: Date): boolean => {
    const status = getDayStatus(date);
    return status === 'available';
  };

  const handleDateClick = (date: Date) => {
    if (!isDateSelectable(date)) return;

    if (!startDate || (startDate && endDate)) {
      // Start fresh selection
      setStartDate(date);
      setEndDate(undefined);
    } else if (isBefore(date, startDate)) {
      // Clicked before start date, reset
      setStartDate(date);
      setEndDate(undefined);
    } else {
      // Set end date
      setEndDate(date);
    }
  };

  const isInSelectedRange = (date: Date): boolean => {
    if (!startDate) return false;
    if (!endDate) return isSameDay(date, startDate);
    return (isSameDay(date, startDate) || isBefore(startDate, date)) && 
           (isSameDay(date, endDate) || isBefore(date, endDate));
  };

  const statusColors: Record<string, string> = {
    available: 'bg-background text-foreground border border-border hover:bg-primary/10 hover:border-primary cursor-pointer',
    blocked: 'bg-muted text-muted-foreground cursor-not-allowed',
    booked: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 cursor-not-allowed',
    buffer: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 cursor-not-allowed',
    past: 'bg-muted/30 text-muted-foreground/50 cursor-not-allowed',
    outside_window: 'bg-muted/50 text-muted-foreground/60 cursor-not-allowed',
  };

  const statusLabels: Record<string, string> = {
    available: 'Available',
    blocked: 'Blocked by host',
    booked: 'Booked',
    buffer: 'Buffer day',
    past: 'Past date',
    outside_window: 'Outside availability window',
  };

  const rentalDays = startDate && endDate ? differenceInDays(endDate, startDate) : 0;

  const calculateBasePrice = () => {
    if (!priceDaily || rentalDays <= 0) return 0;
    const weeks = Math.floor(rentalDays / 7);
    const remainingDays = rentalDays % 7;
    if (priceWeekly && weeks > 0) {
      return (weeks * priceWeekly) + (remainingDays * priceDaily);
    }
    return rentalDays * priceDaily;
  };

  const basePrice = calculateBasePrice();
  const canContinue = startDate && endDate && rentalDays > 0;

  const handleContinue = () => {
    if (startDate && endDate) {
      onDatesSelected(startDate, endDate);
      onOpenChange(false);
    }
  };

  const handleReset = () => {
    setStartDate(undefined);
    setEndDate(undefined);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md sm:max-w-lg p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Calendar className="h-5 w-5 text-primary" />
            Select Your Dates
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Choose your rental period to continue
          </p>
        </DialogHeader>

        <div className="p-4 space-y-4">
          {isLoading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="animate-pulse text-muted-foreground">Loading availability...</div>
            </div>
          ) : (
            <>
              {/* Month Navigation */}
              <div className="flex items-center justify-between">
                <Button variant="ghost" size="icon" onClick={handlePrevMonth}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <h4 className="text-base font-semibold text-foreground">
                  {format(currentMonth, 'MMMM yyyy')}
                </h4>
                <Button variant="ghost" size="icon" onClick={handleNextMonth}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {/* Day Headers */}
              <div className="grid grid-cols-7 gap-1">
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
                    const isSelected = isInSelectedRange(date);
                    const isStart = startDate && isSameDay(date, startDate);
                    const isEnd = endDate && isSameDay(date, endDate);

                    return (
                      <Tooltip key={date.toISOString()}>
                        <TooltipTrigger asChild>
                          <div
                            onClick={() => handleDateClick(date)}
                            className={cn(
                              'aspect-square rounded-lg flex flex-col items-center justify-center text-xs transition-all relative',
                              statusColors[status],
                              isToday(date) && 'ring-2 ring-primary ring-offset-1',
                              isSelected && status === 'available' && 'bg-primary/20 border-primary',
                              (isStart || isEnd) && status === 'available' && 'bg-primary text-primary-foreground border-primary',
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

              {/* Legend */}
              <div className="flex flex-wrap gap-3 pt-2 border-t border-border">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-background border border-border" />
                  <span className="text-xs text-muted-foreground">Available</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-emerald-100 dark:bg-emerald-900/30" />
                  <span className="text-xs text-muted-foreground">Booked</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-muted" />
                  <span className="text-xs text-muted-foreground">Unavailable</span>
                </div>
              </div>
            </>
          )}

          {/* Selection Summary */}
          {(startDate || endDate) && (
            <div className="p-3 bg-muted/30 rounded-xl border border-border">
              <div className="flex items-center justify-between">
                <div>
                  {startDate && !endDate && (
                    <p className="text-sm text-muted-foreground">
                      Start: <span className="font-medium text-foreground">{format(startDate, 'MMM d')}</span>
                      <span className="ml-2 text-xs">→ Select end date</span>
                    </p>
                  )}
                  {startDate && endDate && (
                    <>
                      <span className="text-sm font-medium text-foreground">
                        {rentalDays} day{rentalDays > 1 ? 's' : ''} rental
                      </span>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {format(startDate, 'MMM d')} – {format(endDate, 'MMM d, yyyy')}
                      </p>
                    </>
                  )}
                </div>
                {startDate && endDate && priceDaily && (
                  <span className="text-lg font-bold text-primary">
                    ${basePrice.toLocaleString()}
                  </span>
                )}
              </div>
              {(startDate || endDate) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleReset}
                  className="mt-2 h-7 text-xs text-muted-foreground"
                >
                  Clear dates
                </Button>
              )}
            </div>
          )}

          {/* Info */}
          <div className="flex items-start gap-2 p-2 rounded-lg bg-muted/30">
            <Info className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-[11px] text-muted-foreground">
              Tap a date to start, then tap another to set your rental period.
            </p>
          </div>

          {/* CTA */}
          <Button
            variant="gradient"
            className="w-full h-12 text-base"
            size="lg"
            onClick={handleContinue}
            disabled={!canContinue}
          >
            Continue to Booking
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DateSelectionModal;
