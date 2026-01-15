import { useNavigate } from 'react-router-dom';
import { Listing, CATEGORY_LABELS } from '@/types/listing';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { MapPin, Calendar, ExternalLink, Navigation } from 'lucide-react';
import VerificationBadge from '@/components/verification/VerificationBadge';

interface ListingWithDistance extends Listing {
  distance_miles?: number;
}

interface ListingPreviewDrawerProps {
  listing: ListingWithDistance | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hostVerified?: boolean;
}

const ListingPreviewDrawer = ({
  listing,
  open,
  onOpenChange,
  hostVerified = false,
}: ListingPreviewDrawerProps) => {
  const navigate = useNavigate();

  if (!listing) return null;

  const price =
    listing.mode === 'rent'
      ? `$${listing.price_daily}/day`
      : `$${listing.price_sale?.toLocaleString()}`;

  const locationDisplay = listing.address
    ?.split(',')
    .slice(-2)
    .join(',')
    .trim() || 'Location TBD';

  const handleViewDetails = () => {
    onOpenChange(false);
    navigate(`/listing/${listing.id}`);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="text-left">
          <SheetTitle className="sr-only">Listing Preview</SheetTitle>
          <SheetDescription className="sr-only">
            Preview of {listing.title}
          </SheetDescription>
        </SheetHeader>

        {/* Image */}
        <div className="relative -mx-6 -mt-6 mb-4">
          <img
            src={listing.cover_image_url || listing.image_urls?.[0] || '/placeholder.svg'}
            alt={listing.title}
            className="w-full h-56 object-cover"
          />
          <div className="absolute top-3 left-3 flex gap-2">
            <Badge variant={listing.mode === 'rent' ? 'default' : 'secondary'}>
              {listing.mode === 'rent' ? 'For Rent' : 'For Sale'}
            </Badge>
            <Badge variant="outline" className="bg-background/80">
              {CATEGORY_LABELS[listing.category]}
            </Badge>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-4">
          {/* Title & Price */}
          <div>
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-xl font-semibold text-foreground line-clamp-2">
                {listing.title}
              </h3>
              {hostVerified && <VerificationBadge isVerified={true} size="sm" />}
            </div>
            <p className="text-2xl font-bold text-primary mt-1">{price}</p>
            {listing.mode === 'rent' && listing.price_weekly && (
              <p className="text-sm text-muted-foreground">
                ${listing.price_weekly}/week
              </p>
            )}
          </div>

          {/* Location */}
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-4 w-4 shrink-0" />
            <span className="text-sm">{locationDisplay}</span>
          </div>

          {/* Distance */}
          {listing.distance_miles !== undefined && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Navigation className="h-4 w-4 shrink-0" />
              <span className="text-sm">
                {listing.distance_miles.toFixed(1)} miles away
              </span>
            </div>
          )}

          {/* Availability */}
          {listing.mode === 'rent' && (listing.available_from || listing.available_to) && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4 shrink-0" />
              <span className="text-sm">
                {listing.available_from && listing.available_to
                  ? `Available ${new Date(listing.available_from).toLocaleDateString()} - ${new Date(listing.available_to).toLocaleDateString()}`
                  : listing.available_from
                  ? `Available from ${new Date(listing.available_from).toLocaleDateString()}`
                  : `Available until ${new Date(listing.available_to!).toLocaleDateString()}`}
              </span>
            </div>
          )}

          {/* Description */}
          <div>
            <h4 className="text-sm font-medium text-foreground mb-1">Description</h4>
            <p className="text-sm text-muted-foreground line-clamp-4">
              {listing.description}
            </p>
          </div>

          {/* Highlights */}
          {listing.highlights && listing.highlights.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-foreground mb-2">Highlights</h4>
              <ul className="space-y-1">
                {listing.highlights.slice(0, 4).map((highlight, index) => (
                  <li
                    key={index}
                    className="text-sm text-muted-foreground flex items-center gap-2"
                  >
                    <span className="w-1.5 h-1.5 bg-primary rounded-full shrink-0" />
                    {highlight}
                  </li>
                ))}
                {listing.highlights.length > 4 && (
                  <li className="text-sm text-muted-foreground italic">
                    +{listing.highlights.length - 4} more
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* View Details Button */}
          <Button onClick={handleViewDetails} className="w-full mt-4" size="lg">
            <ExternalLink className="h-4 w-4 mr-2" />
            View Full Details
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ListingPreviewDrawer;
