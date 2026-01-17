import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Check, ExternalLink, Share2, MapPin, Facebook, Twitter, Linkedin, Link2, MessageCircle } from 'lucide-react';
import { CATEGORY_LABELS, MODE_LABELS } from '@/types/listing';
import { useToast } from '@/hooks/use-toast';

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
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showShareOptions, setShowShareOptions] = useState(false);

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
  
  const listingUrl = `${window.location.origin}/listing/${listing.id}`;
  const shareText = `Check out this ${categoryLabel.toLowerCase()} ${listing.mode === 'rent' ? 'for rent' : 'for sale'} on VendiBook: ${listing.title}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(listingUrl);
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
      case 'twitter':
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex flex-col items-center text-center mb-2">
            <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
              <Check className="w-8 h-8 text-green-500" />
            </div>
            <DialogTitle className="text-xl">You're live 🎉</DialogTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Share your listing to get booked faster.
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
                onClick={() => shareToSocial('twitter')}
                className="flex flex-col items-center gap-1 h-auto py-3"
              >
                <Twitter className="w-5 h-5 text-[#1DA1F2]" />
                <span className="text-xs">Twitter</span>
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
              <Link2 className="w-4 h-4 mr-2" />
              Copy Link
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
          /* Action Buttons */
          <div className="flex flex-col gap-2 mt-2">
            <Button onClick={() => setShowShareOptions(true)} className="w-full">
              <Share2 className="w-4 h-4 mr-2" />
              Share to Social Media
            </Button>
            <Button onClick={handleShareKit} variant="secondary" className="w-full">
              Get Full Share Kit
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={onViewListing}
                className="flex-1"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                View Listing
              </Button>
              <Button
                variant="ghost"
                onClick={handleDashboard}
                className="flex-1 text-muted-foreground"
              >
                Dashboard
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
