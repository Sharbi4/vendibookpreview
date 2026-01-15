import React from 'react';
import { Truck, Clock, Mail } from 'lucide-react';
import { InfoTooltip } from '@/components/ui/info-tooltip';

interface FreightInfoCardProps {
  isSellerPaid: boolean;
  freightCost?: number;
  showSellerNote?: boolean;
}

/**
 * Pod 2 & Pod 3 - Freight info display at checkout
 * Shows buyer-paid or seller-paid (free shipping) info
 */
export const FreightInfoCard: React.FC<FreightInfoCardProps> = ({
  isSellerPaid,
  freightCost,
  showSellerNote = false,
}) => {
  if (isSellerPaid) {
    return (
      <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Truck className="h-5 w-5 text-emerald-600" />
          <h4 className="font-semibold text-foreground">
            Delivery: Free Shipping (Vendibook Freight)
          </h4>
        </div>
        
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-start gap-2">
            <span className="text-emerald-600 mt-0.5">•</span>
            <span>Vendibook coordinates freight through a third-party carrier.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-emerald-600 mt-0.5">•</span>
            <span>Seller covers the freight cost (buyer sees $0 freight).</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-emerald-600 mt-0.5">•</span>
            <span>
              Shipping may take{' '}
              <span className="font-medium">72 hours to 10 days</span>
              <InfoTooltip
                content="This range depends on seller readiness, pickup scheduling, and carrier availability. You'll get an email as soon as your shipment is booked/shipped."
                className="ml-1"
              />
            </span>
          </li>
          <li className="flex items-start gap-2">
            <Mail className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
            <span>
              Buyer receives an email when the item ships to{' '}
              <span className="font-medium">schedule delivery time</span>
              <InfoTooltip
                content="After shipment is confirmed, you'll select a delivery window. Check your shipping email + confirmation email."
                className="ml-1"
              />
              {' '}(also in confirmation email).
            </span>
          </li>
        </ul>

        {showSellerNote && freightCost !== undefined && freightCost > 0 && (
          <div className="mt-3 pt-3 border-t border-emerald-200 dark:border-emerald-800">
            <p className="text-sm text-amber-700 dark:text-amber-400 flex items-center gap-1">
              <span className="font-medium">Seller payout note:</span>
              <span>Freight cost will be deducted from your payout after the sale.</span>
              <InfoTooltip
                content="Free shipping is a seller-paid incentive. Vendibook still facilitates the shipment; the freight amount is deducted from the seller's earnings."
              />
            </p>
          </div>
        )}
      </div>
    );
  }

  // Buyer-paid freight (Pod 2)
  return (
    <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Truck className="h-5 w-5 text-blue-600" />
        <h4 className="font-semibold text-foreground">Delivery: Vendibook Freight</h4>
      </div>
      
      <ul className="space-y-2 text-sm text-muted-foreground">
        <li className="flex items-start gap-2">
          <span className="text-blue-600 mt-0.5">•</span>
          <span>Freight is coordinated by Vendibook through a third-party carrier.</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-blue-600 mt-0.5">•</span>
          <span className="font-medium text-foreground">Buyer pays freight at checkout.</span>
        </li>
        <li className="flex items-start gap-2">
          <Clock className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <span>
            Shipping may take{' '}
            <span className="font-medium">72 hours to 10 days</span>
            <InfoTooltip
              content="This range depends on seller readiness, pickup scheduling, and carrier availability. You'll get an email as soon as your shipment is booked/shipped."
              className="ml-1"
            />
          </span>
        </li>
        <li className="flex items-start gap-2">
          <Mail className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <span>
            You'll receive an email when your item ships with a link/steps to{' '}
            <span className="font-medium">schedule a delivery time</span>
            <InfoTooltip
              content="After shipment is confirmed, you'll select a delivery window. Check your shipping email + confirmation email."
              className="ml-1"
            />
          </span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-blue-600 mt-0.5">•</span>
          <span>Scheduling details are also included in your order confirmation email.</span>
        </li>
      </ul>
    </div>
  );
};

/**
 * Pod 4 - Micro-comparison card for freight options
 */
export const FreightComparisonCard: React.FC = () => {
  return (
    <div className="bg-muted/50 rounded-lg p-3 text-sm">
      <div className="flex items-center gap-2 mb-2">
        <Truck className="h-4 w-4 text-primary" />
        <span className="font-medium text-foreground">Vendibook Freight — Payment Options</span>
        <InfoTooltip
          content="No matter who pays, Vendibook coordinates the carrier and scheduling emails."
        />
      </div>
      <ul className="space-y-1 text-muted-foreground text-xs">
        <li><span className="font-medium">Buyer-Paid:</span> Buyer pays freight at checkout.</li>
        <li><span className="font-medium">Seller-Paid (Free Shipping):</span> Seller pays freight; deducted from seller payout.</li>
        <li className="italic">Always: Vendibook facilitates freight via a third-party carrier.</li>
      </ul>
    </div>
  );
};
