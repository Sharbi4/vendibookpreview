import { Truck, Zap, FileCheck, Users, Clock, Package } from 'lucide-react';
import type { FulfillmentType, ListingCategory } from '@/types/listing';

interface QuickHighlightsProps {
  fulfillmentType: FulfillmentType;
  category: ListingCategory;
  highlights?: string[] | null;
  instantBook?: boolean;
  deliveryFee?: number | null;
  hoursOfAccess?: string | null;
}

const QuickHighlights = ({
  fulfillmentType,
  category,
  highlights,
  instantBook,
  deliveryFee,
  hoursOfAccess,
}: QuickHighlightsProps) => {
  const items: { icon: React.ReactNode; text: string }[] = [];

  // Add fulfillment type based on what's available
  if (fulfillmentType === 'on_site') {
    items.push({
      icon: <Users className="h-4 w-4" />,
      text: 'On-site access',
    });
  }

  if (fulfillmentType === 'delivery' || fulfillmentType === 'both') {
    items.push({
      icon: <Truck className="h-4 w-4" />,
      text: deliveryFee ? `Delivery available ($${deliveryFee})` : 'Delivery available',
    });
  }

  if (fulfillmentType === 'pickup' || fulfillmentType === 'both') {
    items.push({
      icon: <Package className="h-4 w-4" />,
      text: 'Pickup available',
    });
  }

  // Instant book
  if (instantBook) {
    items.push({
      icon: <Zap className="h-4 w-4" />,
      text: 'Instant book enabled',
    });
  }

  // Hours of access for static locations
  if ((category === 'ghost_kitchen' || category === 'vendor_lot') && hoursOfAccess) {
    items.push({
      icon: <Clock className="h-4 w-4" />,
      text: hoursOfAccess,
    });
  }

  // Add first 3 highlights from listing
  if (highlights && highlights.length > 0) {
    highlights.slice(0, 3).forEach((highlight) => {
      items.push({
        icon: <FileCheck className="h-4 w-4" />,
        text: highlight,
      });
    });
  }

  // Limit to 6 items max
  const displayItems = items.slice(0, 6);

  if (displayItems.length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {displayItems.map((item, idx) => (
        <div
          key={idx}
          className="flex items-center gap-2 text-sm text-muted-foreground"
        >
          <span className="text-primary flex-shrink-0">{item.icon}</span>
          <span className="truncate">{item.text}</span>
        </div>
      ))}
    </div>
  );
};

export default QuickHighlights;
