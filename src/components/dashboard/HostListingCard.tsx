import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Edit2, Eye, Pause, Play, Trash2, Calendar, Heart, Check, X, DollarSign,
  Star, Shield, Loader2, Share2, MoreHorizontal, Copy as CopyIcon, Archive,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CATEGORY_LABELS } from '@/types/listing';
import AvailabilityCalendar from './AvailabilityCalendar';
import { useListingFavoriteCount } from '@/hooks/useFavorites';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import type { Tables } from '@/integrations/supabase/types';
import { Badge } from '@/components/ui/badge';
import { FeaturedListingModal } from './FeaturedListingModal';
import ShareKitModal from './ShareKitModal';
import { isListingFeatured } from '@/lib/featured';

type Listing = Tables<'listings'>;

interface HostListingCardProps {
  listing: Listing;
  onPause?: (id: string) => void;
  onPublish?: (id: string) => void;
  onUnpause?: (id: string) => void;
  onDelete?: (id: string) => void;
  onDuplicate?: (id: string) => void;
  onArchive?: (id: string) => void;
  onPriceUpdate?: (id: string, newPrice: number) => void;
}

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  published: 'bg-emerald-100 text-emerald-700',
  paused: 'bg-amber-100 text-amber-700',
  archived: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
};
const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  published: 'Published',
  paused: 'Paused',
  archived: 'Archived',
};

const StatusPill = ({ status }: { status: Listing['status'] }) => (
  <span
    className={`px-3 py-1 rounded-full text-xs font-medium ${
      STATUS_STYLES[status] ?? 'bg-muted text-muted-foreground'
    }`}
  >
    {STATUS_LABELS[status] ?? status}
  </span>
);

