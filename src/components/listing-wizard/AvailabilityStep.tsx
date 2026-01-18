import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Lock, CalendarCheck, Clock, Calendar, Info, Timer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, isBefore, startOfDay, addDays } from 'date-fns';
import { useListingAvailability } from '@/hooks/useListingAvailability';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AvailabilityStepProps {
  listingId: string;
  availableFrom: string | null;
  availableTo: string | null;
  onAvailableFromChange: (date: string | null) => void;
  onAvailableToChange: (date: string | null) => void;
  bufferDays?: number;
  onBufferDaysChange?: (days: number) => void;
}

export const AvailabilityStep: React.FC<AvailabilityStepProps> = ({
  listingId,
  availableFrom,
  availableTo,
  onAvailableFromChange,
  onAvailableToChange,
  bufferDays: propBufferDays,
  onBufferDaysChange,
}) => {
  const { toast } = useToast();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [blockReason, setBlockReason] = useState('');
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [useAvailabilityWindow, setUseAvailabilityWindow] = useState(!!(availableFrom || availableTo));
  const [bufferDays, setBufferDays] = useState<number>(propBufferDays || 0);

  const {
    bookings,
    blockDate,
    unblockDate,
    isDateBlocked,
    isDateBooked,
    isDatePending,
  } = useListingAvailability(listingId);

  // Fetch existing buffer days from listing if not provided via props
  useEffect(() => {
    const fetchBufferDays = async () => {
      if (propBufferDays !== undefined) return;
      
      const { data } = await supabase
        .from('listings')
        .select('rental_buffer_days')
        .eq('id', listingId)
        .single();
      
      if (data && (data as any).rental_buffer_days) {
        setBufferDays((data as any).rental_buffer_days);
      }
    };
    
    if (listingId) {
      fetchBufferDays();
    }
  }, [listingId, propBufferDays]);

  // Save buffer days when changed
  const handleBufferDaysChange = async (value: string) => {
    const days = parseInt(value) || 0;
    setBufferDays(days);
    
    if (onBufferDaysChange) {
      onBufferDaysChange(days);
    } else if (listingId) {
      // Save directly to database if no callback provided
      const { error } = await supabase
        .from('listings')
        .update({ rental_buffer_days: days } as any)
        .eq('id', listingId);
      
      if (error) {
        console.error('Error saving buffer days:', error);
        toast({
          title: 'Error',
          description: 'Failed to save buffer time setting.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Buffer time updated',
          description: days > 0 
            ? `${days} day${days > 1 ? 's' : ''} will be blocked before and after each booking.`
            : 'Buffer time has been disabled.',
        });
      }
    }
  };

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

    setSelectedDate(date);

    if (isDateBlocked(date)) {
      unblockDate(date);
    } else {
      setShowBlockDialog(true);
    }
  };

  const handleBlockConfirm = () => {
    if (selectedDate) {
      blockDate(selectedDate, blockReason || undefined);
      setShowBlockDialog(false);
      setBlockReason('');
      setSelectedDate(null);
    }
  };

  const getDayStatus = (date: Date): 'available' | 'blocked' | 'booked' | 'pending' | 'past' | 'outside_window' => {
    if (isBefore(date, startOfDay(new Date()))) return 'past';
    
    // Check if outside availability window
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

  return (
    <div className="space-y-6">
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

      {/* Buffer Time Setting */}
      <div className="p-4 rounded-xl border border-border bg-muted/30">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Timer className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <Label className="text-base font-medium">Buffer time between rentals</Label>
              <p className="text-sm text-muted-foreground mt-0.5">
                Automatically block days before and after bookings for prep/cleanup
              </p>
            </div>
          </div>
          <Select value={bufferDays.toString()} onValueChange={handleBufferDaysChange}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">No buffer</SelectItem>
              <SelectItem value="1">1 day</SelectItem>
              <SelectItem value="2">2 days</SelectItem>
              <SelectItem value="3">3 days</SelectItem>
              <SelectItem value="5">5 days</SelectItem>
              <SelectItem value="7">7 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {bufferDays > 0 && (
          <div className="mt-3 pt-3 border-t border-border">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{bufferDays} day{bufferDays > 1 ? 's' : ''}</span> will be 
              automatically blocked before and after each confirmed booking.
            </p>
          </div>
        )}
      </div>

      {/* Block Dates Section */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Lock className="w-5 h-5 text-muted-foreground" />
          <h3 className="font-medium text-foreground">Block specific dates</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Click on dates to block them from bookings. This is useful for maintenance, personal use, or other commitments.
        </p>

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
      <Dialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Block Date</DialogTitle>
            <DialogDescription>
              Block {selectedDate ? format(selectedDate, 'MMMM d, yyyy') : ''} from bookings.
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
              <Button variant="outline" onClick={() => setShowBlockDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleBlockConfirm}>
                Block Date
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
