import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Truck, Package, ArrowRight, Calendar, Tag, Mail, Shield, Check, Sparkles } from 'lucide-react';
import type { FulfillmentType } from '@/types/listing';
import { AffirmBadge, isAffirmEligible } from '@/components/ui/AffirmBadge';
import { AfterpayBadge, isAfterpayEligible } from '@/components/ui/AfterpayBadge';
import { trackCTAClick } from '@/lib/analytics';
import { useAuth } from '@/contexts/AuthContext';
import { MakeOfferModal, AuthGateOfferModal } from '@/components/offers';
import { LeadCaptureModal } from './LeadCaptureModal';

interface EnhancedInquiryFormProps {
  listingId: string;
  hostId: string;
  listingTitle: string;
  priceSale: number | null;
  fulfillmentType?: FulfillmentType;
  deliveryFee?: number | null;
  deliveryRadiusMiles?: number | null;
  pickupLocation?: string | null;
  vendibookFreightEnabled?: boolean;
  freightPayer?: 'buyer' | 'seller';
  originAddress?: string | null;
  weightLbs?: number | null;
  lengthInches?: number | null;
  widthInches?: number | null;
  heightInches?: number | null;
  freightCategory?: string | null;
  acceptCardPayment?: boolean;
  acceptCashPayment?: boolean;
}

const fulfillmentIcons = {
  pickup: MapPin,
  delivery: Truck,
  freight: Package,
};

const EnhancedInquiryForm = ({ 
  listingId,
  hostId,
  listingTitle,
  priceSale,
  fulfillmentType = 'pickup',
  deliveryFee,
  deliveryRadiusMiles,
  vendibookFreightEnabled = false,
  freightPayer = 'buyer',
}: EnhancedInquiryFormProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [selectedFulfillment, setSelectedFulfillment] = useState<string | null>(null);
  const [isHovered, setIsHovered] = useState(false);

  const getAvailableFulfillmentOptions = () => {
    const options: { id: string; icon: any; title: string; description: string; price?: string; free?: boolean }[] = [];
    
    if (fulfillmentType === 'pickup' || fulfillmentType === 'both') {
      options.push({
        id: 'pickup',
        icon: MapPin,
        title: 'Local Pickup',
        description: 'Pick up at seller location',
        free: true,
      });
    }
    
    if (fulfillmentType === 'delivery' || fulfillmentType === 'both') {
      options.push({
        id: 'delivery',
        icon: Truck,
        title: `Local Delivery${deliveryRadiusMiles ? ` (${deliveryRadiusMiles} mi)` : ''}`,
        description: 'We deliver to you',
        price: deliveryFee ? `+$${deliveryFee}` : undefined,
        free: !deliveryFee,
      });
    }
    
    if (vendibookFreightEnabled) {
      const isFreightSellerPaid = freightPayer === 'seller';
      options.push({
        id: 'freight',
        icon: Package,
        title: 'Nationwide Freight',
        description: 'Est. 7-10 business days',
        price: isFreightSellerPaid ? undefined : 'Quote at checkout',
        free: isFreightSellerPaid,
      });
    }
    
    return options;
  };

  const fulfillmentOptions = getAvailableFulfillmentOptions();

  const handleStartPurchase = () => {
    trackCTAClick('start_purchase', 'inquiry_form');
    if (!user) {
      navigate(`/auth?redirect=/checkout/${listingId}`);
      return;
    }
    navigate(`/checkout/${listingId}`);
  };

  const handleMakeOffer = () => {
    trackCTAClick('make_offer', 'inquiry_form');
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

  return (
    <motion.div 
      data-booking-form 
      className="rounded-2xl border-0 shadow-xl bg-card sticky top-24 overflow-hidden relative"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 100, damping: 20 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
    >
      {/* Animated glow effect */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 opacity-0 pointer-events-none"
        animate={{ opacity: isHovered ? 1 : 0 }}
        transition={{ duration: 0.3 }}
      />

      {/* Header section */}
      <div className="bg-gradient-to-br from-muted/50 to-muted/30 border-b border-border px-6 py-5 relative">
        <motion.h2 
          className="font-semibold text-base text-foreground line-clamp-2 mb-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {listingTitle}
        </motion.h2>
        
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
          <motion.div 
            className="flex items-center gap-1.5 mt-3 text-xs text-muted-foreground"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Calendar className="h-3.5 w-3.5" />
            <span>Nationwide shipping available</span>
          </motion.div>
        )}
      </div>

      {/* Content section */}
      <div className="p-6 space-y-5 relative z-10">
        {/* Fulfillment Options */}
        {fulfillmentOptions.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
              <Truck className="h-4 w-4 text-primary" />
              Delivery Options
            </h3>
            
            <div className="space-y-2">
              {fulfillmentOptions.map((option, idx) => {
                const Icon = option.icon;
                const isSelected = selectedFulfillment === option.id;
                
                return (
                  <motion.button
                    key={option.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    whileHover={{ scale: 1.01, x: 4 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => setSelectedFulfillment(isSelected ? null : option.id)}
                    className={`
                      w-full flex items-center justify-between p-3.5 rounded-xl border transition-all text-left
                      ${isSelected 
                        ? 'bg-primary/5 border-primary/30 ring-1 ring-primary/20' 
                        : 'bg-muted/30 border-border hover:bg-muted/50'
                      }
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <motion.div 
                        className={`
                          w-10 h-10 rounded-lg flex items-center justify-center transition-colors
                          ${isSelected 
                            ? 'bg-primary text-primary-foreground' 
                            : 'bg-background text-foreground'
                          }
                        `}
                        animate={{ rotate: isSelected ? 5 : 0 }}
                      >
                        <Icon className="h-5 w-5" />
                      </motion.div>
                      <div>
                        <span className="text-sm font-medium text-foreground block">
                          {option.title}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {option.description}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {option.free && (
                        <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                          FREE
                        </span>
                      )}
                      {option.price && !option.free && (
                        <span className="text-sm font-medium text-foreground">
                          {option.price}
                        </span>
                      )}
                      <AnimatePresence>
                        {isSelected && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
                            className="w-5 h-5 rounded-full bg-primary flex items-center justify-center"
                          >
                            <Check className="h-3 w-3 text-primary-foreground" />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          <div className="flex gap-2">
            <motion.div className="flex-1" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button 
                onClick={handleStartPurchase}
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
                  trackCTAClick('request_info', 'inquiry_form');
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
        <motion.div 
          className="flex items-center justify-center gap-4 text-xs text-muted-foreground pt-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <span className="flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5" />
            Secure payment
          </span>
          <span className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            Buyer protection
          </span>
        </motion.div>

        {/* Financing options */}
        {priceSale && (isAffirmEligible(priceSale) || isAfterpayEligible(priceSale)) && (
          <motion.div 
            className="flex flex-col gap-2 pt-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            {isAffirmEligible(priceSale) && (
              <AffirmBadge price={priceSale} className="w-full justify-center py-2.5 bg-muted/30 rounded-lg" showEstimate={false} />
            )}
            {isAfterpayEligible(priceSale) && (
              <AfterpayBadge price={priceSale} className="w-full justify-center py-2.5 bg-muted/30 rounded-lg" showEstimate={false} />
            )}
          </motion.div>
        )}
      </div>

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
    </motion.div>
  );
};

export default EnhancedInquiryForm;
