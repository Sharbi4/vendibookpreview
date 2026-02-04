import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, differenceInDays, addDays, isBefore, startOfDay, parseISO } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, 
  Zap, 
  ArrowRight, 
  Shield, 
  Clock, 
  Sparkles, 
  Mail,
  Tag,
  Truck,
  MapPin,
  Package,
  ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { calculateRentalFees, formatCurrency } from '@/lib/commissions';
import { useBlockedDates } from '@/hooks/useBlockedDates';
import { useHourlyAvailability } from '@/hooks/useHourlyAvailability';
import { useAuth } from '@/contexts/AuthContext';
import { trackCTAClick } from '@/lib/analytics';
import { cn } from '@/lib/utils';
import { AffirmBadge, isAffirmEligible } from '@/components/ui/AffirmBadge';
import { AfterpayBadge, isAfterpayEligible } from '@/components/ui/AfterpayBadge';
import { LeadCaptureModal } from './LeadCaptureModal';
import { MakeOfferModal, AuthGateOfferModal } from '@/components/offers';
import type { FulfillmentType } from '@/types/listing';

interface BookingWidgetProps {
  listingId: string;
  listingTitle: string;
  hostId: string;
  isOwner: boolean;
  isRental: boolean;
  // Rental props
  priceDaily?: number | null;
  priceWeekly?: number | null;
  priceHourly?: number | null;
  availableFrom?: string | null;
  availableTo?: string | null;
  instantBook?: boolean;
  hourlyEnabled?: boolean;
  // Sale props
  priceSale?: number | null;
  fulfillmentType?: FulfillmentType;
  deliveryFee?: number | null;
  vendibookFreightEnabled?: boolean;
  freightPayer?: 'buyer' | 'seller';
}

