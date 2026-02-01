import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar,
  ArrowLeft,
  Filter,
  Plus,
  CalendarRange
} from 'lucide-react';
import { useHostBookings } from '@/hooks/useHostBookings';
import { useBlockedDates } from '@/hooks/useBlockedDates';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import BookingDetailsDrawer from './BookingDetailsDrawer';
import BlockDatesModal from './BlockDatesModal';
import type { Tables } from '@/integrations/supabase/types';

type Listing = Tables<'listings'>;

interface RentalCalendarViewProps {
  listing: Listing;
  onBack: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700 border-amber-200',
  approved: 'bg-blue-100 text-blue-700 border-blue-200',
  paid: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  completed: 'bg-gray-100 text-gray-700 border-gray-200',
  cancelled: 'bg-red-100 text-red-700 border-red-200',
  declined: 'bg-red-100 text-red-700 border-red-200',
  blocked: 'bg-gray-800 text-white border-gray-900',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Request pending',
  approved: 'Approved',
  paid: 'Paid',
  completed: 'Completed',
  cancelled: 'Cancelled',
  declined: 'Declined',
  blocked: 'Blocked',
};

const FILTER_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Requests' },
  { value: 'approved', label: 'Approved' },
  { value: 'paid', label: 'Paid' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'blocked', label: 'Blocked' },
];

