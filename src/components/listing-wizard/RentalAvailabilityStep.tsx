import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Lock, CalendarCheck, Clock, Calendar, Info, Trash2, Unlock, Plus, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, isBefore, startOfDay, addDays } from 'date-fns';
import { useListingAvailability } from '@/hooks/useListingAvailability';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { HourlyScheduleGrid, WeeklySchedule, EMPTY_SCHEDULE } from './HourlyScheduleGrid';
import { HourlySpecialPricing, HourlySpecialPricingData } from './HourlySpecialPricing';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

type BookingType = 'daily' | 'hourly' | 'both';

interface RentalAvailabilityStepProps {
  listingId: string;
  listingMode: 'rent' | 'sale';
  availableFrom: string | null;
  availableTo: string | null;
  priceDaily: number | null;
  priceHourly: number | null;
  onAvailableFromChange: (date: string | null) => void;
  onAvailableToChange: (date: string | null) => void;
  onPriceHourlyChange: (price: number | null) => void;
  onSettingsChange: (settings: HourlySettings) => void;
  onSpecialPricingChange?: (pricing: HourlySpecialPricingData | null) => void;
}

export interface HourlySettings {
  hourlyEnabled: boolean;
  dailyEnabled: boolean;
  minHours: number;
  maxHours: number | null;
  bufferTimeMins: number;
  minNoticeHours: number;
  hourlySchedule: WeeklySchedule;
  rentalMinDays: number;
  specialPricing?: HourlySpecialPricingData | null;
}

