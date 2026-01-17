import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Calendar, Loader2, MapPin, Truck, Building, Info, CreditCard, CheckCircle2, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { format, differenceInDays, eachDayOfInterval } from 'date-fns';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useBlockedDates } from '@/hooks/useBlockedDates';
import { RequiredDocumentsBanner } from '@/components/documents/RequiredDocumentsBanner';
import { Listing, CATEGORY_LABELS } from '@/types/listing';
import { calculateRentalFees, RENTAL_RENTER_FEE_PERCENT } from '@/lib/commissions';
import type { TablesInsert } from '@/integrations/supabase/types';
import { CategoryTooltip } from '@/components/categories/CategoryGuide';

interface QuickBookingModalProps {
  listing: Listing | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialStartDate?: Date;
  initialEndDate?: Date;
}

type FulfillmentSelection = 'pickup' | 'delivery' | 'on_site';

const QuickBookingModal = ({
  listing,
  open,
  onOpenChange,
  initialStartDate,
  initialEndDate,
}: QuickBookingModalProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isDateUnavailable } = useBlockedDates({ listingId: listing?.id || '' });

  // Determine if this is a mobile asset or static location
  const isMobileAsset = listing?.category === 'food_truck' || listing?.category === 'food_trailer';
  const isStaticLocation = listing?.category === 'ghost_kitchen' || listing?.category === 'vendor_lot';

  // Determine available fulfillment options
  const getAvailableFulfillmentOptions = (): FulfillmentSelection[] => {
    if (isStaticLocation) return ['on_site'];
    if (listing?.fulfillment_type === 'both') return ['pickup', 'delivery'];
    if (listing?.fulfillment_type === 'pickup') return ['pickup'];
    if (listing?.fulfillment_type === 'delivery') return ['delivery'];
    return ['pickup'];
  };

  const fulfillmentOptions = getAvailableFulfillmentOptions();
  const defaultFulfillment = isStaticLocation ? 'on_site' : fulfillmentOptions[0];

  const [startDate, setStartDate] = useState<Date | undefined>(initialStartDate);
  const [endDate, setEndDate] = useState<Date | undefined>(initialEndDate);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Fulfillment state
  const [fulfillmentSelected, setFulfillmentSelected] = useState<FulfillmentSelection>(defaultFulfillment);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryInstructionsInput, setDeliveryInstructionsInput] = useState('');

  // Reset form when modal opens with new listing
  useEffect(() => {
    if (open && listing) {
      setStartDate(initialStartDate);
      setEndDate(initialEndDate);
      setMessage('');
      setShowConfirmation(false);
      setAgreedToTerms(false);
      setFulfillmentSelected(defaultFulfillment);
      setDeliveryAddress('');
      setDeliveryInstructionsInput('');
    }
  }, [open, listing?.id, initialStartDate, initialEndDate, defaultFulfillment]);

  if (!listing) return null;

  const minDate = listing.available_from ? new Date(listing.available_from) : new Date();
  const maxDate = listing.available_to ? new Date(listing.available_to) : undefined;

  const rentalDays = startDate && endDate ? differenceInDays(endDate, startDate) : 0;

  const calculateBasePrice = () => {
    if (!listing.price_daily || rentalDays <= 0) return 0;

    const weeks = Math.floor(rentalDays / 7);
    const remainingDays = rentalDays % 7;

    let basePrice = 0;
    if (listing.price_weekly && weeks > 0) {
      basePrice = weeks * listing.price_weekly + remainingDays * listing.price_daily;
    } else {
      basePrice = rentalDays * listing.price_daily;
    }

    return basePrice;
  };

  const basePrice = calculateBasePrice();
  const currentDeliveryFee = fulfillmentSelected === 'delivery' && listing.delivery_fee ? listing.delivery_fee : 0;
  const fees = calculateRentalFees(basePrice, currentDeliveryFee);
  
  const isListingAvailable = listing.status === 'published';

  const hasUnavailableDatesInRange = (): boolean => {
    if (!startDate || !endDate) return false;
    const datesInRange = eachDayOfInterval({ start: startDate, end: endDate });
    return datesInRange.some((date) => isDateUnavailable(date));
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
    if (!agreedToTerms) {
      return 'Please agree to the Terms of Service to continue';
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
      const isInstantBook = listing.instant_book === true;
      
      const bookingData: TablesInsert<'booking_requests'> = {
        listing_id: listing.id,
        host_id: listing.host_id,
        shopper_id: user.id,
        start_date: format(startDate!, 'yyyy-MM-dd'),
        end_date: format(endDate!, 'yyyy-MM-dd'),
        message: message.trim() || null,
        total_price: fees.customerTotal,
        fulfillment_selected: fulfillmentSelected,
        is_instant_book: isInstantBook,
      };

      if (fulfillmentSelected === 'delivery') {
        bookingData.delivery_address = deliveryAddress.trim();
        bookingData.delivery_instructions = deliveryInstructionsInput.trim() || null;
        bookingData.delivery_fee_snapshot = listing.delivery_fee || null;
      } else if (fulfillmentSelected === 'on_site') {
        bookingData.address_snapshot = listing.address || null;
        bookingData.access_instructions_snapshot = listing.access_instructions || null;
      }

      const { data: bookingResult, error } = await supabase
        .from('booking_requests')
        .insert(bookingData)
        .select('id')
        .single();

      if (error) throw error;

      // For Instant Book listings, redirect to checkout immediately
      if (isInstantBook) {
        const { data: checkoutData, error: checkoutError } = await supabase.functions.invoke('create-checkout', {
          body: {
            booking_id: bookingResult.id,
            listing_id: listing.id,
            mode: 'rent',
            amount: fees.subtotal,
            delivery_fee: currentDeliveryFee,
          },
        });

        if (checkoutError) throw checkoutError;

        if (checkoutData?.url) {
          window.location.href = checkoutData.url;
          return;
        }
      }

      // For regular bookings, send notification and show confirmation
      supabase.functions
        .invoke('send-booking-notification', {
          body: { booking_id: bookingResult.id, event_type: 'submitted' },
        })
        .catch(console.error);

      setShowConfirmation(true);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {showConfirmation ? (
              'Request Sent!'
            ) : (
              <>
                <img
                  src={listing.cover_image_url || listing.image_urls?.[0] || '/placeholder.svg'}
                  alt={listing.title}
                  className="w-12 h-12 rounded-lg object-cover"
                />
                <div>
                  <span className="block">{listing.title}</span>
                  <CategoryTooltip category={listing.category} side="bottom">
                    <span className="text-sm font-normal text-muted-foreground cursor-help">
                      {CATEGORY_LABELS[listing.category]}
                    </span>
                  </CategoryTooltip>
                </div>
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        {showConfirmation ? (
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="h-8 w-8 text-primary" />
            </div>
            <p className="text-muted-foreground mb-6">
              Your booking request has been sent. The host will review and respond shortly.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
                Continue Browsing
              </Button>
              <Button onClick={() => navigate('/dashboard')} className="flex-1">
                View My Bookings
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Price + Instant Book Badge */}
            <div className="flex items-center justify-between">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-foreground">${listing.price_daily}</span>
                <span className="text-muted-foreground">/ day</span>
                {listing.price_weekly && (
                  <span className="text-sm text-muted-foreground ml-2">
                    · ${listing.price_weekly} / week
                  </span>
                )}
              </div>
              {listing.instant_book && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 text-amber-700 rounded-full text-xs font-medium">
                  <Zap className="h-3 w-3" />
                  Instant Book
                </div>
              )}
            </div>

            {!isListingAvailable && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>This listing is currently unavailable for booking.</AlertDescription>
              </Alert>
            )}

            {/* Date Selection */}
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
                <PopoverContent className="w-auto p-0 z-[60]" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    disabled={(date) =>
                      date < minDate ||
                      (maxDate ? date > maxDate : false) ||
                      (endDate ? date >= endDate : false) ||
                      isDateUnavailable(date)
                    }
                    className={cn('p-3 pointer-events-auto')}
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
                <PopoverContent className="w-auto p-0 z-[60]" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    disabled={(date) =>
                      date < minDate ||
                      (maxDate ? date > maxDate : false) ||
                      (startDate ? date <= startDate : false) ||
                      isDateUnavailable(date)
                    }
                    className={cn('p-3 pointer-events-auto')}
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

            {/* Fulfillment Selection - Mobile Assets */}
            {isMobileAsset && fulfillmentOptions.length > 1 && (
              <div>
                <Label className="text-sm font-medium mb-3 block">
                  How would you like to receive this?
                </Label>
                <RadioGroup
                  value={fulfillmentSelected}
                  onValueChange={(val) => setFulfillmentSelected(val as FulfillmentSelection)}
                  className="space-y-2"
                >
                  {fulfillmentOptions.includes('pickup') && (
                    <div className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:border-primary/50 transition-colors cursor-pointer">
                      <RadioGroupItem value="pickup" id="modal-pickup" />
                      <Label htmlFor="modal-pickup" className="flex items-center gap-2 cursor-pointer flex-1">
                        <MapPin className="h-4 w-4 text-primary" />
                        <span>Pickup</span>
                      </Label>
                    </div>
                  )}
                  {fulfillmentOptions.includes('delivery') && (
                    <div className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:border-primary/50 transition-colors cursor-pointer">
                      <RadioGroupItem value="delivery" id="modal-delivery" />
                      <Label htmlFor="modal-delivery" className="flex items-center gap-2 cursor-pointer flex-1">
                        <Truck className="h-4 w-4 text-primary" />
                        <span>Delivery</span>
                        {listing.delivery_fee && (
                          <span className="text-xs text-muted-foreground ml-auto">
                            +${listing.delivery_fee} fee
                          </span>
                        )}
                      </Label>
                    </div>
                  )}
                </RadioGroup>
              </div>
            )}

            {/* Delivery Details Input */}
            {isMobileAsset && fulfillmentSelected === 'delivery' && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="modal-deliveryAddress" className="text-sm font-medium mb-2 block">
                    Delivery Address *
                  </Label>
                  <Input
                    id="modal-deliveryAddress"
                    placeholder="Enter your delivery address"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    disabled={!isListingAvailable}
                  />
                </div>
                <div>
                  <Label htmlFor="modal-deliveryInstructions" className="text-sm font-medium mb-2 block">
                    Delivery Instructions (optional)
                  </Label>
                  <Textarea
                    id="modal-deliveryInstructions"
                    placeholder="Gate code, parking notes, etc."
                    value={deliveryInstructionsInput}
                    onChange={(e) => setDeliveryInstructionsInput(e.target.value)}
                    rows={2}
                    className="resize-none"
                    disabled={!isListingAvailable}
                  />
                </div>
              </div>
            )}

            {/* Static Location Info */}
            {isStaticLocation && listing.address && (
              <div className="p-4 bg-muted/50 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Building className="h-4 w-4 text-primary" />
                  <span className="font-medium text-sm">On-site Location</span>
                </div>
                <p className="text-sm text-muted-foreground">{listing.address}</p>
              </div>
            )}

            {/* Required Documents Banner */}
            {listing.mode === 'rent' && (
              <RequiredDocumentsBanner listingId={listing.id} variant="compact" />
            )}

            {/* Message */}
            <div>
              <Label htmlFor="modal-message" className="text-sm font-medium mb-2 block">
                Message to Host (optional)
              </Label>
              <Textarea
                id="modal-message"
                placeholder="Introduce yourself and share your plans..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                className="resize-none"
                disabled={!isListingAvailable}
              />
            </div>

            {/* Terms Checkbox */}
            <div className="flex items-start space-x-3">
              <Checkbox
                id="modal-terms"
                checked={agreedToTerms}
                onCheckedChange={(checked) => setAgreedToTerms(checked === true)}
                disabled={!isListingAvailable}
              />
              <Label
                htmlFor="modal-terms"
                className="text-sm text-muted-foreground leading-relaxed cursor-pointer"
              >
                I agree to the{' '}
                <Link
                  to="/terms"
                  target="_blank"
                  className="text-primary hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  Terms of Service
                </Link>
              </Label>
            </div>

            {/* Price Breakdown */}
            {rentalDays > 0 && (
              <div className="border-t border-border pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    ${listing.price_daily} × {rentalDays} day{rentalDays > 1 ? 's' : ''}
                  </span>
                  <span>${basePrice.toFixed(2)}</span>
                </div>
                {fulfillmentSelected === 'delivery' && listing.delivery_fee && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Delivery fee</span>
                    <span>${listing.delivery_fee.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>${fees.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Platform fee ({RENTAL_RENTER_FEE_PERCENT}%)
                  </span>
                  <span>${fees.renterFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-semibold text-lg pt-2 border-t border-border">
                  <span>Total</span>
                  <span>${fees.customerTotal.toFixed(2)}</span>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <Button
              className="w-full"
              size="lg"
              onClick={handleSubmit}
              disabled={isSubmitting || rentalDays <= 0 || !isListingAvailable || !agreedToTerms}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {listing.instant_book ? 'Processing...' : 'Submitting...'}
                </>
              ) : user ? (
                listing.instant_book ? (
                  <>
                    <Zap className="mr-2 h-4 w-4" />
                    Book Now · ${fees.customerTotal.toFixed(2)}
                  </>
                ) : (
                  `Request to Book · $${fees.customerTotal.toFixed(2)}`
                )
              ) : (
                'Sign in to Book'
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              {listing.instant_book 
                ? "You'll be charged immediately. Booking confirms once documents are approved."
                : "You won't be charged until the host confirms your booking"
              }
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default QuickBookingModal;
