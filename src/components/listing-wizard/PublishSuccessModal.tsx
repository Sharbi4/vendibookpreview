import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Check, ExternalLink, Share2, MapPin, Facebook, Linkedin, Link2, MessageCircle, Banknote, ArrowRight, ListChecks } from 'lucide-react';
import { CATEGORY_LABELS, MODE_LABELS } from '@/types/listing';
import { useToast } from '@/hooks/use-toast';
import confetti from 'canvas-confetti';
import { PostPublishFinancingCallout } from '@/components/listings/PostPublishFinancingCallout';
import { PayPalMonogram } from '@/components/brand/ProviderLogos';
import { cn } from '@/lib/utils';


export interface ReadinessItem {
  label: string;
  met: boolean;
}

interface PublishSuccessModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listing: {
    id: string;
    title: string;
    coverImageUrl: string | null;
    category: string;
    mode: string;
    address: string | null;
    priceDaily: number | null;
    priceWeekly: number | null;
    priceSale: number | null;
  } | null;
  /**
   * Sale listings only: which payment options the seller enabled. Omit/null
   * for rentals so no sale payment copy renders.
   */
  paymentMethods?: {
    paypalCheckout: boolean;
    payInPerson: boolean;
  } | null;
  /**
   * Compact readiness summary derived from the existing publish checklist
   * truth. Only render what PublishWizard passes — no new eligibility rules.
   */
  readiness?: ReadinessItem[];
  onViewListing: () => void;
}

const fireConfetti = () => {
  // First burst - left side
  confetti({
    particleCount: 80,
    spread: 70,
    origin: { x: 0.2, y: 0.6 },
    colors: ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444'],
  });

  // Second burst - right side
  confetti({
    particleCount: 80,
    spread: 70,
    origin: { x: 0.8, y: 0.6 },
    colors: ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444'],
  });

  // Delayed center burst
  setTimeout(() => {
    confetti({
      particleCount: 100,
      spread: 100,
      origin: { x: 0.5, y: 0.5 },
      colors: ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444'],
    });
  }, 200);
};