const RentalCalendarView = ({ listing, onBack }: RentalCalendarViewProps) => {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedFilters, setSelectedFilters] = useState<string[]>(['all']);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  
  const { bookings, refetch: refetchBookings } = useHostBookings();
  const { blockedDates, addBlockedDates, removeBlockedDate, isLoading: blockedLoading } = useBlockedDates(listing.id);
  
  // Filter bookings for this listing
  const listingBookings = useMemo(() => 
    bookings.filter(b => b.listing_id === listing.id),
    [bookings, listing.id]
  );

  // Get days in month
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();
    
    const days: (Date | null)[] = [];
    
    // Add empty cells for days before the first of the month
    for (let i = 0; i < startingDay; i++) {
      days.push(null);
    }
    
    // Add all days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    
    return days;
  };

  const days = getDaysInMonth(currentDate);
  const monthYear = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Get booking for a specific date
  const getBookingForDate = (date: Date) => {
    return listingBookings.find(booking => {
      const startDate = new Date(booking.start_date);
      const endDate = booking.end_date ? new Date(booking.end_date) : startDate;
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      const checkDate = new Date(date);
      checkDate.setHours(12, 0, 0, 0);
      return checkDate >= startDate && checkDate <= endDate;
    });
  };

  // Check if date is blocked
  const isDateBlocked = (date: Date) => {
    return blockedDates.some(bd => {
      const blockedDate = new Date(bd.blocked_date);
      return blockedDate.toDateString() === date.toDateString();
    });
  };

  // Get blocked date info
  const getBlockedDateInfo = (date: Date) => {
    return blockedDates.find(bd => {
      const blockedDate = new Date(bd.blocked_date);
      return blockedDate.toDateString() === date.toDateString();
    });
  };

  // Filter toggle
  const toggleFilter = (filter: string) => {
    if (filter === 'all') {
      setSelectedFilters(['all']);
    } else {
      const newFilters = selectedFilters.filter(f => f !== 'all');
      if (newFilters.includes(filter)) {
        const updated = newFilters.filter(f => f !== filter);
        setSelectedFilters(updated.length === 0 ? ['all'] : updated);
      } else {
        setSelectedFilters([...newFilters, filter]);
      }
    }
  };

  // Check if booking/blocked date should be shown based on filters
  const shouldShowDate = (date: Date) => {
    if (selectedFilters.includes('all')) return true;
    
    const booking = getBookingForDate(date);
    if (booking && selectedFilters.includes(booking.status)) return true;
    
    if (isDateBlocked(date) && selectedFilters.includes('blocked')) return true;
    
    return false;
  };

  // Navigate months
  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Handle date click
  const handleDateClick = (date: Date) => {
    const booking = getBookingForDate(date);
    if (booking) {
      setSelectedBookingId(booking.id);
    } else if (isDateBlocked(date)) {
      // Could show blocked date details
    } else {
      // Toggle date selection for blocking
      const isSelected = selectedDates.some(d => d.toDateString() === date.toDateString());
      if (isSelected) {
        setSelectedDates(selectedDates.filter(d => d.toDateString() !== date.toDateString()));
      } else {
        setSelectedDates([...selectedDates, date]);
      }
    }
  };

  // Get today's summary
  const today = new Date();
  const todayBookings = listingBookings.filter(b => {
    const startDate = new Date(b.start_date);
    const endDate = b.end_date ? new Date(b.end_date) : startDate;
    return today >= startDate && today <= endDate;
  });
  const pendingCount = listingBookings.filter(b => b.status === 'pending').length;

  const selectedBooking = selectedBookingId 
    ? listingBookings.find(b => b.id === selectedBookingId) 
    : null;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1">
        {/* Header */}
        <section className="py-6 bg-muted/30 border-b">
          <div className="container max-w-5xl">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onBack}
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Rentals
            </Button>
            
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-foreground">{listing.title}</h1>
                <p className="text-muted-foreground">Booking Calendar</p>
                <p className="text-sm text-muted-foreground mt-1">
                  See what's booked, what's pending, and what's blocked.
                </p>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowBlockModal(true)}
                  disabled={selectedDates.length === 0}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Block dates {selectedDates.length > 0 && `(${selectedDates.length})`}
                </Button>
              </div>
            </div>

            {/* Today Strip */}
            <Card className="mt-4 border-0 shadow-md bg-primary/5">
              <CardContent className="p-3">
                <p className="text-sm">
                  <span className="font-medium">Today:</span>{' '}
                  {todayBookings.length > 0 
                    ? `${todayBookings.length} booking${todayBookings.length > 1 ? 's' : ''}`
                    : 'No bookings'
                  }
                  {pendingCount > 0 && (
                    <span className="text-amber-600 ml-2">
                      • {pendingCount} pending request{pendingCount > 1 ? 's' : ''}
                    </span>
                  )}
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Filter Chips */}
        <section className="py-4 border-b bg-background">
          <div className="container max-w-5xl">
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              <Filter className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              {FILTER_OPTIONS.map(option => (
                <Badge
                  key={option.value}
                  variant={selectedFilters.includes(option.value) ? 'default' : 'outline'}
                  className="cursor-pointer whitespace-nowrap"
                  onClick={() => toggleFilter(option.value)}
                >
                  {option.label}
                </Badge>
              ))}
            </div>
          </div>
        </section>

        {/* Calendar */}
        <section className="py-6 bg-background">
          <div className="container max-w-5xl">
            <Card className="border-0 shadow-xl">
              <CardContent className="p-6">
                {/* Calendar Header */}
                <div className="flex items-center justify-between mb-6">
                  <Button variant="outline" size="icon" onClick={prevMonth}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold">{monthYear}</h2>
                    <Button variant="ghost" size="sm" onClick={goToToday}>
                      Today
                    </Button>
                  </div>
                  
                  <Button variant="outline" size="icon" onClick={nextMonth}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>

                {/* Day Headers */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-1">
                  {days.map((day, index) => {
                    if (!day) {
                      return <div key={`empty-${index}`} className="aspect-square" />;
                    }

                    const booking = getBookingForDate(day);
                    const blocked = isDateBlocked(day);
                    const isToday = day.toDateString() === today.toDateString();
                    const isSelected = selectedDates.some(d => d.toDateString() === day.toDateString());
                    const isPast = day < today && day.toDateString() !== today.toDateString();
                    const showHighlight = shouldShowDate(day) && (booking || blocked);

                    return (
                      <div
                        key={day.toISOString()}
                        onClick={() => !isPast && handleDateClick(day)}
                        className={`
                          aspect-square p-1 rounded-lg border transition-all
                          ${isPast ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-primary'}
                          ${isToday ? 'border-primary border-2' : 'border-border'}
                          ${isSelected ? 'bg-primary/10 border-primary' : ''}
                          ${booking && showHighlight ? STATUS_COLORS[booking.status] : ''}
                          ${blocked && showHighlight && !booking ? STATUS_COLORS.blocked : ''}
                        `}
                      >
                        <div className="h-full flex flex-col">
                          <span className={`text-sm font-medium ${isToday ? 'text-primary' : ''}`}>
                            {day.getDate()}
                          </span>
                          {booking && showHighlight && (
                            <span className="text-[10px] truncate mt-auto">
                              {STATUS_LABELS[booking.status]}
                            </span>
                          )}
                          {blocked && !booking && showHighlight && (
                            <span className="text-[10px] truncate mt-auto">
                              Blocked
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Legend */}
                <div className="flex flex-wrap gap-3 mt-6 pt-4 border-t">
                  {Object.entries(STATUS_LABELS).map(([status, label]) => (
                    <div key={status} className="flex items-center gap-1.5">
                      <div className={`w-3 h-3 rounded ${STATUS_COLORS[status].split(' ')[0]}`} />
                      <span className="text-xs text-muted-foreground">{label}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Empty State for Calendar */}
            {listingBookings.length === 0 && blockedDates.length === 0 && (
              <Card className="mt-6 border-0 shadow-lg">
                <CardContent className="p-8 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                    <CalendarRange className="h-7 w-7 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-2">No bookings yet</h3>
                  <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                    Your calendar is open. Share your listing and keep availability updated to get your first request.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button variant="dark-shine" onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/listing/${listing.id}`);
                    }}>
                      Share listing
                    </Button>
                    <Button variant="outline" onClick={() => setShowBlockModal(true)}>
                      Update availability
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </section>
      </main>

      <Footer />

      {/* Booking Details Drawer */}
      {selectedBooking && (
        <BookingDetailsDrawer
          booking={selectedBooking}
          listing={listing}
          open={!!selectedBookingId}
          onClose={() => setSelectedBookingId(null)}
          onUpdate={() => {
            refetchBookings();
            setSelectedBookingId(null);
          }}
        />
      )}

      {/* Block Dates Modal */}
      <BlockDatesModal
        open={showBlockModal}
        onClose={() => {
          setShowBlockModal(false);
          setSelectedDates([]);
        }}
        selectedDates={selectedDates}
        onBlock={async (dates, note) => {
          await addBlockedDates(dates, note);
          setSelectedDates([]);
          setShowBlockModal(false);
        }}
      />
    </div>
  );
};

export default RentalCalendarView;
