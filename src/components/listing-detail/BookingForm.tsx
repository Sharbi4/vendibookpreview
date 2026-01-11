import { useState } from 'react';
import { Calendar, Loader2, MapPin, Truck, Building, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { format, differenceInDays, eachDayOfInterval } from 'date-fns';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useBlockedDates } from '@/hooks/useBlockedDates';
import type { ListingCategory, FulfillmentType } from '@/types/listing';
import type { TablesInsert } from '@/integrations/supabase/types';

interface BookingFormProps {
  listingId: string;
  hostId: string;
  category: ListingCategory;
  fulfillmentType: FulfillmentType;
  priceDaily: number | null;
  priceWeekly: number | null;
  availableFrom?: string | null;
  availableTo?: string | null;
  // Mobile asset fields
  pickupLocation?: string | null;
  pickupInstructions?: string | null;
  deliveryFee?: number | null;
  deliveryRadiusMiles?: number | null;
  deliveryInstructions?: string | null;
  // Static location fields
  address?: string | null;
  accessInstructions?: string | null;
  hoursOfAccess?: string | null;
  // Listing status
  status: 'draft' | 'published' | 'paused';
}

type FulfillmentSelection = 'pickup' | 'delivery' | 'on_site';

const BookingForm = ({ 
  listingId,
  hostId,
  category,
  fulfillmentType,
  priceDaily, 
  priceWeekly,
  availableFrom,
  availableTo,
  pickupLocation,
  pickupInstructions,
  deliveryFee,
  deliveryRadiusMiles,
  deliveryInstructions,
  address,
  accessInstructions,
  hoursOfAccess,
  status,
}: BookingFormProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isDateUnavailable } = useBlockedDates({ listingId });
  
  // Determine if this is a mobile asset or static location
  const isMobileAsset = category === 'food_truck' || category === 'food_trailer';
  const isStaticLocation = category === 'ghost_kitchen' || category === 'vendor_lot';
  
  // Determine available fulfillment options for mobile assets
  const getAvailableFulfillmentOptions = (): FulfillmentSelection[] => {
    if (isStaticLocation) return ['on_site'];
    if (fulfillmentType === 'both') return ['pickup', 'delivery'];
    if (fulfillmentType === 'pickup') return ['pickup'];
    if (fulfillmentType === 'delivery') return ['delivery'];
    return ['pickup'];
  };
  
  const fulfillmentOptions = getAvailableFulfillmentOptions();
  const defaultFulfillment = isStaticLocation ? 'on_site' : fulfillmentOptions[0];
  
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  
  // Fulfillment state
  const [fulfillmentSelected, setFulfillmentSelected] = useState<FulfillmentSelection>(defaultFulfillment);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryInstructionsInput, setDeliveryInstructionsInput] = useState('');

  const minDate = availableFrom ? new Date(availableFrom) : new Date();
  const maxDate = availableTo ? new Date(availableTo) : undefined;

  const rentalDays = startDate && endDate ? differenceInDays(endDate, startDate) : 0;
  
  const calculateTotal = () => {
    if (!priceDaily || rentalDays <= 0) return 0;
    
    const weeks = Math.floor(rentalDays / 7);
    const remainingDays = rentalDays % 7;
    
    let basePrice = 0;
    if (priceWeekly && weeks > 0) {
      basePrice = (weeks * priceWeekly) + (remainingDays * priceDaily);
    } else {
      basePrice = rentalDays * priceDaily;
    }
    
    // Add delivery fee if delivery is selected
    if (fulfillmentSelected === 'delivery' && deliveryFee) {
      basePrice += deliveryFee;
    }
    
    return basePrice;
  };

  const total = calculateTotal();
  
  const isListingAvailable = status === 'published';

  // Check if any date in the selected range is unavailable
  const hasUnavailableDatesInRange = (): boolean => {
    if (!startDate || !endDate) return false;
    const datesInRange = eachDayOfInterval({ start: startDate, end: endDate });
    return datesInRange.some(date => isDateUnavailable(date));
  };

  const validateForm = (): string | null => {
    if (!startDate || !endDate) {
      return 'Please select your rental dates';
    }
    if (rentalDays <= 0) {
      return 'End date must be after start date';
    }
    if (hasUnavailableDatesInRange()) {
      return 'Your selected dates include unavailable dates. Please choose different dates.';
    }
    if (fulfillmentSelected === 'delivery' && !deliveryAddress.trim()) {
      return 'Please enter a delivery address';
    }
    return null;
  };

  const handleSubmit = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }

    const validationError = validateForm();
    if (validationError) {
      toast({
        title: 'Missing information',
        description: validationError,
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      const bookingData: TablesInsert<'booking_requests'> = {
        listing_id: listingId,
        host_id: hostId,
        shopper_id: user.id,
        start_date: format(startDate!, 'yyyy-MM-dd'),
        end_date: format(endDate!, 'yyyy-MM-dd'),
        message: message.trim() || null,
        total_price: total,
        fulfillment_selected: fulfillmentSelected,
      };

      // Add fulfillment-specific data
      if (fulfillmentSelected === 'delivery') {
        bookingData.delivery_address = deliveryAddress.trim();
        bookingData.delivery_instructions = deliveryInstructionsInput.trim() || null;
        bookingData.delivery_fee_snapshot = deliveryFee || null;
      } else if (fulfillmentSelected === 'on_site') {
        bookingData.address_snapshot = address || null;
        bookingData.access_instructions_snapshot = accessInstructions || null;
      }

      const { error } = await supabase
        .from('booking_requests')
        .insert(bookingData);

      if (error) throw error;

      setShowConfirmation(true);

      // Reset form
      setStartDate(undefined);
      setEndDate(undefined);
      setMessage('');
      setDeliveryAddress('');
      setDeliveryInstructionsInput('');
    } catch (error) {
      console.error('Error submitting booking:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit booking request. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (showConfirmation) {
    return (
      <div className="bg-card border border-border rounded-xl p-6 shadow-card sticky top-24">
        <div className="text-center py-4">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Calendar className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-2">
            Request Sent!
          </h3>
          <p className="text-muted-foreground mb-6">
            Your booking request has been sent. The host will review and respond shortly.
          </p>
          <Button 
            variant="outline" 
            onClick={() => setShowConfirmation(false)}
            className="w-full"
          >
            Make Another Request
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-6 shadow-card sticky top-24">
      {/* Price Header */}
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

      {/* Unavailable Notice */}
      {!isListingAvailable && (
        <Alert className="mb-6">
          <Info className="h-4 w-4" />
          <AlertDescription>
            This listing is currently unavailable for booking.
          </AlertDescription>
        </Alert>
      )}

      {/* Date Selection */}
      <div className="space-y-4 mb-6">
        <div className="grid grid-cols-2 gap-3">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start text-left font-normal"
                disabled={!isListingAvailable}
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
                  date < minDate || 
                  (maxDate && date > maxDate) || 
                  (endDate && date >= endDate) ||
                  isDateUnavailable(date)
                }
                modifiers={{
                  unavailable: (date) => isDateUnavailable(date),
                }}
                modifiersStyles={{
                  unavailable: { 
                    textDecoration: 'line-through',
                    opacity: 0.5,
                  },
                }}
                className={cn("p-3 pointer-events-auto")}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start text-left font-normal"
                disabled={!isListingAvailable}
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
                  date < minDate || 
                  (maxDate && date > maxDate) || 
                  (startDate && date <= startDate) ||
                  isDateUnavailable(date)
                }
                modifiers={{
                  unavailable: (date) => isDateUnavailable(date),
                }}
                modifiersStyles={{
                  unavailable: { 
                    textDecoration: 'line-through',
                    opacity: 0.5,
                  },
                }}
                className={cn("p-3 pointer-events-auto")}
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

      {/* Fulfillment Selection - Mobile Assets Only */}
      {isMobileAsset && fulfillmentOptions.length > 1 && (
        <div className="mb-6">
          <Label className="text-sm font-medium mb-3 block">
            How would you like to receive this?
          </Label>
          <RadioGroup
            value={fulfillmentSelected}
            onValueChange={(val) => setFulfillmentSelected(val as FulfillmentSelection)}
            className="space-y-3"
          >
            {fulfillmentOptions.includes('pickup') && (
              <div className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:border-primary/50 transition-colors cursor-pointer">
                <RadioGroupItem value="pickup" id="pickup" />
                <Label htmlFor="pickup" className="flex items-center gap-2 cursor-pointer flex-1">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span>Pickup</span>
                </Label>
              </div>
            )}
            {fulfillmentOptions.includes('delivery') && (
              <div className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:border-primary/50 transition-colors cursor-pointer">
                <RadioGroupItem value="delivery" id="delivery" />
                <Label htmlFor="delivery" className="flex items-center gap-2 cursor-pointer flex-1">
                  <Truck className="h-4 w-4 text-primary" />
                  <span>Delivery</span>
                  {deliveryFee && (
                    <span className="text-xs text-muted-foreground ml-auto">
                      +${deliveryFee} fee
                    </span>
                  )}
                </Label>
              </div>
            )}
          </RadioGroup>
        </div>
      )}

      {/* Pickup Details - Read Only */}
      {isMobileAsset && fulfillmentSelected === 'pickup' && (
        <div className="mb-6 p-4 bg-muted/50 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="h-4 w-4 text-primary" />
            <span className="font-medium text-sm text-foreground">Pickup Location</span>
          </div>
          <p className="text-sm text-muted-foreground">
            {pickupLocation || 'Location details provided upon booking confirmation'}
          </p>
          {pickupInstructions && (
            <p className="text-sm text-muted-foreground mt-2 italic">
              {pickupInstructions}
            </p>
          )}
        </div>
      )}

      {/* Delivery Details - User Input Required */}
      {isMobileAsset && fulfillmentSelected === 'delivery' && (
        <div className="mb-6 space-y-4">
          <div>
            <Label htmlFor="deliveryAddress" className="text-sm font-medium mb-2 block">
              Delivery Address *
            </Label>
            <Input
              id="deliveryAddress"
              placeholder="Enter your delivery address"
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
              disabled={!isListingAvailable}
            />
            {deliveryRadiusMiles && (
              <p className="text-xs text-muted-foreground mt-1">
                Delivery available within {deliveryRadiusMiles} miles
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="deliveryInstructions" className="text-sm font-medium mb-2 block">
              Delivery Instructions (optional)
            </Label>
            <Textarea
              id="deliveryInstructions"
              placeholder="Gate code, parking notes, etc."
              value={deliveryInstructionsInput}
              onChange={(e) => setDeliveryInstructionsInput(e.target.value)}
              rows={2}
              className="resize-none"
              disabled={!isListingAvailable}
            />
          </div>
          {deliveryFee && (
            <div className="flex items-center gap-2 p-3 bg-primary/5 rounded-lg">
              <Truck className="h-4 w-4 text-primary" />
              <span className="text-sm text-foreground">
                Delivery fee: <strong>${deliveryFee}</strong>
              </span>
            </div>
          )}
        </div>
      )}

      {/* Static Location Info - Read Only */}
      {isStaticLocation && (
        <div className="mb-6">
          <Alert className="bg-muted/50 border-primary/20">
            <Building className="h-4 w-4" />
            <AlertDescription>
              This is a fixed on-site location. Access is provided at the address below.
            </AlertDescription>
          </Alert>
          
          <div className="mt-4 p-4 bg-muted/50 rounded-xl space-y-3">
            {address && (
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span className="font-medium text-sm text-foreground">Address</span>
                </div>
                <p className="text-sm text-muted-foreground">{address}</p>
              </div>
            )}
            {hoursOfAccess && (
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="h-4 w-4 text-primary" />
                  <span className="font-medium text-sm text-foreground">Hours of Access</span>
                </div>
                <p className="text-sm text-muted-foreground">{hoursOfAccess}</p>
              </div>
            )}
            {accessInstructions && (
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Info className="h-4 w-4 text-primary" />
                  <span className="font-medium text-sm text-foreground">Access Instructions</span>
                </div>
                <p className="text-sm text-muted-foreground">{accessInstructions}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Booking Notes */}
      <div className="mb-6">
        <Textarea
          placeholder="Add a message for the host (optional)"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          className="resize-none"
          disabled={!isListingAvailable}
        />
      </div>

      {/* Price Breakdown */}
      {rentalDays > 0 && (
        <div className="border-t border-border pt-4 mb-6 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              ${priceDaily} × {rentalDays} day{rentalDays > 1 ? 's' : ''}
            </span>
            <span className="text-foreground">
              ${priceWeekly && Math.floor(rentalDays / 7) > 0
                ? (Math.floor(rentalDays / 7) * priceWeekly) + ((rentalDays % 7) * priceDaily!)
                : rentalDays * priceDaily!}
            </span>
          </div>
          {fulfillmentSelected === 'delivery' && deliveryFee && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Delivery fee</span>
              <span className="text-foreground">${deliveryFee}</span>
            </div>
          )}
          <div className="flex justify-between font-semibold pt-2 border-t border-border">
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
        disabled={isSubmitting || rentalDays <= 0 || !isListingAvailable}
      >
        {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        {!user ? 'Sign in to Book' : isListingAvailable ? 'Request Booking' : 'Unavailable'}
      </Button>

      <p className="text-xs text-muted-foreground text-center mt-4">
        You won't be charged yet
      </p>
    </div>
  );
};

export default BookingForm;
