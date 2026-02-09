import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar, 
  ArrowRight, 
  CalendarCheck, 
  Lock, 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  Info, 
  Zap,
  Sun,
  CalendarDays,
  CalendarRange,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  addDays,
  addWeeks,
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

type BookingMode = 'hourly' | 'daily' | 'weekly' | 'monthly';
type FlowStep = 'date' | 'mode' | 'hourly-details';

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
  onDatesSelected?: (startDate: Date, endDate: Date, mode?: BookingMode, hours?: number, startTime?: string) => void;
  navigateToBooking?: boolean;
  // New props for vendor space enhanced flow
  isVendorSpace?: boolean;
  totalSlots?: number;
  slotNames?: string[] | null;
}

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
  dailyEnabled = true,
  instantBook = false,
  onDatesSelected,
  navigateToBooking = true,
  isVendorSpace = false,
  totalSlots = 1,
  slotNames = null,
}) => {
  const navigate = useNavigate();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [bookingMode, setBookingMode] = useState<BookingMode>('daily');
  
  // Flow step state - vendor spaces use step-by-step flow
  const [flowStep, setFlowStep] = useState<FlowStep>('date');
  
  // Hourly mode state
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedStartTime, setSelectedStartTime] = useState<string>('');
  const [selectedDuration, setSelectedDuration] = useState<number>(1);
  
  // Weekly/Monthly state
  const [weekCount, setWeekCount] = useState<number>(1);
  const [monthCount, setMonthCount] = useState<number>(1);

  const { blockedDates, bookedDates, bufferDates, isLoading } = useBlockedDates({ listingId });
  const { 
    settings: hourlySettings, 
    getAvailableWindowsForDate,
    getDayAvailabilityInfo,
  } = useHourlyAvailability({ listingId });

  // Determine available modes based on pricing
  const availableModes = useMemo(() => {
    const modes: BookingMode[] = [];
    if (hourlyEnabled && priceHourly && priceHourly > 0) modes.push('hourly');
    if (dailyEnabled !== false && priceDaily && priceDaily > 0) modes.push('daily');
    if (priceWeekly && priceWeekly > 0) modes.push('weekly');
    if (priceMonthly && priceMonthly > 0) modes.push('monthly');
    return modes;
  }, [hourlyEnabled, priceHourly, dailyEnabled, priceDaily, priceWeekly, priceMonthly]);

  // Set default mode based on what's available
  useEffect(() => {
    if (availableModes.length > 0 && !availableModes.includes(bookingMode)) {
      setBookingMode(availableModes[0]);
    }
  }, [availableModes, bookingMode]);

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
    
    const isBlocked = blockedDates.some(d => format(typeof d === 'object' && 'blocked_date' in d ? parseISO((d as { blocked_date: string }).blocked_date) : d as Date, 'yyyy-MM-dd') === dateStr);
    if (isBlocked) return 'blocked';
    
    return 'available';
  };

  const isDateSelectable = (date: Date): boolean => {
    const status = getDayStatus(date);
    if (status !== 'available') return false;
    
    // For hourly mode, we still allow selecting dates - the time slots will show after
    // The user can see which slots are available after clicking
    return true;
  };

  const handleDateClick = (date: Date) => {
    if (!isDateSelectable(date)) return;

    // For vendor space step-by-step flow - dates first, mode after
    if (isVendorSpace && flowStep === 'date') {
      // Simple range selection - start and end date
      if (!startDate || (startDate && endDate)) {
        setStartDate(date);
        setEndDate(undefined);
      } else if (isBefore(date, startDate)) {
        setStartDate(date);
        setEndDate(undefined);
      } else {
        setEndDate(date);
        // Once we have both dates, move to mode selection for vendor space
        setFlowStep('mode');
      }
      return;
    }

    if (bookingMode === 'hourly') {
      // Single date selection for hourly
      setSelectedDate(date);
      setSelectedStartTime('');
      setSelectedDuration(hourlySettings.minHours || 1);
      // For vendor space, move to hourly details step
      if (isVendorSpace) {
        setFlowStep('hourly-details');
      }
    } else if (bookingMode === 'weekly') {
      // Start date selection for weekly - auto-calculate end
      setStartDate(date);
      setEndDate(addWeeks(date, weekCount));
    } else if (bookingMode === 'monthly') {
      // Start date selection for monthly - auto-calculate end
      setStartDate(date);
      setEndDate(addDays(date, monthCount * 30)); // Approximate 30 days per month
    } else {
      // Daily mode - range selection
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

  // Update end date when week/month count changes
  useEffect(() => {
    if (bookingMode === 'weekly' && startDate) {
      setEndDate(addWeeks(startDate, weekCount));
    }
  }, [weekCount, startDate, bookingMode]);

  useEffect(() => {
    if (bookingMode === 'monthly' && startDate) {
      setEndDate(addDays(startDate, monthCount * 30));
    }
  }, [monthCount, startDate, bookingMode]);

  const isInSelectedRange = (date: Date): boolean => {
    if (bookingMode === 'hourly') {
      return selectedDate ? isSameDay(date, selectedDate) : false;
    }
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

  // Calculate rental duration and price based on mode
  const rentalInfo = useMemo(() => {
    if (bookingMode === 'hourly') {
      if (!selectedDate || !selectedStartTime || !priceHourly) return null;
      const basePrice = selectedDuration * priceHourly;
      const fees = calculateRentalFees(basePrice);
      return {
        label: `${selectedDuration} hour${selectedDuration > 1 ? 's' : ''}`,
        basePrice,
        totalWithFees: fees.customerTotal,
        serviceFee: fees.renterFee,
      };
    }
    
    if (!startDate || !endDate) return null;
    const days = differenceInDays(endDate, startDate);
    if (days <= 0) return null;

    let basePrice = 0;
    let label = '';

    if (bookingMode === 'monthly' && priceMonthly) {
      const months = Math.floor(days / 30);
      basePrice = months * priceMonthly;
      label = `${months} month${months > 1 ? 's' : ''}`;
    } else if (bookingMode === 'weekly' && priceWeekly) {
      const weeks = Math.floor(days / 7);
      basePrice = weeks * priceWeekly;
      label = `${weeks} week${weeks > 1 ? 's' : ''}`;
    } else if (priceDaily) {
      // Use tiered pricing for daily
      const weeks = Math.floor(days / 7);
      const remainingDays = days % 7;
      if (priceWeekly && weeks > 0) {
        basePrice = (weeks * priceWeekly) + (remainingDays * priceDaily);
      } else {
        basePrice = days * priceDaily;
      }
      label = `${days} day${days > 1 ? 's' : ''}`;
    }

    const fees = calculateRentalFees(basePrice);
    return {
      label,
      basePrice,
      totalWithFees: fees.customerTotal,
      serviceFee: fees.renterFee,
    };
  }, [bookingMode, startDate, endDate, selectedDate, selectedStartTime, selectedDuration, priceHourly, priceDaily, priceWeekly, priceMonthly]);

  // Available time windows for hourly mode
  const availableWindows = useMemo(() => {
    if (!selectedDate || bookingMode !== 'hourly') return [];
    return getAvailableWindowsForDate(selectedDate);
  }, [selectedDate, bookingMode, getAvailableWindowsForDate]);

  // Generate start time options
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

  // Get max duration for selected start time
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
    if (bookingMode === 'hourly') {
      return selectedDate && selectedStartTime && selectedDuration > 0;
    }
    return startDate && endDate && differenceInDays(endDate, startDate) > 0;
  }, [bookingMode, selectedDate, selectedStartTime, selectedDuration, startDate, endDate]);

  const handleContinue = () => {
    if (bookingMode === 'hourly') {
      if (!selectedDate || !selectedStartTime) return;
      
      if (onDatesSelected) {
        onDatesSelected(selectedDate, selectedDate, 'hourly', selectedDuration, selectedStartTime);
      }
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
        onDatesSelected(startDate, endDate, bookingMode);
      }
      if (navigateToBooking) {
        const startStr = format(startDate, 'yyyy-MM-dd');
        const endStr = format(endDate, 'yyyy-MM-dd');
        navigate(`/book/${listingId}?start=${startStr}&end=${endStr}&mode=${bookingMode}`);
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
    setWeekCount(1);
    setMonthCount(1);
    setFlowStep('date');
  };

  const getModeIcon = (mode: BookingMode) => {
    switch (mode) {
      case 'hourly': return <Clock className="h-3.5 w-3.5" />;
      case 'daily': return <Sun className="h-3.5 w-3.5" />;
      case 'weekly': return <CalendarDays className="h-3.5 w-3.5" />;
      case 'monthly': return <CalendarRange className="h-3.5 w-3.5" />;
    }
  };

  const getModeLabel = (mode: BookingMode) => {
    switch (mode) {
      case 'hourly': return 'Hourly';
      case 'daily': return 'Daily';
      case 'weekly': return 'Weekly';
      case 'monthly': return 'Monthly';
    }
  };

  const getModePrice = (mode: BookingMode) => {
    switch (mode) {
      case 'hourly': return priceHourly;
      case 'daily': return priceDaily;
      case 'weekly': return priceWeekly;
      case 'monthly': return priceMonthly;
    }
  };

  // Helper to calculate rental days from selected range
  const selectedDays = useMemo(() => {
    if (!startDate || !endDate) return 0;
    return differenceInDays(endDate, startDate);
  }, [startDate, endDate]);

  // For vendor space flow - determine if we should show mode selection
  const showVendorModeSelection = isVendorSpace && flowStep === 'mode' && startDate && endDate;
  
  // Calculate weekly/monthly pricing based on consecutive days
  const vendorPricingInfo = useMemo(() => {
    if (!startDate || !endDate) return null;
    const days = differenceInDays(endDate, startDate);
    if (days <= 0) return null;

    const weeks = Math.floor(days / 7);
    const months = Math.floor(days / 30);
    
    return {
      days,
      weeks,
      months,
      isWeeklyEligible: days >= 7 && priceWeekly,
      isMonthlyEligible: days >= 30 && priceMonthly,
      dailyTotal: priceDaily ? days * priceDaily : 0,
      weeklyTotal: priceWeekly ? weeks * priceWeekly + ((days % 7) * (priceDaily || 0)) : 0,
      monthlyTotal: priceMonthly ? months * priceMonthly + ((days % 30) * (priceDaily || 0)) : 0,
    };
  }, [startDate, endDate, priceDaily, priceWeekly, priceMonthly]);

  // Handle mode selection for vendor space flow
  const handleVendorModeSelect = (mode: BookingMode) => {
    setBookingMode(mode);
    if (mode === 'hourly') {
      // For hourly, reset dates and go to hourly flow
      setStartDate(undefined);
      setEndDate(undefined);
      setFlowStep('hourly-details');
    }
    // For daily/weekly/monthly, we already have the dates, so canContinue will be true
  };

  // Handle back navigation for vendor space flow
  const handleVendorBack = () => {
    if (flowStep === 'mode') {
      setFlowStep('date');
      setStartDate(undefined);
      setEndDate(undefined);
    } else if (flowStep === 'hourly-details') {
      setFlowStep('mode');
      setSelectedDate(undefined);
      setSelectedStartTime('');
    }
  };

  // Get flow step title
  const getFlowStepTitle = () => {
    if (isVendorSpace) {
      switch (flowStep) {
        case 'date': return 'Select Your Dates';
        case 'mode': return 'Choose Rental Type';
        case 'hourly-details': return 'Select Time Slot';
        default: return 'Request Booking';
      }
    }
    return 'Request Booking';
  };

  // Get flow step description
  const getFlowStepDescription = () => {
    if (isVendorSpace) {
      switch (flowStep) {
        case 'date': return 'Pick your start and end dates';
        case 'mode': return `${selectedDays} day${selectedDays > 1 ? 's' : ''} selected – how would you like to book?`;
        case 'hourly-details': return 'Choose your time slot for the day';
        default: return 'Choose your rental type and dates';
      }
    }
    return 'Choose your rental type and dates';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md sm:max-w-lg p-0 gap-0 overflow-hidden max-h-[90vh] overflow-y-auto">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="flex items-center gap-2 text-lg">
            {isVendorSpace && flowStep !== 'date' && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 mr-1" 
                onClick={handleVendorBack}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}
            <Calendar className="h-5 w-5 text-primary" />
            {getFlowStepTitle()}
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {getFlowStepDescription()}
          </p>
        </DialogHeader>

        <div className="p-4 space-y-4">
          {/* VENDOR SPACE MODE SELECTION STEP */}
          {showVendorModeSelection && (
            <div className="space-y-4">
              {/* Selected dates display */}
              <div className="p-3 bg-muted/30 rounded-xl border border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">
                      {format(startDate, 'MMM d')} – {format(endDate, 'MMM d, yyyy')}
                    </span>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {selectedDays} day{selectedDays > 1 ? 's' : ''}
                  </Badge>
                </div>
              </div>

              {/* Rental Mode Options */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  How would you like to book?
                </label>
                
                <div className="grid gap-2">
                  {/* Daily Option */}
                  {dailyEnabled && priceDaily && (
                    <button
                      type="button"
                      onClick={() => handleVendorModeSelect('daily')}
                      className={cn(
                        "p-4 rounded-xl border-2 transition-all text-left flex items-center justify-between",
                        bookingMode === 'daily' 
                          ? "border-primary bg-primary/5" 
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Sun className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <span className="font-medium">Daily</span>
                          <p className="text-xs text-muted-foreground">
                            ${priceDaily}/day × {selectedDays} days
                          </p>
                        </div>
                      </div>
                      <span className="text-lg font-bold text-primary">
                        ${(priceDaily * selectedDays).toLocaleString()}
                      </span>
                    </button>
                  )}

                  {/* Weekly Option - only if 7+ days */}
                  {vendorPricingInfo?.isWeeklyEligible && priceWeekly && (
                    <button
                      type="button"
                      onClick={() => handleVendorModeSelect('weekly')}
                      className={cn(
                        "p-4 rounded-xl border-2 transition-all text-left flex items-center justify-between",
                        bookingMode === 'weekly' 
                          ? "border-primary bg-primary/5" 
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                          <CalendarDays className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div>
                          <span className="font-medium">Weekly Rate</span>
                          <p className="text-xs text-muted-foreground">
                            ${priceWeekly}/week ({vendorPricingInfo.weeks} week{vendorPricingInfo.weeks > 1 ? 's' : ''})
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-bold text-emerald-600">
                          ${vendorPricingInfo.weeklyTotal.toLocaleString()}
                        </span>
                        {vendorPricingInfo.dailyTotal > vendorPricingInfo.weeklyTotal && (
                          <p className="text-xs text-emerald-600">
                            Save ${(vendorPricingInfo.dailyTotal - vendorPricingInfo.weeklyTotal).toLocaleString()}
                          </p>
                        )}
                      </div>
                    </button>
                  )}

                  {/* Monthly Option - only if 30+ days */}
                  {vendorPricingInfo?.isMonthlyEligible && priceMonthly && (
                    <button
                      type="button"
                      onClick={() => handleVendorModeSelect('monthly')}
                      className={cn(
                        "p-4 rounded-xl border-2 transition-all text-left flex items-center justify-between",
                        bookingMode === 'monthly' 
                          ? "border-primary bg-primary/5" 
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                          <CalendarRange className="h-5 w-5 text-amber-600" />
                        </div>
                        <div>
                          <span className="font-medium">Monthly Rate</span>
                          <p className="text-xs text-muted-foreground">
                            ${priceMonthly}/month ({vendorPricingInfo.months} month{vendorPricingInfo.months > 1 ? 's' : ''})
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-bold text-amber-600">
                          ${vendorPricingInfo.monthlyTotal.toLocaleString()}
                        </span>
                        {vendorPricingInfo.dailyTotal > vendorPricingInfo.monthlyTotal && (
                          <p className="text-xs text-amber-600">
                            Save ${(vendorPricingInfo.dailyTotal - vendorPricingInfo.monthlyTotal).toLocaleString()}
                          </p>
                        )}
                      </div>
                    </button>
                  )}

                  {/* Hourly Option */}
                  {hourlyEnabled && priceHourly && (
                    <button
                      type="button"
                      onClick={() => handleVendorModeSelect('hourly')}
                      className={cn(
                        "p-4 rounded-xl border-2 transition-all text-left flex items-center justify-between",
                        bookingMode === 'hourly' 
                          ? "border-primary bg-primary/5" 
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                          <Clock className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <span className="font-medium">Hourly</span>
                          <p className="text-xs text-muted-foreground">
                            Book by the hour
                          </p>
                        </div>
                      </div>
                      <span className="text-lg font-bold text-blue-600">
                        ${priceHourly}/hr
                      </span>
                    </button>
                  )}
                </div>
              </div>

              {/* CTA for mode selection */}
              {bookingMode !== 'hourly' && (
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
                    'Continue'
                  )}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              )}
            </div>
          )}

          {/* VENDOR SPACE HOURLY DETAILS STEP */}
          {isVendorSpace && flowStep === 'hourly-details' && (
            <div className="space-y-4">
              {/* Date picker for hourly */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Select a Date
                </label>
                {/* Mini calendar for date selection */}
                <div className="space-y-3">
                  {/* Calendar Header */}
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
                        const isSelectedHourlyDate = selectedDate && isSameDay(date, selectedDate);
                        const canSelect = isDateSelectable(date);

                        return (
                          <Tooltip key={date.toISOString()}>
                            <TooltipTrigger asChild>
                              <div
                                onClick={() => {
                                  if (canSelect) {
                                    setSelectedDate(date);
                                    setSelectedStartTime('');
                                    setSelectedDuration(hourlySettings.minHours || 1);
                                  }
                                }}
                                className={cn(
                                  'aspect-square rounded-lg flex flex-col items-center justify-center text-xs transition-all relative',
                                  canSelect ? statusColors['available'] : statusColors[status],
                                  isToday(date) && 'ring-2 ring-primary ring-offset-1',
                                  isSelectedHourlyDate && canSelect && 'bg-primary text-primary-foreground border-primary',
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
                </div>
              </div>

              {/* Time slot selection */}
              {selectedDate && (
                <div className="space-y-3 p-3 bg-muted/30 rounded-xl border border-border">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <Clock className="h-4 w-4 text-primary" />
                    Select Time for {format(selectedDate, 'MMM d')}
                  </div>

                  {availableWindows.length > 0 ? (
                    <>
                      {/* Available Windows Info */}
                      <div className="text-xs text-muted-foreground">
                        Available: {availableWindows.map(w => {
                          const startH = w.startHour;
                          const endH = w.endHour;
                          return `${startH > 12 ? startH - 12 : startH || 12}${startH >= 12 ? 'PM' : 'AM'}–${endH > 12 ? endH - 12 : endH || 12}${endH >= 12 ? 'PM' : 'AM'}`;
                        }).join(', ')}
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        {/* Start Time */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Start</label>
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

                        {/* Duration */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Hours</label>
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
                      <p className="text-sm text-muted-foreground">No time slots available on this date</p>
                    </div>
                  )}
                </div>
              )}

              {/* Summary and CTA */}
              {rentalInfo && (
                <div className="p-4 bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl border border-primary/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium text-foreground">
                        {rentalInfo.label} rental
                      </span>
                      {selectedDate && selectedStartTime && (
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
                </div>
              )}

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
                  'Continue'
                )}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          )}

          {/* STANDARD FLOW (non-vendor space OR vendor space date selection step) */}
          {(!isVendorSpace || flowStep === 'date') && (
            <>
              {/* Mode Selection Tabs - only for non-vendor space */}
              {!isVendorSpace && availableModes.length > 1 && (
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Rental Type
                  </label>
                  <Tabs 
                    value={bookingMode} 
                    onValueChange={(v) => {
                      setBookingMode(v as BookingMode);
                      handleReset();
                    }} 
                    className="w-full"
                  >
                    <TabsList className={cn(
                      "grid w-full h-11",
                      availableModes.length === 2 && "grid-cols-2",
                      availableModes.length === 3 && "grid-cols-3",
                      availableModes.length === 4 && "grid-cols-4",
                    )}>
                      {availableModes.map((mode) => (
                        <TabsTrigger 
                          key={mode} 
                          value={mode} 
                          className="gap-1.5 text-xs sm:text-sm flex-col sm:flex-row h-full py-1.5"
                        >
                          {getModeIcon(mode)}
                          <span className="hidden sm:inline">{getModeLabel(mode)}</span>
                          <span className="sm:hidden text-[10px]">{getModeLabel(mode)}</span>
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </Tabs>
                  
                  {/* Price indicator for selected mode */}
                  <div className="flex items-center justify-center gap-1 text-sm">
                    <span className="font-bold text-foreground">
                      ${getModePrice(bookingMode)?.toLocaleString() || '—'}
                    </span>
                    <span className="text-muted-foreground">
                      /{bookingMode === 'hourly' ? 'hr' : bookingMode === 'daily' ? 'day' : bookingMode === 'weekly' ? 'week' : 'month'}
                    </span>
                  </div>
                </div>
              )}

              {/* Vendor space hint */}
              {isVendorSpace && flowStep === 'date' && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <p className="text-sm text-foreground">
                    Select your <strong>start date</strong>, then your <strong>end date</strong> to see pricing options.
                  </p>
                </div>
              )}

              {/* Week/Month Duration Selector - only for non-vendor space */}
              {!isVendorSpace && (bookingMode === 'weekly' || bookingMode === 'monthly') && (
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Duration
                  </label>
                  <Select 
                    value={(bookingMode === 'weekly' ? weekCount : monthCount).toString()} 
                    onValueChange={(v) => {
                      if (bookingMode === 'weekly') {
                        setWeekCount(parseInt(v));
                      } else {
                        setMonthCount(parseInt(v));
                      }
                    }}
                  >
                    <SelectTrigger className="h-12">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: bookingMode === 'weekly' ? 12 : 6 }, (_, i) => i + 1).map(n => (
                        <SelectItem key={n} value={n.toString()}>
                          {n} {bookingMode === 'weekly' ? 'week' : 'month'}{n > 1 ? 's' : ''}
                          {' '}
                          <span className="text-muted-foreground">
                            (${((getModePrice(bookingMode) || 0) * n).toLocaleString()})
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {isLoading ? (
                <div className="h-64 flex items-center justify-center">
                  <div className="animate-pulse text-muted-foreground">Loading availability...</div>
                </div>
              ) : (
                <>
                  {/* Calendar Header */}
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
                        const isStart = (bookingMode === 'hourly' && !isVendorSpace ? selectedDate && isSameDay(date, selectedDate) : startDate && isSameDay(date, startDate));
                        const isEnd = endDate && isSameDay(date, endDate);
                        const canSelect = isDateSelectable(date);

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
                                  (isStart || isEnd) && canSelect && 'bg-primary text-primary-foreground border-primary',
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

              {/* Hourly Time Selection - only for non-vendor space */}
              {!isVendorSpace && bookingMode === 'hourly' && selectedDate && (
                <div className="space-y-3 p-3 bg-muted/30 rounded-xl border border-border">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <Clock className="h-4 w-4 text-primary" />
                    Select Time for {format(selectedDate, 'MMM d')}
                  </div>

                  {availableWindows.length > 0 ? (
                    <>
                      {/* Available Windows Info */}
                      <div className="text-xs text-muted-foreground">
                        Available: {availableWindows.map(w => {
                          const startH = w.startHour;
                          const endH = w.endHour;
                          return `${startH > 12 ? startH - 12 : startH || 12}${startH >= 12 ? 'PM' : 'AM'}–${endH > 12 ? endH - 12 : endH || 12}${endH >= 12 ? 'PM' : 'AM'}`;
                        }).join(', ')}
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        {/* Start Time */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Start</label>
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

                        {/* Duration */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Hours</label>
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

              {/* Selection Summary - only for non-vendor space */}
              {!isVendorSpace && rentalInfo && (
                <div className="p-4 bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl border border-primary/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium text-foreground">
                        {rentalInfo.label} rental
                      </span>
                      {startDate && endDate && bookingMode !== 'hourly' && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {format(startDate, 'MMM d')} – {format(endDate, 'MMM d, yyyy')}
                        </p>
                      )}
                      {bookingMode === 'hourly' && selectedDate && selectedStartTime && (
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
                  <Separator className="bg-primary/20" />
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
                    className="w-full mt-2 h-7 text-xs text-muted-foreground"
                  >
                    Clear selection
                  </Button>
                </div>
              )}

              {/* Info - only for non-vendor space or date step */}
              {(!isVendorSpace || flowStep === 'date') && (
                <div className="flex items-start gap-2 p-2 rounded-lg bg-muted/30">
                  <Info className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                  <p className="text-[11px] text-muted-foreground">
                    {isVendorSpace 
                      ? 'Tap your start date, then your end date.'
                      : bookingMode === 'hourly' 
                      ? 'Select a date, then choose your time slot.'
                      : bookingMode === 'weekly' || bookingMode === 'monthly'
                      ? `Choose the number of ${bookingMode === 'weekly' ? 'weeks' : 'months'}, then select your start date.`
                      : 'Tap a date to start, then tap another to set your rental period.'}
                  </p>
                </div>
              )}

              {/* CTA - only for non-vendor space */}
              {!isVendorSpace && (
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
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DateSelectionModal;
