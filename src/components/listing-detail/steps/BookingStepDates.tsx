import { Calendar, ArrowRight, Info } from 'lucide-react';
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
      {/* Header */}
      <div className="border-b border-border pb-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <Calendar className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Select Your Dates</h3>
            <p className="text-sm text-muted-foreground">When do you need this rental?</p>
          </div>
        </div>
      </div>

      {/* Date pickers */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Start Date</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal h-12 border-2",
                  startDate ? "border-primary/50 bg-primary/5" : "text-muted-foreground"
                )}
              >
                <Calendar className="mr-2 h-4 w-4" />
                {startDate ? format(startDate, 'MMM d, yyyy') : 'Select start'}
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
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">End Date</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal h-12 border-2",
                  endDate ? "border-primary/50 bg-primary/5" : "text-muted-foreground"
                )}
              >
                <Calendar className="mr-2 h-4 w-4" />
                {endDate ? format(endDate, 'MMM d, yyyy') : 'Select end'}
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
      </div>

      {/* Summary */}
      {rentalDays > 0 && priceDaily && (
        <div className="p-4 bg-muted/30 rounded-xl border border-border">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium text-foreground">
                {rentalDays} day{rentalDays > 1 ? 's' : ''} rental
              </span>
              <p className="text-xs text-muted-foreground mt-0.5">
                {startDate && endDate && `${format(startDate, 'MMM d')} – ${format(endDate, 'MMM d, yyyy')}`}
              </p>
            </div>
            <span className="text-lg font-bold text-primary">
              ${(rentalDays * priceDaily).toLocaleString()}
            </span>
          </div>
        </div>
      )}

      {/* Error state */}
      {hasUnavailableDates && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2">
          <Info className="h-4 w-4 text-destructive flex-shrink-0" />
          <p className="text-sm text-destructive">
            Selected dates include unavailable days. Please choose different dates.
          </p>
        </div>
      )}

      {/* What's Next */}
      <div className="p-3 bg-muted/30 rounded-xl border border-border">
        <div className="flex items-center gap-2 text-sm">
          <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center">
            <ArrowRight className="h-3 w-3 text-primary-foreground" />
          </div>
          <span className="text-muted-foreground">
            <strong className="text-foreground">Next:</strong> Review any required documents
          </span>
        </div>
      </div>

      {/* CTA */}
      <Button
        variant="gradient"
        className="w-full h-12 text-base"
        size="lg"
        onClick={onContinue}
        disabled={!canContinue}
      >
        Continue to Requirements
        <ArrowRight className="h-4 w-4 ml-2" />
      </Button>
    </div>
  );
};

export default BookingStepDates;