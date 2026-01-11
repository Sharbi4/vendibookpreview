import { useState } from 'react';
import { Calendar, X, Lock, CalendarCheck, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, isBefore, startOfDay } from 'date-fns';
import { useListingAvailability } from '@/hooks/useListingAvailability';
import type { Tables } from '@/integrations/supabase/types';

type Listing = Tables<'listings'>;

interface AvailabilityCalendarProps {
  listing: Listing;
  onClose: () => void;
}

const AvailabilityCalendar = ({ listing, onClose }: AvailabilityCalendarProps) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [blockReason, setBlockReason] = useState('');
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  
  const {
    blockedDates,
    bookings,
    isLoading,
    blockDate,
    unblockDate,
    isDateBlocked,
    isDateBooked,
    isDatePending,
  } = useListingAvailability(listing.id);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Get day of week for first day (0 = Sunday)
  const firstDayOfWeek = monthStart.getDay();
  
  // Create padding for days before the month starts
  const paddingDays = Array(firstDayOfWeek).fill(null);

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  const handleDateClick = (date: Date) => {
    if (isBefore(date, startOfDay(new Date()))) return;
    
    if (isDateBooked(date)) {
      // Can't modify booked dates
      return;
    }

    setSelectedDate(date);
    
    if (isDateBlocked(date)) {
      // Unblock the date
      unblockDate(date);
    } else {
      // Show block dialog
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

  const getDayStatus = (date: Date): 'available' | 'blocked' | 'booked' | 'pending' | 'past' => {
    if (isBefore(date, startOfDay(new Date()))) return 'past';
    if (isDateBooked(date)) return 'booked';
    if (isDatePending(date)) return 'pending';
    if (isDateBlocked(date)) return 'blocked';
    return 'available';
  };

  const statusColors = {
    available: 'bg-background hover:bg-primary/10 text-foreground cursor-pointer',
    blocked: 'bg-muted text-muted-foreground cursor-pointer',
    booked: 'bg-emerald-100 text-emerald-700 cursor-not-allowed',
    pending: 'bg-amber-100 text-amber-700 cursor-not-allowed',
    past: 'bg-muted/30 text-muted-foreground/50 cursor-not-allowed',
  };

  // Get upcoming bookings for the sidebar
  const upcomingBookings = bookings
    .filter(b => b.status === 'approved' && b.end_date >= format(new Date(), 'yyyy-MM-dd'))
    .sort((a, b) => a.start_date.localeCompare(b.start_date))
    .slice(0, 5);

  const pendingBookings = bookings
    .filter(b => b.status === 'pending')
    .sort((a, b) => a.start_date.localeCompare(b.start_date));

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-xl font-bold text-foreground">Availability Calendar</h2>
            <p className="text-sm text-muted-foreground mt-1">{listing.title}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex flex-col lg:flex-row">
          {/* Calendar Section */}
          <div className="flex-1 p-6">
            {/* Month Navigation */}
            <div className="flex items-center justify-between mb-6">
              <Button variant="outline" size="icon" onClick={handlePrevMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h3 className="text-lg font-semibold text-foreground">
                {format(currentMonth, 'MMMM yyyy')}
              </h3>
              <Button variant="outline" size="icon" onClick={handleNextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Day Headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
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
                    disabled={status === 'past' || status === 'booked'}
                    className={cn(
                      'aspect-square rounded-lg flex flex-col items-center justify-center text-sm transition-all relative',
                      statusColors[status],
                      isToday(date) && 'ring-2 ring-primary ring-offset-2',
                      isSelected && 'ring-2 ring-primary',
                    )}
                  >
                    <span className="font-medium">{format(date, 'd')}</span>
                    {status === 'blocked' && (
                      <Lock className="h-3 w-3 absolute bottom-1" />
                    )}
                    {status === 'booked' && (
                      <CalendarCheck className="h-3 w-3 absolute bottom-1" />
                    )}
                    {status === 'pending' && (
                      <Clock className="h-3 w-3 absolute bottom-1" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-4 mt-6 pt-4 border-t border-border">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-background border border-border" />
                <span className="text-xs text-muted-foreground">Available</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-muted" />
                <span className="text-xs text-muted-foreground">Blocked</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-emerald-100" />
                <span className="text-xs text-muted-foreground">Booked</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-amber-100" />
                <span className="text-xs text-muted-foreground">Pending</span>
              </div>
            </div>

            <p className="text-xs text-muted-foreground mt-4">
              Click on available dates to block them. Click blocked dates to unblock.
            </p>
          </div>

          {/* Sidebar - Bookings */}
          <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-border p-6 bg-muted/30">
            {/* Upcoming Bookings */}
            <div className="mb-6">
              <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <CalendarCheck className="h-4 w-4 text-emerald-600" />
                Upcoming Bookings
              </h4>
              {upcomingBookings.length === 0 ? (
                <p className="text-sm text-muted-foreground">No upcoming bookings</p>
              ) : (
                <div className="space-y-2">
                  {upcomingBookings.map(booking => (
                    <div key={booking.id} className="p-3 bg-card rounded-lg border border-border">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-foreground">
                          {format(new Date(booking.start_date), 'MMM d')} - {format(new Date(booking.end_date), 'MMM d')}
                        </span>
                        <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 text-xs">
                          Confirmed
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        ${booking.total_price} total
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pending Requests */}
            {pendingBookings.length > 0 && (
              <div>
                <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-600" />
                  Pending Requests
                </h4>
                <div className="space-y-2">
                  {pendingBookings.map(booking => (
                    <div key={booking.id} className="p-3 bg-card rounded-lg border border-amber-200">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-foreground">
                          {format(new Date(booking.start_date), 'MMM d')} - {format(new Date(booking.end_date), 'MMM d')}
                        </span>
                        <Badge variant="secondary" className="bg-amber-100 text-amber-700 text-xs">
                          Pending
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        ${booking.total_price} total
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Blocked Dates Summary */}
            <div className="mt-6 pt-6 border-t border-border">
              <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                <Lock className="h-4 w-4 text-muted-foreground" />
                Blocked Dates
              </h4>
              <p className="text-sm text-muted-foreground">
                {blockedDates.length} date{blockedDates.length !== 1 ? 's' : ''} blocked
              </p>
            </div>
          </div>
        </div>
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

export default AvailabilityCalendar;
