import { Truck, Zap, FileCheck, Users, Clock, Package, Scale, Ruler, Check } from 'lucide-react';
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
  const items: { icon: React.ReactNode; title: string; description?: string }[] = [];

  // Add fulfillment type based on what's available
  if (fulfillmentType === 'on_site') {
    items.push({
      icon: <Users className="h-6 w-6" />,
      title: 'On-site access',
      description: 'Access the asset at its location',
    });
  }

  if (fulfillmentType === 'delivery' || fulfillmentType === 'both') {
    items.push({
      icon: <Truck className="h-6 w-6" />,
      title: 'Delivery available',
      description: deliveryFee ? `Starting at $${deliveryFee}` : 'We deliver to you',
    });
  }

  if (fulfillmentType === 'pickup' || fulfillmentType === 'both') {
    items.push({
      icon: <Package className="h-6 w-6" />,
      title: 'Pickup available',
      description: 'Pick up at host location',
    });
  }

  // Instant book
  if (instantBook) {
    items.push({
      icon: <Zap className="h-6 w-6" />,
      title: 'Instant Book',
      description: 'Book without waiting for approval',
    });
  }

  // Hours of access for static locations
  if ((category === 'ghost_kitchen' || category === 'vendor_lot') && hoursOfAccess) {
    items.push({
      icon: <Clock className="h-6 w-6" />,
      title: hoursOfAccess,
      description: 'Hours of access',
    });
  }

  // Add dimensions for sale listings (food trucks/trailers)
  if (!isRental && (category === 'food_truck' || category === 'food_trailer')) {
    // Weight
    if (weightLbs) {
      items.push({
        icon: <Scale className="h-6 w-6" />,
        title: `${weightLbs.toLocaleString()} lbs`,
        description: 'Total weight',
      });
    }

    // Dimensions (L x W x H)
    if (lengthInches && widthInches && heightInches) {
      const lengthFt = Math.round(lengthInches / 12);
      const widthFt = Math.round(widthInches / 12);
      const heightFt = Math.round(heightInches / 12);
      items.push({
        icon: <Ruler className="h-6 w-6" />,
        title: `${lengthFt}' × ${widthFt}' × ${heightFt}'`,
        description: 'Length × Width × Height',
      });
    } else if (lengthInches) {
      const lengthFt = Math.round(lengthInches / 12);
      items.push({
        icon: <Ruler className="h-6 w-6" />,
        title: `${lengthFt}' long`,
        description: 'Total length',
      });
    }
  }

  // Add first highlights from listing
  if (highlights && highlights.length > 0) {
    highlights.slice(0, isRental ? 3 : 2).forEach((highlight) => {
      items.push({
        icon: <Check className="h-6 w-6" />,
        title: highlight,
      });
    });
  }

  // Limit to 6 items max
  const displayItems = items.slice(0, 6);

  if (displayItems.length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
      {displayItems.map((item, idx) => (
        <div
          key={idx}
          className="flex items-start gap-4"
        >
          <div className="flex-shrink-0 text-foreground">
            {item.icon}
          </div>
          <div className="min-w-0">
            <p className="font-medium text-foreground">{item.title}</p>
            {item.description && (
              <p className="text-sm text-muted-foreground">{item.description}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default QuickHighlights;
