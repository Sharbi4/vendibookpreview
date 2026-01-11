import { useState } from 'react';
import { Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { format, differenceInDays } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

interface BookingFormProps {
  listingId: string;
  priceDaily: number | null;
  priceWeekly: number | null;
  availableFrom?: string | null;
  availableTo?: string | null;
}

const BookingForm = ({ 
  listingId, 
  priceDaily, 
  priceWeekly,
  availableFrom,
  availableTo 
}: BookingFormProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const minDate = availableFrom ? new Date(availableFrom) : new Date();
  const maxDate = availableTo ? new Date(availableTo) : undefined;

  const rentalDays = startDate && endDate ? differenceInDays(endDate, startDate) : 0;
  
  const calculateTotal = () => {
    if (!priceDaily || rentalDays <= 0) return 0;
    
    const weeks = Math.floor(rentalDays / 7);
    const remainingDays = rentalDays % 7;
    
    if (priceWeekly && weeks > 0) {
      return (weeks * priceWeekly) + (remainingDays * priceDaily);
    }
    
    return rentalDays * priceDaily;
  };

  const total = calculateTotal();

  const handleSubmit = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }

    if (!startDate || !endDate) {
      toast({
        title: 'Select dates',
        description: 'Please select your rental dates',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    
    // TODO: Implement booking request submission
    toast({
      title: 'Request sent!',
      description: 'The host will review your booking request.',
    });
    
    setIsSubmitting(false);
  };

  return (
    <div className="bg-card border border-border rounded-xl p-6 shadow-card sticky top-24">
      <div className="mb-6">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-foreground">
            ${priceDaily}
          </span>
          <span className="text-muted-foreground">/ day</span>
        </div>
        {priceWeekly && (
          <p className="text-sm text-muted-foreground mt-1">
            ${priceWeekly} / week
          </p>
        )}
      </div>

      {/* Date Selection */}
      <div className="space-y-4 mb-6">
        <div className="grid grid-cols-2 gap-3">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start text-left font-normal"
              >
                <Calendar className="mr-2 h-4 w-4" />
                {startDate ? format(startDate, 'MMM d') : 'Start date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={startDate}
                onSelect={setStartDate}
                disabled={(date) => 
                  date < minDate || (maxDate && date > maxDate) || (endDate && date >= endDate)
                }
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start text-left font-normal"
              >
                <Calendar className="mr-2 h-4 w-4" />
                {endDate ? format(endDate, 'MMM d') : 'End date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={endDate}
                onSelect={setEndDate}
                disabled={(date) => 
                  date < minDate || (maxDate && date > maxDate) || (startDate && date <= startDate)
                }
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {rentalDays > 0 && (
          <p className="text-sm text-muted-foreground text-center">
            {rentalDays} day{rentalDays > 1 ? 's' : ''} rental
          </p>
        )}
      </div>

      {/* Message */}
      <div className="mb-6">
        <Textarea
          placeholder="Add a message for the host (optional)"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          className="resize-none"
        />
      </div>

      {/* Price Breakdown */}
      {rentalDays > 0 && (
        <div className="border-t border-border pt-4 mb-6 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              ${priceDaily} × {rentalDays} day{rentalDays > 1 ? 's' : ''}
            </span>
            <span className="text-foreground">${total}</span>
          </div>
          <div className="flex justify-between font-semibold">
            <span>Total</span>
            <span>${total}</span>
          </div>
        </div>
      )}

      {/* Submit Button */}
      <Button 
        className="w-full bg-primary hover:bg-primary/90" 
        size="lg"
        onClick={handleSubmit}
        disabled={isSubmitting}
      >
        {user ? 'Request to Book' : 'Sign in to Book'}
      </Button>

      <p className="text-xs text-muted-foreground text-center mt-4">
        You won't be charged yet
      </p>
    </div>
  );
};

export default BookingForm;
