import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import QRCode from 'qrcode';
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  Pencil,
  Mail,
  Share2,
  Sparkles,
  TrendingUp,
  MapPin,
  MessageCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { CATEGORY_LABELS, ListingCategory, ListingMode } from '@/types/listing';
import { cn } from '@/lib/utils';
import {
  trackShareKitViewed,
  trackShareLinkCopied,
  trackShareQrDownloaded,
  trackShareImageDownloaded,
  trackShareKitDismissed,
} from '@/lib/analytics';

export interface ShareKitListing {
  id: string;
  title: string;
  coverImageUrl: string | null;
  category: ListingCategory;
  mode: ListingMode;
  address: string | null;
  priceDaily: number | null;
  priceWeekly: number | null;
  priceSale: number | null;
  highlights?: string[];
  availableFrom?: string | null;
  availableTo?: string | null;
}

interface ShareKitProps {
  listing: ShareKitListing;
  onClose?: () => void;
}

// Helper to wrap text on canvas
const wrapText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines = 3): string[] => {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';
  words.forEach(word => {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (ctx.measureText(testLine).width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  });
  if (currentLine) lines.push(currentLine);
  return lines.slice(0, maxLines);
};

// Social Icons (monochrome SVG)
const FacebookIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);
const XIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);
const LinkedInIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.063 2.063 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
  </svg>
);
const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
  </svg>
);

