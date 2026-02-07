import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Plug, Zap, Droplet, Refrigerator, Flame, Wind, Wifi, Car, Shield, Sun, Truck, Star, Calendar } from 'lucide-react';
import { Listing, CATEGORY_LABELS } from '@/types/listing';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import RatingBadge from '@/components/reviews/RatingBadge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import VerificationBadge from '@/components/verification/VerificationBadge';
import { CategoryTooltip } from '@/components/categories/CategoryGuide';
import { FavoriteButton } from '@/components/listing/FavoriteButton';
import { AffirmBadge } from '@/components/ui/AffirmBadge';
import { AfterpayBadge } from '@/components/ui/AfterpayBadge';
import { trackListingCardClick } from '@/lib/analytics';
import { AvailabilityCalendarModal } from '@/components/listing/AvailabilityCalendarModal';

interface ListingCardProps {
  listing: Listing;
  className?: string;
  hostVerified?: boolean;
  showQuickBook?: boolean;
  onQuickBook?: (listing: Listing) => void;
  canDeliverToUser?: boolean;
  distanceMiles?: number;
  compact?: boolean;
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

const ListingCard = ({ listing, className, hostVerified, showQuickBook, onQuickBook, canDeliverToUser, distanceMiles, compact = false }: ListingCardProps) => {
  const [showCalendar, setShowCalendar] = useState(false);
  
  // Check if listing is featured (featured_enabled=true and featured_expires_at in the future)
  const isFeatured = (listing as any).featured_enabled && 
    (listing as any).featured_expires_at && 
    new Date((listing as any).featured_expires_at) > new Date();

  // Safely format price with proper null handling
  const formatListingPrice = () => {
    if (listing.mode === 'rent') {
      if (listing.price_daily && listing.price_daily > 0) {
        return `$${listing.price_daily.toLocaleString()}/day`;
      }
      return 'Price TBD';
    }
    // Sale mode
    if (listing.price_sale && listing.price_sale > 0) {
      return `$${listing.price_sale.toLocaleString()}`;
    }
    return 'Price TBD';
  };
  
  const price = formatListingPrice();

  const modeLabel = listing.mode === 'rent' ? 'For Rent' : 'For Sale';
  const modeColor = listing.mode === 'rent' ? 'bg-primary' : 'bg-emerald-500';

  // Get location from pickup_location_text or address
  const location = listing.pickup_location_text || listing.address?.split(',').slice(-2).join(',').trim() || 'Location TBD';

  // Get displayable amenities (max 3 to leave room for Quick Book button)
  const maxAmenities = compact ? 2 : 3;
  const popularAmenities = (listing.amenities || []).filter(a => popularAmenityIcons[a]);
  const displayAmenities = popularAmenities.slice(0, maxAmenities);
  const remainingAmenitiesCount = (listing.amenities?.length || 0) - displayAmenities.length;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_12px_24px_rgba(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-300 ease-out flex flex-col overflow-hidden h-full group">
      <Link 
        to={`/listing/${listing.id}`} 
        className={cn("cursor-pointer block flex-1 flex flex-col", className)}
        onClick={() => trackListingCardClick(listing.id, listing.category, 'listing_card')}
      >
        {/* Image Container - Turo Look */}
        <div className={cn(
          "relative w-full bg-gray-50 overflow-hidden",
          compact ? "aspect-[4/3]" : "aspect-[4/3]"
        )}>
          <img
            src={listing.cover_image_url || listing.image_urls[0] || '/placeholder.svg'}
            alt={listing.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-in-out"
          />
        
        {/* Mode Badge */}
        <div className="absolute top-2 left-2 flex items-center gap-1.5">
          <Badge 
            className={cn(
              "font-medium text-white border-0",
              modeColor,
              compact ? "text-[10px] px-1.5 py-0.5" : "text-xs"
            )}
          >
            {modeLabel}
          </Badge>
          
          {/* Featured Badge */}
          {isFeatured && (
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge className={cn(
                    "font-medium bg-amber-500 text-white border-0 flex items-center gap-1",
                    compact ? "text-[10px] px-1.5 py-0.5" : "text-xs"
                  )}>
                    <Star className={cn("fill-current", compact ? "h-2.5 w-2.5" : "h-3 w-3")} />
                    {!compact && "Featured"}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  Premium listing with priority placement
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          
          {/* Instant Book Badge */}
          {!compact && listing.mode === 'rent' && listing.instant_book && (
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge className="text-xs font-medium bg-amber-500 text-white border-0 flex items-center gap-1">
                    <Zap className="h-3 w-3" />
                    Instant
                  </Badge>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  Book and pay immediately – no waiting for approval
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          
          {/* Can Deliver To User Badge */}
          {!compact && canDeliverToUser && (
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge className="text-xs font-medium bg-emerald-500 text-white border-0 flex items-center gap-1">
                    <Truck className="h-3 w-3" />
                    Delivers to you
                  </Badge>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  This listing can deliver to your selected location
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        {/* Top Right Badges */}
        <div className={cn("absolute flex items-center gap-1.5", compact ? "top-2 right-2" : "top-3 right-3 gap-2")}>
          {/* Favorite Button */}
          {!compact && (
            <FavoriteButton listingId={listing.id} category={listing.category} size="sm" />
          )}
        </div>

        {/* Amenities Icons Overlay */}
        {!compact && (
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
                  {remainingAmenitiesCount > 0 && (
                    <div className="w-7 h-7 bg-background/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm text-xs font-medium text-muted-foreground">
                      +{remainingAmenitiesCount}
                    </div>
                  )}
                </TooltipProvider>
              )}
            </div>
            
            {/* Calendar & Quick Book Buttons */}
            <div className="flex items-center gap-1.5">
              {/* View Availability Button for Rentals */}
              {listing.mode === 'rent' && (
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        className="w-7 h-7 bg-background/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm hover:bg-primary hover:text-primary-foreground transition-colors"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setShowCalendar(true);
                        }}
                      >
                        <Calendar className="h-3.5 w-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      View Availability
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              
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
        )}
        </div>

      {/* Content - Apple/OpenAI Cleanliness */}
      <div className={cn("p-4 space-y-2 flex-1 flex flex-col", compact && "p-3 space-y-1")}>
        {/* Location & Category */}
        <div className="flex items-center justify-between gap-2">
          <span className={cn("text-gray-500 font-medium flex items-center gap-1", compact ? "text-xs" : "text-sm")}>
            <MapPin className={cn(compact ? "h-2.5 w-2.5" : "h-3 w-3")} />
            <span className="line-clamp-1">{location}</span>
            {distanceMiles !== undefined && (
              <span className="text-xs text-primary font-medium ml-1">
                ({distanceMiles < 1 ? '<1' : distanceMiles.toFixed(0)} mi)
              </span>
            )}
          </span>
          {!compact && (
            <CategoryTooltip category={listing.category} side="top">
              <span className="bg-gray-100 text-gray-900 text-xs font-bold px-3 py-1 rounded-full cursor-help">
                {CATEGORY_LABELS[listing.category]}
              </span>
            </CategoryTooltip>
          )}
        </div>

        {/* Delivery Radius Badge */}
        {!compact && (listing.fulfillment_type === 'delivery' || listing.fulfillment_type === 'both') && listing.delivery_radius_miles && (
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Truck className="h-3 w-3" />
            <span>Delivers within {listing.delivery_radius_miles} mi</span>
            {listing.delivery_fee && (
              <span className="text-gray-900 font-medium">· ${listing.delivery_fee} fee</span>
            )}
          </div>
        )}

        {/* Title & Rating - Tracking Tight Typography */}
        <div className="flex items-center justify-between gap-2">
          <h3 className={cn(
            "text-lg font-semibold tracking-tight text-gray-900 line-clamp-1 group-hover:text-primary transition-colors",
            compact && "text-sm"
          )}>
            {listing.title}
          </h3>
          {!compact && <RatingBadge listingId={listing.id} />}
        </div>

        {/* Price - Premium Pill Badge Style */}
        <div className="flex items-center gap-2 flex-wrap mt-auto pt-1">
          <span className="bg-gray-100 text-gray-900 text-sm font-bold px-3 py-1 rounded-full">
            {price}
          </span>
          {!compact && listing.mode === 'rent' && listing.price_weekly && (
            <span className="text-sm text-gray-500 font-medium">
              ${listing.price_weekly}/week
            </span>
          )}
          {/* BNPL badges for eligible listings */}
          {listing.mode === 'sale' && listing.price_sale && (
            <>
              <AfterpayBadge price={listing.price_sale} showEstimate={false} showTooltip={!compact} />
              <AffirmBadge price={listing.price_sale} showEstimate={false} showTooltip={!compact} />
            </>
          )}
          {listing.mode === 'rent' && listing.price_daily && (
            <>
              <AfterpayBadge price={listing.price_daily * 7} showEstimate={false} showTooltip={!compact} />
              <AffirmBadge price={listing.price_daily * 30} showEstimate={false} showTooltip={!compact} />
            </>
          )}
        </div>
      </div>
      </Link>
      
      {/* Availability Calendar Modal */}
      {listing.mode === 'rent' && (
        <AvailabilityCalendarModal
          open={showCalendar}
          onOpenChange={setShowCalendar}
          listingId={listing.id}
          listingTitle={listing.title}
          availableFrom={(listing as any).available_from}
          availableTo={(listing as any).available_to}
        />
      )}
    </div>
  );
};

export default ListingCard;
