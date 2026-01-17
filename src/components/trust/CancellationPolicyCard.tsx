import { useState } from 'react';
import { Info, ChevronRight } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface CancellationPolicyCardProps {
  isRental?: boolean;
}

export const CancellationPolicyCard = ({ isRental = true }: CancellationPolicyCardProps) => {
  const [showModal, setShowModal] = useState(false);

  const shortPolicy = isRental 
    ? "Free cancellation up to 48 hours before start"
    : "All sales are final after confirmation";

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="w-full flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-left group"
      >
        <Info className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <span className="text-sm text-muted-foreground flex-1">{shortPolicy}</span>
        <span className="text-xs text-primary group-hover:underline">Learn more</span>
      </button>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{isRental ? 'Cancellation Policy' : 'Refund Policy'}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 text-sm">
            {isRental ? (
              <>
                <div>
                  <h4 className="font-medium text-foreground mb-1">Free cancellation</h4>
                  <p className="text-muted-foreground">
                    Cancel up to 48 hours before your rental start date for a full refund.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-foreground mb-1">Partial refund</h4>
                  <p className="text-muted-foreground">
                    Cancel within 48 hours and receive a 50% refund of your booking total.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-foreground mb-1">No refund</h4>
                  <p className="text-muted-foreground">
                    Cancellations on the day of rental are non-refundable.
                  </p>
                </div>
              </>
            ) : (
              <>
                <div>
                  <h4 className="font-medium text-foreground mb-1">Before confirmation</h4>
                  <p className="text-muted-foreground">
                    You can cancel your purchase before the seller confirms for a full refund.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-foreground mb-1">After confirmation</h4>
                  <p className="text-muted-foreground">
                    Once the seller confirms, all sales are final unless the item is not as described.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-foreground mb-1">Disputes</h4>
                  <p className="text-muted-foreground">
                    If the item doesn't match the listing, you can open a dispute within 48 hours of delivery.
                  </p>
                </div>
              </>
            )}
            
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground">
                Need help? <a href="/contact" className="text-primary hover:underline">Contact support</a>
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CancellationPolicyCard;
