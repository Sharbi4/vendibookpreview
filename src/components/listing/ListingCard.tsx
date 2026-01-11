import { Heart, MapPin } from 'lucide-react';
import { Listing, CATEGORY_LABELS } from '@/types/listing';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import RatingBadge from '@/components/reviews/RatingBadge';

interface ListingCardProps {
  listing: Listing;
  className?: string;
}

const ListingCard = ({ listing, className }: ListingCardProps) => {
  const price = listing.mode === 'rent' 
    ? `$${listing.price_daily}/day`
    : `$${listing.price_sale?.toLocaleString()}`;

  const modeLabel = listing.mode === 'rent' ? 'For Rent' : 'For Sale';
  const modeColor = listing.mode === 'rent' ? 'bg-primary' : 'bg-emerald-500';

  // Get location from pickup_location_text or address
  const location = listing.pickup_location_text || listing.address?.split(',').slice(-2).join(',').trim() || 'Location TBD';

  return (
    <div className={cn("group cursor-pointer card-hover", className)}>
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

        {/* Favorite Button */}
        <button 
          className="absolute top-3 right-3 p-2 rounded-full bg-white/80 hover:bg-white transition-colors shadow-sm"
          onClick={(e) => {
            e.stopPropagation();
            // Handle favorite
          }}
        >
          <Heart className="h-4 w-4 text-foreground" />
        </button>
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
    </div>
  );
};

export default ListingCard;
