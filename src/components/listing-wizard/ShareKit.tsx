import React, { useState, useEffect, useCallback } from 'react';
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
  TrendingUp,
  MapPin,
  MessageCircle,
  MessageSquare,
  Send,
  Image as ImageIcon,
  Wand2,
  Camera} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { CATEGORY_LABELS, ListingCategory, ListingMode } from '@/types/listing';
import { cn } from '@/lib/utils';
import {
  trackShareKitViewed,
  trackShareLinkCopied,
  trackShareQrDownloaded,
  trackShareImageDownloaded,
  trackShareKitDismissed} from '@/lib/analytics';
import { useShareKit as useShareKitHook, type ShareChannel } from '@/hooks/useShareKit';

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
const InstagramIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
  </svg>
);
const PinterestIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345-.09.375-.293 1.199-.334 1.363-.052.225-.172.271-.398.165-1.501-.7-2.439-2.889-2.439-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.357-.631-2.748-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z" />
  </svg>
);
const RedditIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 01-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 01.042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 014.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 01.14-.197.35.35 0 01.238-.042l2.906.617a1.214 1.214 0 011.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 00-.231.094.33.33 0 000 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 00.029-.463.33.33 0 00-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 00-.232-.095z" />
  </svg>
);
const TelegramIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
  </svg>
);
const TikTokIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.84-.1z" />
  </svg>
);

