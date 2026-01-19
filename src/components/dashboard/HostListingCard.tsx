import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Edit2, Eye, Pause, Play, Trash2, Calendar, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CATEGORY_LABELS } from '@/types/listing';
import AvailabilityCalendar from './AvailabilityCalendar';
import { useListingFavoriteCount } from '@/hooks/useFavorites';
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
  const [showCalendar, setShowCalendar] = useState(false);
  const { data: favoriteCount = 0 } = useListingFavoriteCount(listing.id);
  
  const displayPrice = listing.mode === 'rent' 
    ? `$${listing.price_daily}/day` 
    : `$${listing.price_sale?.toLocaleString()}`;

  const location = listing.address || listing.pickup_location_text || 'No location set';
  const isRental = listing.mode === 'rent';

  return (
    <>
      <div className="relative overflow-hidden rounded-xl border-2 border-primary/30 bg-gradient-to-br from-primary/10 via-amber-500/10 to-yellow-400/10 card-hover">
        {/* Animated background */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-yellow-400/5 animate-pulse" />
        
        <div className="relative flex flex-col sm:flex-row">
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

              <div className="flex items-center gap-3 text-sm flex-wrap">
                <span className="text-primary font-semibold">{displayPrice}</span>
                <span className="text-muted-foreground">•</span>
                <span className="text-muted-foreground capitalize">
                  {CATEGORY_LABELS[listing.category]}
                </span>
                <span className="text-muted-foreground">•</span>
                <span className="text-muted-foreground capitalize">
                  For {listing.mode === 'rent' ? 'Rent' : 'Sale'}
                </span>
                {listing.view_count !== null && listing.view_count > 0 && (
                  <>
                    <span className="text-muted-foreground">•</span>
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Eye className="h-3.5 w-3.5" />
                      {listing.view_count.toLocaleString()} views
                    </span>
                  </>
                )}
                {favoriteCount > 0 && (
                  <>
                    <span className="text-muted-foreground">•</span>
                    <span className="flex items-center gap-1 text-red-500">
                      <Heart className="h-3.5 w-3.5 fill-red-500" />
                      {favoriteCount} saved
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-primary/20 flex-wrap">
              <Button variant="outline" size="sm" asChild className="bg-card/80 backdrop-blur-sm">
                <Link to={`/listing/${listing.id}`}>
                  <Eye className="h-4 w-4 mr-1" />
                  View
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild className="bg-card/80 backdrop-blur-sm">
                <Link to={`/create-listing/${listing.id}`}>
                  <Edit2 className="h-4 w-4 mr-1" />
                  Edit
                </Link>
              </Button>
              {isRental && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowCalendar(true)}
                  className="bg-card/80 backdrop-blur-sm"
                >
                  <Calendar className="h-4 w-4 mr-1" />
                  Availability
                </Button>
              )}
              {listing.status === 'published' && onPause && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => onPause(listing.id)}
                  className="bg-card/80 backdrop-blur-sm"
                >
                  <Pause className="h-4 w-4 mr-1" />
                  Pause
                </Button>
              )}
              {(listing.status === 'draft' || listing.status === 'paused') && onPublish && (
                <Button 
                  size="sm"
                  onClick={() => onPublish(listing.id)}
                  className="bg-gradient-to-r from-primary to-amber-500 hover:from-primary/90 hover:to-amber-500/90 text-white border-0 shadow-md"
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

      {/* Availability Calendar Modal */}
      {showCalendar && (
        <AvailabilityCalendar 
          listing={listing} 
          onClose={() => setShowCalendar(false)} 
        />
      )}
    </>
  );
};

export default HostListingCard;
