import { isToday, isPast, isFuture, parseISO, differenceInHours } from 'date-fns';
import { Clock, Play, CheckCircle2, AlertTriangle, CalendarCheck, Hourglass } from 'lucide-react';
import { getPhaseLabel, type Role } from '@/lib/transactionVocabulary';

interface BookingPhaseIndicatorProps {
  startDate: string;
  endDate: string;
  status: string;
  paymentStatus?: string | null;
  hostConfirmedAt?: string | null;
  shopperConfirmedAt?: string | null;
  disputeStatus?: string | null;
  /** Customer-facing or host-facing copy. Defaults to 'customer'. */
  role?: Role;
}

export type BookingPhase = 
  | 'pending'
  | 'awaiting_payment'
  | 'upcoming'
  | 'happening_now'
  | 'ended_awaiting_confirmation'
  | 'disputed'
  | 'completed';

export const getBookingPhase = ({
  startDate,
  endDate,
  status,
  paymentStatus,
  hostConfirmedAt,
  shopperConfirmedAt,
  disputeStatus,
}: BookingPhaseIndicatorProps): BookingPhase => {
  const start = parseISO(startDate);
  const end = parseISO(endDate);
  const now = new Date();

  // If there's an active dispute
  if (disputeStatus && disputeStatus !== 'closed') {
    return 'disputed';
  }

  // If booking is completed
  if (status === 'completed') {
    return 'completed';
  }

  // If booking is not approved or is cancelled/declined
  if (status === 'pending') {
    return 'pending';
  }

  if (status === 'cancelled' || status === 'declined') {
    return 'completed'; // Show as final state
  }

  // If approved but not paid
  if (status === 'approved' && paymentStatus !== 'paid') {
    return 'awaiting_payment';
  }

  // If approved and paid, check timeline
  if (status === 'approved' && paymentStatus === 'paid') {
    // Booking hasn't started yet
    if (isFuture(start)) {
      return 'upcoming';
    }

    // Booking is currently active (started but not ended)
    if ((isToday(start) || isPast(start)) && (isToday(end) || isFuture(end))) {
      return 'happening_now';
    }

    // Booking has ended
    if (isPast(end)) {
      // Both confirmed - should be completed by now
      if (hostConfirmedAt && shopperConfirmedAt) {
        return 'completed';
      }
      return 'ended_awaiting_confirmation';
    }
  }

  return 'pending';
};

export const BookingPhaseIndicator = (props: BookingPhaseIndicatorProps) => {
  const phase = getBookingPhase(props);
  const role: Role = props.role ?? 'customer';
  const end = parseISO(props.endDate);
  const hoursUntilAutoClose = Math.max(0, 24 - differenceInHours(new Date(), end));

  const phaseConfig: Record<BookingPhase, {
    description?: string;
    icon: typeof Clock;
    className: string;
    bgClassName: string;
  }> = {
    pending: {
      description: role === 'host'
        ? 'Review and respond to keep the request moving'
        : 'The host typically responds within 24h',
      icon: Clock,
      className: 'text-amber-600',
      bgClassName: 'bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800',
    },
    awaiting_payment: {
      description: role === 'host'
        ? 'We will notify you the moment payment is secured'
        : 'Complete payment to confirm your booking',
      icon: Clock,
      className: 'text-amber-600',
      bgClassName: 'bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800',
    },
    upcoming: {
      description: 'Payment is securely held until the booking is complete',
      icon: CalendarCheck,
      className: 'text-blue-600',
      bgClassName: 'bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800',
    },
    happening_now: {
      description: 'Booking is currently active',
      icon: Play,
      className: 'text-emerald-600',
      bgClassName: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800',
    },
    ended_awaiting_confirmation: {
      description: hoursUntilAutoClose > 0
        ? `Auto-closes in ~${hoursUntilAutoClose}h if no action`
        : 'Confirm to release payment & deposit',
      icon: Hourglass,
      className: 'text-orange-600',
      bgClassName: 'bg-orange-50 border-orange-200 dark:bg-orange-950/30 dark:border-orange-800',
    },
    disputed: {
      description: 'Payment on hold pending resolution',
      icon: AlertTriangle,
      className: 'text-destructive',
      bgClassName: 'bg-destructive/5 border-destructive/20',
    },
    completed: {
      description: role === 'host'
        ? 'Payout released to your connected account'
        : 'Booking finished successfully',
      icon: CheckCircle2,
      className: 'text-primary',
      bgClassName: 'bg-primary/5 border-primary/20',
    },
  };

  const config = phaseConfig[phase];
  const Icon = config.icon;
  const label = getPhaseLabel(phase, role);

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${config.bgClassName}`}>
      <Icon className={`h-4 w-4 flex-shrink-0 ${config.className}`} />
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${config.className}`}>
          {label}
        </p>
        {config.description && (
          <p className="text-xs text-muted-foreground truncate">
            {config.description}
          </p>
        )}
      </div>
    </div>
  );
};

export default BookingPhaseIndicator;
