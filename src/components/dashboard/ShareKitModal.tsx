import { useState, useEffect, useCallback } from 'react';
import QRCode from 'qrcode';
import { motion } from 'framer-motion';
import {
  Copy, Check, ExternalLink, Download, Link2, MessageSquare,
  Zap, Sparkles, ToggleLeft, ToggleRight,
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { trackEventToDb } from '@/hooks/useAnalyticsEvents';
import { CATEGORY_LABELS } from '@/types/listing';
import type { Tables } from '@/integrations/supabase/types';

type Listing = Tables<'listings'>;

/* ── Social SVG Icons ── */
const FacebookIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);
const LinkedInIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
  </svg>
);
const XIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

interface ShareKitModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listing: Listing;
}

const SITE_URL = 'https://vendibook.com';

const ShareKitModal = ({ open, onOpenChange, listing }: ShareKitModalProps) => {
  const { toast } = useToast();
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [utmEnabled, setUtmEnabled] = useState(false);

  /* ── Derived data ── */
  const cityState = [listing.city, listing.state].filter(Boolean).join(', ');
  const categoryLabel = CATEGORY_LABELS[listing.category] || 'Listing';

  const priceText =
    listing.mode === 'rent'
      ? listing.price_daily
        ? `$${listing.price_daily}/day`
        : listing.price_weekly
          ? `$${listing.price_weekly}/week`
          : ''
      : listing.price_sale
        ? `$${Number(listing.price_sale).toLocaleString()}`
        : '';

  const baseShareUrl = `${SITE_URL}/share/listing/${listing.id}`;
  const utmSuffix = `?utm_source=host_share&utm_medium=dashboard&utm_campaign=listing_${listing.id}`;
  const shareUrl = utmEnabled ? `${baseShareUrl}${utmSuffix}` : baseShareUrl;

  const caption =
    listing.mode === 'rent'
      ? `🚚 Now Booking${cityState ? ` in ${cityState}` : ''}\n\n${listing.title}\n💰 ${priceText}\n\nSecure booking through Vendibook.\nBook instantly here:\n${shareUrl}`
      : `🚚 ${categoryLabel} for Sale${cityState ? ` in ${cityState}` : ''}\n\n${listing.title}\n💰 ${priceText}\n\nView full details on Vendibook:\n${shareUrl}`;

  /* ── QR Code ── */
  useEffect(() => {
    if (!open) return;
    QRCode.toDataURL(shareUrl, { width: 256, margin: 2, color: { dark: '#000000', light: '#FFFFFF' } })
      .then(setQrDataUrl)
      .catch(console.error);
    trackEventToDb('share_kit_opened', 'share_kit', { listing_id: listing.id }, listing.id);
  }, [open, shareUrl, listing.id]);

  /* ── Clipboard helpers ── */
  const copyToClipboard = useCallback(async (text: string) => {
    await navigator.clipboard.writeText(text);
  }, []);

  const handleCopyLink = async () => {
    await copyToClipboard(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
    toast({ title: 'Link copied!' });
    trackEventToDb('share_link_copied', 'share_kit', undefined, listing.id);
  };

  const handleCopyCaption = async (withLink = false) => {
    const text = withLink ? `${caption}` : caption.split('\n').filter(l => !l.startsWith('http')).join('\n');
    await copyToClipboard(withLink ? caption : text);
    setCopiedCaption(true);
    setTimeout(() => setCopiedCaption(false), 2000);
    toast({ title: withLink ? 'Caption + link copied!' : 'Caption copied!' });
    trackEventToDb('share_caption_copied', 'share_kit', { with_link: withLink }, listing.id);
  };

  const handleCopyEverything = async () => {
    await copyToClipboard(caption);
    toast({ title: 'Caption + link copied!' });
    trackEventToDb('share_everything_copied', 'share_kit', undefined, listing.id);
    onOpenChange(false);
  };

  /* ── Social share ── */
  const handleSocialClick = (platform: string) => {
    trackEventToDb('share_social_click', 'share_kit', { platform }, listing.id);
    const encoded = encodeURIComponent(shareUrl);
    const text = encodeURIComponent(`Check out ${listing.title} on Vendibook`);
    const urls: Record<string, string> = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encoded}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encoded}`,
      x: `https://twitter.com/intent/tweet?text=${text}&url=${encoded}`,
      sms: `sms:?body=${text}%20${encoded}`,
    };
    window.open(urls[platform], '_blank', 'noopener,noreferrer');
  };

  /* ── QR Download ── */
  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `vendibook-qr-${listing.id.slice(0, 8)}.png`;
    a.click();
    trackEventToDb('share_qr_downloaded', 'share_kit', undefined, listing.id);
    toast({ title: 'QR code downloaded' });
  };

  const socialButtons = [
    { id: 'facebook', label: 'Facebook', icon: FacebookIcon, hover: 'hover:text-[#1877F2]' },
    { id: 'linkedin', label: 'LinkedIn', icon: LinkedInIcon, hover: 'hover:text-[#0A66C2]' },
    { id: 'x', label: 'X', icon: XIcon, hover: 'hover:text-foreground' },
    { id: 'sms', label: 'Text', icon: null, hover: 'hover:text-emerald-600' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl p-0">
        <div className="p-6 space-y-6">
          {/* Header */}
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Promote Your Listing</DialogTitle>
            <DialogDescription>Get more bookings and visibility by sharing your listing.</DialogDescription>
          </DialogHeader>

          {/* Section 1 — Share Link */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Share Link</p>
            <div className="flex items-center gap-2 bg-muted/50 border border-border rounded-xl px-3 py-2">
              <Link2 className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm font-mono text-foreground truncate flex-1">
                vendibook.com/share/listing/{listing.id.slice(0, 8)}…
              </span>
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="h-9 rounded-xl bg-[#FF5124] hover:bg-[#FF5124]/90 text-white" onClick={handleCopyLink}>
                {copiedLink ? <Check className="h-4 w-4 mr-1.5" /> : <Copy className="h-4 w-4 mr-1.5" />}
                {copiedLink ? 'Copied!' : 'Copy Link'}
              </Button>
              <Button size="sm" variant="outline" className="h-9 rounded-xl" asChild>
                <a href={`/listing/${listing.id}`} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-1.5" />
                  Open Listing
                </a>
              </Button>
            </div>
          </div>

          {/* Section 2 — Auto-Generated Caption */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Ready-to-Post Caption</p>
            <div className="bg-muted/50 border border-border rounded-xl p-3 text-sm whitespace-pre-line text-foreground leading-relaxed max-h-40 overflow-y-auto">
              {caption}
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="h-9 rounded-xl" onClick={() => handleCopyCaption(false)}>
                {copiedCaption ? <Check className="h-4 w-4 mr-1.5" /> : <Copy className="h-4 w-4 mr-1.5" />}
                Copy Caption
              </Button>
              <Button size="sm" variant="outline" className="h-9 rounded-xl" onClick={() => handleCopyCaption(true)}>
                <Copy className="h-4 w-4 mr-1.5" />
                Caption + Link
              </Button>
            </div>
          </div>

          {/* Section 3 — Quick Share */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Quick Share</p>
            <div className="flex gap-2">
              {socialButtons.map((btn) => (
                <button
                  key={btn.id}
                  onClick={() => handleSocialClick(btn.id)}
                  className={`inline-flex items-center justify-center w-11 h-11 rounded-xl border border-border bg-background text-muted-foreground transition-all ${btn.hover} hover:border-[#FF5124]/30`}
                  aria-label={`Share to ${btn.label}`}
                >
                  {btn.icon ? (
                    <btn.icon className="h-5 w-5" />
                  ) : (
                    <MessageSquare className="h-5 w-5" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Section 4 — QR Code */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">QR Code</p>
            <div className="flex items-start gap-4">
              {qrDataUrl && (
                <div className="bg-white p-2 rounded-xl border shadow-sm shrink-0">
                  <img src={qrDataUrl} alt="QR Code" className="w-24 h-24" />
                </div>
              )}
              <div className="space-y-2">
                <Button size="sm" variant="outline" className="h-9 rounded-xl" onClick={handleDownloadQr}>
                  <Download className="h-4 w-4 mr-1.5" />
                  Download QR
                </Button>
                <p className="text-xs text-muted-foreground">
                  Print this and display at events or on your truck.
                </p>
              </div>
            </div>
          </div>

          {/* Section 5 — Listing Preview */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Preview</p>
            <div className="flex items-center gap-3 bg-muted/30 border border-border rounded-xl p-3">
              <img
                src={listing.cover_image_url || '/placeholder.svg'}
                alt={listing.title}
                className="w-16 h-16 rounded-lg object-cover shrink-0"
              />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-sm text-foreground truncate">{listing.title}</p>
                {cityState && <p className="text-xs text-muted-foreground">{cityState}</p>}
                <div className="flex items-center gap-2 mt-1">
                  {priceText && <span className="text-sm font-semibold text-primary">{priceText}</span>}
                  {listing.instant_book && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      <Zap className="w-3 h-3 mr-0.5" />
                      Instant Book
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* UTM Toggle */}
          <div className="flex items-center justify-between py-2 border-t border-border">
            <span className="text-sm text-muted-foreground">Add UTM tracking to link</span>
            <button
              onClick={() => setUtmEnabled(!utmEnabled)}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Toggle UTM tracking"
            >
              {utmEnabled ? (
                <ToggleRight className="h-6 w-6 text-[#FF5124]" />
              ) : (
                <ToggleLeft className="h-6 w-6" />
              )}
            </button>
          </div>

          {/* Section 6 — Psychology Boost */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gradient-to-r from-[#FF5124]/10 to-transparent border border-[#FF5124]/20 rounded-xl p-4 space-y-3"
          >
            <div className="flex items-start gap-2">
              <Sparkles className="h-5 w-5 text-[#FF5124] shrink-0 mt-0.5" />
              <p className="text-sm text-foreground">
                <span className="font-medium">Listings shared within the first 24 hours</span> get significantly more visibility.
              </p>
            </div>
            <Button
              className="w-full h-10 rounded-xl bg-[#FF5124] hover:bg-[#FF5124]/90 text-white font-semibold"
              onClick={handleCopyEverything}
            >
              Copy Everything & Close
            </Button>
          </motion.div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShareKitModal;
