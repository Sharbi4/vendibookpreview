import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Plug, Zap, Droplet, Refrigerator, Flame, Wind, Wifi, Car, Shield, Sun, Truck, Calendar, Clock, ArrowRight } from 'lucide-react';
import FeaturedBadge from '@/components/listing/FeaturedBadge';
import ListingCardOverlay from '@/components/listing/ListingCardOverlay';
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
import { trackLeadEvent } from '@/lib/leadTracking';
// AvailabilityCalendarModal removed — calendar lives inside ListingCardOverlay now
import { normalizeScheduleKeys } from '@/lib/scheduleUtils';
import { isListingFeatured } from '@/lib/featured';
import { TrustESignChip } from '@/components/trust/TrustESignChip';
import { SmartImage } from '@/components/ui/SmartImage';

// Types for hourly schedule
interface TimeRange {
  start: string;
  end: string;
}

interface WeeklySchedule {
  mon?: TimeRange[];
  tue?: TimeRange[];
  wed?: TimeRange[];
  thu?: TimeRange[];
  fri?: TimeRange[];
  sat?: TimeRange[];
  sun?: TimeRange[];
}

type DayKey = keyof WeeklySchedule;

const DAY_ABBREV: Record<DayKey, string> = {
  mon: 'Mon',
  tue: 'Tue',
  wed: 'Wed',
  thu: 'Thu',
  fri: 'Fri',
  sat: 'Sat',
  sun: 'Sun',
};

