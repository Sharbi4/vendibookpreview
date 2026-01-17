import { Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface BookingStepDatesProps {
  startDate: Date | undefined;
  endDate: Date | undefined;
  onStartDateChange: (date: Date | undefined) => void;
  onEndDateChange: (date: Date | undefined) => void;
  availableFrom?: string | null;
  availableTo?: string | null;
  isDateUnavailable: (date: Date) => boolean;
  rentalDays: number;
  priceDaily: number | null;
  onContinue: () => void;
  hasUnavailableDates: boolean;
}

const BookingStepDates = ({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  availableFrom,
  availableTo,
  isDateUnavailable,
  rentalDays,
  priceDaily,
  onContinue,
  hasUnavailableDates,
}: BookingStepDatesProps) => {
  const minDate = availableFrom ? new Date(availableFrom) : new Date();
  const maxDate = availableTo ? new Date(availableTo) : undefined;

  const canContinue = startDate && endDate && rentalDays > 0 && !hasUnavailableDates;

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h3 className="text-lg font-semibold text-foreground">Select dates</h3>
        <p className="text-sm text-muted-foreground">When do you need this rental?</p>
      </div>

      {/* Date pickers */}
      <div className="grid grid-cols-2 gap-3">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal h-12",
                !startDate && "text-muted-foreground"
              )}
            >
              <Calendar className="mr-2 h-4 w-4" />
              {startDate ? format(startDate, 'MMM d') : 'Start'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <CalendarComponent
              mode="single"
              selected={startDate}
              onSelect={onStartDateChange}
              disabled={(date) => 
                date < minDate || 
                (maxDate && date > maxDate) || 
                (endDate && date >= endDate) ||
                isDateUnavailable(date)
              }
              className={cn("p-3 pointer-events-auto")}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal h-12",
                !endDate && "text-muted-foreground"
              )}
            >
              <Calendar className="mr-2 h-4 w-4" />
              {endDate ? format(endDate, 'MMM d') : 'End'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <CalendarComponent
              mode="single"
              selected={endDate}
              onSelect={onEndDateChange}
              disabled={(date) => 
                date < minDate || 
                (maxDate && date > maxDate) || 
                (startDate && date <= startDate) ||
                isDateUnavailable(date)
              }
              className={cn("p-3 pointer-events-auto")}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Summary */}
      {rentalDays > 0 && priceDaily && (
        <div className="p-3 bg-muted/50 rounded-lg text-center">
          <span className="text-sm text-muted-foreground">
            {rentalDays} day{rentalDays > 1 ? 's' : ''} · 
          </span>
          <span className="text-sm font-medium text-foreground ml-1">
            ${(rentalDays * priceDaily).toLocaleString()} est.
          </span>
        </div>
      )}

      {/* Error state */}
      {hasUnavailableDates && (
        <p className="text-sm text-destructive text-center">
          Selected dates include unavailable days.
        </p>
      )}

      {/* CTA */}
      <Button
        variant="gradient"
        className="w-full"
        size="lg"
        onClick={onContinue}
        disabled={!canContinue}
      >
        Continue
      </Button>
    </div>
  );
};

export default BookingStepDates;