export const PublishSuccessModal: React.FC<PublishSuccessModalProps> = ({
  open,
  onOpenChange,
  listing,
  paymentMethods,
  readiness,
  onViewListing,
}) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showShareOptions, setShowShareOptions] = useState(false);
  const [hasConfettiFired, setHasConfettiFired] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  // Fire confetti when modal opens
  useEffect(() => {
    if (open && listing && !hasConfettiFired) {
      // Small delay to let modal render first
      const timer = setTimeout(() => {
        fireConfetti();
        setHasConfettiFired(true);
      }, 300);
      return () => clearTimeout(timer);
    }
    // Reset when modal closes
    if (!open) {
      setHasConfettiFired(false);
      setShowShareOptions(false);
    }
  }, [open, listing, hasConfettiFired]);

  if (!listing) return null;
  
  const formatPrice = () => {
    if (listing.mode === 'rent') {
      if (listing.priceDaily) return `$${listing.priceDaily}/day`;
      if (listing.priceWeekly) return `$${listing.priceWeekly}/week`;
    }
    if (listing.priceSale) return `$${listing.priceSale.toLocaleString()}`;
    return 'Contact for price';
  };

  const categoryLabel = CATEGORY_LABELS[listing.category as keyof typeof CATEGORY_LABELS] || listing.category;
  const modeLabel = MODE_LABELS[listing.mode as keyof typeof MODE_LABELS] || listing.mode;
  const isSale = listing.mode === 'sale';
  const showPaymentSummary = isSale && !!paymentMethods && (paymentMethods.paypalCheckout || paymentMethods.payInPerson);
  
  const listingUrl = `${window.location.origin}/listing/${listing.id}`;
  const shareText = `Check out this ${categoryLabel.toLowerCase()} ${listing.mode === 'rent' ? 'for rent' : 'for sale'} on VendiBook: ${listing.title}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(listingUrl);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
      toast({
        title: 'Link copied!',
        description: 'Listing link copied to clipboard.',
      });
    } catch {
      toast({
        title: 'Failed to copy',
        description: 'Please copy the link manually.',
        variant: 'destructive',
      });
    }
  };

  const shareToSocial = (platform: string) => {
    let url = '';
    switch (platform) {
      case 'facebook':
        url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(listingUrl)}`;
        break;
      case 'x':
        url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(listingUrl)}`;
        break;
      case 'linkedin':
        url = `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(listingUrl)}&title=${encodeURIComponent(listing.title)}`;
        break;
      case 'whatsapp':
        url = `https://wa.me/?text=${encodeURIComponent(shareText + ' ' + listingUrl)}`;
        break;
    }
    if (url) {
      window.open(url, '_blank', 'width=600,height=400');
    }
  };

  const handleShareKit = () => {
    onOpenChange(false);
    navigate(`/listing-published/${listing.id}`);
  };

  const handleDashboard = () => {
    onOpenChange(false);
    navigate('/dashboard');
  };

  const renderWhatHappensNext = () => {
    if (!isSale || !paymentMethods) {
      return (
        <p className="text-sm text-muted-foreground leading-relaxed">
          Renters can now find your listing and book it through Vendibook's secure online checkout.
          You'll be notified when a new booking comes in, and payouts follow Vendibook's standard
          transaction completion process.
        </p>
      );
    }
    const { paypalCheckout, payInPerson } = paymentMethods;
    return (
      <div className="space-y-2 text-sm text-muted-foreground leading-relaxed">
        {paypalCheckout && (
          <p>
            <span className="font-medium text-foreground">Online checkout:</span> buyers can pay
            securely through Vendibook with PayPal. The applicable Vendibook seller fee is handled
            as part of the online transaction, and your payout follows Vendibook's transaction
            completion and payout process.
          </p>
        )}
        {payInPerson && (
          <p>
            <span className="font-medium text-foreground">Pay in Person:</span> you and the buyer
            arrange payment directly at pickup or delivery. Vendibook does not charge the
            online-sale commission on a pay-in-person transaction.
          </p>
        )}
        {paypalCheckout && payInPerson && (
          <p>Buyers may choose either available option at checkout.</p>
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <div className="flex flex-col items-center text-center mb-2">
            <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
              <Check className="w-8 h-8 text-green-500" />
            </div>
            <DialogTitle className="text-xl">You're live 🎉</DialogTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Your listing is published and visible on the marketplace.
            </p>
          </div>
        </DialogHeader>

        {/* Listing Preview */}
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="aspect-video relative bg-muted">
            {listing.coverImageUrl ? (
              <img 
                src={listing.coverImageUrl} 
                alt={listing.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-muted-foreground text-sm">No image</span>
              </div>
            )}
            <div className="absolute top-2 left-2">
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-primary text-primary-foreground">
                {modeLabel}
              </span>
            </div>
          </div>
          <div className="p-4">
            <h3 className="font-semibold text-lg line-clamp-1">{listing.title}</h3>
            <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
              <MapPin className="w-3.5 h-3.5" />
              <span className="line-clamp-1">{listing.address || 'Location not specified'}</span>
            </div>
            <div className="flex items-center justify-between mt-3">
              <span className="text-xs text-muted-foreground">{categoryLabel}</span>
              <span className="font-semibold text-primary">{formatPrice()}</span>
            </div>
          </div>
        </div>

        {/* Payment methods the seller enabled (sale listings only) */}
        {showPaymentSummary && paymentMethods && (
          <div className="rounded-xl border border-border bg-card p-4">
            <h4 className="text-sm font-semibold text-foreground mb-3">How buyers can pay</h4>
            <ul className="space-y-2">
              {paymentMethods.paypalCheckout && (
                <li className="flex items-center gap-2.5 text-sm text-foreground">
                  <PayPalMonogram className="h-4 w-4 shrink-0" />
                  <span className="flex-1">Online checkout with PayPal</span>
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                    <Check className="w-3.5 h-3.5" /> Enabled
                  </span>
                </li>
              )}
              {paymentMethods.payInPerson && (
                <li className="flex items-center gap-2.5 text-sm text-foreground">
                  <Banknote className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="flex-1">Pay in Person</span>
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                    <Check className="w-3.5 h-3.5" /> Enabled
                  </span>
                </li>
              )}
            </ul>
          </div>
        )}

        {/* Listing readiness — reuses the publish checklist truth */}
        {readiness && readiness.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-4">
            <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <ListChecks className="w-4 h-4 text-primary" />
              Listing readiness
            </h4>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
              {readiness.map((item) => (
                <li key={item.label} className="flex items-center gap-2 text-sm">
                  <span
                    className={cn(
                      'inline-flex h-4 w-4 items-center justify-center rounded-full shrink-0',
                      item.met ? 'bg-emerald-500/15 text-emerald-600' : 'bg-muted text-muted-foreground',
                    )}
                  >
                    <Check className="w-2.5 h-2.5" />
                  </span>
                  <span className={item.met ? 'text-foreground' : 'text-muted-foreground'}>
                    {item.label}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* What happens next */}
        <div className="rounded-xl border border-border bg-card p-4">
          <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
            <ArrowRight className="w-4 h-4 text-primary" />
            What happens next
          </h4>
          {renderWhatHappensNext()}
        </div>

        {isSale && (
          <PostPublishFinancingCallout listingId={listing.id} />
        )}



        {/* Social Share Buttons */}
        {showShareOptions ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground text-center">Share on social media</p>
            <div className="grid grid-cols-4 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => shareToSocial('facebook')}
                className="flex flex-col items-center gap-1 h-auto py-3"
              >
                <Facebook className="w-5 h-5 text-[#1877F2]" />
                <span className="text-xs">Facebook</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => shareToSocial('x')}
                className="flex flex-col items-center gap-1 h-auto py-3"
                aria-label="Share on X"
              >
                <span className="w-5 h-5 inline-flex items-center justify-center font-bold text-foreground text-base">𝕏</span>
                <span className="text-xs">X</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => shareToSocial('linkedin')}
                className="flex flex-col items-center gap-1 h-auto py-3"
              >
                <Linkedin className="w-5 h-5 text-[#0A66C2]" />
                <span className="text-xs">LinkedIn</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => shareToSocial('whatsapp')}
                className="flex flex-col items-center gap-1 h-auto py-3"
              >
                <MessageCircle className="w-5 h-5 text-[#25D366]" />
                <span className="text-xs">WhatsApp</span>
              </Button>
            </div>
            
            {/* Copy Link */}
            <Button
              variant="secondary"
              onClick={handleCopyLink}
              className="w-full"
            >
              {linkCopied ? <Check className="w-4 h-4 mr-2" /> : <Link2 className="w-4 h-4 mr-2" />}
              {linkCopied ? 'Copied!' : 'Copy Link'}
            </Button>

            <Button
              variant="ghost"
              onClick={() => setShowShareOptions(false)}
              className="w-full text-muted-foreground"
            >
              Back
            </Button>
          </div>
        ) : (
          /* Action Buttons — View listing primary, dashboard secondary */
          <div className="flex flex-col gap-2 mt-2">
            <Button onClick={onViewListing} className="w-full">
              <ExternalLink className="w-4 h-4 mr-2" />
              View listing
            </Button>
            <Button
              variant="outline"
              onClick={handleDashboard}
              className="w-full"
            >
              Go to dashboard
            </Button>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={() => setShowShareOptions(true)}
                className="flex-1 text-muted-foreground"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
              <Button
                variant="ghost"
                onClick={handleShareKit}
                className="flex-1 text-muted-foreground"
              >
                Share Kit
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
