import { Truck, Zap, FileCheck, Users, Clock, Package, Scale, Ruler } from 'lucide-react';
import type { FulfillmentType, ListingCategory } from '@/types/listing';

interface QuickHighlightsProps {
  fulfillmentType: FulfillmentType;
  category: ListingCategory;
  highlights?: string[] | null;
  instantBook?: boolean;
  deliveryFee?: number | null;
  hoursOfAccess?: string | null;
  // Dimensions for sale listings
  weightLbs?: number | null;
  lengthInches?: number | null;
  widthInches?: number | null;
  heightInches?: number | null;
  isRental?: boolean;
}

const QuickHighlights = ({
  fulfillmentType,
  category,
  highlights,
  instantBook,
  deliveryFee,
  hoursOfAccess,
  weightLbs,
  lengthInches,
  widthInches,
  heightInches,
  isRental = true,
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

  // Add dimensions for sale listings (food trucks/trailers)
  if (!isRental && (category === 'food_truck' || category === 'food_trailer')) {
    // Weight
    if (weightLbs) {
      items.push({
        icon: <Scale className="h-4 w-4" />,
        text: `${weightLbs.toLocaleString()} lbs`,
      });
    }

    // Dimensions (L x W x H)
    if (lengthInches && widthInches && heightInches) {
      // Convert to feet for readability
      const lengthFt = Math.round(lengthInches / 12);
      const widthFt = Math.round(widthInches / 12);
      const heightFt = Math.round(heightInches / 12);
      items.push({
        icon: <Ruler className="h-4 w-4" />,
        text: `${lengthFt}' × ${widthFt}' × ${heightFt}' (L×W×H)`,
      });
    } else if (lengthInches) {
      const lengthFt = Math.round(lengthInches / 12);
      items.push({
        icon: <Ruler className="h-4 w-4" />,
        text: `${lengthFt}' long`,
      });
    }
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
