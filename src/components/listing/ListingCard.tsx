import { Link } from 'react-router-dom';
import { Heart, MapPin, Plug, Zap, Droplet, Refrigerator, Flame, Wind, Wifi, Car, Shield, Sun, ShieldCheck, Truck } from 'lucide-react';
import { Listing, CATEGORY_LABELS } from '@/types/listing';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import RatingBadge from '@/components/reviews/RatingBadge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ListingCardProps {
  listing: Listing;
  className?: string;
  hostVerified?: boolean;
  showQuickBook?: boolean;
  onQuickBook?: (listing: Listing) => void;
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

const ListingCard = ({ listing, className, hostVerified, showQuickBook, onQuickBook }: ListingCardProps) => {
  const price = listing.mode === 'rent' 
    ? `$${listing.price_daily}/day`
    : `$${listing.price_sale?.toLocaleString()}`;

  const modeLabel = listing.mode === 'rent' ? 'For Rent' : 'For Sale';
  const modeColor = listing.mode === 'rent' ? 'bg-primary' : 'bg-emerald-500';

  // Get location from pickup_location_text or address
  const location = listing.pickup_location_text || listing.address?.split(',').slice(-2).join(',').trim() || 'Location TBD';

  // Get displayable amenities (max 4 for compact view)
  const displayAmenities = (listing.amenities || [])
    .filter(a => popularAmenityIcons[a])
    .slice(0, 4);

  return (
    <Link to={`/listing/${listing.id}`} className={cn("group cursor-pointer card-hover block", className)}>
      {/* Image Container */}
      <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-muted">
        <img
          src={listing.cover_image_url || listing.image_urls[0] || '/placeholder.svg'}
          alt={listing.title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        
        {/* Mode Badge */}
        <Badge 
          className={cn(
            "absolute top-3 left-3 text-xs font-medium text-white border-0",
            modeColor
          )}
        >
          {modeLabel}
        </Badge>

        {/* Top Right Badges */}
        <div className="absolute top-3 right-3 flex items-center gap-2">
          {/* Verified Badge */}
          {hostVerified && (
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="p-2 rounded-full bg-emerald-500 shadow-sm">
                    <ShieldCheck className="h-4 w-4 text-white" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  Host identity verified
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          
          {/* Favorite Button */}
          <button 
            className="p-2 rounded-full bg-white/80 hover:bg-white transition-colors shadow-sm"
            onClick={(e) => {
              e.stopPropagation();
              // Handle favorite
            }}
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
          
          {/* Quick Book Button */}
          {showQuickBook && listing.mode === 'rent' && onQuickBook && (
            <Button
              size="sm"
              className="shadow-lg text-xs px-3 py-1 h-auto"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onQuickBook(listing);
              }}
            >
              Quick Book
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="mt-3 space-y-1">
        {/* Location & Category */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {location}
          </span>
          <span className="text-xs px-2 py-1 bg-secondary rounded-full text-muted-foreground">
            {CATEGORY_LABELS[listing.category]}
          </span>
        </div>

        {/* Delivery Radius Badge */}
        {(listing.fulfillment_type === 'delivery' || listing.fulfillment_type === 'both') && listing.delivery_radius_miles && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Truck className="h-3 w-3" />
            <span>Delivers within {listing.delivery_radius_miles} mi</span>
            {listing.delivery_fee && (
              <span className="text-foreground font-medium">· ${listing.delivery_fee} fee</span>
            )}
          </div>
        )}

        {/* Title & Rating */}
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
            {listing.title}
          </h3>
          <RatingBadge listingId={listing.id} />
        </div>

        {/* Price */}
        <p className="text-foreground">
          <span className="font-bold">{price}</span>
          {listing.mode === 'rent' && listing.price_weekly && (
            <span className="text-sm text-muted-foreground ml-2">
              · ${listing.price_weekly}/week
            </span>
          )}
        </p>
      </div>
    </Link>
  );
};

export default ListingCard;
