import { productCheckoutUrl, hostedCheckoutUrl } from '@/lib/payments/hostedCheckout';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Edit2,
  Eye,
  Pause,
  Play,
  Trash2,
  Calendar,
  Heart,
  Star,
  Shield,
  Loader2,
  Share2,
  MoreHorizontal,
  Copy as CopyIcon,
  Archive,
  Flame,
  Rocket,
  FileEdit,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CATEGORY_LABELS } from '@/types/listing';
import AvailabilityCalendar from './AvailabilityCalendar';
import { useListingFavoriteCount } from '@/hooks/useFavorites';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Tables } from '@/integrations/supabase/types';
import { Badge } from '@/components/ui/badge';
import { PromoteListingModal } from './PromoteListingModal';
import { ListingUpgradesDialog } from '@/components/monetization/ListingUpgradesDialog';
import ShareKitModal from './ShareKitModal';
import { isListingFeatured } from '@/lib/featured';
import { FeaturedBadge } from '@/components/listing/FeaturedBadge';
import { canBoostListing, canRepublishListing } from '@/lib/listings/publicVisibility';
import { useNavigate } from 'react-router-dom';

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
  draft: 'bg-muted text-muted-foreground border-border',
  published:
    'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
  paused: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
  archived:
    'bg-slate-500/10 text-slate-300 border-slate-500/30',
};
const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  published: 'Published',
  paused: 'Paused',
  archived: 'Archived',
};

const StatusPill = ({ status }: { status: Listing['status'] }) => (
  <span
    className={`inline-flex items-center px-2.5 py-1 rounded-full border text-[11px] font-medium tracking-wide uppercase ${
      STATUS_STYLES[status] ?? 'bg-muted text-muted-foreground border-border'
    }`}
  >
    {STATUS_LABELS[status] ?? status}
  </span>
);

