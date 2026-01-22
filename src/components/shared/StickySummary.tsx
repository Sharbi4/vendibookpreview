import { useState } from 'react';
import { ChevronDown, Package, Calendar, MapPin, Truck } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import WhatsIncluded from './WhatsIncluded';
import { AffirmBadge, isAffirmEligible } from '@/components/ui/AffirmBadge';
import { AfterpayBadge, isAfterpayEligible } from '@/components/ui/AfterpayBadge';

interface PriceLine {
  label: string;
  amount: number;
  isDelivery?: boolean;
  isFee?: boolean;
}

interface StickySummaryProps {
  // Listing info
  imageUrl?: string | null;
  title: string;
  category?: string;
  itemId?: string;
  
  // Dates (for booking)
  startDate?: Date;
  endDate?: Date;
  
  // Pricing
  priceLines: PriceLine[];
  totalToday: number;
  totalLater?: number; // For Request to Book
  
  // Fulfillment
  fulfillmentType?: 'pickup' | 'delivery' | 'vendibook_freight' | 'on_site';
  deliveryAddress?: string;
  
  // Options
  mode: 'checkout' | 'booking';
  showWhatsIncluded?: boolean;
  className?: string;
  
  // Financing eligibility price (totalToday or base price)
  financingEligiblePrice?: number;
}

const StickySummary = ({
  imageUrl,
  title,
  category,
  itemId,
  startDate,
  endDate,
  priceLines,
  totalToday,
  totalLater,
  fulfillmentType,
  deliveryAddress,
  mode,
  showWhatsIncluded = true,
  className,
  financingEligiblePrice,
}: StickySummaryProps) => {
  const [showBreakdown, setShowBreakdown] = useState(true);
  const isRequestMode = totalLater !== undefined && totalToday === 0;

  const getFulfillmentLabel = () => {
    switch (fulfillmentType) {
      case 'pickup': return 'Local Pickup';
      case 'delivery': return 'Local Delivery';
      case 'vendibook_freight': return 'VendiBook Freight';
      case 'on_site': return 'On-Site Access';
      default: return null;
    }
  };

  const getFulfillmentIcon = () => {
    switch (fulfillmentType) {
      case 'pickup': return MapPin;
      case 'delivery': return Truck;
      case 'vendibook_freight': return Package;
      case 'on_site': return MapPin;
      default: return MapPin;
    }
  };

  const FulfillmentIcon = getFulfillmentIcon();

  return (
    <div className={cn(
      "bg-card border-2 border-border rounded-2xl shadow-lg overflow-hidden",
      className
    )}>
      {/* Header with image */}
      <div className="p-4 border-b border-border/50">
        <div className="flex gap-4">
          {imageUrl && (
            <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 border border-border/50">
              <img 
                src={imageUrl} 
                alt={title} 
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-foreground truncate">{title}</h4>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {category && (
                <span className="text-xs px-2 py-0.5 rounded-md bg-muted border border-border text-muted-foreground capitalize">
                  {category.replace('_', ' ')}
                </span>
              )}
              {itemId && (
                <span className="text-xs text-muted-foreground font-mono">
                  #{itemId.slice(0, 8).toUpperCase()}
                </span>
              )}
            </div>
          </div>
        </div>
        
        {/* Dates (booking only) */}
        {startDate && endDate && (
          <div className="flex items-center gap-2 mt-3 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-foreground">
              {format(startDate, 'MMM d')} – {format(endDate, 'MMM d, yyyy')}
            </span>
          </div>
        )}
        
        {/* Fulfillment */}
        {fulfillmentType && (
          <div className="flex items-center gap-2 mt-2 text-sm">
            <FulfillmentIcon className="h-4 w-4 text-muted-foreground" />
            <span className="text-foreground">{getFulfillmentLabel()}</span>
          </div>
        )}
      </div>
      
      {/* Price breakdown */}
      <Collapsible open={showBreakdown} onOpenChange={setShowBreakdown}>
        <div className="p-4">
          <CollapsibleTrigger className="flex items-center justify-between w-full mb-3">
            <span className="text-sm font-medium text-foreground">Price breakdown</span>
            <ChevronDown className={cn(
              "h-4 w-4 text-muted-foreground transition-transform",
              showBreakdown && "rotate-180"
            )} />
          </CollapsibleTrigger>
          
          <CollapsibleContent>
            <div className="space-y-2 text-sm mb-4">
              {priceLines.map((line, index) => (
                <div key={index} className="flex justify-between">
                  <span className={cn(
                    "text-muted-foreground",
                    line.isDelivery && "flex items-center gap-1.5"
                  )}>
                    {line.isDelivery && <Truck className="h-3.5 w-3.5" />}
                    {line.label}
                  </span>
                  <span className="text-foreground">
                    {line.amount > 0 ? `$${line.amount.toLocaleString()}` : 'FREE'}
                  </span>
                </div>
              ))}
            </div>
          </CollapsibleContent>
          
          {/* Totals */}
          <div className="pt-3 border-t-2 border-primary/20 space-y-2">
            <div className="flex justify-between">
              <span className="font-bold text-lg text-foreground">
                {isRequestMode ? 'Total due today' : 'Total'}
              </span>
              <span className={cn(
                "font-bold text-lg",
                isRequestMode ? "text-muted-foreground" : "text-primary"
              )}>
                {isRequestMode ? '$0' : `$${totalToday.toLocaleString()}`}
              </span>
            </div>
            
            {isRequestMode && totalLater && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">
                  Total after approval
                </span>
                <span className="text-sm font-semibold text-foreground">
                  ${totalLater.toLocaleString()}
                </span>
              </div>
            )}
            
            {/* Financing badges */}
            {financingEligiblePrice && (isAfterpayEligible(financingEligiblePrice) || isAffirmEligible(financingEligiblePrice)) && (
              <div className="flex items-center gap-2 pt-2 flex-wrap">
                <AfterpayBadge price={financingEligiblePrice} showEstimate={false} />
                <AffirmBadge price={financingEligiblePrice} showEstimate={false} />
              </div>
            )}
          </div>
        </div>
      </Collapsible>
      
      {/* What's included */}
      {showWhatsIncluded && (
        <div className="px-4 pb-4">
          <WhatsIncluded mode={mode} />
        </div>
      )}
    </div>
  );
};

export default StickySummary;
