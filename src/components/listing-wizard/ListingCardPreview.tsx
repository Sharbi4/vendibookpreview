import React from 'react';
import { Heart, MapPin, Plug, Zap, Droplet, Refrigerator, Flame, Wind, Wifi, Car, Shield, Sun, Truck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { CATEGORY_LABELS, ListingCategory, FulfillmentType } from '@/types/listing';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ListingCardPreviewProps {
  listing: {
    title: string;
    mode: 'rent' | 'sale' | null;
    category: ListingCategory | null;
    images: string[];
    priceDaily: string;
    priceWeekly: string;
    priceSale: string;
    address: string;
    pickupLocationText: string;
    amenities: string[];
    instantBook: boolean;
    fulfillmentType: FulfillmentType | null;
    deliveryFee: string;
    deliveryRadiusMiles: string;
  };
  hostVerified?: boolean;
}

// Map of popular amenities to icons (subset for compact display)
const popularAmenityIcons: Record<string, { icon: React.ElementType; label: string }> = {
  generator: { icon: Zap, label: 'Generator' },
  electrical_hookup: { icon: Plug, label: 'Electric Hookup' },
  electric_hookup: { icon: Plug, label: 'Electric Hookup' },
  refrigerator: { icon: Refrigerator, label: 'Refrigerator' },
  freezer: { icon: Refrigerator, label: 'Freezer' },
  fryer: { icon: Flame, label: 'Fryer' },
  flat_top_grill: { icon: Flame, label: 'Flat Top Grill' },
  hood_system: { icon: Wind, label: 'Hood System' },
  ac_unit: { icon: Wind, label: 'A/C Unit' },
  hvac: { icon: Wind, label: 'HVAC' },
  wifi: { icon: Wifi, label: 'WiFi' },
  parking_available: { icon: Car, label: 'Parking' },
  customer_parking: { icon: Car, label: 'Parking' },
  security: { icon: Shield, label: '24/7 Security' },
  lighting: { icon: Sun, label: 'Night Lighting' },
  water_hookup: { icon: Droplet, label: 'Water Hookup' },
  three_compartment_sink: { icon: Droplet, label: '3 Compartment Sink' },
};

export const ListingCardPreview: React.FC<ListingCardPreviewProps> = ({ listing, hostVerified }) => {
  const price = listing.mode === 'rent' 
    ? listing.priceDaily ? `$${listing.priceDaily}/day` : '$--/day'
    : listing.priceSale ? `$${parseFloat(listing.priceSale).toLocaleString()}` : '$--';

  const modeLabel = listing.mode === 'rent' ? 'For Rent' : listing.mode === 'sale' ? 'For Sale' : 'Mode TBD';
  const modeColor = listing.mode === 'rent' ? 'bg-primary' : listing.mode === 'sale' ? 'bg-emerald-500' : 'bg-muted';

  // Get location from pickup_location_text or address
  const location = listing.pickupLocationText || listing.address?.split(',').slice(-2).join(',').trim() || 'Location TBD';

  // Get displayable amenities (max 4 for compact view)
  const displayAmenities = (listing.amenities || [])
    .filter(a => popularAmenityIcons[a])
    .slice(0, 4);

  // Get the first image as cover
  const coverImage = listing.images?.[0] || null;

  return (
    <div className="w-full max-w-sm mx-auto">
      <div className="text-xs text-muted-foreground text-center mb-3 font-medium uppercase tracking-wider">
        Card Preview (Search Results)
      </div>
      
      <div className="group cursor-pointer card-hover block bg-card rounded-xl border border-border/50 overflow-hidden shadow-sm">
        {/* Image Container */}
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          {coverImage ? (
            <img
              src={coverImage}
              alt={listing.title || 'Listing preview'}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted">
              <span className="text-muted-foreground text-sm">No image uploaded</span>
            </div>
          )}
          
          {/* Mode Badge */}
          <div className="absolute top-3 left-3 flex items-center gap-2">
            <Badge 
              className={cn(
                "text-xs font-medium text-white border-0",
                modeColor
              )}
            >
              {modeLabel}
            </Badge>
            
            {/* Instant Book Badge */}
            {listing.mode === 'rent' && listing.instantBook && (
              <Badge className="text-xs font-medium bg-amber-500 text-white border-0 flex items-center gap-1">
                <Zap className="h-3 w-3" />
                Instant
              </Badge>
            )}
          </div>

          {/* Top Right */}
          <div className="absolute top-3 right-3 flex items-center gap-2">
            {/* Preview Label */}
            <span className="px-2 py-1 text-[10px] font-medium rounded-full bg-black/70 text-white">
              Preview
            </span>
            
            {/* Favorite Button (disabled) */}
            <button 
              className="p-2 rounded-full bg-white/80 transition-colors shadow-sm cursor-default"
              disabled
            >
              <Heart className="h-4 w-4 text-foreground" />
            </button>
          </div>

          {/* Amenities Icons Overlay */}
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
            <div className="flex items-center gap-1">
              {displayAmenities.length > 0 && (
                <TooltipProvider delayDuration={200}>
                  {displayAmenities.map((amenityId) => {
                    const amenity = popularAmenityIcons[amenityId];
                    if (!amenity) return null;
                    const IconComponent = amenity.icon;
                    return (
                      <Tooltip key={amenityId}>
                        <TooltipTrigger asChild>
                          <div className="w-7 h-7 bg-background/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm">
                            <IconComponent className="h-3.5 w-3.5 text-foreground" />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">
                          {amenity.label}
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                  {(listing.amenities?.length || 0) > 4 && (
                    <div className="w-7 h-7 bg-background/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm text-xs font-medium text-muted-foreground">
                      +{(listing.amenities?.length || 0) - 4}
                    </div>
                  )}
                </TooltipProvider>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-3 space-y-1">
          {/* Location & Category */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground flex items-center gap-1 truncate">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{location}</span>
            </span>
            {listing.category && (
              <span className="text-xs px-2 py-1 bg-secondary rounded-full text-muted-foreground shrink-0">
                {CATEGORY_LABELS[listing.category]}
              </span>
            )}
          </div>

          {/* Delivery Radius Badge */}
          {(listing.fulfillmentType === 'delivery' || listing.fulfillmentType === 'both') && listing.deliveryRadiusMiles && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Truck className="h-3 w-3" />
              <span>Delivers within {listing.deliveryRadiusMiles} mi</span>
              {listing.deliveryFee && parseFloat(listing.deliveryFee) > 0 && (
                <span className="text-foreground font-medium">· ${listing.deliveryFee} fee</span>
              )}
            </div>
          )}

          {/* Title */}
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold text-foreground line-clamp-1">
              {listing.title || 'Untitled Listing'}
            </h3>
            {/* Placeholder rating */}
            <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
              <span className="text-amber-500">★</span>
              <span>New</span>
            </div>
          </div>

          {/* Price */}
          <p className="text-foreground">
            <span className="font-bold">{price}</span>
            {listing.mode === 'rent' && listing.priceWeekly && (
              <span className="text-sm text-muted-foreground ml-2">
                · ${listing.priceWeekly}/week
              </span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
};