const DAY_ORDER: DayKey[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

// Format time from 24h to 12h format
const formatTime12h = (time: string): string => {
  const hour = parseInt(time.split(':')[0]);
  if (hour === 0 || hour === 24) return '12AM';
  if (hour === 12) return '12PM';
  return hour > 12 ? `${hour - 12}PM` : `${hour}AM`;
};

// Get a summary of the hourly schedule for display
const getScheduleSummary = (schedule: WeeklySchedule | null | undefined): { daysText: string; hoursText: string } | null => {
  if (!schedule || typeof schedule !== 'object') return null;
  
  const activeDays: DayKey[] = [];
  let commonStart: string | null = null;
  let commonEnd: string | null = null;
  let hasHours = false;
  
  for (const day of DAY_ORDER) {
    const ranges = schedule[day];
    if (ranges && Array.isArray(ranges) && ranges.length > 0) {
      activeDays.push(day);
      hasHours = true;
      // Get the earliest start and latest end for a simple summary
      const firstRange = ranges[0];
      if (firstRange?.start && firstRange?.end) {
        if (!commonStart || firstRange.start < commonStart) commonStart = firstRange.start;
        if (!commonEnd || firstRange.end > commonEnd) commonEnd = firstRange.end;
      }
    }
  }
  
  if (!hasHours || activeDays.length === 0) return null;
  
  // Format days - check for consecutive runs
  let daysText = '';
  if (activeDays.length === 7) {
    daysText = 'Every day';
  } else if (activeDays.length === 5 && 
    activeDays.includes('mon') && activeDays.includes('tue') && 
    activeDays.includes('wed') && activeDays.includes('thu') && 
    activeDays.includes('fri') && !activeDays.includes('sat') && !activeDays.includes('sun')) {
    daysText = 'Weekdays';
  } else if (activeDays.length === 2 && 
    activeDays.includes('sat') && activeDays.includes('sun') && 
    !activeDays.includes('mon')) {
    daysText = 'Weekends';
  } else if (activeDays.length <= 3) {
    daysText = activeDays.map(d => DAY_ABBREV[d]).join(', ');
  } else {
    // Show first and last with count
    daysText = `${activeDays.length} days`;
  }
  
  // Format hours
  let hoursText = '';
  if (commonStart && commonEnd) {
    hoursText = `${formatTime12h(commonStart)}–${formatTime12h(commonEnd)}`;
  }
  
  return { daysText, hoursText };
};

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
  const [showOverlay, setShowOverlay] = useState(false);
  
  // Featured badge: dynamic, source of truth in src/lib/featured.ts
  const isFeatured = isListingFeatured(listing as any);


  // Safely format price with proper null handling
  const formatListingPrice = () => {
    if (listing.mode === 'rent') {
      if (listing.price_daily && listing.price_daily > 0) {
        return `$${listing.price_daily.toLocaleString()}/day`;
      }
      if (listing.price_hourly && listing.price_hourly > 0) {
        return `$${listing.price_hourly.toLocaleString()}/hr`;
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
  
  // Check if we should show hourly rate separately (when daily is the primary price)
  const showHourlyRate = listing.mode === 'rent' && 
    listing.price_hourly && 
    listing.price_hourly > 0 && 
    listing.price_daily && 
    listing.price_daily > 0;

  // Get hourly schedule summary for display (normalize keys for resilience)
  const rawSchedule = (listing as any).hourly_schedule as WeeklySchedule | null;
  const hourlySchedule = normalizeScheduleKeys(rawSchedule) as WeeklySchedule | null;
  const scheduleSummary = showHourlyRate || (listing.mode === 'rent' && listing.price_hourly && listing.price_hourly > 0)
    ? getScheduleSummary(hourlySchedule)
    : null;

  const modeLabel = listing.mode === 'rent' ? 'For Rent' : 'For Sale';
  const modeColor = listing.mode === 'rent' ? 'bg-primary' : 'bg-emerald-500';

  // Build consistent location: City, State — never show full street address on cards
  const raw = listing as any;
  const locationParts = [raw.city, raw.state].filter(Boolean);
  let location: string;
  if (locationParts.length > 0) {
    location = locationParts.join(', ') + (raw.postal_code ? ` ${raw.postal_code}` : '');
  } else if (listing.address) {
    // Fallback: extract city/state from address string (last 2 parts), never show street
    const addrParts = listing.address.split(',').map(s => s.trim());
    location = addrParts.length >= 2 
      ? addrParts.slice(-2).join(', ')
      : addrParts[addrParts.length - 1] || 'United States';
  } else {
    location = 'United States';
  }

  // Get displayable amenities (max 3 to leave room for Quick Book button)
  const maxAmenities = compact ? 2 : 3;
  const popularAmenities = (listing.amenities || []).filter(a => popularAmenityIcons[a]);
  const displayAmenities = popularAmenities.slice(0, maxAmenities);
  const remainingAmenitiesCount = (listing.amenities?.length || 0) - displayAmenities.length;

  return (
    <div
      data-listing-id={listing.id}
      className="relative rounded-2xl border-2 border-white/[0.10] hover:border-white/[0.22] hover:-translate-y-1.5 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] flex flex-col overflow-hidden h-full group shadow-xl shadow-black/40 hover:shadow-2xl hover:shadow-black/60 bg-card/60 backdrop-blur-sm"
    >
      <Link 
        to={`/listing/${listing.id}`} 
        className={cn("cursor-pointer block flex-1 flex flex-col", className)}
        onClick={() => {
          trackListingCardClick(listing.id, listing.category, 'listing_card');
          trackLeadEvent('listing_card_click', { listing_id: listing.id, category: listing.category });
        }}
      >
        {/* Image Container - Turo Look */}
        <div className={cn("relative w-full", compact ? "" : "")}>
          <SmartImage
            src={listing.cover_image_url || listing.image_urls[0]}
            alt={`${listing.title} - ${listing.category === 'food_truck' ? 'Food Truck' : listing.category === 'food_trailer' ? 'Food Trailer' : listing.category === 'ghost_kitchen' ? 'Shared Kitchen' : 'Vendor Space'} ${listing.mode === 'rent' ? 'for Rent' : 'for Sale'}`}
            aspect="4/3"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="group-hover:scale-105 transition-transform duration-500 ease-in-out"
          />
        
        
        
        
        {/* E-sign trust chip — every sale/rental agreement is signed online, free */}
        <div className="absolute bottom-2 left-2 z-10">
          <TrustESignChip variant="card" />
        </div>

        {/* Mode Badge */}
        <div className="absolute top-2 left-2 flex items-center gap-1.5">
          <Badge 
            className={cn(
              "font-semibold text-white border-0 uppercase tracking-[0.08em] backdrop-blur-md shadow-lg",
              modeColor,
              compact ? "text-[9px] px-2 py-0.5" : "text-[10px] px-2.5 py-1"
            )}
          >
            {modeLabel}
          </Badge>
          
          {/* Featured Badge — premium gold ribbon */}
          {isFeatured && (
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <FeaturedBadge variant="card" compact={compact} />
                  </span>
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
          <FavoriteButton listingId={listing.id} category={listing.category} size="sm" />
        </div>

        {/* Amenities Icons Overlay */}
        <div className={cn("absolute left-3 right-3 flex items-center justify-between", compact ? "bottom-2" : "bottom-3")}>
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
                        <div className={cn(
                          "bg-background/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm",
                          compact ? "w-6 h-6" : "w-7 h-7"
                        )}>
                          <IconComponent className={cn(compact ? "h-3 w-3" : "h-3.5 w-3.5", "text-foreground")} />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">
                        {amenity.label}
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
                {remainingAmenitiesCount > 0 && (
                  <div className={cn(
                    "bg-background/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm text-xs font-medium text-muted-foreground",
                    compact ? "w-6 h-6" : "w-7 h-7"
                  )}>
                    +{remainingAmenitiesCount}
                  </div>
                )}
              </TooltipProvider>
            )}
          </div>
          
          {/* Calendar & Quick Book Buttons */}
          {!compact && (
            <div className="flex items-center gap-1.5">
              {/* View Availability Button for Rentals (opens the same overlay as the inline CTA) */}
              {listing.mode === 'rent' && (
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        className="w-7 h-7 bg-background/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm hover:bg-primary hover:text-primary-foreground transition-colors"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          trackLeadEvent('listing_view_availability_click', {
                            listing_id: listing.id,
                            category: listing.category,
                            source: 'listing_card_icon',
                          });
                          setShowOverlay(true);
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
          )}
        </div>
        </div>

      {/* Content - Apple/OpenAI Cleanliness */}
      <div className={cn("p-4 space-y-2 flex-1 flex flex-col", compact && "p-3 space-y-1")}>
        {/* Location & Category */}
        <div className="flex items-center justify-between gap-2">
          <span className={cn("text-white/60 font-medium flex items-center gap-1", compact ? "text-xs" : "text-sm")}>
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
              <span className="bg-white/10 text-white/80 text-xs font-bold px-3 py-1 rounded-full cursor-help">
                {CATEGORY_LABELS[listing.category]}
              </span>
            </CategoryTooltip>
          )}
        </div>

        {/* Delivery Radius Badge */}
        {!compact && (listing.fulfillment_type === 'delivery' || listing.fulfillment_type === 'both') && listing.delivery_radius_miles && (
          <div className="flex items-center gap-1 text-xs text-white/50">
            <Truck className="h-3 w-3" />
            <span>Delivers within {listing.delivery_radius_miles} mi</span>
            {listing.delivery_fee && (
              <span className="text-white/80 font-medium">· ${listing.delivery_fee} fee</span>
            )}
          </div>
        )}

        {/* Title & Rating - Tracking Tight Typography */}
        <div className="flex items-center justify-between gap-2">
          <h3 className={cn(
            "text-lg font-semibold tracking-tight text-white line-clamp-1 group-hover:text-primary transition-colors",
            compact && "text-sm"
          )}>
            {listing.title}
          </h3>
          {!compact && <RatingBadge listingId={listing.id} />}
        </div>

        {/* Price + Micro-action — the only conversion surface on the card */}
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 mt-auto pt-1">
          <div className="flex items-baseline gap-2 flex-wrap min-w-0">
            <span className={cn("text-white font-bold tracking-tight tabular-nums", compact ? "text-base" : "text-xl")}>
              {price}
            </span>
            {showHourlyRate && (
              <span className={cn("text-white/50 font-medium", compact ? "text-xs" : "text-xs")}>
                ${listing.price_hourly}/hr
              </span>
            )}
            {!compact && listing.mode === 'rent' && listing.price_weekly && (
              <span className="text-xs text-white/50 font-medium">
                ${listing.price_weekly}/week
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              trackLeadEvent(
                listing.mode === 'sale'
                  ? 'listing_start_purchase_click'
                  : 'listing_view_availability_click',
                {
                  listing_id: listing.id,
                  category: listing.category,
                  price: listing.mode === 'sale' ? listing.price_sale : listing.price_daily,
                  source: 'listing_card',
                },
              );
              setShowOverlay(true);
            }}
            className="group/cta relative z-10 inline-flex items-center gap-1 text-[13px] font-medium text-[#f97316] hover:text-[#fb923c] whitespace-nowrap shrink-0 transition-colors"
          >
            <span>{listing.mode === 'sale' ? 'Start purchase' : 'View availability'}</span>
            <ArrowRight className="h-3.5 w-3.5 transition-transform duration-150 ease-out group-hover/cta:translate-x-1 group-hover/cta:text-[#fb923c]" />
          </button>
        </div>

        
        {/* Hourly Schedule Summary - shows available days/hours for hourly rentals */}
        {scheduleSummary && (
          <div className={cn(
            "flex items-center gap-1.5 text-white/50",
            compact ? "text-[10px]" : "text-xs"
          )}>
            <Clock className={cn("shrink-0", compact ? "h-3 w-3" : "h-3.5 w-3.5")} />
            <span>{scheduleSummary.daysText}</span>
            {scheduleSummary.hoursText && (
              <>
                <span className="text-white/30">•</span>
                <span>{scheduleSummary.hoursText}</span>
              </>
            )}
          </div>
        )}
      </div>
      </Link>

      {/* Conversion overlay (sale or rent) */}
      <ListingCardOverlay
        open={showOverlay}
        onClose={() => setShowOverlay(false)}
        listing={listing}
      />
    </div>
  );
};

export default ListingCard;
