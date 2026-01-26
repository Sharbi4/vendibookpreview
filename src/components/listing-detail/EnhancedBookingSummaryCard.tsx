import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, differenceInDays } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Zap, ArrowRight, Mail, Shield, Clock, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import RequestDatesModal, { BookingSelection } from './RequestDatesModal';
import { cn } from '@/lib/utils';
import { calculateRentalFees } from '@/lib/commissions';
import { AffirmBadge, isAffirmEligible } from '@/components/ui/AffirmBadge';
import { AfterpayBadge, isAfterpayEligible } from '@/components/ui/AfterpayBadge';
import { useAuth } from '@/contexts/AuthContext';
import { trackCTAClick } from '@/lib/analytics';
import { LeadCaptureModal } from './LeadCaptureModal';

interface EnhancedBookingSummaryCardProps {
  listingId: string;
  listingTitle: string;
  hostId: string;
  priceDaily: number | null;
  priceWeekly?: number | null;
  availableFrom?: string | null;
  availableTo?: string | null;
  instantBook?: boolean;
  coverImage?: string;
}

export const EnhancedBookingSummaryCard: React.FC<EnhancedBookingSummaryCardProps> = ({
  listingId,
  listingTitle,
  hostId,
  priceDaily,
  priceWeekly,
  availableFrom,
  availableTo,
  instantBook = false,
  coverImage,
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showDateModal, setShowDateModal] = useState(false);
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [isHovered, setIsHovered] = useState(false);

  const rentalDays = startDate && endDate ? differenceInDays(endDate, startDate) : 0;

  const calculateBasePrice = () => {
    if (!priceDaily || rentalDays <= 0) return 0;
    const weeks = Math.floor(rentalDays / 7);
    const remainingDays = rentalDays % 7;
    if (priceWeekly && weeks > 0) {
      return (weeks * priceWeekly) + (remainingDays * priceDaily);
    }
    return rentalDays * priceDaily;
  };

  const basePrice = calculateBasePrice();
  const fees = calculateRentalFees(basePrice);
  const totalWithFees = fees.customerTotal;

  const handleDatesSelected = (selection: BookingSelection) => {
    setStartDate(selection.startDate);
    setEndDate(selection.endDate);
  };

  const handleContinue = () => {
    if (startDate && endDate) {
      const startStr = format(startDate, 'yyyy-MM-dd');
      const endStr = format(endDate, 'yyyy-MM-dd');
      navigate(`/book/${listingId}?start=${startStr}&end=${endStr}`);
    }
  };

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
        {/* Animated glow effect on hover */}
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
            <motion.p 
              className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5"
              initial={{ opacity: 0.7 }}
              whileHover={{ opacity: 1 }}
            >
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              ${priceWeekly.toLocaleString()}/week for 7+ days
            </motion.p>
          )}
          
          {/* Financing badges */}
          {priceDaily && (isAfterpayEligible(priceDaily * 7) || isAffirmEligible(priceDaily * 30)) && (
            <motion.div 
              className="flex items-center gap-2 mt-3 flex-wrap"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <AfterpayBadge price={priceDaily * 7} showEstimate={false} />
              <AffirmBadge price={priceDaily * 30} showEstimate={false} />
            </motion.div>
          )}

          {/* Instant Book Badge */}
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

        <div className="p-5 space-y-4 relative z-10">
          <AnimatePresence mode="wait">
            {startDate && endDate ? (
              <motion.div 
                key="selected"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4"
              >
                {/* Selected dates */}
                <motion.div 
                  className="p-4 bg-muted/50 rounded-xl border border-border"
                  whileHover={{ scale: 1.01 }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-foreground flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-primary" />
                      Your dates
                    </span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-7 text-xs hover:bg-primary/10"
                      onClick={() => setShowDateModal(true)}
                    >
                      Change
                    </Button>
                  </div>
                  <p className="text-sm font-medium text-foreground">
                    {format(startDate, 'MMM d')} – {format(endDate, 'MMM d, yyyy')}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {rentalDays} day{rentalDays > 1 ? 's' : ''}
                  </p>
                </motion.div>

                {/* Price summary with animations */}
                <motion.div 
                  className="p-4 bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl border border-primary/20 space-y-3"
                  initial={{ scale: 0.95 }}
                  animate={{ scale: 1 }}
                >
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>{rentalDays} day{rentalDays > 1 ? 's' : ''} × ${priceDaily?.toLocaleString()}</span>
                    <span>${basePrice.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>Platform fee</span>
                    <span>${fees.renterFee.toLocaleString()}</span>
                  </div>
                  <motion.div 
                    className="flex items-center justify-between pt-3 border-t border-primary/20"
                    whileHover={{ scale: 1.01 }}
                  >
                    <span className="font-semibold text-foreground">Est. total</span>
                    <motion.span 
                      className="text-2xl font-bold text-foreground"
                      initial={{ scale: 1 }}
                      whileHover={{ scale: 1.05 }}
                    >
                      ${totalWithFees.toLocaleString()}
                    </motion.span>
                  </motion.div>
                </motion.div>

                {/* Continue button */}
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    variant="dark-shine"
                    className="w-full h-14 text-base font-semibold shadow-lg"
                    size="lg"
                    onClick={handleContinue}
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
              </motion.div>
            ) : (
              <motion.div 
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                {/* Select dates button */}
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    variant="dark-shine"
                    className="w-full h-14 text-base font-semibold shadow-lg"
                    size="lg"
                    onClick={() => setShowDateModal(true)}
                  >
                    <Calendar className="h-5 w-5 mr-2" />
                    Check availability
                  </Button>
                </motion.div>

                {instantBook && (
                  <motion.div 
                    className="flex items-center justify-center gap-2"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 py-1.5 px-3">
                      <Zap className="h-3.5 w-3.5 mr-1.5" />
                      Instant Book Available
                    </Badge>
                  </motion.div>
                )}

                {/* Trust indicators */}
                <motion.div 
                  className="flex items-center justify-center gap-4 text-xs text-muted-foreground pt-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <span className="flex items-center gap-1.5">
                    <Shield className="h-3.5 w-3.5" />
                    Secure booking
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    Free cancellation
                  </span>
                </motion.div>

                {/* Request Info for anonymous visitors */}
                {!user && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    <Button 
                      onClick={() => {
                        trackCTAClick('request_info', 'booking_summary');
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
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      <RequestDatesModal
        open={showDateModal}
        onOpenChange={setShowDateModal}
        listingId={listingId}
        availableFrom={availableFrom}
        availableTo={availableTo}
        instantBook={instantBook}
        onDatesSelected={handleDatesSelected}
        navigateToBooking={false}
      />

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

export default EnhancedBookingSummaryCard;