export const ShareKit: React.FC<ShareKitProps> = ({ listing, onClose }) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { logShare, generate, templates } = useShareKitHook(listing.id);

  // AI-generated captions take precedence when available; falls back to local variants.
  useEffect(() => {
    generate().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listing.id]);

  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [linkCopied, setLinkCopied] = useState(false);
  const [captionCopied, setCaptionCopied] = useState(false);
  const [emailLinkCopied, setEmailLinkCopied] = useState(false);
  const [smsLinkCopied, setSmsLinkCopied] = useState(false);
  const [captionVariant, setCaptionVariant] = useState(0);
  const [shareWithImageBusy, setShareWithImageBusy] = useState(false);

  const baseUrl = `${window.location.origin}/listing/${listing.id}`;
  // UTM-tagged links per channel for analytics attribution
  const withUtm = useCallback((src: string, medium = 'social') =>
    `${baseUrl}?utm_source=${src}&utm_medium=${medium}&utm_campaign=host_share`, [baseUrl]);
  const listingUrl = baseUrl;
  const prettyUrl = listingUrl.replace(/^https?:\/\//, '');
  const categoryLabel = CATEGORY_LABELS[listing.category] || listing.category;
  const city = listing.address?.split(',')[0]?.trim() || '';

  const price = listing.mode === 'sale'
    ? listing.priceSale
    : listing.priceDaily || listing.priceWeekly;
  const priceLabel = listing.mode === 'sale'
    ? 'For sale'
    : listing.priceDaily ? '/ day' : '/ week';
  const priceText = price ? `$${price.toLocaleString()}${listing.mode === 'sale' ? '' : ` ${priceLabel}`}` : '';

  // Multiple AI-style caption variants — rotates with "Regenerate"
  const captionVariants = [
    listing.mode === 'sale'
      ? `🚚 For sale${city ? ` in ${city}` : ''}: ${listing.title}${priceText ? ` — ${priceText}` : ''}.\n\nDM me or grab full details here 👇`
      : `📅 Now booking on Vendibook${city ? ` in ${city}` : ''}: ${listing.title}${priceText ? ` — ${priceText}` : ''}.\n\nReserve your spot 👇`,
    listing.mode === 'sale'
      ? `Just listed: ${listing.title}${city ? ` (${city})` : ''}. ${priceText ? `Asking ${priceText}. ` : ''}Serious buyers only — link below.`
      : `Open dates available 🗓️ ${listing.title}${city ? ` · ${city}` : ''}.${priceText ? ` From ${priceText}.` : ''} Book direct, no fees:`,
    listing.mode === 'sale'
      ? `🔥 ${categoryLabel} alert${city ? ` — ${city}` : ''}!\n${listing.title}${priceText ? `\n${priceText}` : ''}\nTap link to see full specs & photos.`
      : `Looking for a ${categoryLabel.toLowerCase()}${city ? ` in ${city}` : ''}? I just opened bookings for ${listing.title}.${priceText ? ` ${priceText}.` : ''} Lock your date here:`];
  // Prefer AI-generated captions when available (matched by variant index modulo).
  const aiCaptions = templates
    .map((t) => t.caption)
    .filter((c): c is string => !!c && c.trim().length > 0);
  const allCaptions = aiCaptions.length > 0 ? aiCaptions : captionVariants;
  const currentCaption = allCaptions[captionVariant % allCaptions.length];
  const shareText = currentCaption;

  // Hashtags optimized for discovery
  const hashtags = [
    'vendibook',
    listing.mode === 'sale' ? 'forsale' : 'booknow',
    categoryLabel.toLowerCase().replace(/\s+/g, ''),
    city ? city.toLowerCase().replace(/\s+/g, '') : '',
    'smallbusiness'].filter(Boolean);

  useEffect(() => {
    trackShareKitViewed();
    // QR encodes a UTM-tagged URL so print/in-person scans are attributable.
    QRCode.toDataURL(withUtm('qr', 'print'), {
      width: 320,
      margin: 1,
      color: { dark: '#111111', light: '#FFFFFF' }}).then(setQrCodeDataUrl).catch(console.error);
  }, [listingUrl, withUtm]);

  const copy = useCallback(async (text: string, setFlag: (b: boolean) => void, msg: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setFlag(true);
      toast({ title: msg });
      setTimeout(() => setFlag(false), 2000);
    } catch {
      toast({ title: 'Failed to copy', variant: 'destructive' });
    }
  }, [toast]);

  const handleCopyLink = () => {
    const url = withUtm('copy_link', 'clipboard');
    copy(url, setLinkCopied, 'Link copied!');
    trackShareLinkCopied();
    logShare('copy' as ShareChannel, { share_url: url });
  };
  const handleCopyCaption = () => {
    const url = withUtm('copy_caption', 'clipboard');
    const fullCaption = `${currentCaption}\n\n${url}\n\n${hashtags.map(h => `#${h}`).join(' ')}`;
    copy(fullCaption, setCaptionCopied, 'Caption + link + hashtags copied!');
    logShare('copy' as ShareChannel, { share_url: url, caption: currentCaption, content_type: 'caption' });
  };
  const handleCopyEmailLink = () => copy(listingUrl, setEmailLinkCopied, 'Link copied for email!');
  const handleCopySmsLink = () => {
    const sms = `${listing.title} — book now: ${withUtm('sms', 'message')}`;
    copy(sms, setSmsLinkCopied, 'SMS message copied!');
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        const url = withUtm('native', 'share');
        await navigator.share({ title: listing.title, text: currentCaption, url });
        trackShareLinkCopied();
        logShare('native' as ShareChannel, { share_url: url, caption: currentCaption });
      } catch {
        // user cancelled
      }
    } else {
      handleCopyLink();
    }
  };

  // Share with image attached via Web Share API Level 2 (mobile Safari/Chrome)
  const handleShareWithImage = async () => {
    setShareWithImageBusy(true);
    try {
      const blob = await generateShareImageBlob(listing, city, priceText);
      const file = new File([blob], `vendibook-${listing.id}.png`, { type: 'image/png' });
      const shareUrl = withUtm('native', 'share-image');
      const shareData: ShareData = {
        title: listing.title,
        text: currentCaption,
        url: shareUrl,
        files: [file]};
      if (navigator.canShare?.({ files: [file] }) && navigator.share) {
        await navigator.share(shareData);
        trackShareImageDownloaded();
        logShare('native' as ShareChannel, { share_url: shareUrl, caption: currentCaption, content_type: 'image' });
        toast({ title: 'Shared with image!' });
      } else {
        await navigator.clipboard.writeText(`${currentCaption}\n\n${shareUrl}`);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `vendibook-${listing.id}.png`;
        a.click();
        URL.revokeObjectURL(url);
        logShare('copy' as ShareChannel, { share_url: shareUrl, caption: currentCaption, content_type: 'image' });
        toast({
          title: 'Image saved + caption copied',
          description: 'Open Instagram, paste the caption & attach the image.'});
      }
    } catch (e) {
      console.error(e);
      toast({ title: 'Share cancelled', variant: 'destructive' });
    } finally {
      setShareWithImageBusy(false);
    }
  };

  const handleDownloadStory = async () => {
    try {
      const blob = await generateStoryImageBlob(listing, city, priceText);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vendibook-story-${listing.id}.png`;
      a.click();
      URL.revokeObjectURL(url);
      trackShareImageDownloaded();
      logShare('copy' as ShareChannel, { content_type: 'story_image' });
      toast({ title: 'Story image downloaded (1080×1920)' });
    } catch (e) {
      console.error(e);
      toast({ title: 'Failed to generate story image', variant: 'destructive' });
    }
  };

  const openShare = (platform: string) => {
    const url = withUtm(platform);
    const u = encodeURIComponent(url);
    const t = encodeURIComponent(currentCaption);
    const tagsString = hashtags.map(h => `#${h}`).join(' ');
    const tWithTags = encodeURIComponent(`${currentCaption}\n\n${tagsString}`);
    const img = listing.coverImageUrl ? encodeURIComponent(listing.coverImageUrl) : '';

    const urls: Record<string, string> = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${u}&quote=${t}`,
      x: `https://twitter.com/intent/tweet?text=${tWithTags}&url=${u}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${u}`,
      whatsapp: `https://wa.me/?text=${t}%20${u}`,
      telegram: `https://t.me/share/url?url=${u}&text=${t}`,
      reddit: `https://www.reddit.com/submit?url=${u}&title=${encodeURIComponent(listing.title)}`,
      pinterest: `https://pinterest.com/pin/create/button/?url=${u}&description=${t}${img ? `&media=${img}` : ''}`,
      email: `mailto:?subject=${encodeURIComponent(listing.title)}&body=${t}%0A%0A${u}`,
      sms: `sms:?&body=${t}%20${u}`};

    // Per-channel DB log + GA event with channel label
    logShare(platform as ShareChannel, { share_url: url, caption: currentCaption });
    trackShareLinkCopied();

    // Instagram & TikTok have no web share — copy caption + open app
    if (platform === 'instagram' || platform === 'tiktok') {
      navigator.clipboard.writeText(`${currentCaption}\n\n${url}\n\n${tagsString}`).catch(() => {});
      const target = platform === 'instagram'
        ? 'https://www.instagram.com/'
        : 'https://www.tiktok.com/upload';
      toast({
        title: 'Caption copied!',
        description: `Opening ${platform === 'instagram' ? 'Instagram' : 'TikTok'} — paste it on your post.`});
      window.open(target, '_blank', 'noopener,noreferrer');
      return;
    }

    window.open(urls[platform], '_blank', 'noopener,noreferrer');
  };

  const regenerateCaption = () => {
    setCaptionVariant(v => v + 1);
    toast({ title: 'New caption generated' });
  };

