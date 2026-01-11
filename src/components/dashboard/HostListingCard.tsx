import { Link } from 'react-router-dom';
import { Edit2, Eye, Pause, Play, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CATEGORY_LABELS } from '@/types/listing';
import type { Tables } from '@/integrations/supabase/types';

type Listing = Tables<'listings'>;

interface HostListingCardProps {
  listing: Listing;
  onPause?: (id: string) => void;
  onPublish?: (id: string) => void;
  onDelete?: (id: string) => void;
}

const StatusPill = ({ status }: { status: Listing['status'] }) => {
  const styles = {
    draft: 'bg-muted text-muted-foreground',
    published: 'bg-emerald-100 text-emerald-700',
    paused: 'bg-amber-100 text-amber-700',
  };

  const labels = {
    draft: 'Draft',
    published: 'Published',
    paused: 'Paused',
  };

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  );
};

const HostListingCard = ({ listing, onPause, onPublish, onDelete }: HostListingCardProps) => {
  const displayPrice = listing.mode === 'rent' 
    ? `$${listing.price_daily}/day` 
    : `$${listing.price_sale?.toLocaleString()}`;

  const location = listing.address || listing.pickup_location_text || 'No location set';

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden card-hover">
      <div className="flex flex-col sm:flex-row">
        {/* Image */}
        <div className="sm:w-48 h-40 sm:h-auto flex-shrink-0">
          <img
            src={listing.cover_image_url || '/placeholder.svg'}
            alt={listing.title}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Content */}
        <div className="flex-1 p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <h3 className="font-semibold text-foreground line-clamp-1">{listing.title}</h3>
                <p className="text-sm text-muted-foreground">{location}</p>
              </div>
              <StatusPill status={listing.status} />
            </div>

            <div className="flex items-center gap-3 text-sm">
              <span className="text-primary font-semibold">{displayPrice}</span>
              <span className="text-muted-foreground">•</span>
              <span className="text-muted-foreground capitalize">
                {CATEGORY_LABELS[listing.category]}
              </span>
              <span className="text-muted-foreground">•</span>
              <span className="text-muted-foreground capitalize">
                For {listing.mode === 'rent' ? 'Rent' : 'Sale'}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border">
            <Button variant="outline" size="sm" asChild>
              <Link to={`/listing/${listing.id}`}>
                <Eye className="h-4 w-4 mr-1" />
                View
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to={`/edit-listing/${listing.id}`}>
                <Edit2 className="h-4 w-4 mr-1" />
                Edit
              </Link>
            </Button>
            {listing.status === 'published' && onPause && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => onPause(listing.id)}
              >
                <Pause className="h-4 w-4 mr-1" />
                Pause
              </Button>
            )}
            {(listing.status === 'draft' || listing.status === 'paused') && onPublish && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => onPublish(listing.id)}
              >
                <Play className="h-4 w-4 mr-1" />
                Publish
              </Button>
            )}
            {onDelete && (
              <Button 
                variant="ghost" 
                size="sm"
                className="text-destructive hover:text-destructive hover:bg-destructive/10 ml-auto"
                onClick={() => onDelete(listing.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HostListingCard;
