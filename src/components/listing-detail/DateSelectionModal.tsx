import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar, 
  ArrowRight, 
  ChevronLeft, 
  ChevronRight, 
  Info, 
  Zap,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isToday, 
  isBefore, 
  isAfter,
  startOfDay, 
  parseISO, 
  isSameDay, 
  differenceInDays,
  addYears,
} from 'date-fns';
import { useBlockedDates } from '@/hooks/useBlockedDates';
import { useHourlyAvailability } from '@/hooks/useHourlyAvailability';
import { calculateRentalFees } from '@/lib/commissions';
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
  priceMonthly?: number | null;
  priceHourly?: number | null;
  hourlyEnabled?: boolean;
  dailyEnabled?: boolean;
  instantBook?: boolean;
  onDatesSelected?: (startDate: Date, endDate: Date) => void;
  navigateToBooking?: boolean;
  isVendorSpace?: boolean;
  totalSlots?: number;
  slotNames?: string[] | null;
}

// Calculate tiered pricing: months → weeks → days
const calculateTieredPrice = (
  days: number,
  priceDaily: number | null,
  priceWeekly?: number | null,
  priceMonthly?: number | null
): { total: number; breakdown: string } => {
  if (!priceDaily || days <= 0) return { total: 0, breakdown: '' };

  let remaining = days;
  let total = 0;
  const parts: string[] = [];

  // Apply monthly rate for 30+ day chunks
  if (priceMonthly && remaining >= 30) {
    const months = Math.floor(remaining / 30);
    total += months * priceMonthly;
    parts.push(`${months} month${months > 1 ? 's' : ''} @ $${priceMonthly.toLocaleString()}`);
    remaining = remaining % 30;
  }

  // Apply weekly rate for 7+ day chunks
  if (priceWeekly && remaining >= 7) {
    const weeks = Math.floor(remaining / 7);
    total += weeks * priceWeekly;
    parts.push(`${weeks} week${weeks > 1 ? 's' : ''} @ $${priceWeekly.toLocaleString()}`);
    remaining = remaining % 7;
  }

  // Apply daily rate for remaining days
  if (remaining > 0) {
    total += remaining * priceDaily;
    parts.push(`${remaining} day${remaining > 1 ? 's' : ''} @ $${priceDaily.toLocaleString()}`);
  }

  return { total, breakdown: parts.join(' + ') };
};

