import { productCheckoutUrl, hostedCheckoutUrl } from '@/lib/payments/hostedCheckout';
import { listingShareUrl } from '@/lib/share';
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
  Wallet,
  Lightbulb,
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import ListingReadinessCard from '@/components/listing/ListingReadinessCard';
import { cn } from '@/lib/utils';
import { FeaturedBadge } from '@/components/listing/FeaturedBadge';
import IdentityVerifiedBadge from '@/components/verification/IdentityVerifiedBadge';
import { useSellerVerifiedBadge } from '@/hooks/useSellerVerifiedBadge';
import { PayoutSetupDialog } from '@/components/payouts/PayoutSetupDialog';

import { usePayoutPreference } from '@/hooks/usePayoutPreference';
import { PayoutBrandMark } from '@/components/payouts/PayoutBrandMark';
import { PAYOUT_METHOD_LABEL } from '@/lib/payouts/methods';
import { canBoostListing, canRepublishListing } from '@/lib/listings/publicVisibility';
import { useNavigate } from 'react-router-dom';
import { GetVerifiedButton } from '@/components/verification/GetVerifiedButton';
import { ListingDimensionsPrompt } from '@/components/dashboard/ListingDimensionsPrompt';
import { isRentalConversionEligible, linkedRentalCtaLabel } from '@/lib/listings/rentalConversion';
import { useLinkedRental, useCreateLinkedRental } from '@/hooks/useLinkedRental';



type Listing = Tables<'listings'>;