// Generates a 1080x1080 branded PNG blob for Web Share API file attachment
const generateShareImageBlob = (
  listing: ShareKitListing,
  city: string,
  priceText: string = '',
): Promise<Blob> => new Promise((resolve, reject) => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return reject(new Error('No canvas context'));
  canvas.width = 1080;
  canvas.height = 1080;

  const draw = (coverImg?: HTMLImageElement) => {
    if (coverImg) {
      ctx.drawImage(coverImg, 0, 0, 1080, 1080);
      const grad = ctx.createLinearGradient(0, 540, 0, 1080);
      grad.addColorStop(0, 'rgba(0,0,0,0.1)');
      grad.addColorStop(1, 'rgba(0,0,0,0.92)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1080, 1080);
    } else {
      ctx.fillStyle = '#1A1A1A';
      ctx.fillRect(0, 0, 1080, 1080);
    }

    ctx.fillStyle = '#FF5124';
    ctx.fillRect(0, 0, 1080, 8);

    // Badge pill (top-left)
    ctx.fillStyle = '#FF5124';
    const badgeText = listing.mode === 'sale' ? 'FOR SALE' : 'NOW BOOKING';
    ctx.font = 'bold 26px system-ui, -apple-system, sans-serif';
    const badgeWidth = ctx.measureText(badgeText).width + 48;
    ctx.beginPath();
    (ctx as any).roundRect?.(48, 60, badgeWidth, 56, 28);
    if (!(ctx as any).roundRect) ctx.rect(48, 60, badgeWidth, 56);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.textBaseline = 'middle';
    ctx.fillText(badgeText, 72, 88);

    // Bottom title block
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 56px system-ui, -apple-system, sans-serif';
    const titleLines = wrapText(ctx, listing.title, 980, 2);
    titleLines.forEach((line, i) => ctx.fillText(line, 50, 780 + i * 64));

    let cursorY = 780 + titleLines.length * 64 + 36;
    if (city) {
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.font = '32px system-ui, -apple-system, sans-serif';
      ctx.fillText(`📍 ${city}`, 50, cursorY);
      cursorY += 48;
    }
    // Price block — bold accent
    if (priceText) {
      ctx.fillStyle = '#FFB800';
      ctx.font = 'bold 44px system-ui, -apple-system, sans-serif';
      ctx.fillText(priceText, 50, cursorY);
    }

    // CTA bottom
    ctx.fillStyle = '#FF5124';
    ctx.fillRect(0, 1020, 1080, 60);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`vendibook.com/listing/${listing.id.slice(0, 8)}`, 540, 1056);

    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Blob conversion failed'));
    }, 'image/png');
  };

  if (listing.coverImageUrl) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => draw(img);
    img.onerror = () => draw(); // fallback to dark background
    img.src = listing.coverImageUrl;
  } else {
    draw();
  }
});