export const DateSelectionModal: React.FC<DateSelectionModalProps> = ({
  open,
  onOpenChange,
  listingId,
  availableFrom,
  availableTo,
  priceDaily,
  priceWeekly,
  priceMonthly,
  priceHourly,
  hourlyEnabled = false,
  instantBook = false,
  onDatesSelected,
  navigateToBooking = true,
}) => {
  const navigate = useNavigate();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  
  // Hourly mode state
  const [isHourlyMode, setIsHourlyMode] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedStartTime, setSelectedStartTime] = useState<string>('');
  const [selectedDuration, setSelectedDuration] = useState<number>(1);

  const { blockedDates, bookedDates, bufferDates, isLoading } = useBlockedDates({ listingId });
  const { 
    settings: hourlySettings, 
    getAvailableWindowsForDate,
  } = useHourlyAvailability({ listingId });

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
  const canGoPrev = isAfter(monthStart, minMonth);
  const canGoNext = isBefore(monthStart, maxMonth);

  const handlePrevMonth = () => {
    if (canGoPrev) setCurrentMonth(subMonths(currentMonth, 1));
  };
  
  const handleNextMonth = () => {
    if (canGoNext) setCurrentMonth(addMonths(currentMonth, 1));
  };

  const getDayStatus = (date: Date): 'available' | 'blocked' | 'booked' | 'buffer' | 'past' | 'outside_window' => {
    if (isBefore(date, today)) return 'past';
    if (isAfter(date, maxDate)) return 'outside_window';
    
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
    
    const isBlocked = blockedDates.some(d => format(typeof d === 'object' && 'blocked_date' in d ? parseISO((d as { blocked_date: string }).blocked_date) : d as Date, 'yyyy-MM-dd') === dateStr);
    if (isBlocked) return 'blocked';
    
    return 'available';
  };

  const isDateSelectable = (date: Date): boolean => {
    return getDayStatus(date) === 'available';
  };

  const handleDateClick = (date: Date) => {
    if (!isDateSelectable(date)) return;

    if (isHourlyMode) {
      setSelectedDate(date);
      setSelectedStartTime('');
      setSelectedDuration(hourlySettings.minHours || 1);
    } else {
      // Simple range selection
      if (!startDate || (startDate && endDate)) {
        setStartDate(date);
        setEndDate(undefined);
      } else if (isBefore(date, startDate)) {
        setStartDate(date);
        setEndDate(undefined);
      } else {
        setEndDate(date);
      }
    }
  };

  const isInSelectedRange = (date: Date): boolean => {
    if (isHourlyMode) {
      return selectedDate ? isSameDay(date, selectedDate) : false;
    }
    if (!startDate) return false;
    if (!endDate) return isSameDay(date, startDate);
    return (isSameDay(date, startDate) || isAfter(date, startDate)) && 
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

  // Calculate rental duration and tiered pricing
  const rentalInfo = useMemo(() => {
    if (isHourlyMode) {
      if (!selectedDate || !selectedStartTime || !priceHourly) return null;
      const basePrice = selectedDuration * priceHourly;
      const fees = calculateRentalFees(basePrice);
      return {
        days: 0,
        label: `${selectedDuration} hour${selectedDuration > 1 ? 's' : ''}`,
        basePrice,
        breakdown: `${selectedDuration} × $${priceHourly}`,
        totalWithFees: fees.customerTotal,
        serviceFee: fees.renterFee,
      };
    }
    
    if (!startDate || !endDate || !priceDaily) return null;
    const days = differenceInDays(endDate, startDate);
    if (days <= 0) return null;

    const { total, breakdown } = calculateTieredPrice(days, priceDaily, priceWeekly, priceMonthly);
    const fees = calculateRentalFees(total);
    
    return {
      days,
      label: `${days} day${days > 1 ? 's' : ''}`,
      basePrice: total,
      breakdown,
      totalWithFees: fees.customerTotal,
      serviceFee: fees.renterFee,
    };
  }, [isHourlyMode, startDate, endDate, selectedDate, selectedStartTime, selectedDuration, priceHourly, priceDaily, priceWeekly, priceMonthly]);

  // Hourly mode helpers
  const availableWindows = useMemo(() => {
    if (!selectedDate || !isHourlyMode) return [];
    return getAvailableWindowsForDate(selectedDate);
  }, [selectedDate, isHourlyMode, getAvailableWindowsForDate]);

  const startTimeOptions = useMemo(() => {
    const options: { value: string; label: string }[] = [];
    availableWindows.forEach(window => {
      for (let h = window.startHour; h < window.endHour - (hourlySettings.minHours || 1) + 1; h++) {
        const timeStr = `${h.toString().padStart(2, '0')}:00`;
        const label = h === 0 ? '12:00 AM' : h < 12 ? `${h}:00 AM` : h === 12 ? '12:00 PM' : `${h - 12}:00 PM`;
        options.push({ value: timeStr, label });
      }
    });
    return options;
  }, [availableWindows, hourlySettings.minHours]);

  const maxDuration = useMemo(() => {
    if (!selectedStartTime || availableWindows.length === 0) return hourlySettings.maxHours || 24;
    const startHour = parseInt(selectedStartTime.split(':')[0]);
    const window = availableWindows.find(w => startHour >= w.startHour && startHour < w.endHour);
    if (!window) return hourlySettings.minHours || 1;
    return Math.min(window.endHour - startHour, hourlySettings.maxHours || 24);
  }, [selectedStartTime, availableWindows, hourlySettings.maxHours, hourlySettings.minHours]);

  const calculatedEndTime = useMemo(() => {
    if (!selectedStartTime) return '';
    const startHour = parseInt(selectedStartTime.split(':')[0]);
    const endHour = startHour + selectedDuration;
    return endHour === 0 ? '12:00 AM' : endHour < 12 ? `${endHour}:00 AM` : endHour === 12 ? '12:00 PM' : `${endHour - 12}:00 PM`;
  }, [selectedStartTime, selectedDuration]);

  const canContinue = useMemo(() => {
    if (isHourlyMode) {
      return selectedDate && selectedStartTime && selectedDuration > 0;
    }
    return startDate && endDate && differenceInDays(endDate, startDate) > 0;
  }, [isHourlyMode, selectedDate, selectedStartTime, selectedDuration, startDate, endDate]);

  const handleContinue = () => {
    if (isHourlyMode) {
      if (!selectedDate || !selectedStartTime) return;
      
      if (navigateToBooking) {
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        const startHour = parseInt(selectedStartTime.split(':')[0]);
        const endHour = startHour + selectedDuration;
        const endTimeStr = `${endHour.toString().padStart(2, '0')}:00`;
        navigate(`/book/${listingId}?start=${dateStr}&end=${dateStr}&startTime=${selectedStartTime}&endTime=${endTimeStr}&hours=${selectedDuration}`);
      }
    } else {
      if (!startDate || !endDate) return;
      
      if (onDatesSelected) {
        onDatesSelected(startDate, endDate);
      }
      if (navigateToBooking) {
        const startStr = format(startDate, 'yyyy-MM-dd');
        const endStr = format(endDate, 'yyyy-MM-dd');
        navigate(`/book/${listingId}?start=${startStr}&end=${endStr}`);
      }
    }
    onOpenChange(false);
  };

  const handleReset = () => {
    setStartDate(undefined);
    setEndDate(undefined);
    setSelectedDate(undefined);
    setSelectedStartTime('');
    setSelectedDuration(hourlySettings.minHours || 1);
  };

  const handleModeToggle = (hourly: boolean) => {
    setIsHourlyMode(hourly);
    handleReset();
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md p-4">
          <div className="h-64 flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">Loading availability...</div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md sm:max-w-lg p-0 gap-0 overflow-hidden max-h-[90vh] overflow-y-auto">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Calendar className="h-5 w-5 text-primary" />
            Select Your Dates
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {isHourlyMode 
              ? 'Pick a date and time slot' 
              : 'Tap your start date, then your end date'}
          </p>
        </DialogHeader>

        <div className="p-4 space-y-4">
          {/* Mode Toggle - only if hourly is enabled */}
          {hourlyEnabled && priceHourly && (
            <div className="flex gap-2 p-1 bg-muted rounded-lg">
              <button
                type="button"
                onClick={() => handleModeToggle(false)}
                className={cn(
                  "flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2",
                  !isHourlyMode 
                    ? "bg-background text-foreground shadow-sm" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Calendar className="h-4 w-4" />
                By Date
              </button>
              <button
                type="button"
                onClick={() => handleModeToggle(true)}
                className={cn(
                  "flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2",
                  isHourlyMode 
                    ? "bg-background text-foreground shadow-sm" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Clock className="h-4 w-4" />
                By Hour
              </button>
            </div>
          )}

          {/* Calendar Navigation */}
          <div className="flex items-center justify-between">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handlePrevMonth}
              disabled={!canGoPrev}
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
            >
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
                const canSelect = isDateSelectable(date);
                const isSelected = isInSelectedRange(date);
                const isStart = startDate && isSameDay(date, startDate);
                const isEnd = endDate && isSameDay(date, endDate);
                const isHourlySelected = isHourlyMode && selectedDate && isSameDay(date, selectedDate);

                return (
                  <Tooltip key={date.toISOString()}>
                    <TooltipTrigger asChild>
                      <div
                        onClick={() => handleDateClick(date)}
                        className={cn(
                          'aspect-square rounded-lg flex flex-col items-center justify-center text-xs transition-all relative',
                          canSelect ? statusColors['available'] : statusColors[status],
                          isToday(date) && 'ring-2 ring-primary ring-offset-1',
                          isSelected && canSelect && 'bg-primary/20 border-primary',
                          (isStart || isEnd || isHourlySelected) && canSelect && 'bg-primary text-primary-foreground border-primary',
                        )}
                      >
                        <span className="font-medium">{format(date, 'd')}</span>
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

          {/* Hourly Time Selection */}
          {isHourlyMode && selectedDate && (
            <div className="space-y-3 p-3 bg-muted/30 rounded-xl border border-border">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Clock className="h-4 w-4 text-primary" />
                Select Time for {format(selectedDate, 'MMM d')}
              </div>

              {availableWindows.length > 0 ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-semibold text-muted-foreground uppercase">Start</label>
                      <Select value={selectedStartTime} onValueChange={setSelectedStartTime}>
                        <SelectTrigger className="h-10">
                          <SelectValue placeholder="Select time" />
                        </SelectTrigger>
                        <SelectContent>
                          {startTimeOptions.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-semibold text-muted-foreground uppercase">Hours</label>
                      <Select 
                        value={selectedDuration.toString()} 
                        onValueChange={(v) => setSelectedDuration(parseInt(v))}
                        disabled={!selectedStartTime}
                      >
                        <SelectTrigger className="h-10">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: maxDuration - (hourlySettings.minHours || 1) + 1 }, (_, i) => (hourlySettings.minHours || 1) + i).map(h => (
                            <SelectItem key={h} value={h.toString()}>
                              {h} hour{h !== 1 ? 's' : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {selectedStartTime && (
                    <div className="text-xs text-center text-muted-foreground">
                      {startTimeOptions.find(o => o.value === selectedStartTime)?.label} – {calculatedEndTime}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-4">
                  <Clock className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No time slots available</p>
                </div>
              )}
            </div>
          )}

          {/* Pricing Summary */}
          {rentalInfo && (
            <div className="p-4 bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl border border-primary/20 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-foreground">
                    {rentalInfo.label}
                  </span>
                  {!isHourlyMode && startDate && endDate && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {format(startDate, 'MMM d')} – {format(endDate, 'MMM d, yyyy')}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-xl font-bold text-primary">
                    ${rentalInfo.totalWithFees.toLocaleString()}
                  </span>
                  <p className="text-[10px] text-muted-foreground">incl. fees</p>
                </div>
              </div>

              {/* Breakdown */}
              {rentalInfo.breakdown && (
                <div className="text-xs text-muted-foreground border-t border-primary/10 pt-2">
                  {rentalInfo.breakdown}
                </div>
              )}

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Base price</span>
                <span>${rentalInfo.basePrice.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Service fee</span>
                <span>${rentalInfo.serviceFee.toLocaleString()}</span>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleReset}
                className="w-full h-7 text-xs text-muted-foreground"
              >
                Clear selection
              </Button>
            </div>
          )}

          {/* Info */}
          <div className="flex items-start gap-2 p-2 rounded-lg bg-muted/30">
            <Info className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-[11px] text-muted-foreground">
              {isHourlyMode 
                ? 'Select a date, then choose your time slot.'
                : priceWeekly || priceMonthly
                  ? 'Best rates apply automatically: weekly rate for 7+ days, monthly for 30+ days.'
                  : 'Tap a date to start, then tap another to set your rental period.'}
            </p>
          </div>

          {/* CTA Button */}
          <Button
            variant="dark-shine"
            className="w-full h-12 text-base"
            size="lg"
            onClick={handleContinue}
            disabled={!canContinue}
          >
            {instantBook ? (
              <>
                <Zap className="h-4 w-4 mr-2" />
                Book Now
              </>
            ) : (
              'Request to Book'
            )}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>

          {/* Legend */}
          <div className="flex flex-wrap gap-3 pt-2">
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
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DateSelectionModal;