export const ShareKit: React.FC<ShareKitProps> = ({ listing, onClose }) => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [linkCopied, setLinkCopied] = useState(false);
  const [emailLinkCopied, setEmailLinkCopied] = useState(false);

  const listingUrl = `${window.location.origin}/listing/${listing.id}`;
  const prettyUrl = listingUrl.replace(/^https?:\/\//, '');
  const categoryLabel = CATEGORY_LABELS[listing.category] || listing.category;
  const city = listing.address?.split(',')[0]?.trim() || '';

  const price = listing.mode === 'sale'
    ? listing.priceSale
    : listing.priceDaily || listing.priceWeekly;
  const priceLabel = listing.mode === 'sale'
    ? 'For sale'
    : listing.priceDaily ? '/ day' : '/ week';

  const shareText = listing.mode === 'sale'
    ? `🚚 ${categoryLabel} for sale${city ? ` in ${city}` : ''}: ${listing.title}`
    : `📅 Now booking on Vendibook${city ? ` in ${city}` : ''}: ${listing.title}`;

  useEffect(() => {
    trackShareKitViewed();
    QRCode.toDataURL(listingUrl, {
      width: 320,
      margin: 1,
      color: { dark: '#111111', light: '#FFFFFF' },
    }).then(setQrCodeDataUrl).catch(console.error);
  }, [listingUrl]);

  const copy = async (text: string, setFlag: (b: boolean) => void, msg: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setFlag(true);
      trackShareLinkCopied();
      toast({ title: msg });
      setTimeout(() => setFlag(false), 2000);
    } catch {
      toast({ title: 'Failed to copy', variant: 'destructive' });
    }
  };

  const handleCopyLink = () => copy(listingUrl, setLinkCopied, 'Link copied!');
  const handleCopyEmailLink = () => copy(listingUrl, setEmailLinkCopied, 'Link copied for email!');

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: listing.title, text: shareText, url: listingUrl });
        trackShareLinkCopied();
      } catch {
        // user cancelled
      }
    } else {
      handleCopyLink();
    }
  };

  const openShare = (platform: string) => {
    const u = encodeURIComponent(listingUrl);
    const t = encodeURIComponent(shareText);
    const urls: Record<string, string> = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${u}`,
      x: `https://twitter.com/intent/tweet?text=${t}&url=${u}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${u}`,
      whatsapp: `https://wa.me/?text=${t}%20${u}`,
    };
    window.open(urls[platform], '_blank', 'noopener,noreferrer');
  };

  const handleDownloadNowBooking = () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = 1080;
    canvas.height = 1080;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, 1080, 1080);
    ctx.fillStyle = '#FF5124';
    ctx.fillRect(0, 0, 1080, 8);
    ctx.fillStyle = '#FF5124';
    ctx.font = 'bold 72px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('NOW BOOKING', 540, 280);
    ctx.strokeStyle = '#FF5124';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(340, 310);
    ctx.lineTo(740, 310);
    ctx.stroke();
    ctx.fillStyle = '#1A1A1A';
    ctx.font = 'bold 44px system-ui, -apple-system, sans-serif';
    const titleLines = wrapText(ctx, listing.title, 900, 2);
    titleLines.forEach((line, i) => ctx.fillText(line, 540, 420 + i * 56));
    if (city) {
      ctx.fillStyle = '#666666';
      ctx.font = '32px system-ui, -apple-system, sans-serif';
      ctx.fillText(`📍 ${city}`, 540, 420 + titleLines.length * 56 + 50);
    }
    ctx.fillStyle = '#FF5124';
    ctx.font = '28px system-ui, -apple-system, sans-serif';
    ctx.fillText('Book at vendibook.com', 540, 780);
    ctx.fillStyle = '#1A1A1A';
    ctx.fillRect(0, 1020, 1080, 60);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
    ctx.fillText('VENDIBOOK', 540, 1056);
    const link = document.createElement('a');
    link.download = `vendibook-now-booking-${listing.id}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    trackShareImageDownloaded();
    toast({ title: '"Now Booking" image downloaded' });
  };

  const handleDownloadFirstBooking = () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = 1080;
    canvas.height = 1080;
    ctx.fillStyle = '#1A1A1A';
    ctx.fillRect(0, 0, 1080, 1080);
    ctx.fillStyle = '#FF5124';
    ctx.fillRect(0, 0, 1080, 8);
    ctx.font = '80px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🎉', 540, 240);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 56px system-ui, -apple-system, sans-serif';
    ctx.fillText('FIRST BOOKING', 540, 370);
    ctx.fillStyle = '#FF5124';
    ctx.fillText('SECURED', 540, 440);
    ctx.strokeStyle = '#FF5124';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(340, 475);
    ctx.lineTo(740, 475);
    ctx.stroke();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 38px system-ui, -apple-system, sans-serif';
    const titleLines = wrapText(ctx, listing.title, 900, 2);
    titleLines.forEach((line, i) => ctx.fillText(line, 540, 570 + i * 50));
    ctx.fillStyle = '#FF5124';
    ctx.font = '26px system-ui, -apple-system, sans-serif';
    ctx.fillText('vendibook.com', 540, 780);
    ctx.fillStyle = '#FF5124';
    ctx.fillRect(0, 1020, 1080, 60);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
    ctx.fillText('VENDIBOOK', 540, 1056);
    const link = document.createElement('a');
    link.download = `vendibook-first-booking-${listing.id}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    trackShareImageDownloaded();
    toast({ title: '"First Booking Secured" image downloaded' });
  };

  const handleDownloadQr = () => {
    if (!qrCodeDataUrl) return;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const qrImage = new Image();
    qrImage.onload = () => {
      const padding = 32;
      canvas.width = qrImage.width + padding * 2;
      canvas.height = qrImage.height + padding * 2 + 40;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(qrImage, padding, padding);
      ctx.fillStyle = '#666666';
      ctx.font = '14px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Scan to book on Vendibook', canvas.width / 2, canvas.height - 16);
      const link = document.createElement('a');
      link.download = `vendibook-qr-${listing.id}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      trackShareQrDownloaded();
      toast({ title: 'QR code downloaded' });
    };
    qrImage.src = qrCodeDataUrl;
  };

  const handleViewListing = () => {
    trackShareKitDismissed();
    navigate(`/listing/${listing.id}`);
  };

  const socialButtons = [
    { id: 'facebook', label: 'Facebook', Icon: FacebookIcon, color: 'hover:text-[#1877F2]' },
    { id: 'x', label: 'X', Icon: XIcon, color: 'hover:text-foreground' },
    { id: 'linkedin', label: 'LinkedIn', Icon: LinkedInIcon, color: 'hover:text-[#0A66C2]' },
    { id: 'whatsapp', label: 'WhatsApp', Icon: WhatsAppIcon, color: 'hover:text-[#25D366]' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="space-y-6 max-w-xl mx-auto"
    >
      {/* HERO */}
      <div className="text-center pt-2">
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 220, damping: 18 }}
          className="relative w-20 h-20 mx-auto mb-5"
        >
          <div className="absolute inset-0 rounded-full bg-emerald-500/15 blur-xl" />
          <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
            <Check className="w-10 h-10 text-white" strokeWidth={3} />
          </div>
        </motion.div>
        <h1 className="text-[28px] md:text-[32px] font-semibold tracking-tight mb-2 leading-tight">
          You're live. Now let's get you booked.
        </h1>
        <p className="text-muted-foreground text-base max-w-md mx-auto">
          Hosts who share within the first 24 hours get up to <span className="font-medium text-foreground">3× more requests</span>.
        </p>
      </div>

      {/* LISTING PREVIEW CARD */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="rounded-2xl border bg-card overflow-hidden shadow-sm"
      >
        <div className="flex gap-3 p-3">
          <div className="w-20 h-20 rounded-xl overflow-hidden bg-muted shrink-0 ring-1 ring-border">
            {listing.coverImageUrl ? (
              <img src={listing.coverImageUrl} alt={listing.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-muted to-muted-foreground/10" />
            )}
          </div>
          <div className="flex-1 min-w-0 py-0.5">
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground uppercase tracking-wide font-medium">
              <span>{categoryLabel}</span>
              <span>·</span>
              <span>{listing.mode === 'sale' ? 'For Sale' : 'For Rent'}</span>
            </div>
            <h3 className="font-semibold text-[15px] mt-0.5 line-clamp-1">{listing.title}</h3>
            {city && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                <MapPin className="w-3 h-3" />
                <span>{city}</span>
              </div>
            )}
            {price && (
              <div className="text-sm font-semibold mt-1">
                ${price.toLocaleString()}
                <span className="text-xs font-normal text-muted-foreground ml-1">{priceLabel}</span>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* SHARE LINK + PRIMARY ACTIONS */}
      <div className="rounded-2xl border bg-card p-5 space-y-4">
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Your link
          </label>
          <div className="mt-2 flex items-stretch gap-2">
            <div className="flex-1 px-3.5 py-2.5 bg-muted/60 rounded-xl text-sm truncate font-mono text-foreground/80 flex items-center">
              {prettyUrl}
            </div>
            <Button
              onClick={handleCopyLink}
              className={cn(
                'shrink-0 rounded-xl h-auto px-4 transition-all',
                linkCopied && 'bg-emerald-500 hover:bg-emerald-500'
              )}
            >
              {linkCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span className="ml-2 hidden sm:inline">{linkCopied ? 'Copied' : 'Copy'}</span>
            </Button>
          </div>
        </div>

        {/* SOCIAL ROW */}
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Share to
          </label>
          <div className="mt-2 flex items-center gap-2">
            {socialButtons.map(({ id, label, Icon, color }) => (
              <button
                key={id}
                onClick={() => openShare(id)}
                aria-label={`Share to ${label}`}
                className={cn(
                  'flex-1 h-12 rounded-xl border bg-background text-muted-foreground flex items-center justify-center transition-all hover:border-foreground/20 hover:bg-muted/50 active:scale-95',
                  color
                )}
              >
                <Icon className="w-5 h-5" />
              </button>
            ))}
            <button
              onClick={handleNativeShare}
              aria-label="More share options"
              className="flex-1 h-12 rounded-xl border bg-background text-muted-foreground flex items-center justify-center transition-all hover:border-foreground/20 hover:bg-muted/50 hover:text-foreground active:scale-95"
            >
              <Share2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* QR CODE */}
      <div className="rounded-2xl border bg-card p-5">
        <div className="flex items-center gap-4">
          {qrCodeDataUrl ? (
            <div className="bg-white p-2 rounded-xl border shrink-0">
              <img src={qrCodeDataUrl} alt="QR Code" className="w-24 h-24 block" />
            </div>
          ) : (
            <div className="w-[112px] h-[112px] rounded-xl bg-muted animate-pulse shrink-0" />
          )}
          <div className="flex-1">
            <h3 className="font-semibold text-[15px]">QR code</h3>
            <p className="text-xs text-muted-foreground mt-0.5 mb-3">
              Print and display on signage, flyers, or your truck.
            </p>
            <Button variant="outline" size="sm" onClick={handleDownloadQr} className="rounded-lg">
              <Download className="w-4 h-4 mr-2" />
              Download QR
            </Button>
          </div>
        </div>
      </div>

      {/* PROMOTE — IMAGE GRAPHICS */}
      <div>
        <div className="flex items-center gap-2 mb-3 px-1">
          <Sparkles className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold uppercase tracking-wide">Branded graphics</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Now Booking */}
          <button
            onClick={handleDownloadNowBooking}
            className="group text-left rounded-2xl border bg-card overflow-hidden transition-all hover:shadow-md hover:-translate-y-0.5"
          >
            <div className="aspect-square bg-white flex flex-col items-center justify-center relative overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-1 bg-primary" />
              <div className="text-primary font-bold text-base tracking-wide">NOW BOOKING</div>
              <div className="w-12 h-px bg-primary mt-1.5 mb-2" />
              <div className="text-foreground font-semibold text-[10px] px-3 text-center line-clamp-2">{listing.title}</div>
              {city && <div className="text-muted-foreground text-[8px] mt-1">📍 {city}</div>}
              <div className="absolute bottom-0 inset-x-0 h-4 bg-foreground flex items-center justify-center">
                <span className="text-white text-[7px] font-bold tracking-widest">VENDIBOOK</span>
              </div>
            </div>
            <div className="p-3 flex items-center justify-between">
              <div>
                <div className="font-semibold text-sm">Now Booking</div>
                <div className="text-xs text-muted-foreground">1080×1080 · Instagram-ready</div>
              </div>
              <Download className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
          </button>

          {/* First Booking */}
          <button
            onClick={handleDownloadFirstBooking}
            className="group text-left rounded-2xl border bg-card overflow-hidden transition-all hover:shadow-md hover:-translate-y-0.5"
          >
            <div className="aspect-square bg-foreground flex flex-col items-center justify-center relative overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-1 bg-primary" />
              <div className="text-2xl mb-1">🎉</div>
              <div className="text-white font-bold text-[11px]">FIRST BOOKING</div>
              <div className="text-primary font-bold text-[11px]">SECURED</div>
              <div className="absolute bottom-0 inset-x-0 h-4 bg-primary flex items-center justify-center">
                <span className="text-white text-[7px] font-bold tracking-widest">VENDIBOOK</span>
              </div>
            </div>
            <div className="p-3 flex items-center justify-between">
              <div>
                <div className="font-semibold text-sm">First Booking</div>
                <div className="text-xs text-muted-foreground">Celebrate your first sale</div>
              </div>
              <Download className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
          </button>
        </div>
      </div>

      {/* EMAIL SIGNATURE */}
      <button
        onClick={handleCopyEmailLink}
        className="w-full flex items-center gap-3 p-4 rounded-2xl border bg-card text-left hover:bg-muted/40 transition-colors"
      >
        <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
          <Mail className="w-5 h-5 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm">Add to your email signature</div>
          <div className="text-xs text-muted-foreground">One-tap copy for Gmail, Outlook & Apple Mail</div>
        </div>
        <div className={cn(
          'shrink-0 text-xs font-medium px-3 py-1.5 rounded-lg',
          emailLinkCopied ? 'bg-emerald-500 text-white' : 'bg-muted text-foreground'
        )}>
          {emailLinkCopied ? 'Copied' : 'Copy'}
        </div>
      </button>

      {/* SECONDARY ACTIONS */}
      <div className="grid grid-cols-2 gap-2">
        <Button onClick={handleViewListing} variant="outline" size="lg" className="rounded-xl">
          <ExternalLink className="w-4 h-4 mr-2" />
          View listing
        </Button>
        <Button onClick={() => navigate(`/list?edit=${listing.id}`)} variant="outline" size="lg" className="rounded-xl">
          <Pencil className="w-4 h-4 mr-2" />
          Edit
        </Button>
      </div>

      {/* PSYCHOLOGY NUDGE */}
      <div className="rounded-2xl p-4 flex items-center gap-3 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20">
        <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
          <TrendingUp className="w-4.5 h-4.5 text-primary" />
        </div>
        <p className="text-xs text-foreground/80 leading-relaxed">
          <span className="font-semibold text-foreground">Tip:</span> Post to your Stories today — listings shared in the first 24 hours convert <span className="font-semibold">3× faster</span>.
        </p>
      </div>

      {onClose && (
        <div className="text-center pt-2 pb-2">
          <Button
            variant="ghost"
            onClick={() => { trackShareKitDismissed(); onClose(); }}
            className="text-muted-foreground"
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            Go to dashboard
          </Button>
        </div>
      )}
    </motion.div>
  );
};
