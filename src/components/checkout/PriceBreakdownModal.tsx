import { useState } from 'react';
import { Loader2, ShieldCheck, CreditCard, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';

// Commission rates (must match edge function)
const RENTAL_RENTER_FEE_PERCENT = 12.9;

interface PriceBreakdownModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'rent' | 'sale';
  basePrice: number;
  deliveryFee?: number;
  listingTitle?: string;
  onConfirm: () => Promise<void>;
}

const PriceBreakdownModal = ({
  open,
  onOpenChange,
  mode,
  basePrice,
  deliveryFee = 0,
  listingTitle,
  onConfirm,
}: PriceBreakdownModalProps) => {
  const [isProcessing, setIsProcessing] = useState(false);

  // Calculate fees
  const subtotal = basePrice + deliveryFee;
  const platformFee = mode === 'rent' 
    ? Math.round(subtotal * RENTAL_RENTER_FEE_PERCENT) / 100 
    : 0; // Sales don't have buyer-side platform fee visible
  const total = subtotal + platformFee;

  const handleConfirm = async () => {
    setIsProcessing(true);
    try {
      await onConfirm();
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Review Your {mode === 'rent' ? 'Booking' : 'Purchase'}
          </DialogTitle>
          <DialogDescription>
            {listingTitle && (
              <span className="font-medium text-foreground">{listingTitle}</span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Price Breakdown */}
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {mode === 'rent' ? 'Rental price' : 'Item price'}
              </span>
              <span className="text-foreground font-medium">
                ${basePrice.toFixed(2)}
              </span>
            </div>

            {deliveryFee > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Delivery fee</span>
                <span className="text-foreground font-medium">
                  ${deliveryFee.toFixed(2)}
                </span>
              </div>
            )}

            {mode === 'rent' && platformFee > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  Service fee
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-3.5 w-3.5 text-muted-foreground/70" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[200px]">
                      <p className="text-xs">
                        This helps cover our platform costs including secure payments, 
                        customer support, and buyer protection.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </span>
                <span className="text-foreground font-medium">
                  ${platformFee.toFixed(2)}
                </span>
              </div>
            )}

            <Separator />

            <div className="flex justify-between">
              <span className="font-semibold text-foreground">Total</span>
              <span className="font-bold text-xl text-primary">
                ${total.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Security Badge */}
          <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
            <div className="text-xs text-emerald-700 dark:text-emerald-400">
              {mode === 'sale' 
                ? 'Protected by escrow - your payment is secure until you confirm receipt'
                : 'Secure payment powered by Stripe - your information is encrypted'
              }
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <Button
            onClick={handleConfirm}
            disabled={isProcessing}
            size="lg"
            className="w-full bg-primary hover:bg-primary/90"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Preparing checkout...
              </>
            ) : (
              <>
                <CreditCard className="h-4 w-4 mr-2" />
                Pay ${total.toFixed(2)}
              </>
            )}
          </Button>
          
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isProcessing}
            className="w-full"
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PriceBreakdownModal;