export const BookingWidget = ({
  listingId,
  listingTitle,
  hostId,
  isOwner,
  isRental,
  priceDaily,
  priceWeekly,
  priceHourly,
  availableFrom,
  availableTo,
  instantBook = false,
  hourlyEnabled = false,
  priceSale,
  fulfillmentType = 'pickup',
  deliveryFee,
  vendibookFreightEnabled = false,
  freightPayer = 'buyer',
}: BookingWidgetProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isDateUnavailable, isLoading: datesLoading } = useBlockedDates({ listingId });
  
  // Booking state
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [startCalendarOpen, setStartCalendarOpen] = useState(false);
  const [endCalendarOpen, setEndCalendarOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  
  // Sale modals
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showLeadModal, setShowLeadModal] = useState(false);

  // Calculate rental days and price
  const rentalDays = useMemo(() => {
    if (!startDate || !endDate) return 0;
    return differenceInDays(endDate, startDate);
  }, [startDate, endDate]);

  const priceBreakdown = useMemo(() => {
    if (!priceDaily || rentalDays <= 0) return null;
    
    const weeks = Math.floor(rentalDays / 7);
    const remainingDays = rentalDays % 7;
    
    let basePrice: number;
    if (priceWeekly && weeks > 0) {
      basePrice = (weeks * priceWeekly) + (remainingDays * priceDaily);
    } else {
      basePrice = rentalDays * priceDaily;
    }
    
    const fees = calculateRentalFees(basePrice);
    
    return {
      days: rentalDays,
      basePrice,
      renterFee: fees.renterFee,
      customerTotal: fees.customerTotal,
    };
  }, [rentalDays, priceDaily, priceWeekly]);

  // Date validation
  const isDateDisabled = (date: Date): boolean => {
    // Disable past dates
    if (isBefore(date, startOfDay(new Date()))) return true;
    
    // Check availability window
    if (availableFrom) {
      const from = parseISO(availableFrom);
      if (isBefore(date, startOfDay(from))) return true;
    }
    if (availableTo) {
      const to = parseISO(availableTo);
      if (isBefore(startOfDay(to), date)) return true;
    }
    
    // Check blocked dates
    return isDateUnavailable(date);
  };

  const handleStartDateSelect = (date: Date | undefined) => {
    setStartDate(date);
    setStartCalendarOpen(false);
    // Auto-set end date if not set or before start
    if (date && (!endDate || isBefore(endDate, date))) {
      setEndDate(addDays(date, 1));
    }
  };

  const handleEndDateSelect = (date: Date | undefined) => {
    setEndDate(date);
    setEndCalendarOpen(false);
  };

  const handleContinueToBooking = () => {
    trackCTAClick('continue_booking', 'booking_widget');
    if (!startDate || !endDate) return;
    
    const startStr = format(startDate, 'yyyy-MM-dd');
    const endStr = format(endDate, 'yyyy-MM-dd');
    navigate(`/book/${listingId}?start=${startStr}&end=${endStr}`);
  };

  const handleBuyNow = () => {
    trackCTAClick('buy_now', 'booking_widget');
    if (!user) {
      navigate(`/auth?redirect=/checkout/${listingId}`);
      return;
    }
    navigate(`/checkout/${listingId}`);
  };

  const handleMakeOffer = () => {
    trackCTAClick('make_offer', 'booking_widget');
    if (!user) {
      setShowAuthModal(true);
    } else {
      setShowOfferModal(true);
    }
  };

  const handleAuthSuccess = () => {
    setShowAuthModal(false);
    setShowOfferModal(true);
  };

  // Owner view
  if (isOwner) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 p-6"
      >
        <div className="text-center space-y-3">
          <h3 className="font-semibold text-foreground">This is your listing</h3>
          <p className="text-sm text-muted-foreground">
            Manage availability, pricing, and settings
          </p>
          <Button variant="outline" className="w-full" asChild>
            <a href={`/edit-listing/${listingId}`}>Manage Listing</a>
          </Button>
        </div>
      </motion.div>
    );
  }

  // Rental widget
  if (isRental) {
    return (
      <>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 100, damping: 20 }}
          onHoverStart={() => setIsHovered(true)}
          onHoverEnd={() => setIsHovered(false)}
          className="rounded-2xl border border-border shadow-xl bg-card overflow-hidden relative"
        >
          {/* Glow effect */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 opacity-0 pointer-events-none"
            animate={{ opacity: isHovered ? 1 : 0 }}
            transition={{ duration: 0.3 }}
          />

          {/* Header */}
          <div className="p-5 bg-gradient-to-br from-muted/50 to-muted/30 border-b border-border relative">
            <div className="flex items-baseline gap-2">
              <motion.span 
                className="text-3xl font-bold text-foreground"
                initial={{ scale: 1 }}
                whileHover={{ scale: 1.02 }}
              >
                ${priceDaily?.toLocaleString() || '—'}
              </motion.span>
              <span className="text-muted-foreground text-lg">/day</span>
            </div>
            
            {priceWeekly && (
              <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                ${priceWeekly.toLocaleString()}/week for 7+ days
              </p>
            )}

            {instantBook && (
              <motion.div 
                className="absolute top-4 right-4"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, delay: 0.3 }}
              >
                <Badge className="bg-emerald-500 text-white border-0 shadow-md">
                  <Zap className="h-3 w-3 mr-1" />
                  Instant
                </Badge>
              </motion.div>
            )}
          </div>

          {/* Date Selection */}
          <div className="p-5 space-y-4 relative z-10">
            {/* Date Inputs */}
            <div className="grid grid-cols-2 gap-3">
              {/* Start Date */}
              <Popover open={startCalendarOpen} onOpenChange={setStartCalendarOpen}>
                <PopoverTrigger asChild>
                  <button className="flex flex-col items-start p-3 rounded-xl border border-border bg-muted/30 hover:bg-muted/50 transition-colors text-left">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Check-in</span>
                    <span className={cn(
                      "text-sm font-medium",
                      startDate ? "text-foreground" : "text-muted-foreground"
                    )}>
                      {startDate ? format(startDate, 'MMM d, yyyy') : 'Add date'}
                    </span>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={startDate}
                    onSelect={handleStartDateSelect}
                    disabled={isDateDisabled}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>

              {/* End Date */}
              <Popover open={endCalendarOpen} onOpenChange={setEndCalendarOpen}>
                <PopoverTrigger asChild>
                  <button className="flex flex-col items-start p-3 rounded-xl border border-border bg-muted/30 hover:bg-muted/50 transition-colors text-left">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Check-out</span>
                    <span className={cn(
                      "text-sm font-medium",
                      endDate ? "text-foreground" : "text-muted-foreground"
                    )}>
                      {endDate ? format(endDate, 'MMM d, yyyy') : 'Add date'}
                    </span>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <CalendarComponent
                    mode="single"
                    selected={endDate}
                    onSelect={handleEndDateSelect}
                    disabled={(date) => isDateDisabled(date) || (startDate ? isBefore(date, startDate) : false)}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Price Breakdown (shown when dates selected) */}
            <AnimatePresence mode="wait">
              {priceBreakdown && (
                <motion.div 
                  key="breakdown"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="p-4 bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl border border-primary/20 space-y-2"
                >
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>${priceDaily?.toLocaleString()} × {priceBreakdown.days} day{priceBreakdown.days > 1 ? 's' : ''}</span>
                    <span>${priceBreakdown.basePrice.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>Service fee</span>
                    <span>${priceBreakdown.renterFee.toLocaleString()}</span>
                  </div>
                  <Separator className="bg-primary/20" />
                  <div className="flex items-center justify-between pt-1">
                    <span className="font-semibold text-foreground">Est. total</span>
                    <motion.span 
                      className="text-xl font-bold text-foreground"
                      initial={{ scale: 1 }}
                      whileHover={{ scale: 1.05 }}
                    >
                      ${priceBreakdown.customerTotal.toLocaleString()}
                    </motion.span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* CTA Button */}
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                variant="dark-shine"
                className="w-full h-14 text-base font-semibold shadow-lg"
                size="lg"
                onClick={handleContinueToBooking}
                disabled={!startDate || !endDate}
              >
                {instantBook ? (
                  <>
                    <Zap className="h-5 w-5 mr-2" />
                    Book Now
                  </>
                ) : (
                  'Request to Book'
                )}
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </motion.div>

            {!instantBook && (
              <p className="text-xs text-center text-muted-foreground flex items-center justify-center gap-1.5">
                <Shield className="h-3.5 w-3.5" />
                You won't be charged until your request is approved
              </p>
            )}

            {/* Trust indicators */}
            <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground pt-2">
              <span className="flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5" />
                Secure booking
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                Free cancellation
              </span>
            </div>

            {/* Request Info for anonymous visitors */}
            {!user && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Button 
                  onClick={() => {
                    trackCTAClick('request_info', 'booking_widget');
                    setShowLeadModal(true);
                  }}
                  variant="outline"
                  className="w-full text-sm border-dashed h-11" 
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Request Info
                </Button>
              </motion.div>
            )}
          </div>
        </motion.div>

        <LeadCaptureModal
          open={showLeadModal}
          onOpenChange={setShowLeadModal}
          listingId={listingId}
          hostId={hostId}
          listingTitle={listingTitle}
        />
      </>
    );
  }

  // Sale widget
  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 100, damping: 20 }}
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
        className="rounded-2xl border-0 shadow-xl bg-card overflow-hidden relative"
      >
        {/* Glow effect */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 opacity-0 pointer-events-none"
          animate={{ opacity: isHovered ? 1 : 0 }}
          transition={{ duration: 0.3 }}
        />

        {/* Header */}
        <div className="bg-gradient-to-br from-muted/50 to-muted/30 border-b border-border px-6 py-5 relative">
          <div className="flex items-baseline gap-3 flex-wrap">
            <motion.span 
              className="text-3xl font-bold text-foreground"
              whileHover={{ scale: 1.02 }}
            >
              ${priceSale?.toLocaleString()}
            </motion.span>
            {priceSale && isAfterpayEligible(priceSale) && (
              <AfterpayBadge price={priceSale} className="text-xs" showEstimate={false} />
            )}
          </div>
          
          {vendibookFreightEnabled && (
            <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
              <Package className="h-3.5 w-3.5" />
              <span>Nationwide shipping available</span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 relative z-10">
          {/* Fulfillment Options */}
          <div className="space-y-2">
            {(fulfillmentType === 'pickup' || fulfillmentType === 'both') && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border">
                <div className="w-8 h-8 rounded-lg bg-background flex items-center justify-center">
                  <MapPin className="h-4 w-4 text-foreground" />
                </div>
                <div className="flex-1">
                  <span className="text-sm font-medium text-foreground">Local Pickup</span>
                  <span className="text-xs text-emerald-600 ml-2">Free</span>
                </div>
              </div>
            )}
            
            {(fulfillmentType === 'delivery' || fulfillmentType === 'both') && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border">
                <div className="w-8 h-8 rounded-lg bg-background flex items-center justify-center">
                  <Truck className="h-4 w-4 text-foreground" />
                </div>
                <div className="flex-1">
                  <span className="text-sm font-medium text-foreground">Local Delivery</span>
                  {deliveryFee ? (
                    <span className="text-xs text-muted-foreground ml-2">+${deliveryFee}</span>
                  ) : (
                    <span className="text-xs text-emerald-600 ml-2">Free</span>
                  )}
                </div>
              </div>
            )}
            
            {vendibookFreightEnabled && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border">
                <div className="w-8 h-8 rounded-lg bg-background flex items-center justify-center">
                  <Package className="h-4 w-4 text-foreground" />
                </div>
                <div className="flex-1">
                  <span className="text-sm font-medium text-foreground">Nationwide Freight</span>
                  {freightPayer === 'seller' ? (
                    <span className="text-xs text-emerald-600 ml-2">Free</span>
                  ) : (
                    <span className="text-xs text-muted-foreground ml-2">Quote at checkout</span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <div className="flex gap-2">
              <motion.div className="flex-1" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button 
                  onClick={handleBuyNow}
                  variant="dark-shine"
                  className="w-full h-14 text-base font-semibold shadow-lg" 
                  size="lg"
                  disabled={!priceSale}
                >
                  Buy Now
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </motion.div>
              
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button 
                  onClick={handleMakeOffer}
                  variant="outline"
                  className="h-14 px-4 border-primary text-primary hover:bg-primary/10" 
                  size="lg"
                  disabled={!priceSale}
                >
                  <Tag className="w-5 h-5" />
                </Button>
              </motion.div>
            </div>

            <motion.div whileHover={{ scale: 1.01 }}>
              <Button 
                onClick={handleMakeOffer}
                variant="ghost"
                className="w-full text-sm text-muted-foreground hover:text-primary h-11" 
                disabled={!priceSale}
              >
                <Tag className="w-4 h-4 mr-2" />
                Make an Offer
              </Button>
            </motion.div>

            {/* Request Info for anonymous visitors */}
            {!user && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Button 
                  onClick={() => {
                    trackCTAClick('request_info', 'booking_widget');
                    setShowLeadModal(true);
                  }}
                  variant="outline"
                  className="w-full text-sm border-dashed h-11" 
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Request Info
                </Button>
              </motion.div>
            )}
          </div>

          {/* Trust indicators */}
          <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground pt-2">
            <span className="flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5" />
              Secure payment
            </span>
            <span className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              Buyer protection
            </span>
          </div>

          {/* Financing options */}
          {priceSale && (isAffirmEligible(priceSale) || isAfterpayEligible(priceSale)) && (
            <div className="flex flex-col gap-2 pt-2">
              {isAffirmEligible(priceSale) && (
                <AffirmBadge price={priceSale} className="w-full justify-center py-2.5 bg-muted/30 rounded-lg" showEstimate={false} />
              )}
            </div>
          )}
        </div>
      </motion.div>

      {/* Modals */}
      <AuthGateOfferModal
        open={showAuthModal}
        onOpenChange={setShowAuthModal}
        onAuthSuccess={handleAuthSuccess}
      />

      {priceSale && (
        <MakeOfferModal
          open={showOfferModal}
          onOpenChange={setShowOfferModal}
          listingId={listingId}
          sellerId={hostId}
          listingTitle={listingTitle}
          askingPrice={priceSale}
        />
      )}

      <LeadCaptureModal
        open={showLeadModal}
        onOpenChange={setShowLeadModal}
        listingId={listingId}
        hostId={hostId}
        listingTitle={listingTitle}
      />
    </>
  );
};

export default BookingWidget;
