import { useState, useEffect, useCallback } from 'react';
import QRCode from 'qrcode';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Copy, Check, ExternalLink, Download, Link2, MessageSquare,
  Zap, Sparkles, X,
} from 'lucide-react';
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

const glassButtonBase =
  'h-9 rounded-lg font-medium text-sm transition-all text-white';
const glassButtonOutline =
  `${glassButtonBase} px-3 inline-flex items-center gap-1.5`;

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
    QRCode.toDataURL(shareUrl, { width: 256, margin: 2, color: { dark: '#FFFFFF', light: '#00000000' } })
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
    const text = withLink ? caption : caption.split('\n').filter(l => !l.startsWith('http')).join('\n');
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
    { id: 'facebook', label: 'Facebook', icon: FacebookIcon },
    { id: 'linkedin', label: 'LinkedIn', icon: LinkedInIcon },
    { id: 'x', label: 'X', icon: XIcon },
    { id: 'sms', label: 'Text', icon: null },
  ];

  const dismiss = () => onOpenChange(false);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-md px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={dismiss}
        >
          <motion.div
            className="relative w-full max-w-md overflow-hidden rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'linear-gradient(145deg, rgba(20,20,25,0.88) 0%, rgba(15,15,18,0.92) 100%)',
              backdropFilter: 'blur(40px)',
              WebkitBackdropFilter: 'blur(40px)',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 25px 60px -12px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08)',
            }}
          >
            {/* Gradient accent line at top */}
            <div
              className="absolute top-0 left-0 h-[2px] w-full z-10"
              style={{ background: 'linear-gradient(90deg, #FF5124, #E64A19, #FFB800)' }}
            />

            {/* Close button */}
            <button
              onClick={dismiss}
              className="absolute top-3 right-3 p-1.5 rounded-full bg-black/40 backdrop-blur-sm hover:bg-black/60 transition-colors z-10"
              aria-label="Close"
            >
              <X className="w-4 h-4 text-white/70" />
            </button>

            {/* Listing preview hero */}
            <div className="relative h-28 w-full overflow-hidden">
              <img
                src={listing.cover_image_url || '/placeholder.svg'}
                alt={listing.title}
                className="w-full h-full object-cover"
              />
              <div
                className="absolute inset-0"
                style={{ background: 'linear-gradient(to bottom, transparent 20%, rgba(15,15,18,0.95) 100%)' }}
              />
              <div className="absolute bottom-3 left-4 right-4">
                <h3 className="font-semibold text-white text-sm truncate">{listing.title}</h3>
                <div className="flex items-center gap-2 mt-0.5">
                  {cityState && <span className="text-xs text-white/50">{cityState}</span>}
                  {priceText && <span className="text-xs font-medium text-[#FFB800]">{priceText}</span>}
                  {listing.instant_book && (
                    <span className="text-[10px] text-[#FF5124] flex items-center gap-0.5">
                      <Zap className="w-3 h-3" /> Instant
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="p-5 space-y-5">
              {/* Header */}
              <div className="text-center space-y-1">
                <h3 className="text-lg font-semibold text-white">Promote Your Listing</h3>
                <p className="text-sm text-white/50">Get more bookings and visibility by sharing.</p>
              </div>

              {/* Section 1 — Share Link */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-white/60 uppercase tracking-wider">Share Link</p>
                <div
                  className="flex items-center gap-2 rounded-lg px-3 py-2.5"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <Link2 className="h-4 w-4 text-white/30 shrink-0" />
                  <span className="text-sm font-mono text-white/70 truncate flex-1">
                    vendibook.com/share/listing/{listing.id.slice(0, 8)}…
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleCopyLink}
                    className={glassButtonOutline}
                    style={{
                      background: 'linear-gradient(135deg, #FF5124, #E64A19, #FFB800)',
                      boxShadow: '0 4px 20px -4px rgba(255,81,36,0.4)',
                    }}
                  >
                    {copiedLink ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copiedLink ? 'Copied!' : 'Copy Link'}
                  </button>
                  <a
                    href={`/listing/${listing.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={glassButtonOutline}
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open
                  </a>
                </div>
              </div>

              {/* Section 2 — Auto-Generated Caption */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-white/60 uppercase tracking-wider">Ready-to-Post Caption</p>
                <div
                  className="rounded-lg p-3 text-sm whitespace-pre-line text-white/70 leading-relaxed max-h-32 overflow-y-auto"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  {caption}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleCopyCaption(false)}
                    className={glassButtonOutline}
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                  >
                    {copiedCaption ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    Caption
                  </button>
                  <button
                    onClick={() => handleCopyCaption(true)}
                    className={glassButtonOutline}
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                  >
                    <Copy className="h-4 w-4" />
                    Caption + Link
                  </button>
                </div>
              </div>

              {/* Section 3 — Quick Share */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-white/60 uppercase tracking-wider">Quick Share</p>
                <div className="flex gap-2">
                  {socialButtons.map((btn) => (
                    <button
                      key={btn.id}
                      onClick={() => handleSocialClick(btn.id)}
                      className="w-11 h-11 rounded-lg flex items-center justify-center text-white/50 transition-all hover:text-white hover:scale-105"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                        e.currentTarget.style.borderColor = 'rgba(255,81,36,0.3)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                      }}
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
                <p className="text-xs font-medium text-white/60 uppercase tracking-wider">QR Code</p>
                <div className="flex items-start gap-4">
                  {qrDataUrl && (
                    <div
                      className="shrink-0 p-2 rounded-lg"
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                    >
                      <img src={qrDataUrl} alt="QR Code" className="w-20 h-20" />
                    </div>
                  )}
                  <div className="space-y-2">
                    <button
                      onClick={handleDownloadQr}
                      className={glassButtonOutline}
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                    >
                      <Download className="h-4 w-4" />
                      Download QR
                    </button>
                    <p className="text-xs text-white/30">
                      Print this and display at events or on your truck.
                    </p>
                  </div>
                </div>
              </div>

              {/* UTM Toggle */}
              <div
                className="flex items-center justify-between py-2.5 px-3 rounded-lg"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <span className="text-xs text-white/40">Add UTM tracking</span>
                <button
                  onClick={() => setUtmEnabled(!utmEnabled)}
                  className={`w-9 h-5 rounded-full transition-all relative ${utmEnabled ? 'bg-[#FF5124]' : 'bg-white/10'}`}
                  aria-label="Toggle UTM tracking"
                >
                  <span
                    className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${utmEnabled ? 'left-[18px]' : 'left-0.5'}`}
                  />
                </button>
              </div>

              {/* Section 6 — Psychology Boost */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="rounded-xl p-4 space-y-3"
                style={{
                  background: 'linear-gradient(135deg, rgba(255,81,36,0.12), rgba(255,184,0,0.06))',
                  border: '1px solid rgba(255,81,36,0.2)',
                }}
              >
                <div className="flex items-start gap-2">
                  <Sparkles className="h-4 w-4 text-[#FFB800] shrink-0 mt-0.5" />
                  <p className="text-xs text-white/70">
                    <span className="font-medium text-white/90">Listings shared within the first 24 hours</span> get significantly more visibility.
                  </p>
                </div>
                <button
                  onClick={handleCopyEverything}
                  className="w-full h-10 rounded-lg font-medium text-sm transition-all text-white"
                  style={{
                    background: 'linear-gradient(135deg, #FF5124, #E64A19, #FFB800)',
                    boxShadow: '0 4px 20px -4px rgba(255,81,36,0.4)',
                  }}
                >
                  Copy Everything & Close
                </button>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ShareKitModal;