interface HostListingCardProps {
  listing: Listing;
  /** Batch-loaded Equinox opt-in state for this listing (sale listings only). */
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

/** Evenly sized primary action buttons — never crowd or overflow. */
const ACTION_BTN =
  'h-10 rounded-lg px-3 sm:px-4 text-[13px] font-medium justify-center flex-1 min-w-[140px] sm:min-w-0 sm:basis-0';

const shortListingId = (id: string) =>
  id ? `#${id.replace(/-/g, '').slice(0, 8).toUpperCase()}` : '';

const formatPublished = (value: unknown) => {
  if (typeof value !== 'string' || !value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

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
  const [showPayoutSetup, setShowPayoutSetup] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const { preference: payoutPreference } = usePayoutPreference();
  const { data: favoriteCount = 0 } = useListingFavoriteCount(listing.id);
  // Server-derived Identity Verified state for this listing's seller.
  const { verified: sellerVerified } = useSellerVerifiedBadge(
    (listing as any).host_id ?? null,
  );

  const { toast } = useToast();
  const navigate = useNavigate();

  // A listing that has ever gone live keeps its published date even while
  // paused or archived — only never-published drafts show "Created".
  const publishedAt = (listing as { published_at?: string | null }).published_at ?? null;
  const hasBeenPublished = !!publishedAt;
  const publishedOn = formatPublished(publishedAt ?? listing.created_at);
  const listingRef = shortListingId(listing.id);

  const handleShareListing = async () => {
    // Share the /share/listing/:id alias so social crawlers render listing OG tags.
    const url = listingShareUrl(listing.id);
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ title: listing.title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast({ title: 'Link copied', description: 'Listing link copied to your clipboard.' });
    } catch {
      /* user dismissed the share sheet — nothing to report */
    }
  };



  const isSale = listing.mode === 'sale';
  const isPublished = listing.status === 'published';
  const isPaused = listing.status === 'paused';
  const isDraft = listing.status === 'draft';
  const isArchived = listing.status === 'archived';
  const isFeatured = isListingFeatured(listing as any);
  const hasNotary = (listing as { proof_notary_enabled?: boolean })
    .proof_notary_enabled;
  const isRental = listing.mode === 'rent';

  // "Rent it out": turn an existing sale truck/trailer into a linked rental.
  const rentalEligible = isRentalConversionEligible(listing);
  const { rental: linkedRental, state: linkedState, isLoading: linkedLoading } =
    useLinkedRental(listing.id, rentalEligible);
  const createLinkedRental = useCreateLinkedRental();

  const handleRentItOut = async () => {
    if (createLinkedRental.isPending) return;
    if (linkedRental?.id && linkedState !== 'draft') {
      navigate(`/create-listing/${linkedRental.id}`);
      return;
    }
    try {
      const result = await createLinkedRental.mutateAsync(listing.id);
      navigate(`/listings/${listing.id}/rent-it-out`);
      return result;
    } catch (err) {
      toast({
        title: 'Could not start rental setup',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'destructive',
      });
    }
  };


  // Paid promotion eligibility mirrors public visibility exactly: no boosts on
  // paused, removed, deleted, archived, rejected, suspended or expired listings.
  const canBoost = canBoostListing(listing as never);
  const canRepublish = canRepublishListing(listing as never);

  // Manual payouts: sellers pick PayPal, Venmo, Cash App or ACH. Never a gate on
  // publishing or buyer checkout — purely where the money should land.
  const payoutButton = (
    <Button
      variant="outline"
      size="sm"
      className="h-9 rounded-lg px-3 text-xs border-white/10 bg-white/[0.02] hover:bg-white/[0.06]"
      onClick={() => setShowPayoutSetup(true)}
    >
      {payoutPreference ? (
        <>
          <PayoutBrandMark method={payoutPreference.method} className="mr-1.5 h-4 w-4" />
          Payout · {PAYOUT_METHOD_LABEL[payoutPreference.method]}
        </>
      ) : (
        <>
          <Wallet className="h-4 w-4 mr-1.5" />
          Set up payout
        </>
      )}
    </Button>
  );

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
      // Drafts started in List with Vendi resume in the SAME chat and the SAME
      // row; the full editor remains available as the secondary action.
      const vendiDraft = !!(listing as { vendi_session_key?: string | null }).vendi_session_key;
      return (
        <>
          <Button
            size="sm"
            className={ACTION_BTN}
            asChild
          >
            <Link to={vendiDraft ? `/list-with-vendi?listing=${listing.id}` : `/create-listing/${listing.id}`}>
              <FileEdit className="h-4 w-4 mr-1.5" />
              {vendiDraft ? 'Continue with Vendi' : 'Continue editing'}
            </Link>
          </Button>
          {vendiDraft && (
            <Button size="sm" variant="outline" asChild>
              <Link to={`/create-listing/${listing.id}`}>Edit full listing</Link>
            </Button>
          )}

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
              className={ACTION_BTN}
              onClick={() => onPublish(listing.id)}
            >
              <Rocket className="h-4 w-4 mr-1.5" />
              Republish
            </Button>
          )}
          <Button variant="outline" size="sm" className={cn(ACTION_BTN, 'border-white/15 bg-white/[0.04] hover:bg-white/[0.08]')} asChild>
            <Link to={`/listing/${listing.id}`}>
              <Eye className="h-4 w-4 mr-1.5" />
              View
            </Link>
          </Button>
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
        <Button
          variant="outline"
          size="sm"
          className={cn(ACTION_BTN, 'border-white/15 bg-white/[0.04] hover:bg-white/[0.08]')}
          asChild
        >
          <Link to={`/create-listing/${listing.id}`}>
            <Edit2 className="h-4 w-4 mr-1.5 shrink-0" />
            Edit Listing
          </Link>
        </Button>
        {!isFeatured && canBoost && (
          <Button
            size="sm"
            onClick={handleFeaturedClick}
            className={cn(
              ACTION_BTN,
              'bg-[hsl(14,100%,57%)] hover:bg-[hsl(14,100%,52%)] text-white border-0 shadow-[0_0_24px_-8px_hsl(14,100%,57%)]',
            )}
          >
            <Flame className="h-4 w-4 mr-1.5 shrink-0" />
            Boost Listing
          </Button>
        )}
        {rentalEligible && (
          <Button
            size="sm"
            onClick={handleRentItOut}
            disabled={createLinkedRental.isPending || linkedLoading}
            className={cn(
              ACTION_BTN,
              'bg-white text-[#08080a] hover:bg-white/90 border-0 font-semibold',
            )}
          >
            {createLinkedRental.isPending ? (
              <Loader2 className="h-4 w-4 mr-1.5 shrink-0 animate-spin" />
            ) : (
              <Calendar className="h-4 w-4 mr-1.5 shrink-0" />
            )}
            {linkedRentalCtaLabel(linkedState)}
          </Button>
        )}
        {!rentalEligible && (
          <Button
            variant="outline"
            size="sm"
            className={cn(ACTION_BTN, 'border-white/15 bg-white/[0.04] hover:bg-white/[0.08]')}
            onClick={handleShareListing}
          >
            <Share2 className="h-4 w-4 mr-1.5 shrink-0" />
            Share Listing
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          className={cn(ACTION_BTN, 'border-white/15 bg-white/[0.04] hover:bg-white/[0.08]')}
          onClick={() => setShowShareKit(true)}
        >
          <Rocket className="h-4 w-4 mr-1.5 shrink-0" />
          Share Kit
        </Button>

        <KebabMenu>
          {rentalEligible && (
            <DropdownMenuItem onClick={handleShareListing} className="gap-2">
              <Share2 className="h-4 w-4" /> Share Listing
            </DropdownMenuItem>
          )}

          <DropdownMenuItem asChild className="gap-2">
            <Link to={`/listing/${listing.id}`}>
              <Eye className="h-4 w-4" /> View as buyer
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setShowUpgrades(true)} className="gap-2">
            <Rocket className="h-4 w-4" /> Upgrades
          </DropdownMenuItem>
          <DropdownMenuItem asChild className="gap-2">
            <Link to={`/listings/${listing.id}/payments-financing`}>
              <Wallet className="h-4 w-4" /> Payments &amp; financing
            </Link>
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
      <article
        className={cn(
          'group relative overflow-hidden rounded-2xl border-2 bg-[hsl(240_6%_5%/0.92)]',
          'shadow-[0_24px_60px_-30px_rgba(0,0,0,0.95)] backdrop-blur-xl transition-all duration-300',
          'hover:shadow-[0_28px_70px_-28px_rgba(0,0,0,1)]',
          isFeatured
            ? 'border-amber-400/40 featured-ring'
            : 'border-white/10 hover:border-white/20',
        )}
      >
        {/* Restrained top shine */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent"
        />

        <div className="flex flex-col sm:flex-row">
          {/* Image */}
          <div className="relative sm:w-56 h-44 sm:h-auto flex-shrink-0 overflow-hidden border-b-2 sm:border-b-0 sm:border-r-2 border-white/10">
            <img
              src={listing.cover_image_url || '/placeholder.svg'}
              alt={listing.title}
              loading="lazy"
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"
            />
          </div>

          <div className="flex-1 min-w-0 p-4 sm:p-6 flex flex-col gap-4">
            {/* Header: title cluster + status pill */}
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-foreground text-base sm:text-[17px] leading-snug line-clamp-1">
                    {listing.title}
                  </h3>
                  {isFeatured && (
                    <FeaturedBadge listing={listing as any} size="sm" showDaysLeft />
                  )}
                  {sellerVerified && (
                    <IdentityVerifiedBadge
                      verified={sellerVerified}
                      size="sm"
                      withDetails={false}
                    />
                  )}
                  {hasNotary && isSale && (
                    <Badge
                      variant="secondary"
                      className="bg-sky-500/15 text-sky-300 border border-sky-500/30 rounded-full text-[10px] px-1.5 py-0 h-5"
                    >
                      <Shield className="w-3 h-3 mr-1" />
                      Notary
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1 truncate">{location}</p>
              </div>
              <StatusPill status={listing.status} />
            </div>

            {/* Identity strip: price · category · published · ref */}
            <div className="flex items-center gap-x-3 gap-y-1.5 text-xs flex-wrap text-muted-foreground">
              <span className="text-primary font-semibold text-sm">{displayPrice}</span>
              <Divider />
              <span className="capitalize">{CATEGORY_LABELS[listing.category]}</span>
              <Divider />
              <span>For {isRental ? 'rent' : 'sale'}</span>
              {publishedOn && (
                <>
                  <Divider />
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" aria-hidden />
                    {hasBeenPublished ? 'Published' : 'Created'} {publishedOn}
                  </span>
                </>
              )}
              {listingRef && (
                <>
                  <Divider />
                  <span
                    className="font-mono tracking-wider text-[11px] text-muted-foreground/80"
                    title={listing.id}
                  >
                    <span className="sr-only">Listing ID </span>
                    {listingRef}
                  </span>
                </>
              )}
            </div>

            {/* Performance strip */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs text-muted-foreground">
                <Eye className="h-3.5 w-3.5" aria-hidden />
                <span className="font-semibold text-foreground">
                  {(listing.view_count ?? 0).toLocaleString()}
                </span>
                views
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs text-muted-foreground">
                <Heart className="h-3.5 w-3.5 text-red-400 fill-current" aria-hidden />
                <span className="font-semibold text-foreground">{favoriteCount}</span>
                favorites
              </span>
            </div>

            {/* Missing length/height on older published sale listings */}
            <ListingDimensionsPrompt listing={listing} />

            {/* Primary actions — even spacing, no crowding */}
            <div className="flex flex-wrap items-center gap-2 pt-4 border-t-2 border-white/10">
              {renderActions()}
            </div>

            {/* Compact secondary controls */}
            <div className="flex flex-wrap items-center gap-2">
              {isPublished && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 rounded-lg px-3 text-xs border border-white/10 bg-white/[0.02] hover:bg-white/[0.06] text-muted-foreground hover:text-foreground"
                  onClick={() => setShowSuggestions(true)}
                >
                  <Lightbulb className="h-3.5 w-3.5 mr-1.5" aria-hidden />
                  Get suggestions
                </Button>
              )}
              {!isDraft && !isArchived && (
                <>
                  <GetVerifiedButton size="sm" showPrice />
                  {payoutButton}
                </>
              )}
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

      <PayoutSetupDialog
        open={showPayoutSetup}
        onOpenChange={setShowPayoutSetup}
        listingTitle={listing.title}
      />

      <Dialog open={showSuggestions} onOpenChange={setShowSuggestions}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Suggestions for this listing</DialogTitle>
          </DialogHeader>
          <ListingReadinessCard
            listingId={listing.id}
            category={listing.category}
            mode={listing.mode}
            showExistingListingPrompt
          />
        </DialogContent>
      </Dialog>

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