export const RentalAvailabilityStep: React.FC<RentalAvailabilityStepProps> = ({
  listingId,
  listingMode,
  availableFrom,
  availableTo,
  priceDaily,
  priceHourly,
  onAvailableFromChange,
  onAvailableToChange,
  onPriceHourlyChange,
  onSettingsChange,
  onSpecialPricingChange,
}) => {
  const { toast } = useToast();
  
  // Booking type state
  const [bookingType, setBookingType] = useState<BookingType>('daily');
  const [hourlyRate, setHourlyRate] = useState(priceHourly?.toString() || '');
  const [minHours, setMinHours] = useState(2);
  const [maxHours, setMaxHours] = useState<number | null>(null);
  const [bufferMins, setBufferMins] = useState(0);
  const [minNotice, setMinNotice] = useState(0);
  const [minDays, setMinDays] = useState(1);
  const [hourlySchedule, setHourlySchedule] = useState<WeeklySchedule>(EMPTY_SCHEDULE);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [specialPricing, setSpecialPricing] = useState<HourlySpecialPricingData | null>(null);

  // Calendar state
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [rangeStart, setRangeStart] = useState<Date | null>(null);
  const [rangeEnd, setRangeEnd] = useState<Date | null>(null);
  const [blockReason, setBlockReason] = useState('');
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [showBlockUntilDialog, setShowBlockUntilDialog] = useState(false);
  const [showUnblockRangeDialog, setShowUnblockRangeDialog] = useState(false);
  const [blockUntilDate, setBlockUntilDate] = useState<Date | undefined>(undefined);
  const [unblockRangeStart, setUnblockRangeStart] = useState<Date | undefined>(undefined);
  const [unblockRangeEnd, setUnblockRangeEnd] = useState<Date | undefined>(undefined);
  const [isRangeMode, setIsRangeMode] = useState(false);
  const [useAvailabilityWindow, setUseAvailabilityWindow] = useState(!!(availableFrom || availableTo));

  const {
    bookings,
    blockedDates,
    blockDate,
    unblockDate,
    blockDateRange,
    unblockDateRange,
    clearAllBlockedDates,
    isDateBlocked,
    isDateBooked,
    isDatePending,
  } = useListingAvailability(listingId);

  // Load existing settings
  useEffect(() => {
    const loadSettings = async () => {
      if (!listingId) return;
      
      setIsLoading(true);
      try {
        const { data } = await supabase
          .from('listings')
          .select('hourly_enabled, daily_enabled, min_hours, max_hours, buffer_time_mins, min_notice_hours, hourly_schedule, rental_min_days, price_hourly, hourly_special_pricing')
          .eq('id', listingId)
          .single();

        if (data) {
          const hourlyEnabled = (data as any).hourly_enabled || false;
          const dailyEnabled = (data as any).daily_enabled !== false;
          
          if (hourlyEnabled && dailyEnabled) {
            setBookingType('both');
          } else if (hourlyEnabled) {
            setBookingType('hourly');
          } else {
            setBookingType('daily');
          }

          setMinHours((data as any).min_hours || 2);
          setMaxHours((data as any).max_hours || null);
          setBufferMins((data as any).buffer_time_mins || 0);
          setMinNotice((data as any).min_notice_hours || 0);
          setMinDays((data as any).rental_min_days || 1);
          
          const schedule = (data as any).hourly_schedule;
          if (schedule && typeof schedule === 'object') {
            setHourlySchedule({
              mon: schedule.mon || [],
              tue: schedule.tue || [],
              wed: schedule.wed || [],
              thu: schedule.thu || [],
              fri: schedule.fri || [],
              sat: schedule.sat || [],
              sun: schedule.sun || [],
            });
          }
          
          if ((data as any).price_hourly) {
            setHourlyRate((data as any).price_hourly.toString());
          }
          
          // Load special pricing
          const savedSpecialPricing = (data as any).hourly_special_pricing;
          if (savedSpecialPricing && typeof savedSpecialPricing === 'object') {
            setSpecialPricing(savedSpecialPricing as HourlySpecialPricingData);
          }
        }
      } catch (error) {
        console.error('Error loading settings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, [listingId]);

  // Propagate changes up
  useEffect(() => {
    const hourlyEnabled = bookingType === 'hourly' || bookingType === 'both';
    const dailyEnabled = bookingType === 'daily' || bookingType === 'both';
    
    onSettingsChange({
      hourlyEnabled,
      dailyEnabled,
      minHours,
      maxHours,
      bufferTimeMins: bufferMins,
      minNoticeHours: minNotice,
      hourlySchedule,
      rentalMinDays: minDays,
      specialPricing,
    });
  }, [bookingType, minHours, maxHours, bufferMins, minNotice, hourlySchedule, minDays, specialPricing, onSettingsChange]);
  
  // Propagate special pricing changes
  useEffect(() => {
    onSpecialPricingChange?.(specialPricing);
  }, [specialPricing, onSpecialPricingChange]);

  useEffect(() => {
    const rate = parseFloat(hourlyRate);
    onPriceHourlyChange(isNaN(rate) ? null : rate);
  }, [hourlyRate, onPriceHourlyChange]);

  // Calendar helpers
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const firstDayOfWeek = monthStart.getDay();
  const paddingDays = Array(firstDayOfWeek).fill(null);

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  const handleDateClick = (date: Date) => {
    if (isBefore(date, startOfDay(new Date()))) return;
    if (isDateBooked(date)) return;

    if (isRangeMode) {
      if (!rangeStart) {
        setRangeStart(date);
        setRangeEnd(null);
      } else if (!rangeEnd) {
        if (isBefore(date, rangeStart)) {
          setRangeEnd(rangeStart);
          setRangeStart(date);
        } else {
          setRangeEnd(date);
        }
        setShowBlockDialog(true);
      }
    } else {
      setSelectedDate(date);
      if (isDateBlocked(date)) {
        unblockDate(date);
      } else {
        setShowBlockDialog(true);
      }
    }
  };

  const handleBlockConfirm = () => {
    if (isRangeMode && rangeStart && rangeEnd) {
      blockDateRange(rangeStart, rangeEnd, blockReason || undefined);
      setShowBlockDialog(false);
      setBlockReason('');
      setRangeStart(null);
      setRangeEnd(null);
    } else if (selectedDate) {
      blockDate(selectedDate, blockReason || undefined);
      setShowBlockDialog(false);
      setBlockReason('');
      setSelectedDate(null);
    }
  };

  const cancelRangeSelection = () => {
    setRangeStart(null);
    setRangeEnd(null);
    setShowBlockDialog(false);
    setBlockReason('');
  };

  const getDayStatus = (date: Date): 'available' | 'blocked' | 'booked' | 'pending' | 'past' | 'outside_window' => {
    if (isBefore(date, startOfDay(new Date()))) return 'past';
    
    if (useAvailabilityWindow) {
      const fromDate = availableFrom ? new Date(availableFrom) : null;
      const toDate = availableTo ? new Date(availableTo) : null;
      
      if (fromDate && isBefore(date, startOfDay(fromDate))) return 'outside_window';
      if (toDate && isBefore(startOfDay(toDate), date)) return 'outside_window';
    }
    
    if (isDateBooked(date)) return 'booked';
    if (isDatePending(date)) return 'pending';
    if (isDateBlocked(date)) return 'blocked';
    return 'available';
  };

  const statusColors = {
    available: 'bg-background hover:bg-primary/10 text-foreground cursor-pointer border border-border',
    blocked: 'bg-muted text-muted-foreground cursor-pointer',
    booked: 'bg-emerald-100 text-emerald-700 cursor-not-allowed',
    pending: 'bg-amber-100 text-amber-700 cursor-not-allowed',
    past: 'bg-muted/30 text-muted-foreground/50 cursor-not-allowed',
    outside_window: 'bg-muted/50 text-muted-foreground/60 cursor-not-allowed',
  };

  const upcomingBookings = bookings
    .filter(b => b.status === 'approved' && b.end_date >= format(new Date(), 'yyyy-MM-dd'))
    .sort((a, b) => a.start_date.localeCompare(b.start_date))
    .slice(0, 3);

  // Don't show for sale listings
  if (listingMode === 'sale') {
    return null;
  }

  const showHourlySettings = bookingType === 'hourly' || bookingType === 'both';
  const showDailySettings = bookingType === 'daily' || bookingType === 'both';

  // Generate hourly schedule preview
  const getSchedulePreview = () => {
    const today = new Date();
    const dayKey = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][today.getDay()] as keyof WeeklySchedule;
    const todayWindows = hourlySchedule[dayKey];
    
    if (todayWindows.length === 0) return null;
    
    return todayWindows.map(w => {
      const startH = parseInt(w.start.split(':')[0]);
      const endH = parseInt(w.end.split(':')[0]);
      return `${startH > 12 ? startH - 12 : startH}${startH >= 12 ? 'pm' : 'am'}–${endH > 12 ? endH - 12 : endH}${endH >= 12 ? 'pm' : 'am'}`;
    }).join(', ');
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Booking Type Card */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <Label className="text-base font-medium">Booking type</Label>
                <p className="text-sm text-muted-foreground mt-0.5">
                  How can renters book your listing?
                </p>
              </div>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent side="left" className="max-w-xs">
                  <p>Offer both daily and hourly bookings to increase booking requests and maximize your earning potential.</p>
                </TooltipContent>
              </Tooltip>
            </div>
            
            <div className="flex gap-2">
              {(['daily', 'hourly', 'both'] as BookingType[]).map(type => (
                <Button
                  key={type}
                  variant={bookingType === type ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1 capitalize"
                  onClick={() => setBookingType(type)}
                >
                  {type === 'both' ? 'Both' : type}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Daily Settings */}
        {showDailySettings && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="h-4 w-4 text-primary" />
                <Label className="text-base font-medium">Daily availability</Label>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
                  <div>
                    <Label className="text-sm font-medium">Daily rate</Label>
                    <p className="text-sm text-muted-foreground">
                      {priceDaily ? `$${priceDaily}/day` : 'Set in Pricing step'}
                    </p>
                  </div>
                  <Badge variant="secondary">From Pricing</Badge>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm">Minimum days</Label>
                    <Select value={minDays.toString()} onValueChange={(v) => setMinDays(parseInt(v))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5, 7, 14, 30].map(d => (
                          <SelectItem key={d} value={d.toString()}>
                            {d} {d === 1 ? 'day' : 'days'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      The shortest rental period you'll accept. Longer minimums can reduce turnover.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Hourly Settings */}
        {showHourlySettings && (
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="h-4 w-4 text-primary" />
                <Label className="text-base font-medium">Hourly availability</Label>
              </div>

              {/* Hourly Rate */}
              <div className="space-y-2">
                <Label className="text-sm">Hourly rate ($/hour)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    value={hourlyRate}
                    onChange={(e) => setHourlyRate(e.target.value)}
                    placeholder="45"
                    className="pl-7"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Price per hour before any fees. Consider your daily rate when setting this.
                </p>
              </div>

              {/* Minimum Hours */}
              <div className="space-y-2">
                <Label className="text-sm">Minimum hours per booking</Label>
                <Select value={minHours.toString()} onValueChange={(v) => setMinHours(parseInt(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 6, 8].map(h => (
                      <SelectItem key={h} value={h.toString()}>
                        {h} {h === 1 ? 'hour' : 'hours'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  The shortest booking allowed. Helps cover setup time and ensures worthwhile rentals.
                </p>
              </div>

              {/* Weekly Schedule */}
              <HourlyScheduleGrid
                schedule={hourlySchedule}
                onChange={setHourlySchedule}
              />

              {/* Advanced Settings */}
              <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2 w-full justify-start text-muted-foreground">
                    <Settings2 className="h-4 w-4" />
                    Advanced settings
                    <ChevronRight className={cn("h-4 w-4 ml-auto transition-transform", showAdvanced && "rotate-90")} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-3 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm">Buffer between bookings</Label>
                      <Select value={bufferMins.toString()} onValueChange={(v) => setBufferMins(parseInt(v))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">None</SelectItem>
                          <SelectItem value="15">15 minutes</SelectItem>
                          <SelectItem value="30">30 minutes</SelectItem>
                          <SelectItem value="60">1 hour</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Time blocked between bookings for cleaning or prep.
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-sm">Minimum notice</Label>
                      <Select value={minNotice.toString()} onValueChange={(v) => setMinNotice(parseInt(v))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">None</SelectItem>
                          <SelectItem value="2">2 hours</SelectItem>
                          <SelectItem value="12">12 hours</SelectItem>
                          <SelectItem value="24">24 hours</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        How far in advance renters must book.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm">Max hours per booking (optional)</Label>
                    <Select 
                      value={maxHours?.toString() || 'none'} 
                      onValueChange={(v) => setMaxHours(v === 'none' ? null : parseInt(v))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="No limit" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No limit</SelectItem>
                        {[4, 6, 8, 10, 12].map(h => (
                          <SelectItem key={h} value={h.toString()}>
                            {h} hours
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Cap how long a single booking can last.
                    </p>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Preview Card */}
              {getSchedulePreview() && (
                <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">What renters will see today</Label>
                  <p className="text-sm font-medium mt-1">
                    Available: {getSchedulePreview()}
                  </p>
                  {showDailySettings && (
                    <Badge variant="secondary" className="mt-2 text-xs">
                      Full day available
                    </Badge>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}
        
        {/* Special Hourly Pricing */}
        {showHourlySettings && (
          <HourlySpecialPricing
            baseHourlyRate={parseFloat(hourlyRate) || null}
            specialPricing={specialPricing}
            onChange={setSpecialPricing}
          />
        )}

        {/* Availability Window Toggle */}
        <div className="p-4 rounded-xl border border-border bg-muted/30">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <Label className="text-base font-medium">Limit availability window</Label>
              <p className="text-sm text-muted-foreground mt-0.5">
                Set specific dates when your listing is available for booking
              </p>
            </div>
            <Switch
              checked={useAvailabilityWindow}
              onCheckedChange={(checked) => {
                setUseAvailabilityWindow(checked);
                if (!checked) {
                  onAvailableFromChange(null);
                  onAvailableToChange(null);
                }
              }}
            />
          </div>

          {useAvailabilityWindow && (
            <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-border">
              <div className="space-y-2">
                <Label className="text-sm">Available from</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !availableFrom && "text-muted-foreground"
                      )}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {availableFrom ? format(new Date(availableFrom), "PPP") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={availableFrom ? new Date(availableFrom) : undefined}
                      onSelect={(date) => onAvailableFromChange(date ? format(date, 'yyyy-MM-dd') : null)}
                      disabled={(date) => isBefore(date, startOfDay(new Date()))}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Available until</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !availableTo && "text-muted-foreground"
                      )}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {availableTo ? format(new Date(availableTo), "PPP") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={availableTo ? new Date(availableTo) : undefined}
                      onSelect={(date) => onAvailableToChange(date ? format(date, 'yyyy-MM-dd') : null)}
                      disabled={(date) => {
                        const minDate = availableFrom ? addDays(new Date(availableFrom), 1) : startOfDay(new Date());
                        return isBefore(date, minDate);
                      }}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          )}
        </div>

        {/* Block Dates Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-muted-foreground" />
              <h3 className="font-medium text-foreground">Block dates</h3>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="range-mode" className="text-sm text-muted-foreground">Range mode</Label>
              <Switch
                id="range-mode"
                checked={isRangeMode}
                onCheckedChange={(checked) => {
                  setIsRangeMode(checked);
                  setRangeStart(null);
                  setRangeEnd(null);
                }}
              />
            </div>
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            {isRangeMode 
              ? 'Click a start date, then an end date to block a range.' 
              : 'Click dates to block/unblock them.'}
            {' '}
            <span className="text-foreground/70">Blocked dates are unavailable for both daily and hourly bookings.</span>
          </p>

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-2 mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const today = startOfDay(new Date());
                const endDate = addDays(today, 6);
                blockDateRange(today, endDate, 'Blocked for 7 days');
              }}
            >
              Block next 7 days
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const today = startOfDay(new Date());
                const endDate = addDays(today, 29);
                blockDateRange(today, endDate, 'Blocked for 30 days');
              }}
            >
              Block next 30 days
            </Button>

            <Popover open={showBlockUntilDialog} onOpenChange={setShowBlockUntilDialog}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Calendar className="h-4 w-4" />
                  Block until...
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <div className="p-3 border-b border-border">
                  <p className="text-sm font-medium">Block all dates from today until:</p>
                </div>
                <CalendarComponent
                  mode="single"
                  selected={blockUntilDate}
                  onSelect={(date) => {
                    if (date) {
                      setBlockUntilDate(date);
                      blockDateRange(startOfDay(new Date()), date, 'Blocked until ' + format(date, 'MMM d'));
                      setShowBlockUntilDialog(false);
                      setBlockUntilDate(undefined);
                    }
                  }}
                  disabled={(date) => isBefore(date, startOfDay(new Date()))}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>

            {blockedDates.length > 0 && (
              <>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                      Clear all ({blockedDates.length})
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Clear all blocked dates?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will remove all {blockedDates.length} manually blocked date{blockedDates.length !== 1 ? 's' : ''} from your calendar.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={clearAllBlockedDates}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Clear all
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                <Popover open={showUnblockRangeDialog} onOpenChange={setShowUnblockRangeDialog}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      <Unlock className="h-4 w-4" />
                      Unblock range...
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <div className="p-3 border-b border-border">
                      <p className="text-sm font-medium">Select date range to unblock:</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {unblockRangeStart && !unblockRangeEnd 
                          ? `Start: ${format(unblockRangeStart, 'MMM d')} — Select end date`
                          : unblockRangeStart && unblockRangeEnd
                          ? `${format(unblockRangeStart, 'MMM d')} to ${format(unblockRangeEnd, 'MMM d')}`
                          : 'Click to select start date'}
                      </p>
                    </div>
                    <CalendarComponent
                      mode="single"
                      selected={unblockRangeEnd || unblockRangeStart}
                      onSelect={(date) => {
                        if (!date) return;
                        if (!unblockRangeStart) {
                          setUnblockRangeStart(date);
                        } else if (!unblockRangeEnd) {
                          if (isBefore(date, unblockRangeStart)) {
                            setUnblockRangeEnd(unblockRangeStart);
                            setUnblockRangeStart(date);
                          } else {
                            setUnblockRangeEnd(date);
                          }
                        } else {
                          setUnblockRangeStart(date);
                          setUnblockRangeEnd(undefined);
                        }
                      }}
                      initialFocus
                      className="pointer-events-auto"
                    />
                    <div className="p-3 border-t border-border flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => {
                          setUnblockRangeStart(undefined);
                          setUnblockRangeEnd(undefined);
                          setShowUnblockRangeDialog(false);
                        }}
                      >
                        Cancel
                      </Button>
                      <Button 
                        size="sm" 
                        className="flex-1"
                        disabled={!unblockRangeStart || !unblockRangeEnd}
                        onClick={() => {
                          if (unblockRangeStart && unblockRangeEnd) {
                            unblockDateRange(unblockRangeStart, unblockRangeEnd);
                            setUnblockRangeStart(undefined);
                            setUnblockRangeEnd(undefined);
                            setShowUnblockRangeDialog(false);
                          }
                        }}
                      >
                        Unblock
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              </>
            )}
          </div>

          {/* Range Selection Indicator */}
          {isRangeMode && rangeStart && !rangeEnd && (
            <div className="mb-4 p-3 rounded-lg bg-primary/10 border border-primary/20">
              <div className="flex items-center justify-between">
                <span className="text-sm text-foreground">
                  Start: <strong>{format(rangeStart, 'MMM d, yyyy')}</strong> — Now select end date
                </span>
                <Button variant="ghost" size="sm" onClick={cancelRangeSelection}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Calendar */}
          <div className="bg-card rounded-xl border border-border p-4">
            {/* Month Navigation */}
            <div className="flex items-center justify-between mb-4">
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
            <div className="grid grid-cols-7 gap-1 mb-1">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1">
              {paddingDays.map((_, index) => (
                <div key={`padding-${index}`} className="aspect-square" />
              ))}

              {daysInMonth.map(date => {
                const status = getDayStatus(date);
                const isSelected = selectedDate && isSameDay(date, selectedDate);
                const isRangeStart = rangeStart && isSameDay(date, rangeStart);
                const inRange = rangeStart && !rangeEnd && !isBefore(date, rangeStart) && !isBefore(date, startOfDay(new Date()));

                return (
                  <button
                    key={date.toISOString()}
                    onClick={() => handleDateClick(date)}
                    disabled={status === 'past' || status === 'booked' || status === 'outside_window'}
                    className={cn(
                      'aspect-square rounded-lg flex flex-col items-center justify-center text-sm transition-all relative',
                      statusColors[status],
                      isToday(date) && 'ring-2 ring-primary ring-offset-1',
                      isSelected && 'ring-2 ring-primary',
                      isRangeStart && 'ring-2 ring-primary bg-primary/20',
                      isRangeMode && inRange && status === 'available' && 'hover:bg-primary/10',
                    )}
                  >
                    <span className="font-medium">{format(date, 'd')}</span>
                    {status === 'blocked' && (
                      <Lock className="h-2.5 w-2.5 absolute bottom-0.5" />
                    )}
                    {status === 'booked' && (
                      <CalendarCheck className="h-2.5 w-2.5 absolute bottom-0.5" />
                    )}
                    {status === 'pending' && (
                      <Clock className="h-2.5 w-2.5 absolute bottom-0.5" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-border">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-background border border-border" />
                <span className="text-xs text-muted-foreground">Available</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-muted" />
                <span className="text-xs text-muted-foreground">Blocked</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-emerald-100" />
                <span className="text-xs text-muted-foreground">Booked</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-amber-100" />
                <span className="text-xs text-muted-foreground">Pending</span>
              </div>
            </div>
          </div>
        </div>

        {/* Upcoming Bookings Summary */}
        {upcomingBookings.length > 0 && (
          <div className="p-4 rounded-xl border border-border bg-muted/30">
            <h4 className="font-medium text-foreground mb-3 flex items-center gap-2">
              <CalendarCheck className="h-4 w-4 text-emerald-600" />
              Upcoming Bookings
            </h4>
            <div className="space-y-2">
              {upcomingBookings.map(booking => (
                <div key={booking.id} className="flex items-center justify-between text-sm">
                  <span className="text-foreground">
                    {format(new Date(booking.start_date), 'MMM d')} - {format(new Date(booking.end_date), 'MMM d')}
                  </span>
                  <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 text-xs">
                    Confirmed
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Info */}
        <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
          <Info className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            Blocked dates and your availability window will prevent bookings for those periods. You can always update this later from your dashboard.
          </p>
        </div>

        {/* Block Date Dialog */}
        <Dialog open={showBlockDialog} onOpenChange={(open) => {
          setShowBlockDialog(open);
          if (!open) {
            setRangeStart(null);
            setRangeEnd(null);
            setSelectedDate(null);
            setBlockReason('');
          }
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {isRangeMode && rangeStart && rangeEnd ? 'Block Date Range' : 'Block Date'}
              </DialogTitle>
              <DialogDescription>
                {isRangeMode && rangeStart && rangeEnd 
                  ? `Block ${format(rangeStart, 'MMM d')} – ${format(rangeEnd, 'MMM d, yyyy')} from bookings.`
                  : selectedDate ? `Block ${format(selectedDate, 'MMMM d, yyyy')} from bookings.` : ''}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label htmlFor="reason">Reason (optional)</Label>
                <Input
                  id="reason"
                  placeholder="e.g., Personal use, Maintenance"
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => {
                  setShowBlockDialog(false);
                  setRangeStart(null);
                  setRangeEnd(null);
                  setSelectedDate(null);
                  setBlockReason('');
                }}>
                  Cancel
                </Button>
                <Button onClick={handleBlockConfirm}>
                  {isRangeMode && rangeStart && rangeEnd ? 'Block Range' : 'Block Date'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
};
