import { format, parseISO, differenceInDays } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MessageCircle, Clock, User } from 'lucide-react';
import { Link } from 'react-router-dom';

interface HourlySlot {
  date: string;
  slots: string[];
}

interface ShopperProfile {
  id: string;
  full_name: string | null;
  display_name: string | null;
  email: string | null;
  avatar_url: string | null;
}

interface BookingCardProps {
  booking: {
    id: string;
    start_date: string;
    end_date: string;
    total_price: number;
    status: string;
    is_hourly_booking?: boolean | null;
    hourly_slots?: HourlySlot[] | null;
    slot_number?: number | null;
    slot_name?: string | null;
    shopper_id: string;
    shopper?: ShopperProfile | null;
  };
  variant?: 'confirmed' | 'pending';
}

const BookingCard = ({ booking, variant = 'confirmed' }: BookingCardProps) => {
  const shopper = booking.shopper;
  const shopperName = shopper?.display_name || shopper?.full_name || 'Guest';
  const shopperInitials = shopperName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const isHourly = booking.is_hourly_booking;
  const hourlySlots = booking.hourly_slots as HourlySlot[] | null;

  // Calculate duration text
  const getDurationText = () => {
    if (isHourly && hourlySlots && hourlySlots.length > 0) {
      // Count total hours across all days
      const totalHours = hourlySlots.reduce((sum, day) => sum + day.slots.length, 0);
      if (hourlySlots.length === 1) {
        // Single day hourly booking
        const slots = hourlySlots[0].slots.sort();
        const startHour = parseInt(slots[0].split(':')[0]);
        const endHour = parseInt(slots[slots.length - 1].split(':')[0]) + 1;
        const startPeriod = startHour >= 12 ? 'pm' : 'am';
        const endPeriod = endHour >= 12 ? 'pm' : 'am';
        const startDisplay = startHour > 12 ? startHour - 12 : startHour || 12;
        const endDisplay = endHour > 12 ? endHour - 12 : endHour || 12;
        return `${startDisplay}${startPeriod} - ${endDisplay}${endPeriod} (${totalHours}h)`;
      } else {
        // Multi-day hourly
        return `${totalHours} hours over ${hourlySlots.length} days`;
      }
    } else {
      // Daily booking
      const days = differenceInDays(parseISO(booking.end_date), parseISO(booking.start_date)) + 1;
      return days === 1 ? '1 day' : `${days} days`;
    }
  };

  const getDateDisplay = () => {
    const startDate = parseISO(booking.start_date);
    const endDate = parseISO(booking.end_date);
    
    if (isHourly && hourlySlots && hourlySlots.length === 1) {
      // Single day with hours
      return format(startDate, 'MMM d, yyyy');
    }
    
    if (booking.start_date === booking.end_date) {
      return format(startDate, 'MMM d, yyyy');
    }
    
    return `${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d, yyyy')}`;
  };

  const borderClass = variant === 'pending' 
    ? 'border-amber-200 dark:border-amber-800' 
    : 'border-border';

  const badgeClass = variant === 'pending'
    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
    : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';

  return (
    <div className={`p-3 bg-card rounded-lg border ${borderClass}`}>
      {/* Shopper info */}
      <div className="flex items-center gap-2 mb-2">
        <Avatar className="h-7 w-7">
          <AvatarImage src={shopper?.avatar_url || undefined} alt={shopperName} />
          <AvatarFallback className="text-xs bg-muted">
            {shopperInitials || <User className="h-3 w-3" />}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{shopperName}</p>
          {shopper?.email && (
            <p className="text-xs text-muted-foreground truncate">{shopper.email}</p>
          )}
        </div>
      </div>

      {/* Date and duration */}
      <div className="mb-2">
        <p className="text-sm text-foreground">{getDateDisplay()}</p>
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {getDurationText()}
          {booking.slot_name && ` • ${booking.slot_name}`}
          {booking.slot_number && !booking.slot_name && ` • Slot ${booking.slot_number}`}
        </p>
      </div>

      {/* Hourly breakdown if applicable */}
      {isHourly && hourlySlots && hourlySlots.length > 1 && (
        <div className="mb-2 text-xs text-muted-foreground">
          {hourlySlots.slice(0, 3).map((day, idx) => (
            <div key={idx}>
              {format(parseISO(day.date), 'MMM d')}: {day.slots.length}h
            </div>
          ))}
          {hourlySlots.length > 3 && (
            <div>+{hourlySlots.length - 3} more days</div>
          )}
        </div>
      )}

      {/* Price and status */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">
          ${booking.total_price.toLocaleString()}
        </span>
        <Badge variant="secondary" className={`text-xs ${badgeClass}`}>
          {variant === 'pending' ? 'Pending' : 'Confirmed'}
        </Badge>
      </div>

      {/* Quick actions */}
      <div className="mt-2 pt-2 border-t border-border flex gap-2">
        <Link 
          to={`/dashboard?booking=${booking.id}`}
          className="flex-1"
        >
          <Button variant="outline" size="sm" className="w-full text-xs">
            View Details
          </Button>
        </Link>
        <Link to={`/dashboard?booking=${booking.id}&action=message`}>
          <Button variant="ghost" size="sm" className="px-2">
            <MessageCircle className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default BookingCard;
