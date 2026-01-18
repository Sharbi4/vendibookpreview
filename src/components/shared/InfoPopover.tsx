import { Info } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface InfoPopoverProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  iconClassName?: string;
  align?: 'start' | 'center' | 'end';
  side?: 'top' | 'right' | 'bottom' | 'left';
}

const InfoPopover = ({ 
  title, 
  children, 
  className,
  iconClassName,
  align = 'center',
  side = 'top',
}: InfoPopoverProps) => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button 
          type="button"
          className={cn(
            "inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-muted transition-colors",
            className
          )}
          aria-label={`Info about ${title}`}
        >
          <Info className={cn("h-3.5 w-3.5 text-muted-foreground hover:text-foreground", iconClassName)} />
        </button>
      </PopoverTrigger>
      <PopoverContent 
        align={align} 
        side={side}
        className="w-72 text-sm"
      >
        <h4 className="font-semibold text-foreground mb-2">{title}</h4>
        <div className="text-muted-foreground text-xs space-y-2">
          {children}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default InfoPopover;

// Pre-built info popovers for common use cases
export const EscrowInfoPopover = () => (
  <InfoPopover title="How Escrow Works">
    <p>Your payment is held securely until the transaction is complete.</p>
    <ul className="list-disc list-inside space-y-1 mt-2">
      <li>Seller doesn't receive funds until you confirm receipt</li>
      <li>If there's a problem, you can open a dispute</li>
      <li>Funds release after both parties confirm</li>
    </ul>
  </InfoPopover>
);

export const FreightInfoPopover = () => (
  <InfoPopover title="How Freight Works">
    <ul className="list-disc list-inside space-y-1">
      <li>After payment, we contact you within 2 business days to schedule</li>
      <li>You'll receive tracking once the shipment is booked</li>
      <li>Typical transit: 7–10 business days</li>
      <li>Professional freight handling included</li>
    </ul>
  </InfoPopover>
);

export const FeesInfoPopover = () => (
  <InfoPopover title="What Fees Cover">
    <ul className="list-disc list-inside space-y-1">
      <li>Secure payment processing</li>
      <li>Buyer/renter protection</li>
      <li>24/7 customer support</li>
      <li>Dispute resolution services</li>
    </ul>
  </InfoPopover>
);

export const DocumentsInfoPopover = () => (
  <InfoPopover title="Who Can See My Documents?">
    <p>Your documents are kept private and secure.</p>
    <ul className="list-disc list-inside space-y-1 mt-2">
      <li>Only the host reviews them for verification</li>
      <li>VendiBook support may access for disputes</li>
      <li>Never shared publicly or with third parties</li>
    </ul>
  </InfoPopover>
);

export const InstantBookInfoPopover = () => (
  <InfoPopover title="Instant Book vs Request">
    <div className="space-y-3">
      <div>
        <p className="font-medium text-foreground">Instant Book</p>
        <p>Pay now, booking confirms immediately. No waiting.</p>
      </div>
      <div>
        <p className="font-medium text-foreground">Request to Book</p>
        <p>Submit request, host reviews, pay only after approval.</p>
      </div>
    </div>
  </InfoPopover>
);

export const RefundInfoPopover = () => (
  <InfoPopover title="Refund Policy">
    <ul className="list-disc list-inside space-y-1">
      <li>Full refund if host cancels</li>
      <li>Partial refund based on cancellation timing</li>
      <li>Disputes reviewed within 48 hours</li>
    </ul>
  </InfoPopover>
);
