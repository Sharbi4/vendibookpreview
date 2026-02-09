import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar, 
  ArrowRight, 
  ChevronLeft, 
  ChevronRight, 
  MapPin,
  Users,
  CheckCircle,
  XCircle,
  ArrowLeft,
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
  addDays,
} from 'date-fns';
import { useBlockedDates } from '@/hooks/useBlockedDates';
import { useHourlyAvailability } from '@/hooks/useHourlyAvailability';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { calculateRentalFees } from '@/lib/commissions';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface VendorSpaceBookingModalProps {
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
  instantBook?: boolean;
  totalSlots?: number;
  slotNames?: string[] | null;
}

type Step = 'calendar' | 'slots' | 'dates';

interface BookedSlot {
  slot_number: number;
  slot_name: string | null;
  start_date: string;
  end_date: string;
}

// Calculate tiered pricing
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

  if (priceMonthly && remaining >= 30) {
    const months = Math.floor(remaining / 30);
    total += months * priceMonthly;
    parts.push(`${months} month${months > 1 ? 's' : ''} @ $${priceMonthly.toLocaleString()}`);
    remaining = remaining % 30;
  }

  if (priceWeekly && remaining >= 7) {
    const weeks = Math.floor(remaining / 7);
    total += weeks * priceWeekly;
    parts.push(`${weeks} week${weeks > 1 ? 's' : ''} @ $${priceWeekly.toLocaleString()}`);
    remaining = remaining % 7;
  }

  if (remaining > 0) {
    total += remaining * priceDaily;
    parts.push(`${remaining} day${remaining > 1 ? 's' : ''} @ $${priceDaily.toLocaleString()}`);
  }

  return { total, breakdown: parts.join(' + ') };
};

