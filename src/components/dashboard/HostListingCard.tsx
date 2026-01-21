import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Edit2, Eye, Pause, Play, Trash2, Calendar, Heart, Check, X, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CATEGORY_LABELS } from '@/types/listing';
import AvailabilityCalendar from './AvailabilityCalendar';
import { useListingFavoriteCount } from '@/hooks/useFavorites';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Tables } from '@/integrations/supabase/types';

type Listing = Tables<'listings'>;

interface HostListingCardProps {
  listing: Listing;
  onPause?: (id: string) => void;
  onPublish?: (id: string) => void;
  onDelete?: (id: string) => void;
  onPriceUpdate?: (id: string, newPrice: number) => void;
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

const HostListingCard = ({ listing, onPause, onPublish, onDelete, onPriceUpdate }: HostListingCardProps) => {
  const [showCalendar, setShowCalendar] = useState(false);
  const [isEditingPrice, setIsEditingPrice] = useState(false);
  const [editedPrice, setEditedPrice] = useState(listing.price_sale?.toString() || '');
  const [isSaving, setIsSaving] = useState(false);
  const { data: favoriteCount = 0 } = useListingFavoriteCount(listing.id);
  const { toast } = useToast();
  
  const displayPrice = listing.mode === 'rent' 
    ? `$${listing.price_daily}/day` 
    : `$${listing.price_sale?.toLocaleString()}`;

  const location = listing.address || listing.pickup_location_text || 'No location set';
  const isRental = listing.mode === 'rent';
  const isSale = listing.mode === 'sale';

  const handleSavePrice = async () => {
    const newPrice = parseFloat(editedPrice);
    if (isNaN(newPrice) || newPrice <= 0) {
      toast({
        title: 'Invalid price',
        description: 'Please enter a valid price greater than 0',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('listings')
        .update({ price_sale: newPrice, updated_at: new Date().toISOString() })
        .eq('id', listing.id);

      if (error) throw error;

      toast({
        title: 'Price updated',
        description: `Sale price updated to $${newPrice.toLocaleString()}`,
      });
      
      setIsEditingPrice(false);
      onPriceUpdate?.(listing.id, newPrice);
    } catch (error) {
      console.error('Error updating price:', error);
      toast({
        title: 'Error',
        description: 'Failed to update price',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditedPrice(listing.price_sale?.toString() || '');
    setIsEditingPrice(false);
  };

  return (
    <>
      <div className="rounded-2xl border-0 shadow-xl bg-card overflow-hidden hover:shadow-2xl transition-all">
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

              <div className="flex items-center gap-3 text-sm flex-wrap">
                {isSale && isEditingPrice ? (
                  <div className="flex items-center gap-1">
                    <div className="relative">
                      <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        type="number"
                        value={editedPrice}
                        onChange={(e) => setEditedPrice(e.target.value)}
                        className="w-28 h-7 pl-6 text-sm"
                        autoFocus
                        disabled={isSaving}
                      />
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                      onClick={handleSavePrice}
                      disabled={isSaving}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={handleCancelEdit}
                      disabled={isSaving}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <span 
                    className={`text-primary font-semibold ${isSale ? 'cursor-pointer hover:underline' : ''}`}
                    onClick={() => isSale && setIsEditingPrice(true)}
                    title={isSale ? 'Click to edit price' : undefined}
                  >
                    {displayPrice}
                  </span>
                )}
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
            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border flex-wrap">
              <Button variant="outline" size="sm" asChild>
                <Link to={`/listing/${listing.id}`}>
                  <Eye className="h-4 w-4 mr-1" />
                  View
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
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
                >
                  <Pause className="h-4 w-4 mr-1" />
                  Pause
                </Button>
              )}
              {(listing.status === 'draft' || listing.status === 'paused') && onPublish && (
                <Button 
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
