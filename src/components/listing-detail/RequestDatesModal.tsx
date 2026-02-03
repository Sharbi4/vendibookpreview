import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  X, 
  Calendar, 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  Sun, 
  Zap,
  Info,
  ArrowRight,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
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
  startOfDay, 
  parseISO, 
  isSameDay,
  differenceInDays,
} from 'date-fns';
import { useHourlyAvailability } from '@/hooks/useHourlyAvailability';
import { useBlockedDates } from '@/hooks/useBlockedDates';
import { calculateRentalFees } from '@/lib/commissions';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface RequestDatesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listingId: string;
  availableFrom?: string | null;
  availableTo?: string | null;
  instantBook?: boolean;
  onDatesSelected?: (selection: BookingSelection) => void;
  navigateToBooking?: boolean;
}

export interface BookingSelection {
  type: 'hourly' | 'daily';
  startDate: Date;
  endDate: Date;
  startTime?: string;
  endTime?: string;
  durationHours?: number;
  totalPrice: number;
}

export const RequestDatesModal: React.FC<RequestDatesModalProps> = ({
  open,
  onOpenChange,
  listingId,
  availableFrom,
  availableTo,
  instantBook = false,
  onDatesSelected,
  navigateToBooking = true,
}) => {
  const navigate = useNavigate();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  
  // For daily booking - date range selection
  const [dailyStartDate, setDailyStartDate] = useState<Date | undefined>();
  const [dailyEndDate, setDailyEndDate] = useState<Date | undefined>();
  
  // For hourly booking
  const [selectedStartTime, setSelectedStartTime] = useState<string>('');
  const [selectedDuration, setSelectedDuration] = useState<number>(1);
  const [bookingType, setBookingType] = useState<'hourly' | 'daily' | null>(null);

  const { 
    settings, 
    isLoading, 
    getDayAvailabilityInfo,
    getAvailableWindowsForDate,
    calculateHourlyPrice,
    calculateDailyPrice,
  } = useHourlyAvailability({ listingId, selectedDate });

  const { blockedDates, bookedDates, bufferDates } = useBlockedDates({ listingId });

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const firstDayOfWeek = monthStart.getDay();
  const paddingDays = Array(firstDayOfWeek).fill(null);

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  // Check if date is selectable
  const isDateSelectable = (date: Date): boolean => {
    if (isBefore(date, startOfDay(new Date()))) return false;
    
    if (availableFrom) {
      const fromDate = parseISO(availableFrom);
      if (isBefore(date, startOfDay(fromDate))) return false;
    }
    if (availableTo) {
      const toDate = parseISO(availableTo);
      if (isBefore(startOfDay(toDate), date)) return false;
    }

    const dateStr = format(date, 'yyyy-MM-dd');
    const isBlocked = blockedDates.some(d => format(typeof d === 'object' && 'blocked_date' in d ? parseISO((d as { blocked_date: string }).blocked_date) : d as Date, 'yyyy-MM-dd') === dateStr);
    const isBooked = bookedDates.some(d => format(d, 'yyyy-MM-dd') === dateStr);
    const isBuffer = bufferDates.some(d => format(d, 'yyyy-MM-dd') === dateStr);
    
    if (isBlocked || isBooked || isBuffer) return false;
    
    return true;
  };

  const handleDateClick = (date: Date) => {
    if (!isDateSelectable(date)) return;

    // If only daily mode, handle date range selection
    if (settings.dailyEnabled && !settings.hourlyEnabled) {
      if (!dailyStartDate || (dailyStartDate && dailyEndDate)) {
        setDailyStartDate(date);
        setDailyEndDate(undefined);
        setBookingType('daily');
      } else if (isBefore(date, dailyStartDate)) {
        setDailyStartDate(date);
        setDailyEndDate(undefined);
      } else {
        setDailyEndDate(date);
      }
      return;
    }

    // Otherwise, select date for availability panel
    setSelectedDate(date);
    setBookingType(null);
    setSelectedStartTime('');
    setSelectedDuration(settings.minHours);
  };

  // Get available windows for selected date
  const availableWindows = useMemo(() => {
    if (!selectedDate) return [];
    return getAvailableWindowsForDate(selectedDate);
  }, [selectedDate, getAvailableWindowsForDate]);

  // Get day info for selected date
  const selectedDayInfo = useMemo(() => {
    if (!selectedDate) return null;
    return getDayAvailabilityInfo(selectedDate);
  }, [selectedDate, getDayAvailabilityInfo]);

  // Generate start time options
  const startTimeOptions = useMemo(() => {
    const options: { value: string; label: string }[] = [];
    availableWindows.forEach(window => {
      for (let h = window.startHour; h < window.endHour - settings.minHours + 1; h++) {
        const timeStr = `${h.toString().padStart(2, '0')}:00`;
        const label = h === 0 ? '12:00 AM' : h < 12 ? `${h}:00 AM` : h === 12 ? '12:00 PM' : `${h - 12}:00 PM`;
        options.push({ value: timeStr, label });
      }
    });
    return options;
  }, [availableWindows, settings.minHours]);

  // Get max duration for selected start time
  const maxDuration = useMemo(() => {
    if (!selectedStartTime || availableWindows.length === 0) return settings.maxHours;
    
    const startHour = parseInt(selectedStartTime.split(':')[0]);
    const window = availableWindows.find(w => startHour >= w.startHour && startHour < w.endHour);
    if (!window) return settings.minHours;
    
    return Math.min(window.endHour - startHour, settings.maxHours);
  }, [selectedStartTime, availableWindows, settings.maxHours, settings.minHours]);

  // Calculate end time based on selection
  const calculatedEndTime = useMemo(() => {
    if (!selectedStartTime) return '';
    const startHour = parseInt(selectedStartTime.split(':')[0]);
    const endHour = startHour + selectedDuration;
    return `${endHour.toString().padStart(2, '0')}:00`;
  }, [selectedStartTime, selectedDuration]);

  // Calculate prices
  const hourlyPrice = calculateHourlyPrice(selectedDuration);
  const hourlyFees = calculateRentalFees(hourlyPrice);

  const rentalDays = dailyStartDate && dailyEndDate ? differenceInDays(dailyEndDate, dailyStartDate) : 1;
  const dailyPrice = calculateDailyPrice(rentalDays);
  const dailyFees = calculateRentalFees(dailyPrice);

  // Check if selection is valid
  const canContinue = useMemo(() => {
    if (bookingType === 'hourly' && selectedDate && selectedStartTime && selectedDuration >= settings.minHours) {
      return true;
    }
    if (bookingType === 'daily') {
      if (settings.hourlyEnabled) {
        // Selecting full day from panel
        return selectedDate && selectedDayInfo?.hasFullDay;
      } else {
        // Date range selection
        return dailyStartDate && dailyEndDate && rentalDays > 0;
      }
    }
    return false;
  }, [bookingType, selectedDate, selectedStartTime, selectedDuration, settings, dailyStartDate, dailyEndDate, rentalDays, selectedDayInfo]);

  const handleSelectFullDay = () => {
    setBookingType('daily');
    setSelectedStartTime('');
  };

  const handleSelectHourly = () => {
    setBookingType('hourly');
  };

  const handleContinue = () => {
    if (!canContinue) return;

    let selection: BookingSelection;

    if (bookingType === 'hourly' && selectedDate) {
      selection = {
        type: 'hourly',
        startDate: selectedDate,
        endDate: selectedDate,
        startTime: selectedStartTime,
        endTime: calculatedEndTime,
        durationHours: selectedDuration,
        totalPrice: hourlyFees.customerTotal,
      };
    } else if (bookingType === 'daily') {
      const start = settings.hourlyEnabled ? selectedDate! : dailyStartDate!;
      const end = settings.hourlyEnabled ? selectedDate! : dailyEndDate!;
      selection = {
        type: 'daily',
        startDate: start,
        endDate: end,
        totalPrice: dailyFees.customerTotal,
      };
    } else {
      return;
    }

    if (onDatesSelected) {
      onDatesSelected(selection);
    }

    if (navigateToBooking) {
      const startStr = format(selection.startDate, 'yyyy-MM-dd');
      const endStr = format(selection.endDate, 'yyyy-MM-dd');
      let url = `/book/${listingId}?start=${startStr}&end=${endStr}`;
      if (selection.type === 'hourly') {
        url += `&startTime=${selection.startTime}&endTime=${selection.endTime}&hours=${selection.durationHours}`;
      }
      navigate(url);
    }

    onOpenChange(false);
  };

  const handleClear = () => {
    setSelectedDate(undefined);
    setDailyStartDate(undefined);
    setDailyEndDate(undefined);
    setSelectedStartTime('');
    setSelectedDuration(settings.minHours);
    setBookingType(null);
  };

  // Is in daily selected range
  const isInDailyRange = (date: Date): boolean => {
    if (!dailyStartDate) return false;
    if (!dailyEndDate) return isSameDay(date, dailyStartDate);
    return (isSameDay(date, dailyStartDate) || isBefore(dailyStartDate, date)) &&
           (isSameDay(date, dailyEndDate) || isBefore(date, dailyEndDate));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 gap-0 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <DialogHeader className="p-4 pb-3 border-b border-border shrink-0">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Calendar className="h-5 w-5 text-primary" />
            Select date & time
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {settings.hourlyEnabled && settings.dailyEnabled
              ? 'Choose an hourly slot or book the full day (if available).'
              : settings.hourlyEnabled
              ? 'Choose your preferred time slot.'
              : 'Select your rental dates.'}
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          <div className="grid md:grid-cols-2 gap-0 md:gap-4 p-4">
            {/* Calendar Section */}
            <div className="space-y-3">
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
                    const selectable = isDateSelectable(date);
                    const dayInfo = getDayAvailabilityInfo(date);
                    const isSelected = selectedDate && isSameDay(date, selectedDate);
                    const isInRange = isInDailyRange(date);
                    const isRangeStart = dailyStartDate && isSameDay(date, dailyStartDate);
                    const isRangeEnd = dailyEndDate && isSameDay(date, dailyEndDate);

                    return (
                      <Tooltip key={date.toISOString()}>
                        <TooltipTrigger asChild>
                          <div
                            onClick={() => handleDateClick(date)}
                            className={cn(
                              'aspect-square rounded-lg flex flex-col items-center justify-center text-xs transition-all relative p-0.5',
                              !selectable && 'bg-muted/50 text-muted-foreground/50 cursor-not-allowed',
                              selectable && !isSelected && !isInRange && 'bg-background text-foreground border border-border hover:bg-primary/10 hover:border-primary cursor-pointer',
                              isToday(date) && 'ring-2 ring-primary ring-offset-1',
                              (isSelected || isRangeStart || isRangeEnd) && selectable && 'bg-primary text-primary-foreground border-primary',
                              isInRange && !isRangeStart && !isRangeEnd && selectable && 'bg-primary/20 border-primary/50',
                            )}
                          >
                            <span className="font-medium leading-none">{format(date, 'd')}</span>
                            
                            {/* Availability hints */}
                            {selectable && settings.hourlyEnabled && (
                              <div className="absolute bottom-0.5 left-0.5 right-0.5">
                                {dayInfo.hasFullDay && (
                                  <div className="text-[6px] leading-none text-center text-emerald-600 dark:text-emerald-400 truncate">
                                    Full
                                  </div>
                                )}
                                {!dayInfo.hasFullDay && dayInfo.hasHourlySlots && (
                                  <div className="text-[6px] leading-none text-center text-blue-600 dark:text-blue-400 truncate">
                                    {dayInfo.windowsSummary || 'Slots'}
                                  </div>
                                )}
                                {dayInfo.isLimited && !dayInfo.hasFullDay && (
                                  <div className="text-[6px] leading-none text-center text-amber-600 dark:text-amber-400">
                                    Limited
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-[200px]">
                          <p className="font-medium">{format(date, 'MMM d, yyyy')}</p>
                          {!selectable && <p className="text-xs text-muted-foreground">Unavailable</p>}
                          {selectable && dayInfo.hasFullDay && (
                            <p className="text-xs text-emerald-600">Full day available</p>
                          )}
                          {selectable && dayInfo.hasHourlySlots && (
                            <p className="text-xs text-blue-600">
                              {dayInfo.availableWindows.length} time window{dayInfo.availableWindows.length !== 1 ? 's' : ''} available
                            </p>
                          )}
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              </TooltipProvider>

              {/* Legend */}
              <div className="flex flex-wrap gap-3 pt-2 border-t border-border text-[10px]">
                {settings.dailyEnabled && (
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-300" />
                    <span className="text-muted-foreground">Full day</span>
                  </div>
                )}
                {settings.hourlyEnabled && (
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-blue-100 dark:bg-blue-900/30 border border-blue-300" />
                    <span className="text-muted-foreground">Hourly slots</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-muted/50" />
                  <span className="text-muted-foreground">Unavailable</span>
                </div>
              </div>
            </div>

            {/* Availability Panel */}
            <div className="border-t md:border-t-0 md:border-l border-border pt-4 md:pt-0 md:pl-4 space-y-4">
              {!selectedDate && !dailyStartDate ? (
                <div className="flex flex-col items-center justify-center h-full py-8 text-center text-muted-foreground">
                  <Calendar className="h-12 w-12 mb-3 opacity-30" />
                  <p className="text-sm">Select a date to see availability</p>
                </div>
              ) : settings.hourlyEnabled && selectedDate ? (
                <>
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-foreground">
                      {format(selectedDate, 'EEEE, MMMM d')}
                    </h4>
                  </div>

                  {/* Full Day Option */}
                  {selectedDayInfo?.hasFullDay && settings.dailyEnabled && (
                    <>
                      <div 
                        onClick={handleSelectFullDay}
                        className={cn(
                          'p-3 rounded-xl border cursor-pointer transition-all',
                          bookingType === 'daily' 
                            ? 'border-primary bg-primary/5 ring-2 ring-primary/20' 
                            : 'border-border hover:border-primary/50'
                        )}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Sun className="h-4 w-4 text-amber-500" />
                            <span className="font-medium text-sm">Book full day</span>
                          </div>
                          {bookingType === 'daily' && (
                            <Check className="h-4 w-4 text-primary" />
                          )}
                        </div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-lg font-bold text-foreground">
                            ${settings.priceDaily?.toLocaleString()}
                          </span>
                          <span className="text-sm text-muted-foreground">/day</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Separator className="flex-1" />
                        <span className="text-xs text-muted-foreground">or</span>
                        <Separator className="flex-1" />
                      </div>
                    </>
                  )}

                  {/* Hourly Slots */}
                  <div 
                    onClick={handleSelectHourly}
                    className={cn(
                      'p-3 rounded-xl border transition-all',
                      bookingType === 'hourly' 
                        ? 'border-primary bg-primary/5 ring-2 ring-primary/20' 
                        : 'border-border cursor-pointer hover:border-primary/50'
                    )}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-blue-500" />
                        <span className="font-medium text-sm">Book by the hour</span>
                      </div>
                      {bookingType === 'hourly' && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </div>

                    {availableWindows.length > 0 ? (
                      <div className="space-y-3">
                        <div className="text-xs text-muted-foreground">
                          Available: {availableWindows.map(w => {
                            const startH = w.startHour;
                            const endH = w.endHour;
                            return `${startH > 12 ? startH - 12 : startH}${startH >= 12 ? 'PM' : 'AM'}–${endH > 12 ? endH - 12 : endH}${endH >= 12 ? 'PM' : 'AM'}`;
                          }).join(', ')}
                        </div>

                        {bookingType === 'hourly' && (
                          <>
                            {/* Start Time Selector */}
                            <div className="space-y-1.5">
                              <label className="text-xs font-medium text-muted-foreground">Start time</label>
                              <Select value={selectedStartTime} onValueChange={setSelectedStartTime}>
                                <SelectTrigger className="h-9">
                                  <SelectValue placeholder="Select start time" />
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

                            {/* Duration Selector */}
                            <div className="space-y-1.5">
                              <label className="text-xs font-medium text-muted-foreground">Duration</label>
                              <Select 
                                value={selectedDuration.toString()} 
                                onValueChange={(v) => setSelectedDuration(parseInt(v))}
                                disabled={!selectedStartTime}
                              >
                                <SelectTrigger className="h-9">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {Array.from({ length: maxDuration - settings.minHours + 1 }, (_, i) => settings.minHours + i).map(h => (
                                    <SelectItem key={h} value={h.toString()}>
                                      {h} hour{h !== 1 ? 's' : ''}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Price Display */}
                            {selectedStartTime && (
                              <div className="p-2 bg-muted/30 rounded-lg">
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-muted-foreground">
                                    {selectedDuration} hr × ${settings.priceHourly?.toLocaleString()}
                                  </span>
                                  <span className="font-bold text-foreground">
                                    ${hourlyFees.customerTotal.toLocaleString()}
                                  </span>
                                </div>
                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                  {selectedStartTime.replace(':00', '')}:00 – {calculatedEndTime.replace(':00', '')}:00 (incl. fees)
                                </p>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No hourly slots available</p>
                    )}
                  </div>

                  {/* Constraints Info */}
                  <div className="space-y-1 text-[10px] text-muted-foreground">
                    {settings.minHours > 1 && (
                      <p>• Minimum {settings.minHours} hours</p>
                    )}
                    {settings.bufferTimeMins > 0 && (
                      <p>• {settings.bufferTimeMins} min buffer between bookings</p>
                    )}
                    {settings.minNoticeHours > 0 && (
                      <p>• Book at least {settings.minNoticeHours} hours in advance</p>
                    )}
                  </div>
                </>
              ) : !settings.hourlyEnabled && (dailyStartDate || dailyEndDate) ? (
                /* Daily-only mode summary */
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-foreground">Your Selection</h4>
                  
                  <div className="p-3 bg-muted/30 rounded-xl border border-border">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Dates</span>
                      <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={handleClear}>
                        Clear
                      </Button>
                    </div>
                    <p className="text-sm font-medium">
                      {dailyStartDate && format(dailyStartDate, 'MMM d')}
                      {dailyEndDate && ` – ${format(dailyEndDate, 'MMM d, yyyy')}`}
                      {!dailyEndDate && ' → Select end date'}
                    </p>
                    {dailyEndDate && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {rentalDays} day{rentalDays !== 1 ? 's' : ''}
                      </p>
                    )}
                  </div>

                  {dailyEndDate && (
                    <div className="p-3 bg-primary/5 rounded-xl border border-primary/20">
                      <div className="flex items-center justify-between text-sm text-muted-foreground mb-1">
                        <span>{rentalDays} day{rentalDays !== 1 ? 's' : ''} × ${settings.priceDaily?.toLocaleString()}</span>
                        <span>${dailyPrice.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm text-muted-foreground mb-1">
                        <span>Platform fee</span>
                        <span>${dailyFees.renterFee.toLocaleString()}</span>
                      </div>
                      <Separator className="my-2" />
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-foreground">Est. total</span>
                        <span className="text-lg font-bold text-foreground">
                          ${dailyFees.customerTotal.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full py-8 text-center text-muted-foreground">
                  <Calendar className="h-12 w-12 mb-3 opacity-30" />
                  <p className="text-sm">Select a date to see availability</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-muted/30 shrink-0 flex items-center justify-between gap-3">
          <Button variant="ghost" size="sm" onClick={handleClear}>
            Clear selection
          </Button>
          <Button
            variant="dark-shine"
            size="lg"
            onClick={handleContinue}
            disabled={!canContinue}
            className="gap-2"
          >
            {instantBook ? (
              <>
                <Zap className="h-4 w-4" />
                Book Now
              </>
            ) : (
              'Continue'
            )}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RequestDatesModal;