export const VendorSpaceBookingModal: React.FC<VendorSpaceBookingModalProps> = ({
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
  totalSlots = 1,
  slotNames,
}) => {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('calendar');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
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

  // Fetch slot bookings
  const { data: bookedSlots = [] } = useQuery({
    queryKey: ['vendor-slot-bookings', listingId],
    queryFn: async () => {
      const today = format(startOfDay(new Date()), 'yyyy-MM-dd');
      const oneYearFromNow = format(addYears(new Date(), 1), 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('booking_requests')
        .select('slot_number, slot_name, start_date, end_date')
        .eq('listing_id', listingId)
        .in('status', ['pending', 'approved'])
        .lte('start_date', oneYearFromNow)
        .gte('end_date', today);

      if (error) throw error;
      return (data || []).filter((b): b is BookedSlot => b.slot_number !== null);
    },
  });

  const today = startOfDay(new Date());
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

  // Get availability counts for each date
  const getDateAvailability = (date: Date): { available: number; total: number } => {
    if (isBefore(date, today) || isAfter(date, maxDate)) {
      return { available: 0, total: totalSlots };
    }

    const dateStr = format(date, 'yyyy-MM-dd');
    
    // Check global blocks
    const isGloballyBlocked = blockedDates.some(d => {
      const blocked = typeof d === 'object' && 'blocked_date' in d 
        ? (d as { blocked_date: string }).blocked_date 
        : format(d as Date, 'yyyy-MM-dd');
      return blocked === dateStr;
    });
    
    if (isGloballyBlocked) return { available: 0, total: totalSlots };

    // Count booked slots for this date
    const bookedSlotsForDate = bookedSlots.filter(
      b => b.start_date <= dateStr && b.end_date >= dateStr
    );
    
    const uniqueBookedSlots = new Set(bookedSlotsForDate.map(b => b.slot_number));
    const available = totalSlots - uniqueBookedSlots.size;

    return { available: Math.max(0, available), total: totalSlots };
  };

  // Check slot availability for date range
  const isSlotAvailableForRange = (slotNumber: number, start: Date, end: Date): boolean => {
    const startStr = format(start, 'yyyy-MM-dd');
    const endStr = format(end, 'yyyy-MM-dd');

    return !bookedSlots.some(
      b => b.slot_number === slotNumber && b.start_date <= endStr && b.end_date >= startStr
    );
  };

  // Generate slots with availability
  const slots = useMemo(() => {
    return Array.from({ length: totalSlots }, (_, i) => {
      const slotNumber = i + 1;
      const slotName = slotNames?.[i] || `Spot ${slotNumber}`;
      const isAvailable = startDate && endDate 
        ? isSlotAvailableForRange(slotNumber, startDate, endDate)
        : true;
      return { slotNumber, slotName, isAvailable };
    });
  }, [totalSlots, slotNames, startDate, endDate, bookedSlots]);

  const availableSlotsCount = slots.filter(s => s.isAvailable).length;

  const getDayStatus = (date: Date): 'available' | 'partial' | 'full' | 'past' | 'outside' => {
    if (isBefore(date, today)) return 'past';
    if (isAfter(date, maxDate)) return 'outside';
    
    if (availableFrom || availableTo) {
      const fromDate = availableFrom ? parseISO(availableFrom) : null;
      const toDate = availableTo ? parseISO(availableTo) : null;
      if (fromDate && isBefore(date, startOfDay(fromDate))) return 'outside';
      if (toDate && isBefore(startOfDay(toDate), date)) return 'outside';
    }

    const { available, total } = getDateAvailability(date);
    if (available === 0) return 'full';
    if (available < total) return 'partial';
    return 'available';
  };

  const handleDateClick = (date: Date) => {
    const status = getDayStatus(date);
    if (status === 'past' || status === 'outside' || status === 'full') return;

    if (isHourlyMode) {
      setSelectedDate(date);
      setSelectedStartTime('');
      setSelectedDuration(hourlySettings.minHours || 1);
    } else {
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

  const canContinue = useMemo(() => {
    if (isHourlyMode) {
      return selectedSlot && selectedDate && selectedStartTime && selectedDuration > 0;
    }
    return selectedSlot && startDate && endDate && differenceInDays(endDate, startDate) > 0;
  }, [isHourlyMode, selectedSlot, selectedDate, selectedStartTime, selectedDuration, startDate, endDate]);

  const handleBookNow = () => setStep('slots');

  const handleSlotSelect = (slotNumber: number) => {
    setSelectedSlot(slotNumber);
    setStep('dates');
  };

  const handleContinue = () => {
    if (isHourlyMode) {
      if (!selectedDate || !selectedStartTime || !selectedSlot) return;
      
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const startHour = parseInt(selectedStartTime.split(':')[0]);
      const endHour = startHour + selectedDuration;
      const endTimeStr = `${endHour.toString().padStart(2, '0')}:00`;
      const slotName = slotNames?.[selectedSlot - 1] || `Spot ${selectedSlot}`;
      
      navigate(`/book/${listingId}?start=${dateStr}&end=${dateStr}&startTime=${selectedStartTime}&endTime=${endTimeStr}&hours=${selectedDuration}&slot=${selectedSlot}&slotName=${encodeURIComponent(slotName)}`);
    } else {
      if (!startDate || !endDate || !selectedSlot) return;
      
      const startStr = format(startDate, 'yyyy-MM-dd');
      const endStr = format(endDate, 'yyyy-MM-dd');
      const slotName = slotNames?.[selectedSlot - 1] || `Spot ${selectedSlot}`;
      
      navigate(`/book/${listingId}?start=${startStr}&end=${endStr}&slot=${selectedSlot}&slotName=${encodeURIComponent(slotName)}`);
    }
    onOpenChange(false);
  };

  const handleBack = () => {
    if (step === 'dates') {
      setStep('slots');
      setStartDate(undefined);
      setEndDate(undefined);
      setSelectedDate(undefined);
      setSelectedStartTime('');
    } else if (step === 'slots') {
      setStep('calendar');
      setSelectedSlot(null);
    }
  };

  const handleReset = () => {
    setStep('calendar');
    setSelectedSlot(null);
    setStartDate(undefined);
    setEndDate(undefined);
    setSelectedDate(undefined);
    setSelectedStartTime('');
    setSelectedDuration(hourlySettings.minHours || 1);
    setCurrentMonth(new Date());
    setIsHourlyMode(false);
  };

  const handleModeToggle = (hourly: boolean) => {
    setIsHourlyMode(hourly);
    setStartDate(undefined);
    setEndDate(undefined);
    setSelectedDate(undefined);
    setSelectedStartTime('');
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
          <div className="flex items-center gap-2">
            {step !== 'calendar' && (
              <Button variant="ghost" size="icon" onClick={handleBack} className="h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <DialogTitle className="flex items-center gap-2 text-lg">
              {step === 'calendar' && (
                <>
                  <Calendar className="h-5 w-5 text-primary" />
                  Monthly Availability
                </>
              )}
              {step === 'slots' && (
                <>
                  <Users className="h-5 w-5 text-primary" />
                  Choose Your Space
                </>
              )}
              {step === 'dates' && (
                <>
                  <Calendar className="h-5 w-5 text-primary" />
                  Select Your Dates
                </>
              )}
            </DialogTitle>
          </div>
          <p className="text-sm text-muted-foreground mt-1 ml-10">
            {step === 'calendar' && 'View availability across the month'}
            {step === 'slots' && 'Select an available space to book'}
            {step === 'dates' && 'Tap start date, then end date'}
          </p>
        </DialogHeader>

        <div className="p-4 space-y-4">
          {/* Step 1: Calendar View with Availability */}
          {step === 'calendar' && (
            <>
              {/* Month Navigation */}
              <div className="flex items-center justify-between">
                <Button variant="ghost" size="icon" onClick={handlePrevMonth} disabled={!canGoPrev}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <h4 className="text-base font-semibold text-foreground">
                  {format(currentMonth, 'MMMM yyyy')}
                </h4>
                <Button variant="ghost" size="icon" onClick={handleNextMonth} disabled={!canGoNext}>
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

              {/* Calendar Grid with Slot Counts */}
              <TooltipProvider>
                <div className="grid grid-cols-7 gap-1">
                  {paddingDays.map((_, index) => (
                    <div key={`padding-${index}`} className="aspect-square" />
                  ))}

                  {daysInMonth.map(date => {
                    const status = getDayStatus(date);
                    const { available, total } = getDateAvailability(date);

                    return (
                      <Tooltip key={date.toISOString()}>
                        <TooltipTrigger asChild>
                          <div
                            className={cn(
                              'aspect-square rounded-lg flex flex-col items-center justify-center text-xs transition-all relative',
                              status === 'available' && 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800',
                              status === 'partial' && 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800',
                              status === 'full' && 'bg-muted text-muted-foreground',
                              status === 'past' && 'bg-muted/30 text-muted-foreground/50',
                              status === 'outside' && 'bg-muted/30 text-muted-foreground/50',
                              isToday(date) && 'ring-2 ring-primary ring-offset-1',
                            )}
                          >
                            <span className="font-medium">{format(date, 'd')}</span>
                            {(status === 'available' || status === 'partial') && (
                              <span className="text-[9px] font-medium opacity-80">
                                {available}/{total}
                              </span>
                            )}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          <p>{format(date, 'MMM d, yyyy')}</p>
                          <p className="text-xs text-muted-foreground">
                            {status === 'available' && `All ${available} spaces available`}
                            {status === 'partial' && `${available} of ${total} spaces available`}
                            {status === 'full' && 'Fully booked'}
                            {status === 'past' && 'Past date'}
                            {status === 'outside' && 'Not available'}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              </TooltipProvider>

              {/* Legend */}
              <div className="flex flex-wrap gap-3 pt-2 border-t border-border">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-emerald-50 border border-emerald-200 dark:bg-emerald-900/20" />
                  <span className="text-xs text-muted-foreground">All available</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-amber-50 border border-amber-200 dark:bg-amber-900/20" />
                  <span className="text-xs text-muted-foreground">Some available</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-muted" />
                  <span className="text-xs text-muted-foreground">Fully booked</span>
                </div>
              </div>

              {/* Book Now Button */}
              <Button
                variant="dark-shine"
                className="w-full h-12 text-base"
                size="lg"
                onClick={handleBookNow}
              >
                Book Now
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </>
          )}

          {/* Step 2: Slot Selection */}
          {step === 'slots' && (
            <>
              <div className="flex items-center justify-between mb-2">
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                  {totalSlots} Total Spaces
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {slots.map((slot) => (
                  <button
                    key={slot.slotNumber}
                    onClick={() => slot.isAvailable && handleSlotSelect(slot.slotNumber)}
                    disabled={!slot.isAvailable}
                    className={cn(
                      "relative p-4 rounded-xl border-2 transition-all duration-200 text-left",
                      slot.isAvailable
                        ? "bg-card border-primary/20 hover:border-primary hover:shadow-lg cursor-pointer"
                        : "bg-muted/30 border-muted/50 opacity-60 cursor-not-allowed"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div
                          className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center",
                            slot.isAvailable ? "bg-primary/10" : "bg-muted"
                          )}
                        >
                          <MapPin
                            className={cn(
                              "h-4 w-4",
                              slot.isAvailable ? "text-primary" : "text-muted-foreground"
                            )}
                          />
                        </div>
                        <span
                          className={cn(
                            "text-sm font-medium truncate max-w-[80px]",
                            slot.isAvailable ? "text-foreground" : "text-muted-foreground"
                          )}
                        >
                          {slot.slotName}
                        </span>
                      </div>
                      {slot.isAvailable ? (
                        <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                      ) : (
                        <XCircle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      )}
                    </div>
                    <p
                      className={cn(
                        "text-xs mt-2 font-medium",
                        slot.isAvailable ? "text-primary" : "text-muted-foreground"
                      )}
                    >
                      {slot.isAvailable ? "Available" : "Booked"}
                    </p>
                  </button>
                ))}
              </div>

              <p className="text-xs text-muted-foreground text-center pt-2">
                Select a space to continue to date selection
              </p>
            </>
          )}

          {/* Step 3: Date Selection */}
          {step === 'dates' && (
            <>
              <div className="flex items-center gap-2 p-3 bg-primary/5 rounded-xl border border-primary/20">
                <MapPin className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-foreground">
                  {slotNames?.[selectedSlot! - 1] || `Spot ${selectedSlot}`}
                </span>
                <Badge variant="secondary" className="ml-auto text-xs">Selected</Badge>
              </div>

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

              {/* Month Navigation */}
              <div className="flex items-center justify-between">
                <Button variant="ghost" size="icon" onClick={handlePrevMonth} disabled={!canGoPrev}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <h4 className="text-base font-semibold text-foreground">
                  {format(currentMonth, 'MMMM yyyy')}
                </h4>
                <Button variant="ghost" size="icon" onClick={handleNextMonth} disabled={!canGoNext}>
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

              {/* Calendar Grid for Date Selection */}
              <TooltipProvider>
                <div className="grid grid-cols-7 gap-1">
                  {paddingDays.map((_, index) => (
                    <div key={`padding-${index}`} className="aspect-square" />
                  ))}

                  {daysInMonth.map(date => {
                    const status = getDayStatus(date);
                    const canSelect = status === 'available' || status === 'partial';
                    const isSelected = isInSelectedRange(date);
                    const isStart = startDate && isSameDay(date, startDate);
                    const isEnd = endDate && isSameDay(date, endDate);
                    const isHourlySelected = isHourlyMode && selectedDate && isSameDay(date, selectedDate);

                    // Check if this specific slot is available for this date
                    const isSlotAvailable = selectedSlot 
                      ? !bookedSlots.some(
                          b => b.slot_number === selectedSlot && 
                               b.start_date <= format(date, 'yyyy-MM-dd') && 
                               b.end_date >= format(date, 'yyyy-MM-dd')
                        )
                      : canSelect;

                    return (
                      <Tooltip key={date.toISOString()}>
                        <TooltipTrigger asChild>
                          <div
                            onClick={() => isSlotAvailable && handleDateClick(date)}
                            className={cn(
                              'aspect-square rounded-lg flex flex-col items-center justify-center text-xs transition-all relative',
                              isSlotAvailable 
                                ? 'bg-background text-foreground border border-border hover:bg-primary/10 hover:border-primary cursor-pointer' 
                                : 'bg-muted text-muted-foreground cursor-not-allowed',
                              isToday(date) && 'ring-2 ring-primary ring-offset-1',
                              isSelected && isSlotAvailable && 'bg-primary/20 border-primary',
                              (isStart || isEnd || isHourlySelected) && isSlotAvailable && 'bg-primary text-primary-foreground border-primary',
                            )}
                          >
                            <span className="font-medium">{format(date, 'd')}</span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          <p>{format(date, 'MMM d, yyyy')}</p>
                          <p className="text-xs text-muted-foreground">
                            {isSlotAvailable ? 'Available' : 'Not available for this space'}
                          </p>
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
                      <span className="text-sm font-medium text-foreground">{rentalInfo.label}</span>
                      {!isHourlyMode && startDate && endDate && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {format(startDate, 'MMM d')} – {format(endDate, 'MMM d, yyyy')}
                        </p>
                      )}
                      {isHourlyMode && selectedDate && selectedStartTime && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {format(selectedDate, 'MMM d, yyyy')} • {startTimeOptions.find(o => o.value === selectedStartTime)?.label} – {calculatedEndTime}
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
                </div>
              )}

              {/* Continue Button */}
              <Button
                variant="dark-shine"
                className="w-full h-12 text-base"
                size="lg"
                onClick={handleContinue}
                disabled={!canContinue}
              >
                {instantBook ? 'Book Now' : 'Request to Book'}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VendorSpaceBookingModal;