// 1080×1920 Instagram/TikTok Story variant.
const generateStoryImageBlob = (
  listing: ShareKitListing,
  city: string,
  priceText: string = '',
): Promise<Blob> => new Promise((resolve, reject) => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return reject(new Error('No canvas context'));
  canvas.width = 1080;
  canvas.height = 1920;

  const draw = (coverImg?: HTMLImageElement) => {
    if (coverImg) {
      // Cover-fit the image, then a deep gradient overlay for legibility.
      const ratio = Math.max(1080 / coverImg.width, 1920 / coverImg.height);
      const w = coverImg.width * ratio;
      const h = coverImg.height * ratio;
      ctx.drawImage(coverImg, (1080 - w) / 2, (1920 - h) / 2, w, h);
      const grad = ctx.createLinearGradient(0, 0, 0, 1920);
      grad.addColorStop(0, 'rgba(0,0,0,0.55)');
      grad.addColorStop(0.45, 'rgba(0,0,0,0.1)');
      grad.addColorStop(1, 'rgba(0,0,0,0.92)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1080, 1920);
    } else {
      ctx.fillStyle = '#0a0a0c';
      ctx.fillRect(0, 0, 1080, 1920);
    }

    // Accent
    ctx.fillStyle = '#FF5124';
    ctx.fillRect(0, 0, 1080, 10);

    // Top badge
    ctx.fillStyle = '#FF5124';
    const badgeText = listing.mode === 'sale' ? 'FOR SALE' : 'NOW BOOKING';
    ctx.font = 'bold 34px system-ui, -apple-system, sans-serif';
    const badgeWidth = ctx.measureText(badgeText).width + 56;
    ctx.beginPath();
    (ctx as any).roundRect?.(60, 120, badgeWidth, 64, 32);
    if (!(ctx as any).roundRect) ctx.rect(60, 120, badgeWidth, 64);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.textBaseline = 'middle';
    ctx.fillText(badgeText, 88, 152);

    // Title — bottom third
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 80px system-ui, -apple-system, sans-serif';
    const titleLines = wrapText(ctx, listing.title, 960, 3);
    titleLines.forEach((line, i) => ctx.fillText(line, 60, 1380 + i * 92));

    let cy = 1380 + titleLines.length * 92 + 60;
    if (city) {
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.font = '40px system-ui, -apple-system, sans-serif';
      ctx.fillText(`📍 ${city}`, 60, cy);
      cy += 60;
    }
    if (priceText) {
      ctx.fillStyle = '#FFB800';
      ctx.font = 'bold 56px system-ui, -apple-system, sans-serif';
      ctx.fillText(priceText, 60, cy);
    }

    // CTA strip
    ctx.fillStyle = '#FF5124';
    ctx.fillRect(0, 1840, 1080, 80);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 30px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Book on vendibook.com', 540, 1888);

    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Blob conversion failed'));
    }, 'image/png');
  };

  if (listing.coverImageUrl) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => draw(img);
    img.onerror = () => draw();
    img.src = listing.coverImageUrl;
  } else {
    draw();
  }
});

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
    { id: 'instagram', label: 'Instagram', Icon: InstagramIcon, color: 'hover:text-[#E4405F]' },
    { id: 'tiktok', label: 'TikTok', Icon: TikTokIcon, color: 'hover:text-foreground' },
    { id: 'facebook', label: 'Facebook', Icon: FacebookIcon, color: 'hover:text-[#1877F2]' },
    { id: 'x', label: 'X', Icon: XIcon, color: 'hover:text-foreground' },
    { id: 'whatsapp', label: 'WhatsApp', Icon: WhatsAppIcon, color: 'hover:text-[#25D366]' },
    { id: 'linkedin', label: 'LinkedIn', Icon: LinkedInIcon, color: 'hover:text-[#0A66C2]' },
    { id: 'telegram', label: 'Telegram', Icon: TelegramIcon, color: 'hover:text-[#0088cc]' },
    { id: 'pinterest', label: 'Pinterest', Icon: PinterestIcon, color: 'hover:text-[#E60023]' },
    { id: 'reddit', label: 'Reddit', Icon: RedditIcon, color: 'hover:text-[#FF4500]' }];

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
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Share to
            </label>
            <button
              onClick={handleNativeShare}
              className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
            >
              <Share2 className="w-3 h-3" /> More
            </button>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {socialButtons.map(({ id, label, Icon, color }) => (
              <button
                key={id}
                onClick={() => openShare(id)}
                aria-label={`Share to ${label}`}
                className={cn(
                  'h-14 rounded-xl border bg-background text-muted-foreground flex flex-col items-center justify-center gap-1 transition-all hover:border-foreground/20 hover:bg-muted/50 active:scale-95',
                  color
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[9px] font-medium">{label}</span>
              </button>
            ))}
          </div>

          {/* Quick channels: SMS / Email */}
          <div className="grid grid-cols-2 gap-2 mt-2">
            <button
              onClick={() => openShare('sms')}
              className="h-11 rounded-xl border bg-background text-foreground/80 flex items-center justify-center gap-2 text-sm font-medium hover:bg-muted/50 active:scale-95 transition-all"
            >
              <MessageSquare className="w-4 h-4" /> SMS
            </button>
            <button
              onClick={() => openShare('email')}
              className="h-11 rounded-xl border bg-background text-foreground/80 flex items-center justify-center gap-2 text-sm font-medium hover:bg-muted/50 active:scale-95 transition-all"
            >
              <Send className="w-4 h-4" /> Email
            </button>
          </div>
        </div>
      </div>

      {/* SMART CAPTION (AI-style) */}
      <div className="rounded-2xl border bg-card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wand2 className="w-4 h-4 text-primary" />
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Smart caption
            </label>
          </div>
          <button
            onClick={regenerateCaption}
            className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
          >
             Regenerate
          </button>
        </div>
        <div className="px-3.5 py-3 bg-muted/60 rounded-xl text-sm text-foreground/90 whitespace-pre-line leading-relaxed">
          {currentCaption}
        </div>
        <div className="text-[11px] text-muted-foreground">
          {hashtags.map(h => `#${h}`).join(' ')}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={handleCopyCaption}
            variant="outline"
            className={cn('rounded-xl', captionCopied && 'bg-emerald-500 text-white border-emerald-500 hover:bg-emerald-500')}
          >
            {captionCopied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
            {captionCopied ? 'Copied' : 'Copy caption'}
          </Button>
          <Button
            onClick={handleShareWithImage}
            disabled={shareWithImageBusy}
            className="rounded-xl"
          >
            {shareWithImageBusy ? (
              <><Camera className="w-4 h-4 mr-2 animate-pulse" /> Preparing…</>
            ) : (
              <><ImageIcon className="w-4 h-4 mr-2" /> Share with image</>
            )}
          </Button>
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
          
          <h2 className="text-sm font-semibold uppercase tracking-wide">Branded graphics</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Now Booking — 1080×1080 */}
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
              {priceText && <div className="text-primary text-[9px] font-bold mt-0.5">{priceText}</div>}
              <div className="absolute bottom-0 inset-x-0 h-4 bg-foreground flex items-center justify-center">
                <span className="text-white text-[7px] font-bold tracking-widest">VENDIBOOK</span>
              </div>
            </div>
            <div className="p-3 flex items-center justify-between">
              <div>
                <div className="font-semibold text-sm">Now Booking</div>
                <div className="text-xs text-muted-foreground">1080×1080 · Square</div>
              </div>
              <Download className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
          </button>

          {/* IG / TikTok Story — 1080×1920 */}
          <button
            onClick={handleDownloadStory}
            className="group text-left rounded-2xl border bg-card overflow-hidden transition-all hover:shadow-md hover:-translate-y-0.5"
          >
            <div className="aspect-[9/16] bg-foreground relative overflow-hidden flex flex-col justify-end">
              {listing.coverImageUrl && (
                <img src={listing.coverImageUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-70" />
              )}
              <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/85" />
              <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded-full bg-primary text-white text-[7px] font-bold tracking-widest">
                {listing.mode === 'sale' ? 'FOR SALE' : 'NOW BOOKING'}
              </div>
              <div className="relative px-2.5 pb-3 space-y-0.5">
                <div className="text-white font-bold text-[10px] leading-tight line-clamp-2">{listing.title}</div>
                {city && <div className="text-white/80 text-[7px]">📍 {city}</div>}
                {priceText && <div className="text-[#FFB800] font-bold text-[9px]">{priceText}</div>}
              </div>
            </div>
            <div className="p-3 flex items-center justify-between">
              <div>
                <div className="font-semibold text-sm">Story</div>
                <div className="text-xs text-muted-foreground">1080×1920 · IG / TikTok</div>
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