const HostListingCard = ({
  listing, onPause, onPublish, onUnpause, onDelete, onDuplicate, onArchive, onPriceUpdate,
}: HostListingCardProps) => {
  const [showCalendar, setShowCalendar] = useState(false);
  const [showFeaturedModal, setShowFeaturedModal] = useState(false);
  const [showShareKit, setShowShareKit] = useState(false);
  const [isEditingPrice, setIsEditingPrice] = useState(false);
  const [editedPrice, setEditedPrice] = useState(listing.price_sale?.toString() || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingNotary, setIsLoadingNotary] = useState(false);
  const { data: favoriteCount = 0 } = useListingFavoriteCount(listing.id);
  const { toast } = useToast();
  const { user } = useAuth();

  const isSale = listing.mode === 'sale';
  const isPublished = listing.status === 'published';
  const isPaused = listing.status === 'paused';
  const isFeatured = isListingFeatured(listing as any);
  const hasNotary = (listing as any).proof_notary_enabled;

  const handleFeaturedClick = () => {
    if (!isPublished) {
      toast({
        title: 'Listing must be published',
        description: 'Please publish your listing first before adding the Featured add-on.',
        variant: 'destructive',
      });
      return;
    }
    setShowFeaturedModal(true);
  };

  const handleNotaryCheckout = async () => {
    if (!isPublished) {
      toast({
        title: 'Listing must be published',
        description: 'Please publish your listing first before adding Proof Notary.',
        variant: 'destructive',
      });
      return;
    }
    setIsLoadingNotary(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-notary-checkout', {
        body: { listing_id: listing.id },
      });
      if (error) throw error;
      if (data?.url) window.open(data.url, '_blank');
    } catch (error) {
      console.error('Notary checkout error:', error);
      toast({
        title: 'Error',
        description: 'Failed to start checkout. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingNotary(false);
    }
  };

  const displayPrice = listing.mode === 'rent'
    ? `$${listing.price_daily}/day`
    : `$${listing.price_sale?.toLocaleString()}`;

  const location = listing.address || listing.pickup_location_text || 'No location set';
  const isRental = listing.mode === 'rent';

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
        .eq('id', listing.id)
        .eq('host_id', user?.id ?? ''); // defense-in-depth alongside RLS
      if (error) throw error;
      toast({
        title: 'Price updated',
        description: `Sale price updated to $${newPrice.toLocaleString()}`,
      });
      setIsEditingPrice(false);
      onPriceUpdate?.(listing.id, newPrice);
    } catch (error) {
      console.error('Error updating price:', error);
      toast({ title: 'Error', description: 'Failed to update price', variant: 'destructive' });
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
      <div className="rounded-2xl border border-border shadow-md bg-card overflow-hidden hover:shadow-lg transition-all">
        <div className="flex flex-col sm:flex-row">
          <div className="sm:w-48 h-40 sm:h-auto flex-shrink-0">
            <img
              src={listing.cover_image_url || '/placeholder.svg'}
              alt={listing.title}
              className="w-full h-full object-cover"
            />
          </div>

          <div className="flex-1 p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-foreground line-clamp-1">{listing.title}</h3>
                    {isFeatured && (
                      <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-xs">
                        <Star className="w-3 h-3 mr-1 fill-current" />
                        Featured
                      </Badge>
                    )}
                    {hasNotary && isSale && (
                      <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-xs">
                        <Shield className="w-3 h-3 mr-1" />
                        Notary
                      </Badge>
                    )}
                  </div>
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
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50" onClick={handleSavePrice} disabled={isSaving}>
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={handleCancelEdit} disabled={isSaving}>
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

            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border flex-wrap">
              <Button variant="outline" size="sm" className="h-9 rounded-xl" asChild>
                <Link to={`/listing/${listing.id}`}>
                  <Eye className="h-4 w-4 mr-1.5" />
                  View
                </Link>
              </Button>
              <Button variant="outline" size="sm" className="h-9 rounded-xl" asChild>
                <Link to={`/create-listing/${listing.id}`}>
                  <Edit2 className="h-4 w-4 mr-1.5" />
                  Edit
                </Link>
              </Button>
              {isPublished && (
                <Button variant="outline" size="sm" className="h-9 rounded-xl" onClick={() => setShowShareKit(true)}>
                  <Share2 className="h-4 w-4 mr-1.5" />
                  Share
                </Button>
              )}
              {isRental && (
                <Button variant="outline" size="sm" className="h-9 rounded-xl" onClick={() => setShowCalendar(true)}>
                  <Calendar className="h-4 w-4 mr-1.5" />
                  Availability
                </Button>
              )}
              {isPublished && !isFeatured && (
                <Button variant="outline" size="sm" onClick={handleFeaturedClick} className="h-9 rounded-xl">
                  <Star className="h-4 w-4 mr-1.5" />
                  Boost
                </Button>
              )}
              {isPublished && isSale && !hasNotary && (
                <Button variant="outline" size="sm" onClick={handleNotaryCheckout} disabled={isLoadingNotary} className="h-9 rounded-xl">
                  {isLoadingNotary ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                    <>
                      <Shield className="h-4 w-4 mr-1.5" />
                      Notary
                    </>
                  )}
                </Button>
              )}

              <div className="flex-1" />

              {/* Status actions */}
              {isPublished && onPause && (
                <Button variant="outline" size="sm" className="h-9 rounded-xl" onClick={() => onPause(listing.id)}>
                  <Pause className="h-4 w-4 mr-1.5" />
                  Pause
                </Button>
              )}
              {isPaused && (onUnpause || onPublish) && (
                <Button variant="outline" size="sm" className="h-9 rounded-xl" onClick={() => (onUnpause ?? onPublish!)(listing.id)}>
                  <Play className="h-4 w-4 mr-1.5" />
                  Resume
                </Button>
              )}
              {listing.status === 'draft' && onPublish && (
                <Button variant="outline" size="sm" className="h-9 rounded-xl" onClick={() => onPublish(listing.id)}>
                  <Play className="h-4 w-4 mr-1.5" />
                  Publish
                </Button>
              )}
              {listing.status === 'archived' && onPublish && (
                <Button variant="outline" size="sm" className="h-9 rounded-xl" onClick={() => onPublish(listing.id)}>
                  <Play className="h-4 w-4 mr-1.5" />
                  Republish
                </Button>
              )}

              {/* Overflow menu — duplicate / archive / delete */}
              {(onDuplicate || onArchive || onDelete) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    {onDuplicate && (
                      <DropdownMenuItem onClick={() => onDuplicate(listing.id)} className="gap-2">
                        <CopyIcon className="h-4 w-4" /> Duplicate
                      </DropdownMenuItem>
                    )}
                    {onArchive && listing.status !== 'archived' && (
                      <DropdownMenuItem onClick={() => onArchive(listing.id)} className="gap-2">
                        <Archive className="h-4 w-4" /> Archive
                      </DropdownMenuItem>
                    )}
                    {onDelete && (
                      <>
                        <DropdownMenuSeparator />
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem
                              onSelect={(e) => e.preventDefault()}
                              className="gap-2 text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete this listing?</AlertDialogTitle>
                              <AlertDialogDescription>
                                "{listing.title}" will be permanently removed. This can't be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => onDelete(listing.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </div>
      </div>

      {showCalendar && (
        <AvailabilityCalendar listing={listing} onClose={() => setShowCalendar(false)} />
      )}

      <FeaturedListingModal
        open={showFeaturedModal}
        onOpenChange={setShowFeaturedModal}
        listingId={listing.id}
        listingTitle={listing.title}
      />

      <ShareKitModal open={showShareKit} onOpenChange={setShowShareKit} listing={listing} />
    </>
  );
};

export default HostListingCard;
