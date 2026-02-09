import React from 'react';
import { Heart, MapPin, Plug, Zap, Droplet, Refrigerator, Flame, Wind, Wifi, Car, Shield, Sun, Truck, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { CATEGORY_LABELS, ListingCategory, FulfillmentType } from '@/types/listing';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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
      const firstRange = ranges[0];
      if (firstRange?.start && firstRange?.end) {
        if (!commonStart || firstRange.start < commonStart) commonStart = firstRange.start;
        if (!commonEnd || firstRange.end > commonEnd) commonEnd = firstRange.end;
      }
    }
  }
  
  if (!hasHours || activeDays.length === 0) return null;
  
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
    daysText = `${activeDays.length} days`;
  }
  
  let hoursText = '';
  if (commonStart && commonEnd) {
    hoursText = `${formatTime12h(commonStart)}–${formatTime12h(commonEnd)}`;
  }
  
  return { daysText, hoursText };
};

interface ListingCardPreviewProps {
  listing: {
    title: string;
    mode: 'rent' | 'sale' | null;
    category: ListingCategory | null;
    images: string[];
    priceHourly: string;
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
    hourlySchedule?: WeeklySchedule | null;
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
  // Determine primary price display
  const price = listing.mode === 'rent' 
    ? listing.priceDaily 
      ? `$${listing.priceDaily}/day` 
      : listing.priceHourly 
        ? `$${listing.priceHourly}/hr`
        : '$--/day'
    : listing.priceSale ? `$${parseFloat(listing.priceSale).toLocaleString()}` : '$--';

  // Show hourly rate separately when daily is the primary
  const showHourlyRate = listing.mode === 'rent' && 
    listing.priceHourly && 
    parseFloat(listing.priceHourly) > 0 && 
    listing.priceDaily && 
    parseFloat(listing.priceDaily) > 0;

  // Get schedule summary for hourly rentals
  const scheduleSummary = (showHourlyRate || (listing.mode === 'rent' && listing.priceHourly && parseFloat(listing.priceHourly) > 0))
    ? getScheduleSummary(listing.hourlySchedule)
    : null;

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
      <div className="text-xs text-gray-500 text-center mb-3 font-medium uppercase tracking-wider">
        Card Preview (Search Results)
      </div>
      
      {/* Premium Apple/Turo Card Container */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_12px_24px_rgba(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-300 ease-out flex flex-col overflow-hidden h-full group">
        {/* Image Container - Turo Look */}
        <div className="relative aspect-[4/3] w-full bg-gray-50 overflow-hidden">
          {coverImage ? (
            <img
              src={coverImage}
              alt={listing.title || 'Listing preview'}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-in-out"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-50">
              <span className="text-gray-500 text-sm">No image uploaded</span>
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

        {/* Content - Apple/OpenAI Typography */}
        <div className="p-4 space-y-2 flex-1 flex flex-col">
          {/* Location & Category */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm text-gray-500 font-medium flex items-center gap-1 truncate">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{location}</span>
            </span>
            {listing.category && (
              <span className="bg-gray-100 text-gray-900 text-xs font-bold px-3 py-1 rounded-full shrink-0">
                {CATEGORY_LABELS[listing.category]}
              </span>
            )}
          </div>

          {/* Delivery Radius Badge */}
          {(listing.fulfillmentType === 'delivery' || listing.fulfillmentType === 'both') && listing.deliveryRadiusMiles && (
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Truck className="h-3 w-3" />
              <span>Delivers within {listing.deliveryRadiusMiles} mi</span>
              {listing.deliveryFee && parseFloat(listing.deliveryFee) > 0 && (
                <span className="text-gray-900 font-medium">· ${listing.deliveryFee} fee</span>
              )}
            </div>
          )}

          {/* Title - Tracking Tight */}
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-lg font-semibold tracking-tight text-gray-900 line-clamp-1">
              {listing.title || 'Untitled Listing'}
            </h3>
            {/* Placeholder rating */}
            <div className="flex items-center gap-1 text-xs text-gray-500 shrink-0">
              <span className="text-amber-500">★</span>
              <span>New</span>
            </div>
          </div>

          {/* Price - Pill Badge Style */}
          <div className="flex items-center gap-2 flex-wrap mt-auto pt-1">
            <span className="bg-gray-100 text-gray-900 text-sm font-bold px-3 py-1 rounded-full">
              {price}
            </span>
            {showHourlyRate && (
              <span className="text-sm text-gray-500 font-medium">
                ${listing.priceHourly}/hr
              </span>
            )}
            {listing.mode === 'rent' && listing.priceWeekly && (
              <span className="text-sm text-gray-500 font-medium">
                ${listing.priceWeekly}/week
              </span>
            )}
          </div>
          
          {/* Hourly Schedule Summary */}
          {scheduleSummary && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5 shrink-0" />
              <span>{scheduleSummary.daysText}</span>
              {scheduleSummary.hoursText && (
                <>
                  <span className="text-muted-foreground/50">•</span>
                  <span>{scheduleSummary.hoursText}</span>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
