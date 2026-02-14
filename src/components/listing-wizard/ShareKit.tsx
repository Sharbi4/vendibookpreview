import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';
import { 
  Check, 
  Copy, 
  Download, 
  ExternalLink, 
  QrCode,
  Pencil,
  Mail
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { CATEGORY_LABELS, ListingCategory, ListingMode } from '@/types/listing';
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

export const ShareKit: React.FC<ShareKitProps> = ({ listing, onClose }) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [linkCopied, setLinkCopied] = useState(false);
  const [emailLinkCopied, setEmailLinkCopied] = useState(false);

  const listingUrl = `${window.location.origin}/listing/${listing.id}`;
  const categoryLabel = CATEGORY_LABELS[listing.category] || listing.category;
  
  // Extract city from address
  const city = listing.address?.split(',')[0]?.trim() || '';

  // Generate QR code on mount
  useEffect(() => {
    trackShareKitViewed();
    
    QRCode.toDataURL(listingUrl, {
      width: 256,
      margin: 2,
      color: { dark: '#000000', light: '#FFFFFF' },
    }).then(setQrCodeDataUrl).catch(console.error);
  }, [listingUrl]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(listingUrl);
      setLinkCopied(true);
      trackShareLinkCopied();
      toast({ title: 'Link copied!' });
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      toast({ title: 'Failed to copy', variant: 'destructive' });
    }
  };

  const handleCopyEmailLink = async () => {
    try {
      await navigator.clipboard.writeText(listingUrl);
      setEmailLinkCopied(true);
      trackShareLinkCopied();
      toast({ title: 'Link copied for email!' });
      setTimeout(() => setEmailLinkCopied(false), 2000);
    } catch {
      toast({ title: 'Failed to copy', variant: 'destructive' });
    }
  };

  const handleDownloadNowBooking = () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 1080;
    canvas.height = 1080;

    // White background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, 1080, 1080);

    // Top accent bar
    ctx.fillStyle = '#FF5124';
    ctx.fillRect(0, 0, 1080, 8);

    // "NOW BOOKING" headline
    ctx.fillStyle = '#FF5124';
    ctx.font = 'bold 72px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('NOW BOOKING', 540, 280);

    // Decorative line under headline
    ctx.strokeStyle = '#FF5124';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(340, 310);
    ctx.lineTo(740, 310);
    ctx.stroke();

    // Listing name
    ctx.fillStyle = '#1A1A1A';
    ctx.font = 'bold 44px system-ui, -apple-system, sans-serif';
    const titleLines = wrapText(ctx, listing.title, 900, 2);
    titleLines.forEach((line, i) => {
      ctx.fillText(line, 540, 420 + i * 56);
    });

    // City
    if (city) {
      ctx.fillStyle = '#666666';
      ctx.font = '32px system-ui, -apple-system, sans-serif';
      ctx.fillText(`📍 ${city}`, 540, 420 + titleLines.length * 56 + 50);
    }

    // Booking link
    ctx.fillStyle = '#FF5124';
    ctx.font = '28px system-ui, -apple-system, sans-serif';
    ctx.fillText('Book at vendibook.com', 540, 780);

    // Bottom bar
    ctx.fillStyle = '#1A1A1A';
    ctx.fillRect(0, 1020, 1080, 60);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
    ctx.fillText('VENDIBOOK', 540, 1056);

    // Download
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

    // Dark charcoal background
    ctx.fillStyle = '#1A1A1A';
    ctx.fillRect(0, 0, 1080, 1080);

    // Accent stripe at top
    ctx.fillStyle = '#FF5124';
    ctx.fillRect(0, 0, 1080, 8);

    // Celebration emoji
    ctx.font = '80px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🎉', 540, 240);

    // "FIRST BOOKING SECURED" headline
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 56px system-ui, -apple-system, sans-serif';
    ctx.fillText('FIRST BOOKING', 540, 370);
    ctx.fillStyle = '#FF5124';
    ctx.font = 'bold 56px system-ui, -apple-system, sans-serif';
    ctx.fillText('SECURED', 540, 440);

    // Decorative line
    ctx.strokeStyle = '#FF5124';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(340, 475);
    ctx.lineTo(740, 475);
    ctx.stroke();

    // Listing name
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 38px system-ui, -apple-system, sans-serif';
    const titleLines = wrapText(ctx, listing.title, 900, 2);
    titleLines.forEach((line, i) => {
      ctx.fillText(line, 540, 570 + i * 50);
    });

    // Booking link
    ctx.fillStyle = '#FF5124';
    ctx.font = '26px system-ui, -apple-system, sans-serif';
    ctx.fillText('vendibook.com', 540, 780);

    // Bottom bar
    ctx.fillStyle = '#FF5124';
    ctx.fillRect(0, 1020, 1080, 60);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
    ctx.fillText('VENDIBOOK', 540, 1056);

    // Download
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

  return (
    <div className="space-y-8 max-w-lg mx-auto">
      
      {/* Header */}
      <div className="text-center pt-4">
        <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-5">
          <Check className="w-10 h-10 text-emerald-500" strokeWidth={3} />
        </div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Your Listing is Live 🎉</h1>
        <p className="text-muted-foreground text-lg">
          Start receiving booking requests by sharing your link.
        </p>
      </div>

      {/* Listing Link + QR Code */}
      <Card>
        <CardContent className="pt-6 space-y-5">
          {/* Link + Copy */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Your listing link</label>
            <div className="flex items-center gap-2">
              <div className="flex-1 px-3 py-2.5 bg-muted rounded-lg text-sm truncate font-mono text-muted-foreground">
                {listingUrl}
              </div>
              <Button onClick={handleCopyLink} size="lg" className="shrink-0">
                {linkCopied ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* QR Code */}
          <div className="flex items-center gap-4 pt-2">
            {qrCodeDataUrl && (
              <div className="bg-white p-2 rounded-xl border shadow-sm shrink-0">
                <img src={qrCodeDataUrl} alt="QR Code" className="w-24 h-24" />
              </div>
            )}
            <div className="flex-1 space-y-2">
              <p className="text-sm text-muted-foreground">
                Print this QR code and display it to drive traffic directly to your listing.
              </p>
              <Button variant="outline" size="sm" onClick={handleDownloadQr}>
                <Download className="w-4 h-4 mr-2" />
                Download QR code
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Promote Your Listing Section */}
      <div>
        <h2 className="text-xl font-semibold mb-1">Promote Your Listing</h2>
        <p className="text-sm text-muted-foreground mb-4">Download branded images to share on social media.</p>

        <div className="space-y-4">
          {/* "Now Booking" Image */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                {/* Preview thumbnail */}
                <div className="w-20 h-20 rounded-xl border-2 border-border bg-white flex flex-col items-center justify-center shrink-0 shadow-sm">
                  <span className="text-[8px] font-bold text-primary leading-tight">NOW</span>
                  <span className="text-[8px] font-bold text-primary leading-tight">BOOKING</span>
                  <div className="w-6 h-px bg-primary mt-0.5 mb-0.5" />
                  <span className="text-[5px] text-muted-foreground leading-tight truncate max-w-[60px]">{listing.title}</span>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-sm mb-1">Download "Now Booking" Image</h3>
                  <p className="text-xs text-muted-foreground mb-3">
                    Branded 1080×1080 graphic with your listing name{city ? `, ${city}` : ''}, and booking link.
                  </p>
                  <Button onClick={handleDownloadNowBooking} size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Download image
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* "First Booking Secured" Image */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                {/* Preview thumbnail */}
                <div className="w-20 h-20 rounded-xl border-2 border-border bg-foreground flex flex-col items-center justify-center shrink-0 shadow-sm">
                  <span className="text-[10px]">🎉</span>
                  <span className="text-[6px] font-bold text-white leading-tight">FIRST BOOKING</span>
                  <span className="text-[6px] font-bold text-primary leading-tight">SECURED</span>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-sm mb-1">Download "First Booking Secured" Image</h3>
                  <p className="text-xs text-muted-foreground mb-3">
                    Celebration graphic to share when you land your first booking.
                  </p>
                  <Button onClick={handleDownloadFirstBooking} variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Download image
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Email Link Section */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <Mail className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-sm mb-1">Add to Email</h3>
                  <p className="text-xs text-muted-foreground mb-3">
                    Add this link to your email signature so people can book directly.
                  </p>
                  <Button onClick={handleCopyEmailLink} variant="outline" size="sm">
                    {emailLinkCopied ? (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 mr-2" />
                        Copy listing link for email
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button onClick={handleViewListing} variant="outline" className="flex-1" size="lg">
          <ExternalLink className="w-4 h-4 mr-2" />
          View Public Listing
        </Button>
        <Button onClick={() => navigate(`/list?edit=${listing.id}`)} variant="outline" className="flex-1" size="lg">
          <Pencil className="w-4 h-4 mr-2" />
          Edit Listing
        </Button>
      </div>

      {/* Psychology Banner */}
      <div className="rounded-xl border p-4" style={{ background: 'linear-gradient(135deg, hsla(14, 100%, 55%, 0.06), hsla(40, 100%, 49%, 0.06))', borderColor: 'hsla(14, 100%, 55%, 0.15)' }}>
        <p className="text-xs text-center text-muted-foreground">
          📈 Listings that share their link receive up to <span className="font-semibold text-foreground">3× more booking requests</span>.
        </p>
      </div>

      {onClose && (
        <div className="text-center pb-4">
          <Button variant="ghost" onClick={() => { trackShareKitDismissed(); onClose(); }}>
            Go to dashboard
          </Button>
        </div>
      )}
    </div>
  );
};
