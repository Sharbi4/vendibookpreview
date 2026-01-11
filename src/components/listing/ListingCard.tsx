import { Heart } from 'lucide-react';
import { Listing, categoryLabels } from '@/types/listing';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ListingCardProps {
  listing: Listing;
  className?: string;
}

const ListingCard = ({ listing, className }: ListingCardProps) => {
  const price = listing.mode === 'rent' 
    ? `$${listing.priceDaily}/day`
    : `$${listing.priceSale?.toLocaleString()}`;

  const modeLabel = listing.mode === 'rent' ? 'For Rent' : 'For Sale';
  const modeColor = listing.mode === 'rent' ? 'bg-primary' : 'bg-emerald-500';

  return (
    <div className={cn("group cursor-pointer card-hover", className)}>
      {/* Image Container */}
      <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-muted">
        <img
          src={listing.images[0]}
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
          <span className="text-sm text-muted-foreground">
            {listing.city}, {listing.state}
          </span>
          <span className="text-xs px-2 py-1 bg-secondary rounded-full text-muted-foreground">
            {categoryLabels[listing.category]}
          </span>
        </div>

        {/* Title */}
        <h3 className="font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
          {listing.title}
        </h3>

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
  );
};

export default ListingCard;
