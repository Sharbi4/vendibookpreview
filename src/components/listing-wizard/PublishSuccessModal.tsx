import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Check, ExternalLink, Facebook, Twitter, Linkedin, Link2, MapPin } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { CATEGORY_LABELS, MODE_LABELS, type ListingFormData } from '@/types/listing';

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
  onViewListing: () => void;
}

export const PublishSuccessModal: React.FC<PublishSuccessModalProps> = ({
  open,
  onOpenChange,
  listing,
  onViewListing,
}) => {
  const { toast } = useToast();

  if (!listing) return null;

  const listingUrl = `${window.location.origin}/listing/${listing.id}`;
  
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

  const shareText = `Check out my ${categoryLabel} listing on Vendibook: ${listing.title}`;

  const shareLinks = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(listingUrl)}`,
    twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(listingUrl)}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(listingUrl)}`,
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(listingUrl);
      toast({
        title: 'Link copied!',
        description: 'Listing URL copied to clipboard',
      });
    } catch (err) {
      toast({
        title: 'Failed to copy',
        description: 'Please copy the URL manually',
        variant: 'destructive',
      });
    }
  };

  const openShare = (url: string) => {
    window.open(url, '_blank', 'width=600,height=400');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex flex-col items-center text-center mb-2">
            <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
              <Check className="w-8 h-8 text-green-500" />
            </div>
            <DialogTitle className="text-xl">Listing Published!</DialogTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Your listing is now live on Vendibook
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

        {/* Share Links */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-center">Share your listing</p>
          <div className="flex items-center justify-center gap-3">
            <Button
              variant="outline"
              size="icon"
              className="rounded-full h-10 w-10 hover:bg-[#1877F2]/10 hover:border-[#1877F2] hover:text-[#1877F2]"
              onClick={() => openShare(shareLinks.facebook)}
            >
              <Facebook className="w-5 h-5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="rounded-full h-10 w-10 hover:bg-[#1DA1F2]/10 hover:border-[#1DA1F2] hover:text-[#1DA1F2]"
              onClick={() => openShare(shareLinks.twitter)}
            >
              <Twitter className="w-5 h-5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="rounded-full h-10 w-10 hover:bg-[#0A66C2]/10 hover:border-[#0A66C2] hover:text-[#0A66C2]"
              onClick={() => openShare(shareLinks.linkedin)}
            >
              <Linkedin className="w-5 h-5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="rounded-full h-10 w-10"
              onClick={copyToClipboard}
            >
              <Link2 className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2 mt-2">
          <Button onClick={onViewListing} className="w-full">
            <ExternalLink className="w-4 h-4 mr-2" />
            View Listing
          </Button>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="w-full text-muted-foreground"
          >
            Go to Dashboard
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
