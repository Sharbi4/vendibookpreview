import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';
import { jsPDF } from 'jspdf';
import { 
  Check, 
  Copy, 
  Download, 
  ExternalLink, 
  Facebook, 
  Plus, 
  QrCode,
  Image as ImageIcon,
  ChevronDown,
  Sparkles,
  FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { CATEGORY_LABELS, MODE_LABELS, ListingCategory, ListingMode } from '@/types/listing';
import {
  trackShareKitViewed,
  trackShareLinkCopied,
  trackShareFbTextCopied,
  trackShareQrDownloaded,
  trackShareImageDownloaded,
  trackShareKitDismissed,
} from '@/lib/analytics';
import { cn } from '@/lib/utils';

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

type PostVariant = 'short' | 'friendly' | 'event' | 'seller';

const POST_VARIANTS: { id: PostVariant; label: string; description: string }[] = [
  { id: 'short', label: 'Short + Direct', description: 'Quick and to the point' },
  { id: 'friendly', label: 'Friendly + Story', description: 'Personal and engaging' },
  { id: 'event', label: 'Event-ready', description: 'For festivals & events' },
  { id: 'seller', label: 'Seller-focused', description: 'Highlight the business opportunity' },
];

export const ShareKit: React.FC<ShareKitProps> = ({ listing, onClose }) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [selectedVariant, setSelectedVariant] = useState<PostVariant>(listing.mode === 'sale' ? 'seller' : 'short');
  const [postText, setPostText] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);
  const [showVariants, setShowVariants] = useState(false);

  const listingUrl = `${window.location.origin}/listing/${listing.id}`;
  const categoryLabel = CATEGORY_LABELS[listing.category] || listing.category;
  const modeLabel = MODE_LABELS[listing.mode] || listing.mode;
  
  // Extract city from address
  const city = listing.address?.split(',')[0]?.trim() || '';
  const state = listing.address?.split(',')[1]?.trim()?.substring(0, 2) || '';
  const locationShort = city && state ? `${city}, ${state}` : listing.address || '';

  const formatPrice = () => {
    if (listing.mode === 'rent') {
      if (listing.priceDaily) return `$${listing.priceDaily}/day`;
      if (listing.priceWeekly) return `$${listing.priceWeekly}/week`;
    }
    if (listing.priceSale) return `$${listing.priceSale.toLocaleString()}`;
    return null;
  };

  const priceText = formatPrice();

  // Generate hashtags based on city and category
  const generateHashtags = () => {
    const tags: string[] = [];
    if (city) tags.push(`#${city.replace(/\s+/g, '')}FoodTruck`);
    if (listing.category === 'food_truck') tags.push('#FoodTruckForRent', '#FoodTruckLife');
    else if (listing.category === 'food_trailer') tags.push('#FoodTrailer', '#ConcessionTrailer');
    else if (listing.category === 'ghost_kitchen') tags.push('#GhostKitchen', '#CloudKitchen');
    else if (listing.category === 'vendor_lot') tags.push('#VendorLot', '#FoodVendor');
    if (listing.mode === 'sale') tags.push('#ForSale');
    return tags.slice(0, 4).join(' ');
  };

  // Generate post text based on variant
  const generatePostText = (variant: PostVariant): string => {
    const highlights = listing.highlights?.slice(0, 3) || [];
    const hashtags = generateHashtags();
    const priceInfo = priceText ? `${priceText}${listing.mode === 'rent' ? ' starting rate' : ''}` : '';
    
    switch (variant) {
      case 'short':
        return `🚚 ${categoryLabel} ${listing.mode === 'rent' ? 'for rent' : 'for sale'} in ${locationShort}!

${listing.title}
${priceInfo ? `💰 ${priceInfo}` : ''}
${highlights.length > 0 ? `\n✅ ${highlights.join('\n✅ ')}` : ''}

📲 Book on Vendibook:
${listingUrl}

${hashtags}`;

      case 'friendly':
        return `Hey everyone! 👋

I'm excited to share my ${categoryLabel.toLowerCase()} listing${locationShort ? ` in ${locationShort}` : ''}!

"${listing.title}"

${listing.mode === 'rent' ? "Whether you're looking to start your food business or need equipment for an upcoming event, this is a great opportunity!" : "Ready for a new owner who wants to hit the ground running!"}

${highlights.length > 0 ? `Here's what makes it special:\n• ${highlights.join('\n• ')}` : ''}
${priceInfo ? `\nPricing: ${priceInfo}` : ''}

Message me on Vendibook to learn more or book:
${listingUrl}

${hashtags}`;

      case 'event':
        return `🎪 Looking for a ${categoryLabel.toLowerCase()} for your next event?

${listing.title} is now available ${locationShort ? `in ${locationShort}` : ''}!

Perfect for:
🎉 Festivals & fairs
🏢 Corporate events
🎓 School functions
🎄 Holiday markets

${highlights.length > 0 ? `Includes:\n✅ ${highlights.join('\n✅ ')}` : ''}
${priceInfo ? `\n💵 ${priceInfo}` : ''}

Book now on Vendibook:
${listingUrl}

${hashtags}`;

      case 'seller':
        return `📢 Business Opportunity Alert!

${categoryLabel} ${listing.mode === 'rent' ? 'Available for Rent' : 'For Sale'} in ${locationShort}

${listing.title}

${listing.mode === 'sale' ? "Turn-key business ready for a new owner. Start earning from day one!" : "Generate income by renting out this fully-equipped unit!"}

${highlights.length > 0 ? `Key Features:\n🔹 ${highlights.join('\n🔹 ')}` : ''}
${priceInfo ? `\n💰 Price: ${priceInfo}` : ''}

Serious inquiries only. View listing and message me on Vendibook:
${listingUrl}

${hashtags}`;

      default:
        return '';
    }
  };

  // Generate QR code on mount
  useEffect(() => {
    trackShareKitViewed();
    
    QRCode.toDataURL(listingUrl, {
      width: 256,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    }).then(setQrCodeDataUrl).catch(console.error);
  }, [listingUrl]);

  // Update post text when variant changes
  useEffect(() => {
    setPostText(generatePostText(selectedVariant));
  }, [selectedVariant, listing]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(listingUrl);
      setLinkCopied(true);
      trackShareLinkCopied();
      toast({ title: 'Link copied' });
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      toast({ title: 'Failed to copy', variant: 'destructive' });
    }
  };

  const handleCopyPostText = async () => {
    try {
      await navigator.clipboard.writeText(postText);
      trackShareFbTextCopied();
      toast({ title: 'Post text copied' });
    } catch {
      toast({ title: 'Failed to copy', variant: 'destructive' });
    }
  };

  const handleDownloadQr = async (withCaption: boolean = false) => {
    if (!qrCodeDataUrl) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const qrImage = new Image();
    qrImage.onload = () => {
      const padding = 32;
      const captionHeight = withCaption ? 40 : 0;
      
      canvas.width = qrImage.width + padding * 2;
      canvas.height = qrImage.height + padding * 2 + captionHeight;
      
      // White background
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw QR code
      ctx.drawImage(qrImage, padding, padding);
      
      // Add caption if requested
      if (withCaption) {
        ctx.fillStyle = '#666666';
        ctx.font = '14px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Scan to view my listing', canvas.width / 2, canvas.height - 16);
      }
      
      // Download
      const link = document.createElement('a');
      link.download = `vendibook-qr-${listing.id}${withCaption ? '-caption' : ''}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      
      trackShareQrDownloaded();
      toast({ title: 'QR code downloaded' });
    };
    qrImage.src = qrCodeDataUrl;
  };

  const handleDownloadPdfFlyer = async () => {
    if (!qrCodeDataUrl) return;

    try {
      // Create PDF - Letter size (8.5 x 11 inches)
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'in',
        format: 'letter',
      });

      const pageWidth = 8.5;
      const pageHeight = 11;
      const margin = 0.5;
      const contentWidth = pageWidth - margin * 2;

      // Brand colors
      const primaryOrange: [number, number, number] = [255, 81, 36]; // #FF5124
      const primaryDark: [number, number, number] = [234, 88, 12]; // #EA580C
      const darkColor: [number, number, number] = [26, 26, 26];
      const grayColor: [number, number, number] = [100, 100, 100];
      const lightGray: [number, number, number] = [245, 245, 245];

      // === DYNAMIC HEADER WITH DIAGONAL STRIPE ===
      // Main orange header
      pdf.setFillColor(...primaryOrange);
      pdf.rect(0, 0, pageWidth, 1.8, 'F');
      
      // Decorative diagonal accent stripe
      pdf.setFillColor(...primaryDark);
      pdf.triangle(pageWidth - 3, 0, pageWidth, 0, pageWidth, 1.2, 'F');
      
      // Small decorative dots
      pdf.setFillColor(255, 255, 255);
      pdf.circle(0.4, 0.4, 0.08, 'F');
      pdf.circle(0.65, 0.55, 0.05, 'F');
      pdf.circle(0.3, 0.7, 0.06, 'F');

      // Vendibook logo text with shadow effect
      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(36);
      pdf.setFont('helvetica', 'bold');
      pdf.text('VendiBook', margin + 0.02, 0.72);
      pdf.setTextColor(255, 255, 255);
      pdf.text('VendiBook', margin, 0.7);

      // Tagline with modern styling
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(255, 255, 255);
      pdf.text('THE MARKETPLACE FOR MOBILE FOOD', margin, 1.1);

      // Mode badge in header (RENT or SALE)
      const modeBadgeText = listing.mode === 'rent' ? '🔥 FOR RENT' : '💰 FOR SALE';
      pdf.setFillColor(255, 255, 255);
      const modeBadgeWidth = 1.6;
      pdf.roundedRect(pageWidth - margin - modeBadgeWidth, 0.45, modeBadgeWidth, 0.4, 0.1, 0.1, 'F');
      pdf.setTextColor(...primaryOrange);
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text(modeBadgeText, pageWidth - margin - modeBadgeWidth + 0.2, 0.72);

      let yPos = 2.2;

      // === MAIN CONTENT CARD ===
      // Card background with subtle shadow effect
      pdf.setFillColor(250, 250, 250);
      pdf.roundedRect(margin + 0.05, yPos - 0.1 + 0.05, contentWidth, 4.8, 0.15, 0.15, 'F');
      pdf.setFillColor(255, 255, 255);
      pdf.roundedRect(margin, yPos - 0.1, contentWidth, 4.8, 0.15, 0.15, 'F');
      pdf.setDrawColor(230, 230, 230);
      pdf.setLineWidth(0.01);
      pdf.roundedRect(margin, yPos - 0.1, contentWidth, 4.8, 0.15, 0.15, 'S');

      // Category pill
      pdf.setFillColor(...primaryOrange);
      const categoryText = categoryLabel.toUpperCase();
      pdf.setFontSize(10);
      const categoryWidth = pdf.getTextWidth(categoryText) * 0.04 + 0.35;
      pdf.roundedRect(margin + 0.25, yPos, categoryWidth, 0.28, 0.08, 0.08, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      pdf.text(categoryText, margin + 0.25 + 0.15, yPos + 0.19);
      yPos += 0.55;

      // Title - Large and bold
      pdf.setTextColor(...darkColor);
      pdf.setFontSize(26);
      pdf.setFont('helvetica', 'bold');
      const titleLines = pdf.splitTextToSize(listing.title, contentWidth - 0.5);
      titleLines.slice(0, 2).forEach((line: string, i: number) => {
        pdf.text(line, margin + 0.25, yPos + i * 0.4);
      });
      yPos += Math.min(titleLines.length, 2) * 0.4 + 0.25;

      // Location with icon
      if (locationShort) {
        pdf.setTextColor(...grayColor);
        pdf.setFontSize(13);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`📍 ${locationShort}`, margin + 0.25, yPos);
        yPos += 0.4;
      }

      // Divider line
      yPos += 0.1;
      pdf.setDrawColor(230, 230, 230);
      pdf.setLineWidth(0.015);
      pdf.line(margin + 0.25, yPos, margin + contentWidth - 0.25, yPos);
      yPos += 0.35;

      // === PRICE SECTION - Big and Bold ===
      if (priceText) {
        // Price background
        pdf.setFillColor(...lightGray);
        pdf.roundedRect(margin + 0.25, yPos - 0.15, contentWidth - 0.5, 0.8, 0.1, 0.1, 'F');
        
        pdf.setTextColor(...primaryOrange);
        pdf.setFontSize(38);
        pdf.setFont('helvetica', 'bold');
        pdf.text(priceText, margin + 0.45, yPos + 0.45);
        
        if (listing.mode === 'rent') {
          pdf.setTextColor(...grayColor);
          pdf.setFontSize(14);
          pdf.setFont('helvetica', 'normal');
          pdf.text('starting rate', margin + 0.45 + pdf.getTextWidth(priceText) * 0.11 + 0.15, yPos + 0.45);
        }
        yPos += 1.05;
      }

      // === HIGHLIGHTS SECTION ===
      if (listing.highlights && listing.highlights.length > 0) {
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(...darkColor);
        pdf.text('WHAT YOU GET:', margin + 0.25, yPos);
        yPos += 0.3;
        
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(12);
        listing.highlights.slice(0, 4).forEach((highlight) => {
          pdf.setFillColor(...primaryOrange);
          pdf.circle(margin + 0.35, yPos - 0.05, 0.06, 'F');
          pdf.setTextColor(...darkColor);
          pdf.text(highlight, margin + 0.55, yPos);
          yPos += 0.32;
        });
      }

      // === QR CODE SECTION ===
      yPos = 7.2;
      
      // QR section background
      pdf.setFillColor(...lightGray);
      pdf.roundedRect(margin, yPos - 0.25, contentWidth, 2.8, 0.15, 0.15, 'F');
      
      // Decorative corner accents
      pdf.setFillColor(...primaryOrange);
      pdf.triangle(margin, yPos - 0.25, margin + 0.3, yPos - 0.25, margin, yPos + 0.05, 'F');
      pdf.triangle(margin + contentWidth, yPos - 0.25, margin + contentWidth - 0.3, yPos - 0.25, margin + contentWidth, yPos + 0.05, 'F');

      // "SCAN TO BOOK" text
      pdf.setTextColor(...darkColor);
      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      pdf.text('SCAN TO VIEW & BOOK INSTANTLY', pageWidth / 2, yPos + 0.15, { align: 'center' });

      // QR Code with white background
      const qrSize = 1.8;
      const qrX = (pageWidth - qrSize) / 2;
      const qrY = yPos + 0.35;
      
      // White background for QR
      pdf.setFillColor(255, 255, 255);
      pdf.roundedRect(qrX - 0.15, qrY - 0.1, qrSize + 0.3, qrSize + 0.25, 0.1, 0.1, 'F');
      pdf.setDrawColor(...primaryOrange);
      pdf.setLineWidth(0.03);
      pdf.roundedRect(qrX - 0.15, qrY - 0.1, qrSize + 0.3, qrSize + 0.25, 0.1, 0.1, 'S');
      
      // QR Code
      pdf.addImage(qrCodeDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);

      // URL below QR
      pdf.setTextColor(...grayColor);
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text('vendibook.com', pageWidth / 2, yPos + 2.45, { align: 'center' });

      // === FOOTER ===
      // Footer background with gradient effect (simulated with two rectangles)
      pdf.setFillColor(...primaryDark);
      pdf.rect(0, pageHeight - 0.7, pageWidth, 0.7, 'F');
      pdf.setFillColor(...primaryOrange);
      pdf.rect(0, pageHeight - 0.7, pageWidth * 0.6, 0.7, 'F');
      
      // Diagonal transition
      pdf.setFillColor(...primaryDark);
      pdf.triangle(pageWidth * 0.5, pageHeight - 0.7, pageWidth * 0.7, pageHeight - 0.7, pageWidth * 0.7, pageHeight, 'F');
      
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Questions?', margin + 0.2, pageHeight - 0.38);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.text('1-877-8-VENDI-2  •  support@vendibook.com', margin + 0.2, pageHeight - 0.18);
      
      // Vendibook text on right side of footer
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('VendiBook', pageWidth - margin - 0.2, pageHeight - 0.28, { align: 'right' });

      // Save
      pdf.save(`vendibook-flyer-${listing.id}.pdf`);
      
      trackShareQrDownloaded();
      toast({ title: 'PDF flyer downloaded' });
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      toast({ title: 'Failed to generate PDF', variant: 'destructive' });
    }
  };

  const handleDownloadShareImage = async () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 1:1 ratio for social sharing
    canvas.width = 1080;
    canvas.height = 1080;

    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#F97316');
    gradient.addColorStop(1, '#EA580C');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // White card
    const cardMargin = 60;
    const cardWidth = canvas.width - cardMargin * 2;
    const cardHeight = canvas.height - cardMargin * 2;
    
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.roundRect(cardMargin, cardMargin, cardWidth, cardHeight, 24);
    ctx.fill();

    // Load and draw cover image if available
    const drawContent = () => {
      const textX = cardMargin + 40;
      let textY = cardMargin + 480;

      // Category badge
      ctx.fillStyle = '#F97316';
      ctx.beginPath();
      ctx.roundRect(textX, textY, ctx.measureText(categoryLabel).width + 24, 32, 8);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 16px system-ui, -apple-system, sans-serif';
      ctx.fillText(categoryLabel, textX + 12, textY + 22);
      
      textY += 52;

      // Title
      ctx.fillStyle = '#1A1A1A';
      ctx.font = 'bold 36px system-ui, -apple-system, sans-serif';
      const titleLines = wrapText(ctx, listing.title, cardWidth - 80);
      titleLines.forEach((line, i) => {
        ctx.fillText(line, textX, textY + i * 44);
      });
      
      textY += titleLines.length * 44 + 20;

      // Location
      if (locationShort) {
        ctx.fillStyle = '#666666';
        ctx.font = '24px system-ui, -apple-system, sans-serif';
        ctx.fillText(`📍 ${locationShort}`, textX, textY);
        textY += 40;
      }

      // Price
      if (priceText) {
        ctx.fillStyle = '#F97316';
        ctx.font = 'bold 32px system-ui, -apple-system, sans-serif';
        ctx.fillText(priceText, textX, textY);
        textY += 50;
      }

      // Mode badge
      ctx.fillStyle = listing.mode === 'rent' ? '#10B981' : '#3B82F6';
      ctx.beginPath();
      ctx.roundRect(textX, textY, ctx.measureText(modeLabel).width + 24, 36, 8);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 18px system-ui, -apple-system, sans-serif';
      ctx.fillText(modeLabel, textX + 12, textY + 25);

      // Vendibook logo/text at bottom
      ctx.fillStyle = '#999999';
      ctx.font = '20px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('vendibook.com', canvas.width / 2, canvas.height - cardMargin - 30);
      ctx.textAlign = 'left';

      // Download
      const link = document.createElement('a');
      link.download = `vendibook-share-${listing.id}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      
      trackShareImageDownloaded();
      toast({ title: 'Share image downloaded' });
    };

    // Helper to wrap text
    const wrapText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] => {
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
      return lines.slice(0, 3); // Max 3 lines
    };

    if (listing.coverImageUrl) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        // Draw image in card
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(cardMargin, cardMargin, cardWidth, 400, [24, 24, 0, 0]);
        ctx.clip();
        
        // Cover the area proportionally
        const imgRatio = img.width / img.height;
        const targetRatio = cardWidth / 400;
        let drawWidth, drawHeight, drawX, drawY;
        
        if (imgRatio > targetRatio) {
          drawHeight = 400;
          drawWidth = drawHeight * imgRatio;
          drawX = cardMargin - (drawWidth - cardWidth) / 2;
          drawY = cardMargin;
        } else {
          drawWidth = cardWidth;
          drawHeight = drawWidth / imgRatio;
          drawX = cardMargin;
          drawY = cardMargin - (drawHeight - 400) / 2;
        }
        
        ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
        ctx.restore();
        
        drawContent();
      };
      img.onerror = () => {
        // Draw placeholder if image fails
        ctx.fillStyle = '#E5E5E5';
        ctx.fillRect(cardMargin, cardMargin, cardWidth, 400);
        drawContent();
      };
      img.src = listing.coverImageUrl;
    } else {
      ctx.fillStyle = '#E5E5E5';
      ctx.fillRect(cardMargin, cardMargin, cardWidth, 400);
      drawContent();
    }
  };

  const handleViewListing = () => {
    trackShareKitDismissed();
    navigate(`/listing/${listing.id}`);
  };

  const handleAddAnother = () => {
    trackShareKitDismissed();
    navigate('/list');
  };

  const handleDismiss = () => {
    trackShareKitDismissed();
    onClose?.();
  };

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      {/* Header */}
      <div className="text-center">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <Sparkles className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold mb-1">You're live 🎉</h1>
        <p className="text-muted-foreground">Share your listing to get booked faster.</p>
      </div>

      {/* Card 1: Copy Link (PRIMARY) */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex-1 px-3 py-2 bg-muted rounded-lg text-sm truncate font-mono">
              {listingUrl}
            </div>
            <Button onClick={handleCopyLink} className="shrink-0">
              {linkCopied ? (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy link
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Card 2: Facebook Groups */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Facebook className="w-5 h-5 text-[#1877F2]" />
              Post to Facebook groups
            </CardTitle>
            <button
              onClick={() => setShowVariants(!showVariants)}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              {POST_VARIANTS.find(v => v.id === selectedVariant)?.label}
              <ChevronDown className={cn("w-4 h-4 transition-transform", showVariants && "rotate-180")} />
            </button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {showVariants && (
            <div className="grid grid-cols-2 gap-2 pb-2">
              {POST_VARIANTS.map((variant) => (
                <button
                  key={variant.id}
                  onClick={() => {
                    setSelectedVariant(variant.id);
                    setShowVariants(false);
                  }}
                  className={cn(
                    "text-left p-2 rounded-lg border transition-all text-sm",
                    selectedVariant === variant.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <span className="font-medium block">{variant.label}</span>
                  <span className="text-xs text-muted-foreground">{variant.description}</span>
                </button>
              ))}
            </div>
          )}
          
          <Textarea
            value={postText}
            onChange={(e) => setPostText(e.target.value)}
            className="min-h-[160px] text-sm"
          />
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCopyPostText} className="flex-1">
              <Copy className="w-4 h-4 mr-2" />
              Copy post text
            </Button>
            <Button
              variant="outline"
              onClick={() => window.open('https://www.facebook.com/groups/', '_blank')}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Open Facebook
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Card 3: QR Code */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <QrCode className="w-5 h-5" />
            QR code for your window
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-4">
            {qrCodeDataUrl && (
              <div className="bg-white p-2 rounded-lg border shrink-0">
                <img src={qrCodeDataUrl} alt="QR Code" className="w-24 h-24" />
              </div>
            )}
            <div className="flex flex-col gap-2 flex-1">
              <Button variant="outline" size="sm" onClick={() => handleDownloadQr(false)}>
                <Download className="w-4 h-4 mr-2" />
                Download QR
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleDownloadQr(true)}>
                <Download className="w-4 h-4 mr-2" />
                Download QR + caption
              </Button>
              <p className="text-xs text-muted-foreground">
                Print and display to drive walk-in traffic
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card 4: Print Flyer */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Print flyer
            <Badge variant="secondary" className="text-[10px] ml-auto">Pro quality</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-4">
            {/* Dynamic Flyer Preview */}
            <div className="w-20 h-28 rounded-lg overflow-hidden shadow-lg border border-border shrink-0 relative bg-white">
              {/* Header stripe */}
              <div className="h-5 bg-gradient-to-r from-primary to-primary/80 relative">
                <div className="absolute right-0 top-0 w-0 h-0 border-t-[20px] border-t-primary/60 border-l-[20px] border-l-transparent" />
                <span className="text-[4px] text-white font-bold absolute left-1 top-1.5">VendiBook</span>
              </div>
              {/* Content */}
              <div className="p-1.5 space-y-1">
                <div className="bg-primary/10 rounded px-1 py-0.5 inline-block">
                  <span className="text-[3px] text-primary font-bold">{categoryLabel.toUpperCase()}</span>
                </div>
                <div className="text-[4px] font-bold text-foreground line-clamp-2 leading-tight">
                  {listing.title}
                </div>
                {priceText && (
                  <div className="text-[5px] font-bold text-primary">{priceText}</div>
                )}
              </div>
              {/* QR placeholder */}
              <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-8 h-8 bg-muted rounded flex items-center justify-center">
                <QrCode className="w-5 h-5 text-muted-foreground" />
              </div>
              {/* Footer */}
              <div className="absolute bottom-0 left-0 right-0 h-2 bg-gradient-to-r from-primary to-primary/70" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground mb-3">
                Eye-catching print-ready flyer with your listing details, QR code, and professional Vendibook branding. Perfect for events, windows, or display on your truck.
              </p>
              <Button onClick={handleDownloadPdfFlyer} className="bg-gradient-to-r from-primary to-amber-500 hover:from-primary/90 hover:to-amber-500/90 text-white">
                <Download className="w-4 h-4 mr-2" />
                Download PDF flyer
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card 4: Share Image */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ImageIcon className="w-5 h-5" />
            Share image
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-primary-foreground shrink-0">
              <span className="text-xs font-medium text-center px-2">1:1 Share</span>
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground mb-2">
                Auto-generated image with your listing photo, title, and price.
              </p>
              <Button variant="outline" size="sm" onClick={handleDownloadShareImage}>
                <Download className="w-4 h-4 mr-2" />
                Download image
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bottom Actions */}
      <div className="flex items-center justify-center gap-4 pt-2">
        <button
          onClick={handleViewListing}
          className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
        >
          <ExternalLink className="w-4 h-4" />
          View listing
        </button>
        <span className="text-muted-foreground">•</span>
        <button
          onClick={handleAddAnother}
          className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
        >
          <Plus className="w-4 h-4" />
          Add another listing
        </button>
      </div>

      {onClose && (
        <div className="text-center">
          <Button variant="ghost" onClick={handleDismiss}>
            Go to dashboard
          </Button>
        </div>
      )}
    </div>
  );
};