const HostListingCard = ({
  listing,
  onPause,
  onPublish,
  onUnpause,
  onDelete,
  onDuplicate,
  onArchive,
}: HostListingCardProps) => {
  const [showCalendar, setShowCalendar] = useState(false);
  const [showFeaturedModal, setShowFeaturedModal] = useState(false);
  const [showShareKit, setShowShareKit] = useState(false);
  const [showUpgrades, setShowUpgrades] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isLoadingNotary, setIsLoadingNotary] = useState(false);
  const { data: favoriteCount = 0 } = useListingFavoriteCount(listing.id);
  const { toast } = useToast();
  const navigate = useNavigate();

  const isSale = listing.mode === 'sale';
  const isPublished = listing.status === 'published';
  const isPaused = listing.status === 'paused';
  const isDraft = listing.status === 'draft';
  const isArchived = listing.status === 'archived';
  const isFeatured = isListingFeatured(listing as any);
  const hasNotary = (listing as { proof_notary_enabled?: boolean })
    .proof_notary_enabled;
  const isRental = listing.mode === 'rent';

  // Paid promotion eligibility mirrors public visibility exactly: no boosts on
  // paused, removed, deleted, archived, rejected, suspended or expired listings.
  const canBoost = canBoostListing(listing as never);
  const canRepublish = canRepublishListing(listing as never);

  const handleFeaturedClick = () => {
    if (!canBoost) {
      toast({
        title: canRepublish ? 'Republish first to boost' : 'Boost unavailable',
        description: canRepublish
          ? 'Republish this listing to make it available, then boost it.'
          : 'Boost requires a live, published listing.',
        variant: 'destructive',
      });
      return;
    }
    setShowFeaturedModal(true);
  };

  const handleNotaryCheckout = async () => {
    if (!canBoost) {
      toast({
        title: 'Publish first to add Notary',
        description: 'Proof Notary requires a published listing.',
        variant: 'destructive',
      });
      return;
    }
    setIsLoadingNotary(true);
    try {
      const data = { url: hostedCheckoutUrl('notary', listing.id, { label: 'Proof Notary' }) };
      if (data?.url) window.open(data.url, '_blank');
    } catch (error) {
      console.error('Notary checkout error:', error);
      toast({
        title: 'Could not start checkout',
        description: 'Please try again in a moment.',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingNotary(false);
    }
  };

  const displayPrice = isRental
    ? `$${listing.price_daily}/day`
    : `$${listing.price_sale?.toLocaleString()}`;

  const location =
    listing.address || listing.pickup_location_text || 'No location set';

  // ── Primary + secondary actions per status (max 3 visible + kebab) ──
  const renderActions = () => {
    if (isDraft) {
      return (
        <>
          <Button
            size="sm"
            className="h-10 rounded-md px-4"
            asChild
          >
            <Link to={`/create-listing/${listing.id}`}>
              <FileEdit className="h-4 w-4 mr-1.5" />
              Continue editing
            </Link>
          </Button>
          <div className="flex-1" />
          <KebabMenu>
            {onPublish && (
              <DropdownMenuItem onClick={() => onPublish(listing.id)} className="gap-2">
                <Play className="h-4 w-4" /> Publish
              </DropdownMenuItem>
            )}
            {onDuplicate && (
              <DropdownMenuItem onClick={() => onDuplicate(listing.id)} className="gap-2">
                <CopyIcon className="h-4 w-4" /> Duplicate
              </DropdownMenuItem>
            )}
            {onDelete && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setShowDeleteConfirm(true)}
                  className="gap-2 text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4" /> Delete
                </DropdownMenuItem>
              </>
            )}
          </KebabMenu>
        </>
      );
    }

    if (isArchived) {
      return (
        <>
          {onPublish && (
            <Button
              size="sm"
              className="h-10 rounded-md px-4"
              onClick={() => onPublish(listing.id)}
            >
              <Rocket className="h-4 w-4 mr-1.5" />
              Republish
            </Button>
          )}
          <Button variant="outline" size="sm" className="h-10 rounded-md px-4" asChild>
            <Link to={`/listing/${listing.id}`}>
              <Eye className="h-4 w-4 mr-1.5" />
              View
            </Link>
          </Button>
          <div className="flex-1" />
          <KebabMenu>
            <DropdownMenuItem onClick={() => setShowShareKit(true)} className="gap-2">
              <Share2 className="h-4 w-4" /> Share
            </DropdownMenuItem>
            {onDuplicate && (
              <DropdownMenuItem onClick={() => onDuplicate(listing.id)} className="gap-2">
                <CopyIcon className="h-4 w-4" /> Duplicate
              </DropdownMenuItem>
            )}
            {onDelete && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setShowDeleteConfirm(true)}
                  className="gap-2 text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4" /> Delete permanently
                </DropdownMenuItem>
              </>
            )}
          </KebabMenu>
        </>
      );
    }

    // Published / paused
    return (
      <>
        <Button variant="outline" size="sm" className="h-10 rounded-md px-4" asChild>
          <Link to={`/create-listing/${listing.id}`}>
            <Edit2 className="h-4 w-4 mr-1.5" />
            Edit
          </Link>
        </Button>
        {!isFeatured && canBoost && (
          <Button
            size="sm"
            onClick={handleFeaturedClick}
            className="h-10 rounded-md px-4 bg-[hsl(14,100%,57%)] hover:bg-[hsl(14,100%,52%)] text-white border-0 shadow-[0_0_20px_-6px_hsl(14,100%,57%)]"
          >
            <Flame className="h-4 w-4 mr-1.5" />
            Boost
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          className="h-10 rounded-md px-4"
          onClick={() => setShowShareKit(true)}
        >
          <Share2 className="h-4 w-4 mr-1.5" />
          Share
        </Button>
        <div className="flex-1" />
        <KebabMenu>
          <DropdownMenuItem asChild className="gap-2">
            <Link to={`/listing/${listing.id}`}>
              <Eye className="h-4 w-4" /> View as buyer
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setShowUpgrades(true)} className="gap-2">
            <Rocket className="h-4 w-4" /> Upgrades
          </DropdownMenuItem>
          {isRental && (
            <DropdownMenuItem onClick={() => setShowCalendar(true)} className="gap-2">
              <Calendar className="h-4 w-4" /> Availability
            </DropdownMenuItem>
          )}
          {isSale && !hasNotary && (
            <DropdownMenuItem
              onClick={handleNotaryCheckout}
              disabled={isLoadingNotary}
              className="gap-2"
            >
              {isLoadingNotary ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Shield className="h-4 w-4" />
              )}{' '}
              Add Notary
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          {isPublished && onPause && (
            <DropdownMenuItem onClick={() => onPause(listing.id)} className="gap-2">
              <Pause className="h-4 w-4" /> Pause
            </DropdownMenuItem>
          )}
          {isPaused && (onUnpause || onPublish) && (
            <DropdownMenuItem
              onClick={() => (onUnpause ?? onPublish!)(listing.id)}
              className="gap-2"
            >
              <Play className="h-4 w-4" /> Resume
            </DropdownMenuItem>
          )}
          {onDuplicate && (
            <DropdownMenuItem onClick={() => onDuplicate(listing.id)} className="gap-2">
              <CopyIcon className="h-4 w-4" /> Duplicate
            </DropdownMenuItem>
          )}
          {onArchive && (
            <DropdownMenuItem onClick={() => onArchive(listing.id)} className="gap-2">
              <Archive className="h-4 w-4" /> Archive
            </DropdownMenuItem>
          )}
          {onDelete && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setShowDeleteConfirm(true)}
                className="gap-2 text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4" /> Delete
              </DropdownMenuItem>
            </>
          )}
        </KebabMenu>
      </>
    );
  };

  return (
    <>
      <article className="rounded-lg border border-border bg-card overflow-hidden shadow-sm hover:shadow-md transition-shadow">
        <div className="flex flex-col sm:flex-row">
          {/* Image — clipped to inherit the card's rounded corner on its side */}
          <div className="sm:w-52 h-44 sm:h-auto flex-shrink-0 overflow-hidden">
            <img
              src={listing.cover_image_url || '/placeholder.svg'}
              alt={listing.title}
              className="w-full h-full object-cover"
            />
          </div>

          <div className="flex-1 p-5 flex flex-col">
            {/* Header row: title cluster + status pill */}
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-foreground text-[15px] leading-snug line-clamp-1">
                    {listing.title}
                  </h3>
                  {isFeatured && (
                    <FeaturedBadge listing={listing as any} size="sm" showDaysLeft />
                  )}
                  {hasNotary && isSale && (
                    <Badge
                      variant="secondary"
                      className="bg-sky-500/15 text-sky-300 border border-sky-500/30 text-[10px] px-1.5 py-0 h-5"
                    >
                      <Shield className="w-3 h-3 mr-1" />
                      Notary
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1 truncate">
                  {location}
                </p>
              </div>
              <StatusPill status={listing.status} />
            </div>

            {/* Meta strip — plain row, no inner rectangle */}
            <div className="flex items-center gap-x-3 gap-y-1 text-xs flex-wrap mt-3 text-muted-foreground">
              <span className="text-primary font-semibold text-sm">
                {displayPrice}
              </span>
              <Divider />
              <span className="capitalize">
                {CATEGORY_LABELS[listing.category]}
              </span>
              <Divider />
              <span>For {isRental ? 'rent' : 'sale'}</span>
              {listing.view_count !== null && listing.view_count > 0 && (
                <>
                  <Divider />
                  <span className="inline-flex items-center gap-1">
                    <Eye className="h-3.5 w-3.5" />
                    {listing.view_count.toLocaleString()}
                  </span>
                </>
              )}
              {favoriteCount > 0 && (
                <>
                  <Divider />
                  <span className="inline-flex items-center gap-1 text-red-400">
                    <Heart className="h-3.5 w-3.5 fill-current" />
                    {favoriteCount}
                  </span>
                </>
              )}
            </div>

            {/* Action bar — one row, subtle top divider, no inner box */}
            <div className="flex items-center gap-2 mt-5 pt-4 border-t border-border/70">
              {renderActions()}
            </div>
          </div>
        </div>
      </article>

      {showCalendar && (
        <AvailabilityCalendar
          listing={listing}
          onClose={() => setShowCalendar(false)}
        />
      )}

      <PromoteListingModal
        open={showFeaturedModal}
        onOpenChange={setShowFeaturedModal}
        listingId={listing.id}
        listingTitle={listing.title}
      />

      <ShareKitModal
        open={showShareKit}
        onOpenChange={setShowShareKit}
        listing={listing}
      />

      <ListingUpgradesDialog
        listingId={listing.id}
        open={showUpgrades}
        onOpenChange={setShowUpgrades}
      />

      {onDelete && (
        <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this listing?</AlertDialogTitle>
              <AlertDialogDescription>
                "{listing.title}" will be permanently removed. This can't be
                undone.
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
      )}
    </>
  );
};

const Divider = () => (
  <span aria-hidden className="h-3 w-px bg-border/70" />
);

const KebabMenu = ({ children }: { children: React.ReactNode }) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button
        variant="ghost"
        size="icon"
        aria-label="More actions"
        className="h-10 w-10 rounded-md"
      >
        <MoreHorizontal className="h-4 w-4" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="w-52">
      {children}
    </DropdownMenuContent>
  </DropdownMenu>
);

export default HostListingCard;
